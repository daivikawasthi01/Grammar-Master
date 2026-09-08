"""
ERRANT-based edit extraction and F0.5 scoring engine.
Computes precision, recall, and F0.5 using the official BEA/CoNLL edit-matching methodology.

Supports multi-annotator evaluation using the max-over-references policy.
"""

from typing import List, Dict, Any, Union, Tuple

_errant_instance = None
_errant_failed = False

def get_errant_annotator():
    """Lazy loader for ERRANT annotator."""
    global _errant_instance, _errant_failed
    if _errant_failed:
        return None
    if _errant_instance is None:
        try:
            import errant
            _errant_instance = errant.load("en")
        except Exception as e:
            print(f"[Warning] Could not initialize ERRANT ({e}).")
            _errant_failed = True
            return None
    return _errant_instance

def calculate_f_score(tp: int, fp: int, fn: int, beta: float = 0.5) -> Dict[str, float]:
    """Calculates Precision, Recall, and F_beta (default beta=0.5)."""
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0

    if precision == 0.0 and recall == 0.0:
        if tp == 0 and fp == 0 and fn == 0:
            # Both hypothesis and reference made zero edits (correct sentence untouched)
            return {"precision": 1.0, "recall": 1.0, "f_score": 1.0}
        return {"precision": 0.0, "recall": 0.0, "f_score": 0.0}

    beta_sq = beta ** 2
    denom = (beta_sq * precision) + recall
    f_score = ((1 + beta_sq) * precision * recall) / denom if denom > 0 else 0.0

    return {
        "precision": precision,
        "recall": recall,
        "f_score": f_score,
    }

def score_single_reference(
    annotator,
    source: str,
    hypothesis: str,
    reference: str
) -> Dict[str, Any]:
    """Scores hypothesis against a single reference using ERRANT edit spans."""
    orig_doc = annotator.parse(source)
    hyp_doc = annotator.parse(hypothesis)
    ref_doc = annotator.parse(reference)

    hyp_edits = annotator.annotate(orig_doc, hyp_doc)
    ref_edits = annotator.annotate(orig_doc, ref_doc)

    # Clean string edit representation: (o_start, o_end, c_str)
    hyp_set = {(e.o_start, e.o_end, e.c_str.strip()) for e in hyp_edits}
    ref_set = {(e.o_start, e.o_end, e.c_str.strip()) for e in ref_edits}

    tp = len(hyp_set & ref_set)
    fp = len(hyp_set - ref_set)
    fn = len(ref_set - hyp_set)

    f_metrics = calculate_f_score(tp, fp, fn, beta=0.5)

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": f_metrics["precision"],
        "recall": f_metrics["recall"],
        "f0_5": f_metrics["f_score"],
        "hyp_edit_count": len(hyp_set),
        "ref_edit_count": len(ref_set),
    }

def score_with_errant(
    source: str,
    hypothesis: str,
    references: Union[str, List[str]],
    max_over_references: bool = True
) -> Dict[str, Any]:
    """
    Evaluates hypothesis against one or multiple references using ERRANT.
    Uses max_over_references to pick the annotator that aligns best with the model's valid fix.
    """
    if isinstance(references, str):
        references = [references]

    if not references:
        references = [source]

    # Quick short-circuit: exact match to any reference
    for ref in references:
        if hypothesis.strip() == ref.strip():
            return {
                "tp": 1,
                "fp": 0,
                "fn": 0,
                "precision": 1.0,
                "recall": 1.0,
                "f0_5": 1.0,
                "hyp_edit_count": 0,
                "ref_edit_count": 0,
            }

    annotator = get_errant_annotator()
    if annotator is None:
        # Fallback if ERRANT not available: token-level diff approximation
        return _fallback_token_f_score(source, hypothesis, references)

    best_result = None
    for ref in references:
        res = score_single_reference(annotator, source, hypothesis, ref)
        if best_result is None or (res["f0_5"] > best_result["f0_5"]):
            best_result = res

    return best_result or {
        "tp": 0, "fp": 0, "fn": 0, "precision": 0.0, "recall": 0.0, "f0_5": 0.0
    }

def _fallback_token_f_score(
    source: str,
    hypothesis: str,
    references: List[str]
) -> Dict[str, Any]:
    """Fast token-level edit fallback."""
    s_tokens = set(source.split())
    h_tokens = set(hypothesis.split())
    
    best_f = 0.0
    best_res = {"precision": 0.0, "recall": 0.0, "f0_5": 0.0, "tp": 0, "fp": 0, "fn": 0}

    for ref in references:
        r_tokens = set(ref.split())
        intended_adds = r_tokens - s_tokens
        actual_adds = h_tokens - s_tokens

        tp = len(intended_adds & actual_adds)
        fp = len(actual_adds - intended_adds)
        fn = len(intended_adds - actual_adds)

        res = calculate_f_score(tp, fp, fn, beta=0.5)
        if res["f_score"] >= best_f:
            best_f = res["f_score"]
            best_res = {
                "precision": res["precision"],
                "recall": res["recall"],
                "f0_5": res["f_score"],
                "tp": tp,
                "fp": fp,
                "fn": fn,
            }

    return best_res
