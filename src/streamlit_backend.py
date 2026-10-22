"""Backend adapter used by the Streamlit custom UI component.

The original attached UI expected a separate FastAPI process. Streamlit
Community Cloud normally runs one Python entry point, so this module calls the
saved scikit-learn model directly and returns the same JSON-shaped data that
the UI needs.
"""

from __future__ import annotations

from functools import lru_cache
import math
from pathlib import Path
from typing import Any
import warnings

from sklearn.exceptions import InconsistentVersionWarning

from src.concept_content import CONCEPT_CONTENT
from src.diagnosis_engine import (
    CONCEPTS,
    FEATURE_COLS_CATEGORICAL,
    FEATURE_COLS_CONCEPTS,
    FEATURE_COLS_NUMERIC,
    PREREQS,
    build_feature_row,
    load_bundle,
    predict_ranked_concepts,
    recommend_next_review,
)

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "artifacts" / "model_bundle.joblib"

AUTHOR_NAME = "Minglang Li"
MENTOR_NAME = "Dr. Qingyang Xiao"
APP_VERSION = "1.0.0-streamlit-ui"

MODEL_NOTE = (
    "Research prototype trained only on synthetic incorrect answers. Model scores "
    "are uncalibrated probabilities for alternative top-gap labels, not measured "
    "mastery or independently confirmed gaps. The review policy may select a "
    "different concept from the highest-ranked prediction. Not an educational "
    "placement decision."
)

DEFAULT_INPUTS: dict[str, Any] = {
    "grade_level": 8,
    "grade_band": "middle",
    "study_hours_per_week": 4.5,
    "attendance_rate": 0.9,
    "confidence_trait": 0.55,
    "carelessness": 0.12,
    "difficulty": 2.4,
    "primary_concepts": ["percentages"],
    "hist_required_acc_mean": 0.3,
    "hist_primary_acc_mean": 0.35,
    "hist_total_attempts_on_required": 5,
    "hist_total_attempts_on_primary": 3,
    "answer_time_sec": 85.0,
    "pre_answer_confidence": 0.45,
}

_FLOAT_FIELDS: dict[str, tuple[float, float]] = {
    "study_hours_per_week": (0.5, 12.0),
    "attendance_rate": (0.5, 1.0),
    "confidence_trait": (0.05, 0.99),
    "carelessness": (0.0, 0.4),
    "difficulty": (0.5, 4.5),
    "hist_required_acc_mean": (-1.0, 1.0),
    "hist_primary_acc_mean": (-1.0, 1.0),
    "answer_time_sec": (10.0, 240.0),
    "pre_answer_confidence": (0.01, 0.99),
}

_INT_FIELDS: dict[str, tuple[int, int]] = {
    "grade_level": (5, 11),
    "hist_total_attempts_on_required": (0, 200),
    "hist_total_attempts_on_primary": (0, 200),
}

_ALLOWED_FIELDS = set(DEFAULT_INPUTS)
_ALLOWED_GRADE_BANDS = {"elementary", "middle", "high"}


class InputValidationError(ValueError):
    """Raised when component input does not match the research form contract."""


def pretty_concept(concept: str) -> str:
    return concept.replace("_", " ").title()


def _validate_bundle(bundle: Any) -> None:
    """Reject incompatible artifacts instead of returning plausible-looking output."""

    if not isinstance(bundle, dict):
        raise ValueError("Invalid model bundle.")

    expected_pairs = (
        ("feature_cols_numeric", FEATURE_COLS_NUMERIC),
        ("feature_cols_categorical", FEATURE_COLS_CATEGORICAL),
        ("feature_cols_concepts", FEATURE_COLS_CONCEPTS),
        ("concepts", CONCEPTS),
    )
    for key, expected in expected_pairs:
        if bundle.get(key) != expected:
            raise ValueError(f"Incompatible model schema: {key}.")

    model = bundle.get("model")
    columns = bundle.get("feature_columns")
    if model is None or not callable(getattr(model, "predict_proba", None)):
        raise ValueError("Model does not support probability prediction.")
    if not isinstance(columns, list) or len(columns) != len(set(columns)):
        raise ValueError("Invalid encoded feature columns.")

    expected_columns = set(FEATURE_COLS_NUMERIC + FEATURE_COLS_CONCEPTS) | {
        "grade_band_elementary",
        "grade_band_middle",
        "grade_band_high",
    }
    if set(columns) != expected_columns:
        raise ValueError("Incompatible encoded feature set.")
    if int(model.n_features_in_) != len(columns):
        raise ValueError("Model feature count does not match its schema.")
    if set(model.classes_) != set(CONCEPTS):
        raise ValueError("Model labels do not match supported concepts.")

    for key in ("accuracy", "incorrect_rate"):
        value = bundle.get(key)
        if not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid model metadata: {key}.")
    if not isinstance(bundle.get("training_rows"), int) or bundle["training_rows"] < 1:
        raise ValueError("Invalid training-row metadata.")

    bandit_q = bundle.get("bandit_q")
    if bandit_q is not None:
        if not isinstance(bandit_q, dict) or set(bandit_q) != set(CONCEPTS):
            raise ValueError("Incompatible review policy.")
        if not all(
            isinstance(value, (int, float)) and math.isfinite(value)
            for value in bandit_q.values()
        ):
            raise ValueError("Invalid review-policy values.")


