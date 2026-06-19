"""Core model and simulation logic for the math concept-gap diagnosis app.

This module is a cleaned, GitHub-ready version of the notebook logic. It keeps
runtime dependencies lightweight by using scikit-learn for the Streamlit app.
"""

from __future__ import annotations

import random
from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

SEED = 42

CONCEPTS: List[str] = [
    "integer_arithmetic",
    "fractions",
    "decimals",
    "ratios_proportions",
    "percentages",
    "algebraic_simplification",
    "linear_equations",
    "exponents",
    "polynomials",
    "quadratic_equations",
    "geometry_area",
    "geometry_volume",
    "probability_basics",
    "data_interpretation",
]

PREREQS: Dict[str, List[str]] = {
    "integer_arithmetic": [],
    "fractions": ["integer_arithmetic"],
    "decimals": ["integer_arithmetic"],
    "ratios_proportions": ["fractions", "decimals"],
    "percentages": ["fractions", "decimals", "ratios_proportions"],
    "algebraic_simplification": ["integer_arithmetic"],
    "linear_equations": ["algebraic_simplification"],
    "systems_of_equations": ["linear_equations"],
    "exponents": ["integer_arithmetic"],
    "polynomials": ["algebraic_simplification", "exponents"],
    "quadratic_equations": ["linear_equations", "polynomials"],
    "geometry_area": ["integer_arithmetic", "fractions"],
    "geometry_volume": ["geometry_area"],
    "probability_basics": ["fractions", "ratios_proportions"],
    "data_interpretation": ["integer_arithmetic", "percentages"],
}

FEATURE_COLS_NUMERIC: List[str] = [
    "grade_level",
    "study_hours_per_week",
    "attendance_rate",
    "confidence_trait",
    "carelessness",
    "difficulty",
    "num_primary_concepts",
    "num_required_concepts",
    "hist_required_acc_mean",
    "hist_primary_acc_mean",
    "hist_total_attempts_on_required",
    "hist_total_attempts_on_primary",
    "answer_time_sec",
    "pre_answer_confidence",
]

FEATURE_COLS_CATEGORICAL: List[str] = ["grade_band"]
FEATURE_COLS_CONCEPTS: List[str] = [f"req__{c}" for c in CONCEPTS] + [f"prim__{c}" for c in CONCEPTS]


def seed_everything(seed: int = SEED) -> None:
    """Seed random number generators for reproducible demo data."""

    np.random.seed(seed)
    random.seed(seed)


def get_full_prereqs(concept: str, prereq_map: Dict[str, List[str]] | None = None) -> List[str]:
    """Return all direct and transitive prerequisites for a concept."""

    prereq_map = prereq_map or PREREQS
    seen = set()
    stack = list(prereq_map.get(concept, []))
    while stack:
        current = stack.pop()
        if current not in seen:
            seen.add(current)
            stack.extend(prereq_map.get(current, []))
    return sorted(seen)


def required_from_primary(primary_concepts: Sequence[str]) -> Tuple[str, ...]:
    """Compute the full required concept set from selected primary concepts."""

    required = set(primary_concepts)
    for concept in primary_concepts:
        required.update(get_full_prereqs(concept))
    return tuple(sorted(required))


def build_problem_bank(num_problems: int = 600, seed: int = SEED) -> pd.DataFrame:
    """Create a synthetic problem bank with primary and required concepts."""

    seed_everything(seed)
    rows: List[Dict[str, Any]] = []
    for pid in range(num_problems):
        n_primary = int(np.random.choice([1, 2], p=[0.72, 0.28]))
        primary = random.sample(CONCEPTS, n_primary)
        all_required = required_from_primary(primary)
        difficulty = np.clip(0.8 + 0.35 * len(all_required) + np.random.normal(0, 0.25), 0.5, 4.5)
        grade_band = str(np.random.choice(["elementary", "middle", "high"], p=[0.25, 0.45, 0.30]))
        rows.append(
            {
                "problem_id": f"P{pid:04d}",
                "grade_band": grade_band,
                "difficulty": round(float(difficulty), 2),
                "primary_concepts": tuple(sorted(primary)),
                "required_concepts": all_required,
            }
        )
    return pd.DataFrame(rows)


