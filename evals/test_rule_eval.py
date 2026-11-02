import unittest

from evals.run_rule_eval import aggregate, score_case

TERMS = ["wdym", "yaar"]
CASE = {"id": 1, "input": "wdym yaar, I left becuase i was tired", "expected_fixes": [{"original": "becuase", "replacement": "because"}]}


class TestRuleScoring(unittest.TestCase):
    def test_good_edit_fixes_without_touching_protected(self):
        r = score_case(CASE, [{"original": "becuase", "replacement": "because", "occurrence": 0}], TERMS)
        self.assertTrue(r["preserved"])
        self.assertFalse(r["false_flag"])
        self.assertEqual(r["fixes_applied"], 1)

    def test_edit_to_protected_word_is_a_false_flag(self):
        r = score_case(CASE, [{"original": "yaar", "replacement": "friend", "occurrence": 0}], TERMS)
        self.assertFalse(r["preserved"])
        self.assertTrue(r["false_flag"])

    def test_noop_preserves_everything_and_fixes_nothing(self):
        agg = aggregate([score_case(CASE, [], TERMS)])
        self.assertEqual(agg["protected_preservation"], 1.0)
        self.assertEqual(agg["fix_recall"], 0.0)


if __name__ == "__main__":
    unittest.main()
