#!/usr/bin/env python3
"""
Unit tests for GEC evaluation metrics (GLEU, Semantic Similarity, and ERRANT F0.5).
"""

import unittest
from evals.metrics.gleu import compute_gleu
from evals.metrics.semantic_similarity import compute_semantic_similarity
from evals.metrics.errant_scorer import score_with_errant, calculate_f_score

class TestMetrics(unittest.TestCase):

    def test_gleu_identical_match(self):
        source = "This is a clean sentence."
        hypothesis = "This is a clean sentence."
        reference = "This is a clean sentence."
        score = compute_gleu(source, hypothesis, [reference])
        self.assertAlmostEqual(score, 1.0, places=2)

    def test_gleu_valid_correction(self):
        source = "He go to school yesterday."
        bad_hyp = "He go to school yesterday."
        good_hyp = "He went to school yesterday."
        reference = "He went to school yesterday."

        bad_score = compute_gleu(source, bad_hyp, [reference])
        good_score = compute_gleu(source, good_hyp, [reference])

        self.assertGreater(good_score, bad_score)
        self.assertAlmostEqual(good_score, 1.0, places=2)

    def test_gleu_multi_reference_max(self):
        source = "He likes eat apple."
        # Annotator 1 says "He likes eating apples.", Annotator 2 says "He likes to eat apples."
        refs = ["He likes eating apples.", "He likes to eat apples."]
        hyp = "He likes to eat apples."

        # Should match Annotator 2 with 1.0
        score = compute_gleu(source, hyp, refs, max_over_references=True)
        self.assertAlmostEqual(score, 1.0, places=2)

    def test_semantic_similarity_preservation(self):
        source = "She do not understand the problem."
        fixed = "She does not understand the problem."
        hallucination = "The weather in New York is sunny today."

        sim_fixed = compute_semantic_similarity(fixed, [source])
        sim_hallucination = compute_semantic_similarity(hallucination, [source])

        self.assertGreater(sim_fixed, 0.90)
        self.assertLess(sim_hallucination, 0.50)

    def test_calculate_f_score_math(self):
        # 2 TP, 1 FP, 1 FN
        # P = 2/3 = 0.6667, R = 2/3 = 0.6667 -> F0.5 = 0.6667
        res = calculate_f_score(tp=2, fp=1, fn=1, beta=0.5)
        self.assertAlmostEqual(res["precision"], 2/3, places=3)
        self.assertAlmostEqual(res["recall"], 2/3, places=3)
        self.assertAlmostEqual(res["f_score"], 2/3, places=3)

    def test_errant_scorer_on_correction(self):
        source = "He go to school."
        hyp = "He goes to school."
        ref = "He goes to school."

        result = score_with_errant(source, hyp, [ref])
        self.assertEqual(result["f0_5"], 1.0)
        self.assertEqual(result["precision"], 1.0)

if __name__ == "__main__":
    unittest.main()
