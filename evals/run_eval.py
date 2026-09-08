#!/usr/bin/env python3
"""
Grammar-Master GEC Benchmark Evaluation Runner.

Measures grammatical correction accuracy (GLEU, ERRANT F0.5), semantic preservation,
latency percentiles (p50/p95), and token cost on the CoNLL-2014 benchmark.

Supports two evaluation modes:
1. [Primary]: Live Next.js HTTP API endpoint (/api/grammar-check) - Headline benchmark.
2. [Diagnostic]: Direct Groq LLM inference (GROQ_MODELS.PRIMARY from src/lib/ai-config.ts) - Pipeline vs model ablation.
"""

import os
import sys
import json
import time
import argparse
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add project root to sys.path so evals package imports cleanly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

def load_local_env():
    """Loads environment variables from .env.local or .env if present."""
    for env_file in [PROJECT_ROOT / ".env.local", PROJECT_ROOT / ".env"]:
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v

load_local_env()

import requests
from evals.metrics.gleu import compute_gleu
from evals.metrics.semantic_similarity import compute_semantic_similarity
from evals.metrics.errant_scorer import score_with_errant

def load_shared_ai_models() -> Dict[str, str]:
    """Loads shared model configuration from src/config/ai-models.json as single source of truth."""
    models_path = PROJECT_ROOT / "src" / "config" / "ai-models.json"
    if models_path.exists():
        with open(models_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"PRIMARY": "openai/gpt-oss-120b", "FAST": "openai/gpt-oss-20b"}

SHARED_AI_MODELS = load_shared_ai_models()
CONFIGURED_PRIMARY_MODEL = SHARED_AI_MODELS.get("PRIMARY", "openai/gpt-oss-120b")

GROQ_PRICING = {
    "prompt_per_million": 0.59,
    "completion_per_million": 0.79,
}

SYSTEM_PROMPT_GRAMMAR = """You are a professional grammar and writing expert. Review the following text in English and:
1. Fix any grammatical errors
2. Correct spelling mistakes
3. Improve punctuation where needed
4. Preserve all HTML formatting exactly as is
5. If no corrections are needed, return the exact same text
6. Focus only on grammar, spelling, and punctuation - do not change the writing style or tone"""

