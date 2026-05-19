"""Stage 1.75 — judge articles from stage 1.5.

Two-layer scoring:
  Layer A — deterministic regex checks (compliance_score 0-40)
  Layer B — Gemini LLM rubric per article in isolation (quality_score 0-60)
  Total   — compliance + quality (0-100)
"""