def build_student_profiles(num_students: int = 1200, seed: int = SEED) -> List[Dict[str, Any]]:
    """Build synthetic student profiles and latent concept mastery scores."""

    seed_everything(seed)
    students: List[Dict[str, Any]] = []
    grade_levels = [5, 6, 7, 8, 9, 10, 11]
    for sid in range(num_students):
        grade = int(np.random.choice(grade_levels))
        study_hours = np.clip(np.random.normal(4.5, 2.0), 0.5, 12.0)
        attendance = np.clip(np.random.normal(0.9, 0.08), 0.5, 1.0)
        confidence = np.clip(np.random.normal(0.55, 0.18), 0.05, 0.99)
        carelessness = np.clip(np.random.beta(2, 10), 0.0, 0.4)

        base_level = np.clip(0.25 + 0.06 * (grade - 5) + np.random.normal(0, 0.08), 0.05, 0.95)
        mastery: Dict[str, float] = {}
        for concept in CONCEPTS:
            prereq_bonus = 0.03 if len(PREREQS[concept]) == 0 else 0.01 * len(PREREQS[concept])
            value = np.clip(
                base_level + prereq_bonus + 0.03 * (study_hours - 4.5) + np.random.normal(0, 0.15),
                0.01,
                0.99,
            )
            mastery[concept] = float(value)

        students.append(
            {
                "student_id": f"S{sid:04d}",
                "grade_level": grade,
                "study_hours_per_week": round(float(study_hours), 2),
                "attendance_rate": round(float(attendance), 3),
                "confidence": round(float(confidence), 3),
                "carelessness": round(float(carelessness), 3),
                "mastery": mastery,
            }
        )
    return students


def concept_gap_score(student_mastery: Dict[str, float], concept: str, difficulty: float) -> float:
    """Score how likely a concept is to be a gap for a student/problem pair."""

    mastery = student_mastery[concept]
    prereq_deficit = 0.0
    for prereq in PREREQS.get(concept, []):
        prereq_deficit += (1.0 - student_mastery[prereq]) * 0.25
    direct_gap = 1.0 - mastery
    return float(0.75 * direct_gap + prereq_deficit + 0.05 * difficulty)


def simulate_attempt(student: Dict[str, Any], problem: pd.Series | Dict[str, Any]) -> Dict[str, Any]:
    """Simulate one student answer attempt and infer true synthetic gaps."""

    required = list(problem["required_concepts"])
    primary = list(problem["primary_concepts"])
    student_mastery = student["mastery"]

    req_mastery = np.mean([student_mastery[c] for c in required])
    primary_mastery = np.mean([student_mastery[c] for c in primary])
    difficulty = float(problem["difficulty"])

    grade_factor = 0.02 * (student["grade_level"] - 8)
    effort_factor = 0.04 * (student["study_hours_per_week"] - 4.5)
    attendance_factor = 0.8 * (student["attendance_rate"] - 0.85)
    confidence_factor = 0.08 * (student["confidence"] - 0.5)
    carelessness_penalty = 0.9 * student["carelessness"]

    logit = (
        3.2 * primary_mastery
        + 1.7 * req_mastery
        + grade_factor
        + effort_factor
        + attendance_factor
        + confidence_factor
        - 0.65 * difficulty
        - carelessness_penalty
        - 1.75
    )

    prob_correct = 1 / (1 + np.exp(-logit))
    correct = int(np.random.binomial(1, prob_correct))

    answer_time = np.clip(np.random.normal(45 + 18 * difficulty + 25 * (1 - req_mastery), 12), 10, 240)
    pre_answer_conf = np.clip(np.random.normal(student["confidence"] + 0.25 * (primary_mastery - 0.5), 0.12), 0.01, 0.99)

    gap_scores = {concept: concept_gap_score(student_mastery, concept, difficulty) for concept in required}
    ranked_gaps = [concept for concept, _ in sorted(gap_scores.items(), key=lambda x: x[1], reverse=True)]

    if correct == 1:
        top_missing: List[str] = []
    else:
        n_missing = min(len(ranked_gaps), int(np.random.choice([1, 2, 3], p=[0.35, 0.4, 0.25])))
        top_missing = ranked_gaps[:n_missing]

    return {
        "prob_correct_latent": float(prob_correct),
        "is_correct": correct,
        "answer_time_sec": round(float(answer_time), 2),
        "pre_answer_confidence": round(float(pre_answer_conf), 3),
        "true_missing_concepts": top_missing,
    }


