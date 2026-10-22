"""Fast smoke test for the deployable model/UI contract."""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.streamlit_backend import (  # noqa: E402
    AUTHOR_NAME,
    DEFAULT_INPUTS,
    MENTOR_NAME,
    concepts_payload,
    run_diagnosis,
)


def main() -> None:
    result = run_diagnosis(DEFAULT_INPUTS)
    concepts = concepts_payload()

    assert AUTHOR_NAME == "Minglang Li"
    assert MENTOR_NAME == "Dr. Qingyang Xiao"
    assert len(concepts) == 14
    assert len(result["ranked_concepts"]) == 7
    assert result["inputs"]["primary_concepts"] == ["percentages"]
    assert result["recommended_review"]
    assert result["model_metadata"]["model_type"] == "RandomForestClassifier"
    assert (ROOT / "component" / "index.html").is_file()
    assert (ROOT / "component" / "app.js").is_file()
    assert (ROOT / "component" / "styles.css").is_file()

    top = result["ranked_concepts"][0]
    print("MathGap smoke test passed")
    print(f"Top model candidate: {top['label']} ({top['probability']:.3f})")
    print(f"Suggested review: {result['recommended_review_label']}")


if __name__ == "__main__":
    main()