def calculate_percentile(values: List[float], p: float) -> float:
    """Calculates the p-th percentile of a list of floats."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    d = k - f
    return sorted_vals[f] + d * (sorted_vals[c] - sorted_vals[f])

def call_live_api(url: str, text: str, timeout: float = 30.0, max_retries: int = 3) -> Tuple[str, float, int, int]:
    """Sends text to live Next.js /api/grammar-check endpoint with automatic retries."""
    payload = {
        "text": text,
        "language": "English",
        "_id": "demo123",
    }
    headers = {"x-eval-runner": "true"}

    for attempt in range(max_retries):
        start = time.perf_counter()
        resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
        latency_ms = (time.perf_counter() - start) * 1000.0

        if resp.status_code == 200:
            data = resp.json()
            corrected = text
            if "success" in data and isinstance(data["success"], dict):
                corrected = data["success"].get("text", text)

            # Estimate tokens: ~1 token per 4 characters + system prompt tokens (~80 tokens)
            prompt_tokens = len(SYSTEM_PROMPT_GRAMMAR.split()) + len(text.split()) + 20
            completion_tokens = len(corrected.split()) + 5

            return corrected, latency_ms, prompt_tokens, completion_tokens

        if resp.status_code == 429 and attempt < max_retries - 1:
            time.sleep(2.0 * (attempt + 1))
            continue

        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text}")

def call_direct_groq(client, model: str, text: str) -> Tuple[str, float, int, int]:
    """Calls Groq model directly using the exact system prompt from the API route."""
    start = time.perf_counter()
    completion = client.chat.completions.create(
      messages=[
        {"role": "system", "content": SYSTEM_PROMPT_GRAMMAR},
        {"role": "user", "content": text},
      ],
      model=model,
      temperature=0.0,
    )
    latency_ms = (time.perf_counter() - start) * 1000.0

    corrected = completion.choices[0].message.content or text
    usage = completion.usage
    p_tokens = usage.prompt_tokens if usage else len(text.split()) + 80
    c_tokens = usage.completion_tokens if usage else len(corrected.split())

    return corrected, latency_ms, p_tokens, c_tokens

def run_evaluation(
    dataset_path: str,
    limit: Optional[int] = None,
    direct_groq: bool = False,
    api_url: str = "http://localhost:3000/api/grammar-check",
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """Executes evaluation across dataset rows and aggregates metrics."""
    if not model_name:
        model_name = CONFIGURED_PRIMARY_MODEL

    groq_client = None
    if direct_groq:
        import groq
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is required for direct-groq mode.")
        groq_client = groq.Groq(api_key=api_key)

    # Load dataset
    samples = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                samples.append(json.loads(line))

    if limit and limit > 0:
        samples = samples[:limit]

    # Load manifest if available
    manifest_path = Path(dataset_path).parent / "manifest.json"
    manifest = {}
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as mf:
            manifest = json.load(mf)

    mode_label = (
        f"Diagnostic [Direct LLM Baseline: {model_name}]"
        if direct_groq
        else f"Primary [Live App Route: {api_url}]"
    )

    print(f"\n========================================================")
    print(f" Grammar-Master Evaluation Benchmark")
    print(f" Mode:    {mode_label}")
    print(f" Dataset: {Path(dataset_path).name} (N={len(samples)}, seed={manifest.get('random_seed', 42)})")
    print(f" Time:    {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"========================================================\n")

    results = []
    latencies = []
    gleu_scores = []
    sim_scores = []
    f05_scores = []
    precisions = []
    recalls = []

    total_prompt_tokens = 0
    total_completion_tokens = 0

    for idx, sample in enumerate(samples, start=1):
        source = sample["source"]
        references = sample["references"]

        try:
            if direct_groq:
                hyp, lat_ms, p_tok, c_tok = call_direct_groq(groq_client, model_name, source)
            else:
                hyp, lat_ms, p_tok, c_tok = call_live_api(api_url, source)
        except Exception as err:
            print(f"  [{idx}/{len(samples)}] Failed: {err}")
            hyp = source
            lat_ms = 0.0
            p_tok, c_tok = 0, 0

        # Score with multi-annotator max policy
        gleu = compute_gleu(source, hyp, references, max_over_references=True)
        sim = compute_semantic_similarity(hyp, references, max_over_references=True)
        errant_res = score_with_errant(source, hyp, references, max_over_references=True)

        latencies.append(lat_ms)
        gleu_scores.append(gleu)
        sim_scores.append(sim)
        f05_scores.append(errant_res["f0_5"])
        precisions.append(errant_res["precision"])
        recalls.append(errant_res["recall"])

        total_prompt_tokens += p_tok
        total_completion_tokens += c_tok

        results.append({
            "id": sample.get("id", idx),
            "source": source,
            "hypothesis": hyp,
            "references": references,
            "gleu": gleu,
            "semantic_similarity": sim,
            "f0_5": errant_res["f0_5"],
            "precision": errant_res["precision"],
            "recall": errant_res["recall"],
            "latency_ms": lat_ms,
            "prompt_tokens": p_tok,
            "completion_tokens": c_tok,
        })

        if idx % 5 == 0 or idx == len(samples):
            avg_g = sum(gleu_scores) / len(gleu_scores)
            avg_s = sum(sim_scores) / len(sim_scores)
            print(f"  Processed [{idx:3d}/{len(samples)}] -> Mean GLEU: {avg_g:.3f} | Sim: {avg_s:.3f} | Latency: {lat_ms:.0f}ms", flush=True)

    # Aggregate Statistics
    mean_gleu = sum(gleu_scores) / len(gleu_scores) if gleu_scores else 0.0
    mean_sim = sum(sim_scores) / len(sim_scores) if sim_scores else 0.0
    mean_f05 = sum(f05_scores) / len(f05_scores) if f05_scores else 0.0
    mean_p = sum(precisions) / len(precisions) if precisions else 0.0
    mean_r = sum(recalls) / len(recalls) if recalls else 0.0

    lat_min = min(latencies) if latencies else 0.0
    lat_mean = sum(latencies) / len(latencies) if latencies else 0.0
    lat_p50 = calculate_percentile(latencies, 50)
    lat_p95 = calculate_percentile(latencies, 95)
    lat_max = max(latencies) if latencies else 0.0

    # Economics
    cost_prompt = (total_prompt_tokens / 1_000_000) * GROQ_PRICING["prompt_per_million"]
    cost_comp = (total_completion_tokens / 1_000_000) * GROQ_PRICING["completion_per_million"]
    total_cost = cost_prompt + cost_comp
    cost_per_1k = (total_cost / len(samples)) * 1000 if samples else 0.0

    summary = {
        "mode": mode_label,
        "is_diagnostic": direct_groq,
        "timestamp": datetime.datetime.now().isoformat(),
        "dataset": Path(dataset_path).name,
        "sample_count": len(samples),
        "random_seed": manifest.get("random_seed", 42),
        "metrics": {
            "gleu": round(mean_gleu, 4),
            "semantic_similarity": round(mean_sim, 4),
            "f0_5": round(mean_f05, 4),
            "precision": round(mean_p, 4),
            "recall": round(mean_r, 4),
        },
        "latency_ms": {
            "min": round(lat_min, 1),
            "mean": round(lat_mean, 1),
            "p50": round(lat_p50, 1),
            "p95": round(lat_p95, 1),
            "max": round(lat_max, 1),
        },
        "tokens": {
            "prompt_tokens": total_prompt_tokens,
            "completion_tokens": total_completion_tokens,
            "total_tokens": total_prompt_tokens + total_completion_tokens,
        },
        "economics": {
            "total_cost_usd": round(total_cost, 5),
            "cost_per_1k_sentences_usd": round(cost_per_1k, 4),
        },
        "results": results,
    }

    return summary

def generate_markdown_report(summary: Dict[str, Any], output_path: str):
    """Generates an executive markdown benchmark report."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    m = summary["metrics"]
    l = summary["latency_ms"]
    t = summary["tokens"]
    e = summary["economics"]
    results = summary["results"]

    qualitative_samples = results[:5]

    md = f"""# Grammar-Master Benchmark Report

**Mode**: `{summary['mode']}`  
**Evaluated on**: N={summary['sample_count']} sentences, seed={summary['random_seed']}, from CoNLL-2014 test set (`{summary['dataset']}`)  
**Generated**: {summary['timestamp']}

---

## 1. Executive Summary

| Metric | Score | Industry Benchmark Context |
| :--- | :--- | :--- |
| **GLEU** | **{m['gleu']:.4f}** | *Official CoNLL-2014 n-gram precision/recall metric (max over references)* |
| **Semantic Similarity** | **{m['semantic_similarity']:.4f}** | *Cosine embedding similarity (`all-MiniLM-L6-v2`) measuring meaning preservation* |
| **$F_{0.5}$ Score** | **{m['f0_5']:.4f}** | *Precision-weighted edit F-score (ERRANT methodology)* |
| **Precision** | **{m['precision']:.4f}** | *Ratio of proposed edits that were legitimate corrections* |
| **Recall** | **{m['recall']:.4f}** | *Ratio of reference errors successfully identified and fixed* |

---

## 2. Latency & Systems Performance

| Latency Metric | Milliseconds |
| :--- | :--- |
| **p50 (Median)** | **{l['p50']:.1f} ms** |
| **p95** | **{l['p95']:.1f} ms** |
| **Mean** | **{l['mean']:.1f} ms** |
| **Min / Max** | **{l['min']:.1f} ms / {l['max']:.1f} ms** |

---

## 3. Token Economics & Throughput

| Resource | Count / Cost |
| :--- | :--- |
| **Total Prompt Tokens** | {t['prompt_tokens']:,} |
| **Total Completion Tokens** | {t['completion_tokens']:,} |
| **Total Tokens** | {t['total_tokens']:,} |
| **Estimated Evaluation Cost** | ${e['total_cost_usd']:.5f} |
| **Estimated Cost / 1,000 Sentences** | **${e['cost_per_1k_sentences_usd']:.4f}** |

---

## 4. Qualitative Sample Inspections

"""
    for i, s in enumerate(qualitative_samples, start=1):
        md += f"### Example {i} (ID: {s['id']})\n"
        md += f"- **Source (Input)**: `{s['source']}`\n"
        md += f"- **Hypothesis (Output)**: `{s['hypothesis']}`\n"
        md += f"- **Reference(s)**: `{s['references'][0]}`\n"
        md += f"- **Metrics**: GLEU: `{s['gleu']:.3f}` | Sim: `{s['semantic_similarity']:.3f}` | $F_{{0.5}}$: `{s['f0_5']:.3f}` | Latency: `{s['latency_ms']:.0f}ms`\n\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md)

    # Also persist latest.json
    json_path = os.path.join(os.path.dirname(output_path), "benchmark_latest.json")
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(summary, jf, indent=2)

    print(f"\nReport written to: {output_path}")
    print(f"JSON data written to: {json_path}")

def main():
    parser = argparse.ArgumentParser(description="Grammar-Master GEC Benchmark Runner")
    parser.add_argument("--dataset", type=str, default="evals/datasets/conll2014_subset.jsonl", help="Dataset JSONL path")
    parser.add_argument("--limit", type=int, default=None, help="Max number of sentences to evaluate (e.g. 25, 100)")
    parser.add_argument("--direct-groq", action="store_true", help="Diagnostic baseline: invoke Groq model directly")
    parser.add_argument("--target", type=str, default="http://localhost:3000/api/grammar-check", help="Live API target URL")
    parser.add_argument("--model", type=str, default=CONFIGURED_PRIMARY_MODEL, help=f"Groq model ID (default: {CONFIGURED_PRIMARY_MODEL} from src/lib/ai-config.ts)")
    parser.add_argument("--output", type=str, default="evals/reports/benchmark_latest.md", help="Output report markdown path")

    args = parser.parse_args()

    summary = run_evaluation(
        dataset_path=args.dataset,
        limit=args.limit,
        direct_groq=args.direct_groq,
        api_url=args.target,
        model_name=args.model,
    )

    generate_markdown_report(summary, args.output)

if __name__ == "__main__":
    main()