def simulate_dataset(students: Sequence[Dict[str, Any]], problem_bank: pd.DataFrame, attempts_per_student: int = 45) -> pd.DataFrame:
    """Create a supervised training table from synthetic students and problems."""

    rows: List[Dict[str, Any]] = []
    for student in students:
        concept_attempts: Counter[str] = Counter()
        concept_corrects: Counter[str] = Counter()
        sampled_problem_ids = np.random.choice(problem_bank.index, size=attempts_per_student, replace=True)
        for step_idx, problem_index in enumerate(sampled_problem_ids):
            problem = problem_bank.loc[problem_index]
            result = simulate_attempt(student, problem)
            required = list(problem["required_concepts"])
            primary = list(problem["primary_concepts"])

            hist_acc_required = [
                concept_corrects[c] / concept_attempts[c] if concept_attempts[c] > 0 else np.nan for c in required
            ]
            hist_acc_primary = [
                concept_corrects[c] / concept_attempts[c] if concept_attempts[c] > 0 else np.nan for c in primary
            ]

            rows.append(
                {
                    "student_id": student["student_id"],
                    "problem_id": problem["problem_id"],
                    "step_idx": step_idx,
                    "grade_level": student["grade_level"],
                    "study_hours_per_week": student["study_hours_per_week"],
                    "attendance_rate": student["attendance_rate"],
                    "confidence_trait": student["confidence"],
                    "carelessness": student["carelessness"],
                    "grade_band": problem["grade_band"],
                    "difficulty": problem["difficulty"],
                    "num_primary_concepts": len(primary),
                    "num_required_concepts": len(required),
                    "primary_concepts": tuple(primary),
                    "required_concepts": tuple(required),
                    "hist_required_acc_mean": float(np.nanmean(hist_acc_required))
                    if hist_acc_required and not np.all(np.isnan(hist_acc_required))
                    else -1.0,
                    "hist_primary_acc_mean": float(np.nanmean(hist_acc_primary))
                    if hist_acc_primary and not np.all(np.isnan(hist_acc_primary))
                    else -1.0,
                    "hist_total_attempts_on_required": int(sum(concept_attempts[c] for c in required)),
                    "hist_total_attempts_on_primary": int(sum(concept_attempts[c] for c in primary)),
                    "prob_correct_latent": result["prob_correct_latent"],
                    "answer_time_sec": result["answer_time_sec"],
                    "pre_answer_confidence": result["pre_answer_confidence"],
                    "is_correct": result["is_correct"],
                    "true_missing_concepts": result["true_missing_concepts"],
                }
            )

            for concept in required:
                concept_attempts[concept] += 1
                concept_corrects[concept] += result["is_correct"]

    return pd.DataFrame(rows)


def get_rank(values: Sequence[str], idx: int) -> str:
    """Return ranked label or NONE when the rank is unavailable."""

    return values[idx] if len(values) > idx else "NONE"


def add_concept_indicator_columns(input_df: pd.DataFrame) -> pd.DataFrame:
    """Add binary required/primary concept indicator features."""

    out = input_df.copy()
    for concept in CONCEPTS:
        out[f"req__{concept}"] = out["required_concepts"].apply(lambda values: int(concept in values))
        out[f"prim__{concept}"] = out["primary_concepts"].apply(lambda values: int(concept in values))
    return out