@lru_cache(maxsize=1)
def get_bundle() -> dict[str, Any]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model artifact not found: {MODEL_PATH}")
    with warnings.catch_warnings():
        warnings.simplefilter("error", InconsistentVersionWarning)
        bundle = load_bundle(MODEL_PATH)
    _validate_bundle(bundle)
    return bundle


def validate_inputs(raw: Any) -> dict[str, Any]:
    """Validate and normalize input received from the browser component."""

    if not isinstance(raw, dict):
        raise InputValidationError("Diagnosis inputs must be an object.")

    unknown = set(raw) - _ALLOWED_FIELDS
    if unknown:
        raise InputValidationError(
            "Unsupported input field(s): " + ", ".join(sorted(unknown))
        )

    merged = {**DEFAULT_INPUTS, **raw}
    normalized: dict[str, Any] = {}

    grade_band = merged.get("grade_band")
    if grade_band not in _ALLOWED_GRADE_BANDS:
        raise InputValidationError("Problem grade band must be elementary, middle, or high.")
    normalized["grade_band"] = str(grade_band)

    concepts = merged.get("primary_concepts")
    if not isinstance(concepts, list) or not concepts:
        raise InputValidationError("Select at least one primary concept.")
    if len(concepts) > len(CONCEPTS):
        raise InputValidationError("Too many primary concepts were selected.")
    if any(not isinstance(item, str) for item in concepts):
        raise InputValidationError("Primary concept identifiers must be text.")
    if len(set(concepts)) != len(concepts):
        raise InputValidationError("Select each primary concept only once.")
    unsupported = sorted(set(concepts) - set(CONCEPTS))
    if unsupported:
        raise InputValidationError(
            "Unsupported primary concept(s): " + ", ".join(unsupported)
        )
    normalized["primary_concepts"] = sorted(concepts)

    for key, (minimum, maximum) in _INT_FIELDS.items():
        value = merged.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise InputValidationError(f"{key} must be an integer.")
        if not math.isfinite(float(value)) or int(value) != float(value):
            raise InputValidationError(f"{key} must be a finite integer.")
        integer = int(value)
        if not minimum <= integer <= maximum:
            raise InputValidationError(
                f"{key} must be between {minimum} and {maximum}."
            )
        normalized[key] = integer

    for key, (minimum, maximum) in _FLOAT_FIELDS.items():
        value = merged.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise InputValidationError(f"{key} must be numeric.")
        number = float(value)
        if not math.isfinite(number):
            raise InputValidationError(f"{key} must be finite.")
        if not minimum <= number <= maximum:
            raise InputValidationError(
                f"{key} must be between {minimum} and {maximum}."
            )
        normalized[key] = number

    # Return fields in the same order used by the model adapter and frontend.
    return {key: normalized[key] for key in DEFAULT_INPUTS}


def concepts_payload() -> list[dict[str, Any]]:
    """Return authored concept metadata for the component."""

    return [
        {
            "id": concept,
            "label": str(CONCEPT_CONTENT[concept]["label"]),
            "description": str(CONCEPT_CONTENT[concept]["description"]),
            "prerequisites": list(PREREQS[concept]),
            "key_ideas": list(CONCEPT_CONTENT[concept]["key_ideas"]),
            "review_prompt": str(CONCEPT_CONTENT[concept]["review_prompt"]),
            "review_answer": str(CONCEPT_CONTENT[concept]["review_answer"]),
            "example_latex": CONCEPT_CONTENT[concept].get("example_latex"),
        }
        for concept in CONCEPTS
    ]


def run_diagnosis(raw_inputs: Any) -> dict[str, Any]:
    """Run the saved model and return the UI's research-response structure."""

    inputs = validate_inputs(raw_inputs)
    bundle = get_bundle()
    row = build_feature_row(**inputs)
    ranked = predict_ranked_concepts(row, bundle, topn=7)

    if len(ranked) != 7:
        raise RuntimeError("The model returned an incomplete ranking.")
    for concept, probability in ranked:
        if concept not in CONCEPTS or not math.isfinite(probability):
            raise RuntimeError("The model returned an invalid candidate.")
        if not 0.0 <= probability <= 1.0:
            raise RuntimeError("The model returned an invalid probability.")

    recommended = recommend_next_review(ranked, bundle.get("bandit_q"))
    return {
        "inputs": inputs,
        "required_concepts": list(row["required_concepts"]),
        "ranked_concepts": [
            {
                "concept": concept,
                "label": str(CONCEPT_CONTENT[concept]["label"]),
                "probability": float(probability),
            }
            for concept, probability in ranked
        ],
        "recommended_review": recommended,
        "recommended_review_label": (
            str(CONCEPT_CONTENT[recommended]["label"]) if recommended else None
        ),
        "model_note": MODEL_NOTE,
        "model_metadata": {
            "model_type": type(bundle["model"]).__name__,
            "training_rows": int(bundle["training_rows"]),
            "validation_accuracy": float(bundle["accuracy"]),
            "incorrect_rate": float(bundle["incorrect_rate"]),
        },
    }
