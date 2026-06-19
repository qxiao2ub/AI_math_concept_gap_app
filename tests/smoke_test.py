"""Small smoke test for the packaged model and inference path."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.diagnosis_engine import build_feature_row, load_bundle, predict_ranked_concepts


def test_prediction_path() -> None:
    bundle = load_bundle(ROOT / "artifacts" / "model_bundle.joblib")
    row = build_feature_row(
        grade_level=8,
        grade_band="middle",
        study_hours_per_week=4.5,
        attendance_rate=0.9,
        confidence_trait=0.55,
        carelessness=0.12,
        difficulty=2.4,
        primary_concepts=["fractions", "ratios_proportions"],
        hist_required_acc_mean=0.3,
        hist_primary_acc_mean=0.35,
        hist_total_attempts_on_required=5,
        hist_total_attempts_on_primary=3,
        answer_time_sec=85,
        pre_answer_confidence=0.45,
    )
    ranked = predict_ranked_concepts(row, bundle, topn=3)
    assert len(ranked) > 0
    assert all(isinstance(item[0], str) for item in ranked)


if __name__ == "__main__":
    test_prediction_path()
    print("Smoke test passed.")