def prepare_training_table(df: pd.DataFrame) -> pd.DataFrame:
    """Filter incorrect attempts and add target columns."""

    train_df = df[df["is_correct"] == 0].copy().reset_index(drop=True)
    train_df["top1_missing"] = train_df["true_missing_concepts"].apply(lambda values: get_rank(values, 0))
    train_df["top2_missing"] = train_df["true_missing_concepts"].apply(lambda values: get_rank(values, 1))
    train_df["top3_missing"] = train_df["true_missing_concepts"].apply(lambda values: get_rank(values, 2))
    return train_df


def train_gap_model(df: pd.DataFrame, seed: int = SEED) -> Dict[str, Any]:
    """Train the top-1 missing concept Random Forest used by the app."""

    train_df = prepare_training_table(df)
    model_df = add_concept_indicator_columns(train_df)
    features = FEATURE_COLS_NUMERIC + FEATURE_COLS_CATEGORICAL + FEATURE_COLS_CONCEPTS
    x = model_df[features]
    y = model_df["top1_missing"]

    stratify = y if y.value_counts().min() >= 2 else None
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=seed,
        stratify=stratify,
    )
    x_train_enc = pd.get_dummies(x_train, columns=["grade_band"], drop_first=False)
    x_test_enc = pd.get_dummies(x_test, columns=["grade_band"], drop_first=False)
    x_train_enc, x_test_enc = x_train_enc.align(x_test_enc, join="left", axis=1, fill_value=0)

    model = RandomForestClassifier(
        n_estimators=80,
        max_depth=12,
        min_samples_leaf=2,
        random_state=seed,
        n_jobs=-1,
    )
    model.fit(x_train_enc, y_train)
    predictions = model.predict(x_test_enc)
    accuracy = float(accuracy_score(y_test, predictions))

    return {
        "model": model,
        "feature_columns": list(x_train_enc.columns),
        "concepts": CONCEPTS,
        "prereqs": PREREQS,
        "feature_cols_numeric": FEATURE_COLS_NUMERIC,
        "feature_cols_categorical": FEATURE_COLS_CATEGORICAL,
        "feature_cols_concepts": FEATURE_COLS_CONCEPTS,
        "accuracy": accuracy,
        "training_rows": int(len(train_df)),
        "all_rows": int(len(df)),
        "incorrect_rate": float(1 - df["is_correct"].mean()),
        "label_counts": y.value_counts().to_dict(),
    }


def build_feature_row(
    *,
    grade_level: int,
    grade_band: str,
    study_hours_per_week: float,
    attendance_rate: float,
    confidence_trait: float,
    carelessness: float,
    difficulty: float,
    primary_concepts: Sequence[str],
    hist_required_acc_mean: float,
    hist_primary_acc_mean: float,
    hist_total_attempts_on_required: int,
    hist_total_attempts_on_primary: int,
    answer_time_sec: float,
    pre_answer_confidence: float,
) -> Dict[str, Any]:
    """Build a single inference feature row from app form inputs."""

    primary_tuple = tuple(sorted(primary_concepts))
    required_tuple = required_from_primary(primary_tuple)
    row: Dict[str, Any] = {
        "grade_level": int(grade_level),
        "study_hours_per_week": float(study_hours_per_week),
        "attendance_rate": float(attendance_rate),
        "confidence_trait": float(confidence_trait),
        "carelessness": float(carelessness),
        "difficulty": float(difficulty),
        "num_primary_concepts": len(primary_tuple),
        "num_required_concepts": len(required_tuple),
        "hist_required_acc_mean": float(hist_required_acc_mean),
        "hist_primary_acc_mean": float(hist_primary_acc_mean),
        "hist_total_attempts_on_required": int(hist_total_attempts_on_required),
        "hist_total_attempts_on_primary": int(hist_total_attempts_on_primary),
        "answer_time_sec": float(answer_time_sec),
        "pre_answer_confidence": float(pre_answer_confidence),
        "grade_band": grade_band,
        "primary_concepts": primary_tuple,
        "required_concepts": required_tuple,
    }
    for concept in CONCEPTS:
        row[f"req__{concept}"] = int(concept in required_tuple)
        row[f"prim__{concept}"] = int(concept in primary_tuple)
    return row


