"""Layer 2: LLM-based medical claim validator.

A cheap, focused LLM call that catches paraphrased medical language regex misses.
Returns structured violations. Any violation with hedged=false is a reject.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Callable

from lib import content_policy as _cp
from lib.prompt_builder import build_medical_validator_system


@dataclass(frozen=True)
class MedicalViolation:
    term: str
    sentence: str
    hedged: bool


def build_prompt(article_text: str) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for the medical validator."""
    system = build_medical_validator_system()
    user = f"Check this article for unhedged medical language:\n\n{article_text}"
    return system, user


def parse_response(raw: str) -> list[MedicalViolation]:
    """Parse the LLM JSON response into MedicalViolation objects."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse medical validator response: {e}") from e

    violations = data.get("violations", [])
    return [
        MedicalViolation(
            term=v.get("term", ""),
            sentence=v.get("sentence", ""),
            hedged=bool(v.get("hedged", False)),
        )
        for v in violations
        if isinstance(v, dict)
    ]


def check_article(
    article_text: str,
    *,
    llm_fn: Callable | None = None,
    api_key: str = "",
    model: str = "google/gemini-2.5-flash",
    temperature: float = 0.1,
    timeout: int = 60,
) -> list[MedicalViolation]:
    """Run the medical validator. Returns list of MedicalViolation.

    If llm_fn is provided, it is called as llm_fn(system, user) and must
    return the raw response text. Otherwise uses OpenRouter."""
    system, user = build_prompt(article_text)

    if llm_fn is not None:
        raw = llm_fn(system, user)
    else:
        from stage_1_5.openrouter import chat_completion, extract_text
        resp = chat_completion(
            api_key=api_key, model_id=model, system=system, user=user,
            temperature=temperature, max_tokens=1000, timeout=timeout,
        )
        raw, _ = extract_text(resp)

    return parse_response(raw)
