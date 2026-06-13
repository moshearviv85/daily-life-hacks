"""Single post-write cleanup pass for generated article Markdown."""
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
from stage_1_5 import openrouter as _or  # noqa: E402

DEFAULT_MODEL = "google/gemini-2.5-flash"
EM_DASH_VARIANTS = (
    "\u2014",
    "\u00e2\u20ac\u201d",
    "\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009d",
)


class ArticlePolishError(RuntimeError):
    """Raised when the article polish pass cannot return usable Markdown."""


@dataclass(frozen=True)
class ArticlePolishResult:
    markdown: str
    latency_ms: int
    tokens_in: int | None
    tokens_out: int | None
    cost: float | None
    finish_reason: str | None


def normalize_punctuation(text: str) -> str:
    """Replace em-dash variants with a plain short hyphen."""
    for dash in EM_DASH_VARIANTS:
        text = text.replace(dash, "-")
    return text


def build_polish_prompts(markdown: str) -> tuple[str, str]:
    """Build the one-pass article polish prompt."""
    hedge_terms = ", ".join(_cp.MEDICAL_TERMS_HEDGE_REQUIRED)
    hard_terms = ", ".join(_cp.MEDICAL_TERMS_HARD_BAN)
    system = f"""You are a careful YMYL copy editor for Daily Life Hacks.

You get one complete Markdown article. Do exactly this:
1. Replace any em dash with a short hyphen.
2. Read the whole text, including frontmatter, title, excerpt, tags, imageAlt, FAQ, and body.
3. Identify medical, disease, supplement, body-system, treatment, or strong health statements.
4. Soften those statements under YMYL rules, or remove them entirely when they are not needed.
5. Preserve the article's meaning, usefulness, structure, frontmatter keys, Markdown, and natural voice.

YMYL editing rules:
- Prefer plain food, cooking, shopping, timing, satiety, comfort, routine, and meal-planning language.
- If a health reference is necessary, make it cautious: "may", "might", or "could"; no promises.
- Remove body-chemistry explanations instead of hedging them.
- Do not leave words like "brain chemicals", "hormone", "hormones", "neurotransmitters", "reward system", or "nervous system" in the output.
- For comfort-food topics, explain comfort through memory, warmth, texture, smell, familiarity, routine, seasoning, and serving temperature - never brain chemistry or hormones.
- Do not add new health claims, citations, disclaimers, notes, or commentary.
- Do not wrap the answer in code fences.
- Return the complete corrected Markdown article only.

Terms that usually need softening or removal:
{hedge_terms}

Hard-banned terms:
{hard_terms}
"""
    user = f"""Article to clean:
{normalize_punctuation(markdown)}"""
    return system, user


def _strip_code_fence(text: str) -> str:
    cleaned = text.strip()
    if not cleaned.startswith("```"):
        return cleaned
    cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def polish_article_text(
    markdown: str,
    *,
    api_key: str = "",
    model_id: str = DEFAULT_MODEL,
    temperature: float = 0.2,
    max_tokens: int = 10000,
    timeout: int = 180,
    llm_fn: Callable[[str, str], str] | None = None,
) -> ArticlePolishResult:
    """Normalize punctuation and run one YMYL/medical softening pass."""
    system, user = build_polish_prompts(markdown)
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

    polished = normalize_punctuation(_strip_code_fence(raw))
    if not polished:
        raise ArticlePolishError("article polish returned empty markdown")
    return ArticlePolishResult(
        markdown=polished,
        latency_ms=latency_ms,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost=cost,
        finish_reason=finish_reason,
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean one generated article Markdown file.")
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

    result = polish_article_text(
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
