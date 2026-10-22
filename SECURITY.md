# Data and Security Notes

This repository is an educational research prototype.

- Use only synthetic, public, or explicitly approved non-sensitive data.
- Do not enter or commit CUI, FOUO, ITAR, EAR, PII, PHI, student records, or
  confidential institutional information.
- The deployed app has no database and does not intentionally persist form
  inputs. Streamlit hosting and browser/network infrastructure may still
  generate ordinary service logs.
- Do not use the model output as an educational placement decision, diagnosis,
  grading decision, or substitute for a qualified educator's judgment.
- Never commit `.streamlit/secrets.toml`, credentials, access tokens, or private
  keys.
