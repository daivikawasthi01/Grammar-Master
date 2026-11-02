"""
GLEU-style metric for grammatical error correction, after Napoles et al. (2015).

For n = 1..4, n-gram precision of the hypothesis H against the reference R, minus a
penalty for n-grams that H copied from the source S but that R does not contain:

    p_n = max(0, |H∩R| - |H∩S \\ R|) / |H|

GLEU = BP * exp(mean(log p_n)), with the usual brevity penalty against the reference.

This is a re-implementation from the paper, NOT the official script, and it has not been
validated against it. Report it as "GLEU (re-implemented)". An unchanged copy of the
source scores high on this metric, so every report must also show the no-op baseline.
The headline number for this project is ERRANT F0.5, which is more discriminating.
"""

from collections import Counter
import math
from typing import List, Tuple, Union

_EPS = 1e-9


def get_ngrams(tokens: List[str], n: int) -> Counter:
    """Extracts n-gram frequency counter from token list."""
    if len(tokens) < n:
        return Counter()
    return Counter(tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1))


def _stats(source: str, hypothesis: str, reference: str, max_n: int = 4) -> Tuple[List[Tuple[int, int]], int, int]:
    """Per-n (numerator, denominator) plus hypothesis and reference lengths."""
    s_tokens, h_tokens, r_tokens = source.split(), hypothesis.split(), reference.split()
    per_n = []
    for n in range(1, max_n + 1):
        h, r, s = get_ngrams(h_tokens, n), get_ngrams(r_tokens, n), get_ngrams(s_tokens, n)
        total = sum(h.values())
        matches = sum((h & r).values())
        # n-grams kept from the source although the reference dropped them
        copied_errors = sum(max(0, min(h[g], s[g]) - r[g]) for g in h)
        per_n.append((max(0, matches - copied_errors), total))
    return per_n, len(h_tokens), len(r_tokens)


def _combine(per_n: List[Tuple[int, int]], hyp_len: int, ref_len: int) -> float:
    if hyp_len == 0:
        return 1.0 if ref_len == 0 else 0.0
    logs = [math.log(max(num / den, _EPS)) for num, den in per_n if den > 0]
    if not logs:
        return 0.0
    bp = 1.0 if hyp_len >= ref_len else math.exp(1 - ref_len / hyp_len)
    return bp * math.exp(sum(logs) / len(logs))


def sentence_gleu_single(source: str, hypothesis: str, reference: str, max_n: int = 4) -> float:
    return _combine(*_stats(source, hypothesis, reference, max_n))


def compute_gleu(
    source: str,
    hypothesis: str,
    references: Union[str, List[str]],
    max_over_references: bool = True,
) -> float:
    """Sentence-level GLEU against one or more references (max over references by default)."""
    if isinstance(references, str):
        references = [references]
    if not references:
        references = [source]
    scores = [sentence_gleu_single(source, hypothesis, ref) for ref in references]
    return max(scores) if max_over_references else sum(scores) / len(scores)


def compute_corpus_gleu(
    sources: List[str],
    hypotheses: List[str],
    references_list: List[List[str]],
) -> float:
    """Corpus-level GLEU: counts are summed over all sentences before the geometric mean.

    The best reference per sentence is chosen by its sentence-level score.
    """
    if not sources or len(sources) != len(hypotheses):
        return 0.0
    totals = [[0, 0] for _ in range(4)]
    hyp_len = ref_len = 0
    for src, hyp, refs in zip(sources, hypotheses, references_list):
        best = max(
            (_stats(src, hyp, ref) for ref in (refs or [src])),
            key=lambda st: _combine(*st),
        )
        per_n, h_len, r_len = best
        for i, (num, den) in enumerate(per_n):
            totals[i][0] += num
            totals[i][1] += den
        hyp_len += h_len
        ref_len += r_len
    return _combine([(n, d) for n, d in totals], hyp_len, ref_len)
