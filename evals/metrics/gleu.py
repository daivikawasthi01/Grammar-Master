"""
Generalized Language Evaluation Understanding (GLEU) Metric for Grammatical Error Correction.
Based on Napoles et al. (2015): "Ground Truth for Grammatical Error Correction".

Supports multi-annotator evaluation using the max-over-references policy.
"""

from collections import Counter
import math
from typing import List, Union

def get_ngrams(tokens: List[str], n: int) -> Counter:
    """Extracts n-gram frequency counter from token list."""
    if len(tokens) < n:
        return Counter()
    return Counter(tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1))

def sentence_gleu_single(
    source: str,
    hypothesis: str,
    reference: str,
    min_n: int = 1,
    max_n: int = 4
) -> float:
    """
    Computes GLEU score for a single candidate against a single reference and source.
    """
    s_tokens = source.strip().split()
    h_tokens = hypothesis.strip().split()
    r_tokens = reference.strip().split()

    if not h_tokens:
        return 0.0 if r_tokens else 1.0

    # Handle exact identical match
    if h_tokens == r_tokens:
        return 1.0

    precision_sum = 0.0
    valid_n = 0

    for n in range(min_n, max_n + 1):
        h_ngrams = get_ngrams(h_tokens, n)
        r_ngrams = get_ngrams(r_tokens, n)
        s_ngrams = get_ngrams(s_tokens, n)

        total_h = sum(h_ngrams.values())
        if total_h == 0:
            continue

        # Correct matches between hypothesis and reference
        matches = sum((h_ngrams & r_ngrams).values())

        # Penalize n-grams that the hypothesis copied from source that should have been changed
        unmodified_errors = sum(
            max(0, h_ngrams[ng] - r_ngrams[ng])
            for ng in h_ngrams
            if s_ngrams[ng] > r_ngrams[ng]
        )

        n_score = max(0, matches - unmodified_errors) / total_h
        precision_sum += n_score
        valid_n += 1

    if valid_n == 0:
        return 0.0

    return precision_sum / valid_n

def compute_gleu(
    source: str,
    hypothesis: str,
    references: Union[str, List[str]],
    max_over_references: bool = True
) -> float:
    """
    Computes GLEU score for a candidate hypothesis against one or multiple references.
    
    Multi-annotator policy:
    When multiple references are provided, returns max(GLEU) over all reference
    annotations to avoid unfairly penalizing valid alternative corrections.
    """
    if isinstance(references, str):
        references = [references]

    if not references:
        return sentence_gleu_single(source, hypothesis, source)

    scores = [
        sentence_gleu_single(source, hypothesis, ref)
        for ref in references
    ]

    return max(scores) if max_over_references else (sum(scores) / len(scores))

def compute_corpus_gleu(
    sources: List[str],
    hypotheses: List[str],
    references_list: List[List[str]],
    max_over_references: bool = True
) -> float:
    """Computes macro-averaged GLEU score across an entire evaluation corpus."""
    if not sources or not hypotheses or len(sources) != len(hypotheses):
        return 0.0

    scores = [
        compute_gleu(src, hyp, refs, max_over_references=max_over_references)
        for src, hyp, refs in zip(sources, hypotheses, references_list)
    ]
    return sum(scores) / len(scores) if scores else 0.0
