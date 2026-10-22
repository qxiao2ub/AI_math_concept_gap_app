# Detailed GitHub and Streamlit Deployment Guide

This guide assumes the repository has already been extracted from the ZIP.

## Part 1 — Verify the extracted repository

The folder you upload must contain `app.py` at its top level. Do not upload an
extra wrapper folder that leaves the repository looking like this:

```text
repository/
└── another-folder/
    └── app.py
```

The correct GitHub root looks like this:

```text
repository/
├── app.py
├── requirements.txt
├── .streamlit/
├── component/
├── src/
└── artifacts/
```

Before uploading, run:

```powershell
python tests/smoke_test.py
python -m unittest discover -s tests -p "test_*.py" -v
```

## Part 2 — Create the GitHub repository

1. Create a new, empty GitHub repository.
2. Suggested name: `Minglang-MathGap-Diagnosis-Streamlit-App`.
3. Keep the repository public only when all included content is approved for
   public release. Otherwise use a private repository and grant Streamlit the
   required repository access.
4. Do not add another README, license, or `.gitignore` during repository
   creation.

## Part 3 — Upload by browser

1. Open the new repository.
2. Choose the GitHub option to upload existing files.
3. In File Explorer, open the extracted folder.
4. Select every file and folder inside it.
5. Make sure these hidden/deployment-critical items are included:
   - `.streamlit/config.toml`
   - `component/`
   - `src/`
   - `artifacts/model_bundle.joblib`
6. Commit to `main`.
7. Open `app.py` on GitHub and confirm its path is exactly `/app.py`.

For a large browser upload, Git command-line upload is often more reliable.

## Part 4 — Upload by Git

```bash
git init
git status
git add .
git status
git commit -m "Initial MathGap Streamlit UI integration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Minglang-MathGap-Diagnosis-Streamlit-App.git
git push -u origin main
```

The second `git status` should show `app.py`, `component/`, `src/`, and the
model artifact staged for commit. It should not show `.venv`, `__pycache__`, or
credentials.

## Part 5 — Deploy on Streamlit Community Cloud

Use these values:

```text
Repository:     YOUR_USERNAME/Minglang-MathGap-Diagnosis-Streamlit-App
Branch:         main
Main file path: app.py
Python version: 3.11
Secrets:        leave blank
```

Deployment sequence:

1. Sign in with GitHub.
2. Create a new app from an existing repository.
3. Select the repository and `main` branch.
4. Enter `app.py` as the entrypoint.
5. Open Advanced settings and select Python 3.11.
6. Deploy.
7. Watch the log until dependency installation and app startup finish.

## Part 6 — Functional acceptance checklist

After the public app loads, verify:

- [ ] Browser tab title includes Minglang Li and Dr. Qingyang Xiao.
- [ ] Header and footer show the author and mentor names.
- [ ] Diagnosis tab shows the initial model result.
- [ ] Concept map opens and concept selection changes the inspector.
- [ ] Review brief opens and print mode is available.
- [ ] Credits tab shows author and mentor roles.
- [ ] Edit inputs opens the research form.
- [ ] Percentages, Quadratic equations, and Volume scenarios all run.
- [ ] Download JSON creates a result containing author and mentor fields.
- [ ] About panel explains synthetic-data limitations.

## Part 7 — Read the build log when deployment fails

### Error: missing model file

The GitHub repository is missing:

```text
artifacts/model_bundle.joblib
```

Upload it and redeploy.

### Error: incompatible scikit-learn model

Confirm `requirements.txt` still contains:

```text
scikit-learn==1.8.0
```

### Error: missing frontend component

Confirm all files under `component/` are in GitHub. The app does not build the
React source during deployment; it serves the ready-to-use component files.

### Error: repository/file is not selectable

Confirm the Streamlit account is connected to the correct GitHub account and
has access to that repository. For organization/private repositories, review
the GitHub authorization settings.

## Part 8 — Safe maintenance

Before each update:

```bash
python tests/smoke_test.py
python -m unittest discover -s tests -p 'test_*.py' -v
node --check component/app.js
```

Do not commit private student data, tokens, passwords, `.streamlit/secrets.toml`,
or locally generated virtual-environment files.
