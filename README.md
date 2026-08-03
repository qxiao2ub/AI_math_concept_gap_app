# AI-Based Math Concept Gap Diagnosis App

This repository is a GitHub-ready Streamlit app converted from the uploaded notebook:
`060226_Minglang_AI_App_tool_for_students.ipynb`.

The app demonstrates a prototype pipeline for diagnosing likely missing math concepts after a student answers a problem incorrectly. It uses synthetic data generated from the notebook logic, trains a lightweight `RandomForestClassifier`, and recommends the next concept for review.

## Project credits

- **Author:** Minglang Li
- **Mentor:** Dr. Qingyang Xiao

The same credits are displayed in the Streamlit app header, left sidebar panel, browser page title, and the **Author & Mentor** tab.

## What the app does

- Builds a synthetic math problem bank with primary and prerequisite concepts.
- Simulates student profiles and answer attempts.
- Trains a model to predict the top missing concept for an incorrect answer.
- Provides a Streamlit interface where a user can enter student/problem features.
- Shows ranked concept-gap predictions and a next-review recommendation.

## Repository structure

```text
Minglang_AI_Math_Concept_Gap_Streamlit_App/
├── app.py
├── README.md
├── requirements.txt
├── LICENSE
├── AUTHORS.md
├── .gitignore
├── .streamlit/
│   └── config.toml
├── artifacts/
│   └── model_bundle.joblib
├── data/
│   ├── sample_attempts_preview.csv
│   ├── synthetic_math_concept_gap_dataset.csv
│   └── synthetic_problem_bank.csv
├── notebooks/
│   ├── 060226_Minglang_AI_App_tool_for_students.ipynb
│   └── 060226_Minglang_AI_App_tool_for_students_extracted.py
├── scripts/
│   └── build_artifacts.py
├── src/
│   ├── __init__.py
│   └── diagnosis_engine.py
└── tests/
    └── smoke_test.py
```

## Quick start

### 1. Create a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Streamlit app

```bash
streamlit run app.py
```

### 4. Rebuild data and model artifacts

The ZIP already includes generated demo artifacts. To rebuild them:

```bash
python scripts/build_artifacts.py
```

### 5. Run a smoke test

```bash
python tests/smoke_test.py
```

## Upload to GitHub

From inside the project folder:

```bash
git init
git add .
git commit -m "Initial Streamlit math concept gap app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repository name.

## Deploy to Streamlit Community Cloud

1. Push this repository to GitHub.
2. Open Streamlit Community Cloud.
3. Choose **New app**.
4. Select this GitHub repository and branch.
5. Set the main file path to `app.py`.
6. Deploy.

## Model details

The default bundled model is a Random Forest trained on synthetic incorrect-answer attempts. Inputs include:

- student grade level
- problem grade band and difficulty
- study hours, attendance, confidence, and carelessness proxies
- prior accuracy and attempt-count history
- answer time and pre-answer confidence
- primary and required concept indicators

The output is a ranked list of likely missing concepts. The review recommendation chooses from the ranked concept gaps using a lightweight adaptive-review policy inspired by the notebook's epsilon-greedy demonstration.

## Suggested next steps

- Replace the synthetic problem bank with a real concept-tagged problem inventory.
- Add a secure data ingestion workflow for consented, non-sensitive learning records.
- Retrain and validate models with real data.
- Add authentication only after privacy and data-handling requirements are defined.
- Add unit tests for each simulation and inference function.
- Add app screenshots to the README after local testing.
