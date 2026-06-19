"""Build synthetic data and model artifacts for the Streamlit app.

Run from the repository root:
    python scripts/build_artifacts.py
"""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.diagnosis_engine import (
    SEED,
    build_problem_bank,
    build_student_profiles,
    save_bundle,
    simulate_dataset,
    train_bandit_policy,
    train_gap_model,
)

DATA_DIR = ROOT / "data"
ARTIFACTS_DIR = ROOT / "artifacts"


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    ARTIFACTS_DIR.mkdir(exist_ok=True)

    problem_bank = build_problem_bank(num_problems=500, seed=SEED)
    students = build_student_profiles(num_students=600, seed=SEED)
    dataset = simulate_dataset(students, problem_bank, attempts_per_student=30)

    bundle = train_gap_model(dataset, seed=SEED)
    bandit_q, bandit_counts, reward_history = train_bandit_policy(students[:150], problem_bank, episodes=220, seed=SEED)
    bundle["bandit_q"] = bandit_q
    bundle["bandit_counts"] = bandit_counts
    bundle["bandit_reward_history"] = reward_history

    problem_bank.to_csv(DATA_DIR / "synthetic_problem_bank.csv", index=False)
    dataset.to_csv(DATA_DIR / "synthetic_math_concept_gap_dataset.csv", index=False)

    preview_columns = [
        "student_id",
        "problem_id",
        "grade_level",
        "grade_band",
        "difficulty",
        "primary_concepts",
        "required_concepts",
        "hist_required_acc_mean",
        "hist_primary_acc_mean",
        "answer_time_sec",
        "pre_answer_confidence",
        "is_correct",
        "true_missing_concepts",
    ]
    dataset[preview_columns].head(1000).to_csv(DATA_DIR / "sample_attempts_preview.csv", index=False)

    save_bundle(bundle, ARTIFACTS_DIR / "model_bundle.joblib")

    print("Built artifacts:")
    print(f"  data rows: {len(dataset):,}")
    print(f"  incorrect rate: {bundle['incorrect_rate']:.3f}")
    print(f"  validation top-1 accuracy: {bundle['accuracy']:.3f}")
    print(f"  model: {ARTIFACTS_DIR / 'model_bundle.joblib'}")


if __name__ == "__main__":
    main()
