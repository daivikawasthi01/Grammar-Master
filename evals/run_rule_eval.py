#!/usr/bin/env python3
"""
Rule-obedience evaluation: does the app leave the writer's own vocabulary alone while still
fixing real mistakes?

Loads a golden set (default: evals/datasets/golden_diary_synthetic.json), installs its style
guide through the app's own import + save routes, runs every case through /api/check, applies
the returned edits, and reports:

  - protected-term preservation  (cases where every protected word survives unchanged)
  - false-flag rate              (cases where any returned edit touches a protected word)
  - fix recall                   (expected misspellings/mistakes that were corrected)
  - clean-case edit rate         (cases with nothing to fix that still got edits)
  - tokens per check, latency p50/p95

A no-op baseline (return the input unchanged) is reported next to every run: it preserves
everything and fixes nothing, so both columns are needed to read the result.

Retrieval recall@k and irrelevant-rule rate need a retrieval-debug endpoint and arrive with
Phase 3; they are not measured here.

Needs the dev server and a session: EVAL_AUTH_COOKIE='gm_session=...'.
Private real entries go in evals/datasets/private/ (gitignored) in the same format.
"""

import argparse
import datetime
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    k = (len(ordered) - 1) * p / 100.0
    lo, hi = int(k), min(int(k) + 1, len(ordered) - 1)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (k - lo)


def apply_edits(text: str, edits: List[Dict[str, Any]]) -> str:
    spans = []
    for e in edits:
        original, replacement = e.get("original") or "", e.get("replacement") or ""
        idx = -1
        for _ in range(int(e.get("occurrence") or 0) + 1):
            idx = text.find(original, idx + 1)
            if idx == -1:
                break
        if idx != -1 and original:
            spans.append((idx, idx + len(original), replacement))
    spans.sort(key=lambda s: s[0], reverse=True)
    last = len(text) + 1
    for start, end, replacement in spans:
        if end > last:
            continue
        text = text[:start] + replacement + text[end:]
        last = start
    return text


def protected_spans(text: str, terms: List[str]) -> List[tuple]:
    if not terms:
        return []
    alt = "|".join(re.escape(t) for t in sorted(terms, key=len, reverse=True))
    return [(m.start(), m.end(), m.group(0)) for m in re.finditer(rf"(?<![\w]){'(?:' + alt + ')'}(?![\w])", text, re.I)]


def edit_touches(text: str, edit: Dict[str, Any], spans: List[tuple]) -> bool:
    original = edit.get("original") or ""
    idx = -1
    for _ in range(int(edit.get("occurrence") or 0) + 1):
        idx = text.find(original, idx + 1)
        if idx == -1:
            return False
    return any(idx < s_end and idx + len(original) > s_start for s_start, s_end, _ in spans)


def fix_applied(hypothesis: str, fix: Dict[str, str]) -> bool:
    return fix["replacement"] in hypothesis and fix["original"] not in hypothesis


def score_case(case: Dict[str, Any], edits: List[Dict[str, Any]], protected_terms: List[str]) -> Dict[str, Any]:
    text = case["input"]
    hyp = apply_edits(text, edits)
    spans = protected_spans(text, protected_terms)
    preserved = all(tok in hyp for _, _, tok in spans)
    touched = any(edit_touches(text, e, spans) for e in edits)
    fixes = case.get("expected_fixes", [])
    applied = sum(1 for f in fixes if fix_applied(hyp, f))
    return {
        "id": case["id"],
        "has_protected": bool(spans),
        "preserved": preserved,
        "false_flag": touched,
        "fixes_expected": len(fixes),
        "fixes_applied": applied,
        "is_clean": not fixes,
        "edit_count": len(edits),
        "hypothesis": hyp,
    }


