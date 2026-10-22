# UI Integration Notes

## What was integrated

The attached `MathGap-Diagnosis-Workspace.zip` supplied a polished React/Vite
interface designed around four workspace areas:

1. Diagnosis
2. Concept map
3. Review brief
4. Model/credits information

The original package expected two separately running services: a Vite/React
frontend and a FastAPI Python backend. Streamlit Community Cloud normally
launches one Python entry point, so the interface was adapted into a local
static Streamlit custom component.

## Deployed architecture

```text
Browser UI (`component/`)
        │ Streamlit component messages
        ▼
`app.py` session/event adapter
        │ direct Python call
        ▼
`src/streamlit_backend.py`
        │
        ▼
`artifacts/model_bundle.joblib`
```

This architecture does **not** require Node.js, npm, Vite, React, FastAPI,
Uvicorn, or a second public service at deployment time.

## Preserved source

The supplied React/Vite source is preserved in `ui_source_original/`. It is not
loaded by the deployed Streamlit app. The production UI that Streamlit serves
is in:

- `component/index.html`
- `component/styles.css`
- `component/app.js`
- `component/art/`

## Credits added throughout the application

- **Author:** Minglang Li
- **Mentor:** Dr. Qingyang Xiao

The names appear in the browser title, app header, footer, Credits tab, About
panel, review brief, exported JSON, `README.md`, and `AUTHORS.md`.

## Model behavior

The app invokes the saved scikit-learn artifact directly. It does not use
mocked predictions. Input validation is performed again in Python before model
inference. The model was trained on synthetic data, and output probabilities
are not calibrated mastery measurements.
