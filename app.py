"""Streamlit entry point for the integrated MathGap diagnosis workspace.

The browser interface is a static Streamlit custom component adapted from the
attached React/Vite UI. Model inference stays in this Python process so the app
can run on Streamlit Community Cloud without a separate FastAPI server.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Any

import streamlit as st
import streamlit.components.v1 as components

from src.streamlit_backend import (
    APP_VERSION,
    AUTHOR_NAME,
    DEFAULT_INPUTS,
    InputValidationError,
    MENTOR_NAME,
    MODEL_NOTE,
    concepts_payload,
    run_diagnosis,
)

ROOT = Path(__file__).resolve().parent
COMPONENT_DIR = ROOT / "component"
LOGGER = logging.getLogger(__name__)

st.set_page_config(
    page_title=f"MathGap | {AUTHOR_NAME} · {MENTOR_NAME}",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Let the integrated design occupy the full Streamlit canvas.
st.markdown(
    """
    <style>
      #MainMenu, header[data-testid="stHeader"], footer {display: none !important;}
      [data-testid="stSidebar"] {display: none !important;}
      [data-testid="stAppViewContainer"], [data-testid="stMain"] {
        background: #f7f8f6 !important;
      }
      .stApp, .main, .block-container {
        margin: 0 !important;
        padding: 0 !important;
        max-width: none !important;
        width: 100% !important;
      }
      [data-testid="stVerticalBlock"] {gap: 0 !important;}
      [data-testid="stCustomComponentV1"] {margin: 0 !important;}
      iframe[title="mathgap_workspace_ui.mathgap_workspace_ui"] {
        display: block;
        border: 0 !important;
        width: 100% !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _initialize_state() -> None:
    if "mg_initialized" in st.session_state:
        return

    st.session_state.mg_initialized = True
    st.session_state.mg_last_request_id = None
    st.session_state.mg_response_id = "initial"
    st.session_state.mg_created_at = _utc_now()
    st.session_state.mg_error = ""

    try:
        st.session_state.mg_result = run_diagnosis(DEFAULT_INPUTS)
    except Exception:  # Keep internals out of the browser message.
        LOGGER.exception("Unable to initialize the MathGap model")
        st.session_state.mg_result = None
        st.session_state.mg_error = (
            "The research model could not be loaded. Confirm that "
            "artifacts/model_bundle.joblib is present and that requirements.txt "
            "installed scikit-learn 1.8.0."
        )


def _process_component_event(event: Any) -> bool:
    """Process one component event; return True when a rerun is required."""

    if not isinstance(event, dict) or event.get("action") != "diagnose":
        return False

    request_id = event.get("request_id")
    if not isinstance(request_id, str) or not request_id.strip() or len(request_id) > 160:
        st.session_state.mg_error = "The browser sent an invalid request identifier. Please reload the app."
        st.session_state.mg_response_id = f"invalid-{_utc_now()}"
        return True

    if request_id == st.session_state.mg_last_request_id:
        return False

    st.session_state.mg_last_request_id = request_id
    st.session_state.mg_response_id = request_id

    try:
        result = run_diagnosis(event.get("inputs"))
    except InputValidationError as exc:
        st.session_state.mg_error = str(exc)
    except Exception:
        LOGGER.exception("MathGap diagnosis failed")
        st.session_state.mg_error = (
            "The diagnosis could not be completed. The previous result is still "
            "available; review the inputs and try again."
        )
    else:
        st.session_state.mg_result = result
        st.session_state.mg_created_at = _utc_now()
        st.session_state.mg_error = ""

    return True


def main() -> None:
    _initialize_state()

    if not (COMPONENT_DIR / "index.html").exists():
        st.error(
            "The integrated UI is missing. Keep the complete `component/` folder "
            "at the repository root and redeploy."
        )
        st.stop()

    mathgap_component = components.declare_component(
        "mathgap_workspace_ui",
        path=str(COMPONENT_DIR),
    )

    event = mathgap_component(
        concepts=concepts_payload(),
        result=st.session_state.mg_result,
        error=st.session_state.mg_error,
        response_id=st.session_state.mg_response_id,
        created_at=st.session_state.mg_created_at,
        author=AUTHOR_NAME,
        mentor=MENTOR_NAME,
        model_note=MODEL_NOTE,
        app_version=APP_VERSION,
        default=None,
        key="mathgap-workspace-component",
    )

    if _process_component_event(event):
        st.rerun()


if __name__ == "__main__":
    main()