def aggregate(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    with_prot = [r for r in rows if r["has_protected"]]
    clean = [r for r in rows if r["is_clean"]]
    exp = sum(r["fixes_expected"] for r in rows)
    return {
        "cases": len(rows),
        "protected_preservation": (sum(r["preserved"] for r in with_prot) / len(with_prot)) if with_prot else None,
        "false_flag_rate": (sum(r["false_flag"] for r in with_prot) / len(with_prot)) if with_prot else None,
        "fix_recall": (sum(r["fixes_applied"] for r in rows) / exp) if exp else None,
        "clean_case_edit_rate": (sum(r["edit_count"] > 0 for r in clean) / len(clean)) if clean else None,
    }


def run(args) -> Dict[str, Any]:
    import requests

    golden = json.loads(Path(args.dataset).read_text(encoding="utf-8"))
    base = args.base_url.rstrip("/")
    headers = {"x-eval-runner": "true"}
    cookie = os.environ.get("EVAL_AUTH_COOKIE")
    if not cookie:
        sys.exit("EVAL_AUTH_COOKIE is required (sign in to the dev server and copy the gm_session cookie).")
    headers["Cookie"] = cookie

    # What a writer does in the app: compile the guide text, tick every proposed protect term, save.
    imp = requests.post(f"{base}/api/style-guide/compile", json={"text": golden["style_guide_text"]}, headers=headers, timeout=60)
    imp.raise_for_status()
    compiled = imp.json()
    rules = list(compiled["rules"])
    terms = [t["term"] for t in compiled["protectTerms"] if t["named"]]
    for i in range(0, len(terms), 20):  # a rule holds at most 20 terms
        chunk = terms[i : i + 20]
        rules.append({"id": f"p{i}", "kind": "protect", "preferred": chunk[0], "forbidden": chunk[1:], "caseSensitive": False})
    guidance = compiled["guidance"]
    put = requests.put(f"{base}/api/style-guide", json={"rules": rules, "guidanceNotes": guidance}, headers=headers, timeout=30)
    put.raise_for_status()
    print(f"Installed {len(rules)} rules ({len(terms)} protected terms), {len(guidance)} guidance notes.")

    terms = golden["protected_terms"]
    rows, noop_rows, latencies = [], [], []
    prompt_tokens = completion_tokens = failures = 0
    meta_seen: Dict[str, Any] = {}
    for case in golden["cases"]:
        start = time.perf_counter()
        try:
            # The provider's per-minute token limit answers 502; back off and retry rather than count it as "no edits".
            for attempt in range(5):
                resp = requests.post(f"{base}/api/check", json={"text": case["input"], "language": "en-US"}, headers=headers, timeout=60)
                if resp.status_code != 502 or attempt == 4:
                    break
                time.sleep(4 * (attempt + 1))
            resp.raise_for_status()
            data = resp.json()
            latencies.append((time.perf_counter() - start) * 1000.0)
        except Exception as err:  # a failed call counts as "no edits" and is reported
            print(f"  case {case['id']} failed: {err}")
            failures += 1
            data = {"edits": [], "meta": {}}
        meta = data.get("meta") or {}
        usage = meta.get("usage") or {}
        prompt_tokens += int(usage.get("promptTokens") or 0)
        completion_tokens += int(usage.get("completionTokens") or 0)
        for k in ("model", "promptVersion"):
            meta_seen.setdefault(k, meta.get(k))
        rows.append(score_case(case, data.get("edits") or [], terms))
        noop_rows.append(score_case(case, [], terms))

    n = len(golden["cases"])
    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "dataset": Path(args.dataset).name,
        "model": meta_seen.get("model"),
        "prompt_version": meta_seen.get("promptVersion"),
        "failed_requests": failures,
        "metrics": aggregate(rows),
        "noop_baseline": aggregate(noop_rows),
        "tokens_per_check": round((prompt_tokens + completion_tokens) / n, 1) if n else 0,
        "latency_ms": {"p50": round(percentile(latencies, 50), 1), "p95": round(percentile(latencies, 95), 1)},
        "rows": rows,
    }


def fmt(v: Optional[float]) -> str:
    return "n/a" if v is None else f"{v * 100:.1f}%"


def write_report(summary: Dict[str, Any], out: str) -> None:
    m, b = summary["metrics"], summary["noop_baseline"]
    lines = [
        "# Rule-obedience report",
        "",
        f"Dataset `{summary['dataset']}` (N={m['cases']}) | model `{summary['model']}` | prompt `{summary['prompt_version']}` | failed requests {summary['failed_requests']}",
        "",
        "| Metric | This run | No-op baseline |",
        "| :--- | :--- | :--- |",
        f"| Protected-term preservation | {fmt(m['protected_preservation'])} | {fmt(b['protected_preservation'])} |",
        f"| False-flag rate (edit touches a protected word) | {fmt(m['false_flag_rate'])} | {fmt(b['false_flag_rate'])} |",
        f"| Fix recall | {fmt(m['fix_recall'])} | {fmt(b['fix_recall'])} |",
        f"| Clean-case edit rate | {fmt(m['clean_case_edit_rate'])} | {fmt(b['clean_case_edit_rate'])} |",
        "",
        f"Tokens per check: {summary['tokens_per_check']} | latency p50 {summary['latency_ms']['p50']} ms, p95 {summary['latency_ms']['p95']} ms",
        "",
    ]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    Path(out).write_text("\n".join(lines), encoding="utf-8")
    Path(out).with_suffix(".json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("\n".join(lines))


def main() -> None:
    ap = argparse.ArgumentParser(description="Grammar-Master rule-obedience evaluation")
    ap.add_argument("--dataset", default="evals/datasets/golden_diary_synthetic.json")
    ap.add_argument("--base-url", default="http://localhost:3000")
    ap.add_argument("--output", default="evals/reports/rule_eval_latest.md")
    ap.add_argument("--min-preservation", type=float, default=None, help="CI gate: exit 1 if protected-term preservation is below this (0-1)")
    args = ap.parse_args()
    summary = run(args)
    write_report(summary, args.output)
    pres = summary["metrics"]["protected_preservation"]
    if args.min_preservation is not None and (pres is None or pres < args.min_preservation):
        print(f"\nGATE FAILED: preservation {fmt(pres)} < {args.min_preservation * 100:.0f}%")
        sys.exit(1)


if __name__ == "__main__":
    main()
