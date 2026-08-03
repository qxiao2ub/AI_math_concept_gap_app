"""Streamlit app for AI-based math concept-gap diagnosis."""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
import streamlit as st

from src.diagnosis_engine import (
    CONCEPTS,
    build_feature_row,
    load_bundle,
    predict_ranked_concepts,
    recommend_next_review,
    required_from_primary,
)

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "artifacts" / "model_bundle.joblib"
PROBLEM_BANK_PATH = ROOT / "data" / "synthetic_problem_bank.csv"
SAMPLE_DATA_PATH = ROOT / "data" / "sample_attempts_preview.csv"

AUTHOR_NAME = "Minglang Li"
MENTOR_NAME = "Dr. Qingyang Xiao"


@st.cache_resource(show_spinner=False)
def cached_model_bundle() -> dict[str, Any]:
    return load_bundle(MODEL_PATH)


@st.cache_data(show_spinner=False)
def load_preview_data() -> pd.DataFrame:
    if SAMPLE_DATA_PATH.exists():
        return pd.read_csv(SAMPLE_DATA_PATH)
    return pd.DataFrame()


@st.cache_data(show_spinner=False)
def load_problem_bank() -> pd.DataFrame:
    if PROBLEM_BANK_PATH.exists():
        return pd.read_csv(PROBLEM_BANK_PATH)
    return pd.DataFrame()


def pretty_concept(concept: str) -> str:
    return concept.replace("_", " ").title()


def safe_parse_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    if not isinstance(value, str):
        return []
    try:
        parsed = ast.literal_eval(value)
        if isinstance(parsed, (list, tuple)):
            return [str(item) for item in parsed]
    except (SyntaxError, ValueError):
        pass
    return []


def concept_count_frame(values: Iterable[Any]) -> pd.DataFrame:
    counts: dict[str, int] = {}
    for raw in values:
        for concept in safe_parse_list(raw):
            counts[concept] = counts.get(concept, 0) + 1
    if not counts:
        return pd.DataFrame(columns=["concept", "count"])
    out = pd.DataFrame(sorted(counts.items(), key=lambda item: item[1], reverse=True), columns=["concept", "count"])
    out["concept_label"] = out["concept"].map(pretty_concept)
    return out


def render_sidebar(bundle: dict[str, Any]) -> None:
    st.sidebar.title("AI Math Learning Assistant")
    st.sidebar.markdown("### Project credits")
    st.sidebar.markdown(f"**Author:** {AUTHOR_NAME}")
    st.sidebar.markdown(f"**Mentor:** {MENTOR_NAME}")
    st.sidebar.divider()
    st.sidebar.markdown("### Model status")
    st.sidebar.metric("Validation top-1 accuracy", f"{bundle.get('accuracy', 0):.1%}")
    st.sidebar.metric("Synthetic training rows", f"{bundle.get('training_rows', 0):,}")
    st.sidebar.metric("Incorrect-answer rate", f"{bundle.get('incorrect_rate', 0):.1%}")
    st.sidebar.caption("Prototype model trained on synthetic data generated from the uploaded notebook logic.")


def render_diagnosis_tab(bundle: dict[str, Any]) -> None:
    st.subheader("Diagnose a student answer")
    st.write(
        "Enter a problem profile and student history. The app predicts the most likely missing math concepts "
        "and recommends the next concept to review."
    )

    with st.form("diagnosis_form"):
        left, right = st.columns(2)
        with left:
            grade_level = st.slider("Student grade level", min_value=5, max_value=11, value=8)
            grade_band = st.selectbox("Problem grade band", ["elementary", "middle", "high"], index=1)
            difficulty = st.slider("Problem difficulty", min_value=0.5, max_value=4.5, value=2.4, step=0.1)
            primary_concepts = st.multiselect(
                "Primary concepts tested by the problem",
                options=CONCEPTS,
                default=["fractions", "ratios_proportions"],
                format_func=pretty_concept,
            )
            study_hours = st.slider("Study hours per week", min_value=0.5, max_value=12.0, value=4.5, step=0.5)
            attendance_rate = st.slider("Attendance rate", min_value=0.50, max_value=1.00, value=0.90, step=0.01)

        with right:
            confidence_trait = st.slider("Student confidence trait", min_value=0.05, max_value=0.99, value=0.55, step=0.01)
            carelessness = st.slider("Carelessness proxy", min_value=0.00, max_value=0.40, value=0.12, step=0.01)
            hist_required_acc = st.slider("Prior accuracy on required concepts", min_value=-1.0, max_value=1.0, value=0.30, step=0.05)
            hist_primary_acc = st.slider("Prior accuracy on primary concepts", min_value=-1.0, max_value=1.0, value=0.35, step=0.05)
            hist_required_attempts = st.number_input("Prior required-concept attempts", min_value=0, max_value=200, value=5, step=1)
            hist_primary_attempts = st.number_input("Prior primary-concept attempts", min_value=0, max_value=200, value=3, step=1)
            answer_time = st.slider("Answer time, seconds", min_value=10.0, max_value=240.0, value=85.0, step=1.0)
            pre_answer_conf = st.slider("Pre-answer confidence", min_value=0.01, max_value=0.99, value=0.45, step=0.01)

        submitted = st.form_submit_button("Diagnose concept gaps")

    if not primary_concepts:
        st.info("Select at least one primary concept to run a diagnosis.")
        return

    required_concepts = required_from_primary(primary_concepts)
    st.caption("Required concept chain: " + ", ".join(pretty_concept(c) for c in required_concepts))

    if submitted:
        row = build_feature_row(
            grade_level=grade_level,
            grade_band=grade_band,
            study_hours_per_week=study_hours,
            attendance_rate=attendance_rate,
            confidence_trait=confidence_trait,
            carelessness=carelessness,
            difficulty=difficulty,
            primary_concepts=primary_concepts,
            hist_required_acc_mean=hist_required_acc,
            hist_primary_acc_mean=hist_primary_acc,
            hist_total_attempts_on_required=hist_required_attempts,
            hist_total_attempts_on_primary=hist_primary_attempts,
            answer_time_sec=answer_time,
            pre_answer_confidence=pre_answer_conf,
        )
        ranked = predict_ranked_concepts(row, bundle, topn=7)
        recommendation = recommend_next_review(ranked, bundle.get("bandit_q"))

        result_df = pd.DataFrame(ranked, columns=["concept", "model_probability"])
        result_df["concept"] = result_df["concept"].map(pretty_concept)
        result_df["model_probability"] = result_df["model_probability"].round(3)

        col1, col2 = st.columns([0.55, 0.45])
        with col1:
            st.markdown("### Ranked concept-gap prediction")
            st.dataframe(result_df, use_container_width=True, hide_index=True)
        with col2:
            st.markdown("### Next review recommendation")
            if recommendation:
                st.success(pretty_concept(recommendation))
            else:
                st.warning("No review concept was available for this input.")
            st.bar_chart(result_df.set_index("concept"))


