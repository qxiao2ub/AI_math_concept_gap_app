"""Static checks for files required by Streamlit's custom component."""

from __future__ import annotations

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ComponentContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.html = (ROOT / "component" / "index.html").read_text(encoding="utf-8")
        cls.js = (ROOT / "component" / "app.js").read_text(encoding="utf-8")
        cls.css = (ROOT / "component" / "styles.css").read_text(encoding="utf-8")

    def test_required_static_assets_exist(self) -> None:
        for relative in (
            "component/index.html",
            "component/app.js",
            "component/styles.css",
            "component/art/connection-study.jpg",
            "component/art/loop-study.jpg",
        ):
            self.assertTrue((ROOT / relative).is_file(), relative)

    def test_streamlit_message_protocol_is_present(self) -> None:
        self.assertIn("streamlit:componentReady", self.js)
        self.assertIn("streamlit:render", self.js)
        self.assertIn("streamlit:setComponentValue", self.js)
        self.assertIn("streamlit:setFrameHeight", self.js)

    def test_credits_are_visible_in_app_assets(self) -> None:
        combined = self.html + self.js
        self.assertIn("Minglang Li", combined)
        self.assertIn("Dr. Qingyang Xiao", combined)

    def test_no_remote_script_dependency(self) -> None:
        self.assertNotIn("https://", self.html)
        self.assertNotIn("http://", self.html)
        self.assertNotIn("<script type=\"module\"", self.html)

    def test_css_has_responsive_and_print_rules(self) -> None:
        self.assertIn("@media", self.css)
        self.assertIn("@media print", self.css)


if __name__ == "__main__":
    unittest.main(verbosity=2)