def predict_ranked_concepts(row_like: Dict[str, Any], bundle: Dict[str, Any], topn: int = 5) -> List[Tuple[str, float]]:
    """Predict ranked concept gaps for one app input row."""

    features = bundle["feature_cols_numeric"] + bundle["feature_cols_categorical"] + bundle["feature_cols_concepts"]
    row_df = pd.DataFrame([row_like])
    row_df = row_df[features]
    row_df = pd.get_dummies(row_df, columns=["grade_band"], drop_first=False)
    row_df = row_df.reindex(columns=bundle["feature_columns"], fill_value=0)

    model = bundle["model"]
    probs = model.predict_proba(row_df)[0]
    ranked = sorted(zip(model.classes_, probs), key=lambda item: item[1], reverse=True)
    return [(concept, float(prob)) for concept, prob in ranked if concept != "NONE"][:topn]


def simulate_review(student_mastery: Dict[str, float], concept: str, intensity: float = 0.12) -> Dict[str, float]:
    """Simulate a small mastery boost after reviewing a concept."""

    improved = dict(student_mastery)
    improved[concept] = float(np.clip(improved[concept] + intensity, 0.01, 0.99))
    for prereq in PREREQS.get(concept, []):
        improved[prereq] = float(np.clip(improved[prereq] + 0.4 * intensity, 0.01, 0.99))
    return improved


def estimate_future_reward(student: Dict[str, Any], concept: str, problem_bank: pd.DataFrame, n_eval: int = 12) -> float:
    """Estimate post-review correctness improvement for one concept."""

    base_mastery = student["mastery"]
    improved_mastery = simulate_review(base_mastery, concept)

    def eval_rate(mastery_dict: Dict[str, float]) -> float:
        temp_student = dict(student)
        temp_student["mastery"] = mastery_dict
        probs = []
        for _ in range(n_eval):
            problem = problem_bank.sample(1, random_state=np.random.randint(0, 10**6)).iloc[0]
            attempt = simulate_attempt(temp_student, problem)
            probs.append(attempt["prob_correct_latent"])
        return float(np.mean(probs))

    return float(eval_rate(improved_mastery) - eval_rate(base_mastery))


def epsilon_greedy_recommend(q_values: Dict[str, float], epsilon: float = 0.15) -> str:
    """Choose a review concept using an epsilon-greedy policy."""

    if np.random.rand() < epsilon:
        return random.choice(CONCEPTS)
    return max(q_values, key=q_values.get)


def train_bandit_policy(
    students_subset: Sequence[Dict[str, Any]],
    problem_bank: pd.DataFrame,
    episodes: int = 220,
    seed: int = SEED,
) -> Tuple[Dict[str, float], Dict[str, int], List[float]]:
    """Train a lightweight adaptive-review policy for demo recommendations."""

    seed_everything(seed)
    q_values = {concept: 0.0 for concept in CONCEPTS}
    counts = {concept: 0 for concept in CONCEPTS}
    reward_history: List[float] = []

    for _ in range(episodes):
        student = random.choice(list(students_subset))
        action = epsilon_greedy_recommend(q_values, epsilon=0.20)
        reward = estimate_future_reward(student, action, problem_bank, n_eval=10)
        counts[action] += 1
        q_values[action] += (reward - q_values[action]) / counts[action]
        reward_history.append(reward)

    return q_values, counts, reward_history


def recommend_next_review(ranked_concepts: Iterable[Tuple[str, float]], bandit_q: Dict[str, float] | None = None) -> str | None:
    """Pick a review concept using diagnosis rank and optional bandit scores."""

    candidates = [concept for concept, _ in ranked_concepts]
    if not candidates:
        return None
    if not bandit_q:
        return candidates[0]
    return max(candidates, key=lambda concept: bandit_q.get(concept, 0.0))


def save_bundle(bundle: Dict[str, Any], path: str | Path) -> None:
    """Save a trained model bundle."""

    Path(path).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)


def load_bundle(path: str | Path) -> Dict[str, Any]:
    """Load a trained model bundle."""

    return joblib.load(path)