def render_data_tab() -> None:
    st.subheader("Synthetic data preview")
    sample_df = load_preview_data()
    problem_bank = load_problem_bank()

    if sample_df.empty:
        st.warning("No sample data found. Run `python scripts/build_artifacts.py` first.")
        return

    col1, col2, col3 = st.columns(3)
    col1.metric("Preview attempts", f"{len(sample_df):,}")
    col2.metric("Problems", f"{len(problem_bank):,}" if not problem_bank.empty else "N/A")
    col3.metric("Incorrect attempts", f"{int((sample_df['is_correct'] == 0).sum()):,}")

    st.dataframe(sample_df.head(50), use_container_width=True)

    missing_counts = concept_count_frame(sample_df.loc[sample_df["is_correct"] == 0, "true_missing_concepts"])
    if not missing_counts.empty:
        st.markdown("### Most frequent synthetic missing concepts")
        st.bar_chart(missing_counts.head(12).set_index("concept_label")["count"])


def render_method_tab(bundle: dict[str, Any]) -> None:
    st.subheader("How this prototype works")
    st.markdown(
        """
        1. Generate a synthetic problem bank with primary math concepts and prerequisite chains.
        2. Generate synthetic student profiles with latent mastery values for each concept.
        3. Simulate answer attempts, including correctness, answer time, confidence, and ranked missing concepts.
        4. Train a Random Forest model to predict the top missing concept for incorrect answers.
        5. Use a lightweight adaptive-review policy to choose the next concept to review from the predicted gaps.

        This is a prototype. The model should be retrained on real, consented, non-sensitive student interaction data
        before being used for real educational decisions.
        """
    )
    st.json(
        {
            "concept_count": len(CONCEPTS),
            "model_type": "RandomForestClassifier",
            "validation_top1_accuracy": round(float(bundle.get("accuracy", 0.0)), 4),
            "synthetic_training_rows": bundle.get("training_rows", 0),
        }
    )


def render_credits_tab() -> None:
    st.subheader("Project credits")
    left, right = st.columns(2)
    with left:
        st.markdown("#### Author")
        st.info(AUTHOR_NAME)
    with right:
        st.markdown("#### Mentor")
        st.info(MENTOR_NAME)

    st.markdown("### About this app")
    st.write(
        "This Streamlit prototype converts the original student notebook into a GitHub-ready web app for "
        "demonstrating AI-assisted math concept-gap diagnosis and adaptive review recommendations."
    )
    st.warning(
        "Use synthetic or approved non-sensitive data only. Do not upload CUI, FOUO, ITAR, EAR, PII, PHI, "
        "or identifiable student records."
    )


def main() -> None:
    st.set_page_config(
        page_title=f"Math Concept Gap Diagnosis | {AUTHOR_NAME}",
        page_icon="🧠",
        layout="wide",
    )
    st.title("AI-Based Math Concept Gap Diagnosis App")
    st.markdown(f"**Author:** {AUTHOR_NAME}  \n**Mentor:** {MENTOR_NAME}")
    st.caption("Streamlit prototype converted from the uploaded Colab notebook.")

    if not MODEL_PATH.exists():
        st.error("Model artifact not found. Run `python scripts/build_artifacts.py` from the repo root.")
        st.stop()

    bundle = cached_model_bundle()
    render_sidebar(bundle)

    diagnosis_tab, data_tab, method_tab, credits_tab = st.tabs(
        ["Diagnose", "Explore synthetic data", "Methodology", "Author & Mentor"]
    )
    with diagnosis_tab:
        render_diagnosis_tab(bundle)
    with data_tab:
        render_data_tab()
    with method_tab:
        render_method_tab(bundle)
    with credits_tab:
        render_credits_tab()


if __name__ == "__main__":
    main()
