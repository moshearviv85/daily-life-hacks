"""Layer B: LLM rubric judge.

One article at a time, in isolation, to avoid context window pressure. Uses
Gemini with structured JSON output (responseSchema) so parsing is reliable.
"""
from __future__ import annotations

import time
from typing import Any

from topic_research.llm.gemini import GeminiError, generate as _gemini_generate


DEFAULT_JUDGE_MODEL = "gemini-2.5-flash"


RUBRIC_PROMPT = """You are a senior content editor evaluating articles written for daily-life-hacks.com. The site has a specific brand voice called "David Miller":
- Practical, direct, useful. No fluff, no hype.
- Human and conversational with light dry humor. Slightly cynical, never mean.
- Zero lecturing, zero guilt. Anti-drama.
- Contractions throughout (it's, don't, can't, they're).
- Opens with a scene, confession, contrast, or opinion. Not "In this article" or a dictionary definition.
- Each H2 section should have at least one voice moment: a personal aside, direct address to the reader, or a specific concrete detail. Flat exposition in the middle of the article is the most common voice failure.
- Closes with a natural thought. Never with sign-offs like "Happy eating!", "Your gut will thank you!", "Your future self will thank you!", "You won't regret it!", "Give it a try!".

You are given ONE article below. Score it on four axes. Do not be generous. A score of 20 on voice is reserved for writing that feels genuinely human and distinctive. Scores of 10 to 14 are typical for competent but bland work.

VOICE (0-20): how well does the writing match the David Miller voice described above?
  0-5   Generic AI content, no personality, robotic sentences.
  6-10  Occasional voice moments but most paragraphs are flat.
  11-14 Voice is present but uneven. Strong in the intro, weak in the middle.
  15-17 Voice carries through consistently. Sounds like a real blogger.
  18-20 Voice is strong and distinctive. Specific, witty, believable.

FLOW (0-15): readability, burstiness, paragraph rhythm.
  0-5   Monotonous, all sentences the same length, textbook-feel.
  6-9   Predictable rhythm. Reads like an essay.
  10-12 Good mix of short and long sentences, readable pace.
  13-15 Strong rhythm with deliberate short punchy sentences breaking up longer ones.

SEO (0-15): natural keyword integration and H2 structure.
  0-5   Keyword stuffing OR keyword missing from body.
  6-9   Keyword present but awkward placement. H2s generic.
  10-12 Keyword woven in naturally. H2s are specific and useful.
  13-15 Keyword appears in several H2s naturally. H2 structure tells the article's story.

HOOK (0-10): opening paragraph quality.
  0-3   Boring, generic, definitional, or "In this article...".
  4-6   Functional opening that states the topic.
  7-10  Strong hook: scene, confession, contrast, or opinion that pulls the reader in.

Return your scores as JSON. Be honest even when scoring low. "Reasoning" should be two to three short sentences naming the strongest and weakest aspect.

--- ARTICLE BEGINS ---
{article}
--- ARTICLE ENDS ---
"""


RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "voice_score":  {"type": "INTEGER", "minimum": 0, "maximum": 20},
        "flow_score":   {"type": "INTEGER", "minimum": 0, "maximum": 15},
        "seo_score":    {"type": "INTEGER", "minimum": 0, "maximum": 15},
        "hook_score":   {"type": "INTEGER", "minimum": 0, "maximum": 10},
        "reasoning":    {"type": "STRING"},
    },
    "required": ["voice_score", "flow_score", "seo_score", "hook_score", "reasoning"],
    "propertyOrdering": ["voice_score", "flow_score", "seo_score", "hook_score", "reasoning"],
}


MAX_ARTICLE_CHARS = 60_000  # safety cap; articles above this are very unusual


def judge_one(
    *,
    article_markdown: str,
    api_key: str,
    model: str = DEFAULT_JUDGE_MODEL,
    timeout: int = 90,
) -> dict[str, Any]:
    """Score a single article. Returns dict with the rubric fields + latency_ms.

    Raises:
        GeminiError on API failure (caller is expected to catch and mark the
        score row as judge_status='error').
    """
    article = article_markdown or ""
    if len(article) > MAX_ARTICLE_CHARS:
        article = article[:MAX_ARTICLE_CHARS] + "\n\n[... truncated by judge for safety ...]"

    prompt = RUBRIC_PROMPT.format(article=article)

    start = time.monotonic()
    try:
        result = _gemini_generate(
            prompt=prompt,
            api_key=api_key,
            schema=RESPONSE_SCHEMA,
            model=model,
            temperature=0.2,
            timeout=timeout,
        )
    except GeminiError:
        raise
    latency_ms = int((time.monotonic() - start) * 1000)

    if not isinstance(result, dict):
        raise GeminiError(f"judge returned non-dict: {type(result).__name__}")

    # Defensive coercion.
    def _i(key: str, max_val: int) -> int:
        v = result.get(key)
        try:
            iv = int(v)
        except (TypeError, ValueError):
            iv = 0
        return max(0, min(iv, max_val))

    voice = _i("voice_score", 20)
    flow = _i("flow_score", 15)
    seo = _i("seo_score", 15)
    hook = _i("hook_score", 10)
    reasoning = str(result.get("reasoning") or "").strip()
    quality = voice + flow + seo + hook

    return {
        "voice_score": voice,
        "flow_score": flow,
        "seo_score": seo,
        "hook_score": hook,
        "quality_score": quality,
        "reasoning": reasoning,
        "latency_ms": latency_ms,
    }
