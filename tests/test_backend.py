"""Unit tests for the Streamlit backend adapter."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.streamlit_backend import (  # noqa: E402
    DEFAULT_INPUTS,
    InputValidationError,
    concepts_payload,
    run_diagnosis,
    validate_inputs,
)


class InputValidationTests(unittest.TestCase):
    def test_defaults_are_valid(self) -> None:
        self.assertEqual(validate_inputs(DEFAULT_INPUTS), DEFAULT_INPUTS)

    def test_partial_input_uses_defaults(self) -> None:
        normalized = validate_inputs({"primary_concepts": ["fractions"]})
        self.assertEqual(normalized["primary_concepts"], ["fractions"])
        self.assertEqual(normalized["grade_level"], DEFAULT_INPUTS["grade_level"])

    def test_unknown_field_is_rejected(self) -> None:
        with self.assertRaises(InputValidationError):
            validate_inputs({"primary_concepts": ["fractions"], "secret": 1})

    def test_unknown_concept_is_rejected(self) -> None:
        with self.assertRaises(InputValidationError):
            validate_inputs({"primary_concepts": ["not_a_concept"]})

    def test_nonfinite_value_is_rejected(self) -> None:
        with self.assertRaises(InputValidationError):
            validate_inputs({"primary_concepts": ["fractions"], "difficulty": float("nan")})


class ModelContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result = run_diagnosis(DEFAULT_INPUTS)

    def test_concept_metadata_is_complete(self) -> None:
        concepts = concepts_payload()
        self.assertEqual(len(concepts), 14)
        self.assertEqual(len({item["id"] for item in concepts}), 14)
        for item in concepts:
            self.assertTrue(item["label"])
            self.assertTrue(item["description"])
            self.assertIsInstance(item["prerequisites"], list)

    def test_model_response_shape(self) -> None:
        self.assertEqual(len(self.result["ranked_concepts"]), 7)
        self.assertIn("model_note", self.result)
        self.assertIn("model_metadata", self.result)
        self.assertEqual(
            self.result["model_metadata"]["model_type"],
            "RandomForestClassifier",
        )

    def test_probability_bounds(self) -> None:
        for item in self.result["ranked_concepts"]:
            self.assertGreaterEqual(item["probability"], 0.0)
            self.assertLessEqual(item["probability"], 1.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
