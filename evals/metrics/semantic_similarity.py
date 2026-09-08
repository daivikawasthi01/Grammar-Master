"""
Semantic similarity metric for Grammatical Error Correction.
Ensures that the corrected output preserves original meaning and does not hallucinate
or drastically rewrite semantic propositions.

Uses SentenceTransformer ('all-MiniLM-L6-v2') with automatic fallback to
lexical character n-gram cosine similarity.
"""

from typing import List, Union
import numpy as np

_model_instance = None
_model_failed = False

def get_sentence_transformer():
    """Lazy loader for SentenceTransformer model."""
    global _model_instance, _model_failed
    if _model_failed:
        return None
    if _model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Fast, high-quality 384-dimensional sentence embedding model
            _model_instance = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"[Warning] Could not initialize SentenceTransformer ({e}). Using n-gram fallback.")
            _model_failed = True
            return None
    return _model_instance

def _fallback_similarity(text1: str, text2: str) -> float:
    """Character n-gram TF-IDF cosine similarity fallback."""
    from collections import Counter
    import math

    def char_ngrams(s: str, n=3):
        s = f" {s.lower()} "
        return Counter(s[i:i+n] for i in range(len(s) - n + 1))

    c1 = char_ngrams(text1)
    c2 = char_ngrams(text2)

    intersection = set(c1.keys()) & set(c2.keys())
    dot = sum(c1[k] * c2[k] for k in intersection)

    norm1 = math.sqrt(sum(v * v for v in c1.values()))
    norm2 = math.sqrt(sum(v * v for v in c2.values()))

    if norm1 == 0 or norm2 == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm1 * norm2)))

def compute_semantic_similarity(
    candidate: str,
    references: Union[str, List[str]],
    max_over_references: bool = True
) -> float:
    """
    Computes semantic similarity between candidate and reference(s).
    
    Returns a score between 0.0 and 1.0 (higher = meaning preserved).
    """
    if isinstance(references, str):
        references = [references]

    if not references:
        return 1.0

    # If identical to any reference, score is 1.0
    if any(candidate.strip() == ref.strip() for ref in references):
        return 1.0

    model = get_sentence_transformer()

    if model is not None:
        try:
            cand_emb = model.encode(candidate, convert_to_numpy=True, normalize_embeddings=True)
            ref_embs = model.encode(references, convert_to_numpy=True, normalize_embeddings=True)
            # Dot product of normalized vectors = cosine similarity
            sims = np.dot(ref_embs, cand_emb)
            scores = [float(s) for s in sims]
            return float(max(scores) if max_over_references else (sum(scores) / len(scores)))
        except Exception as e:
            pass

    # Fallback
    fallback_scores = [_fallback_similarity(candidate, ref) for ref in references]
    return max(fallback_scores) if max_over_references else (sum(fallback_scores) / len(fallback_scores))
