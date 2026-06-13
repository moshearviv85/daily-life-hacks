"""One-pass LLM copy edit for medical or health-adjacent language."""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from lib import content_policy as _cp  # noqa: E402
from normalize_punctuation import normalize_punctuation  # noqa: E402
from stage_1_5 import openrouter as _or  # noqa: E402

DEFAULT_MODEL = "google/gemini-2.5-flash"


class MedicalSofteningError(RuntimeError):
    """Raised when the medical softening pass cannot return usable markdown."""


@dataclass(frozen=True)
class MedicalSofteningResult:
    markdown: str
    latency_ms: int
    tokens_in: int | None
    tokens_out: int | None
    cost: float | None
    finish_reason: str | None


def _issue_lines(issues: list[dict[str, str]] | None) -> str:
    if not issues:
        return "No specific validator lines were provided. Scan the whole article."
    lines: list[str] = []
    for issue in issues:
        rule = issue.get("rule", "medical")
        detail = issue.get("detail", "").strip()
        lines.append(f"- {rule}: {detail}")
    return "\n".join(lines)


def build_soften_prompts(
    markdown: str,
    *,
    issues: list[dict[str, str]] | None = None,
) -> tuple[str, str]:
    """Build the focused medical-copy-edit prompt."""
    hedge_terms = ", ".join(_cp.MEDICAL_TERMS_HEDGE_REQUIRED)
    hard_terms = ", ".join(_cp.MEDICAL_TERMS_HARD_BAN)
    system = f"""You are a conservative copy editor for Daily Life Hacks.

Read the full Markdown article and do one job: soften or remove medical,
health, disease, supplement, body-system, and treatment language wherever it
appears.

Rules:
- Return the complete corrected Markdown article only.
- Preserve the article's topic, usefulness, frontmatter shape, Markdown shape, and natural voice.
- If a medical/body-system reference is not necessary, remove it or replace it with plain food, cooking, shopping, timing, satiety, comfort, routine, or meal-planning language.
- If a health reference is necessary, make it cautious and non-medical. Use words like "may", "might", or "could"; avoid promises.
- Do not add new health claims, citations, disclaimers, code fences, notes, or commentary.
- Update frontmatter title, excerpt, tags, imageAlt, and FAQ answers too if they contain medical language.
- Never use hard-banned terms unless the only safe choice is to remove the sentence.

Terms that usually need softening or removal:
{hedge_terms}

Hard-banned terms:
{hard_terms}
"""
    user = f"""Validator notes:
{_issue_lines(issues)}

Article to soften:
{markdown}"""
    return system, user


def _strip_code_fence(text: str) -> str:
    cleaned = text.strip()
    if not cleaned.startswith("```"):
        return cleaned
    cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def soften_medical_language(
    markdown: str,
    *,
    api_key: str = "",
    model_id: str = DEFAULT_MODEL,
    issues: list[dict[str, str]] | None = None,
    temperature: float = 0.2,
    max_tokens: int = 10000,
    timeout: int = 180,
    llm_fn: Callable[[str, str], str] | None = None,
) -> MedicalSofteningResult:
    """Run one focused model pass that softens/removes medical language."""
    system, user = build_soften_prompts(markdown, issues=issues)
    if llm_fn is not None:
        raw = llm_fn(system, user)
        latency_ms = 0
        tokens_in = tokens_out = None
        cost = None
        finish_reason = "test"
    else:
        resp, latency_ms = _or.call_with_retry(
            api_key=api_key,
            model_id=model_id,
            system=system,
            user=user,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
            retries=2,
        )
        raw, finish_reason = _or.extract_text(resp)
        tokens_in, tokens_out, cost = _or.usage_cost(resp)

    softened = normalize_punctuation(_strip_code_fence(raw))
    if not softened:
        raise MedicalSofteningError("medical softening returned empty markdown")
    return MedicalSofteningResult(
        markdown=softened,
        latency_ms=latency_ms,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost=cost,
        finish_reason=finish_reason,
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Soften medical language in Markdown.")
    parser.add_argument("path", nargs="?", help="Markdown file. Reads stdin when omitted.")
    parser.add_argument("--output", help="Output path. Writes stdout when omitted.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--api-key", default=os.environ.get("OPENROUTER_API_KEY", ""))
    parser.add_argument("--timeout", type=int, default=180)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.path:
        markdown = Path(args.path).read_text(encoding="utf-8")
    else:
        markdown = sys.stdin.read()

    result = soften_medical_language(
        markdown,
        api_key=args.api_key,
        model_id=args.model,
        timeout=args.timeout,
    )
    if args.output:
        Path(args.output).write_text(result.markdown, encoding="utf-8")
    else:
        sys.stdout.write(result.markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
