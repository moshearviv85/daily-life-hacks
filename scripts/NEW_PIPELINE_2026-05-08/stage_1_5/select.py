"""Select up to 50 OpenRouter models that fit the discovery criteria.

Criteria
--------
Hard filters (model must pass all):
  - id does not end with ':free' (rate-limited, unreliable for batch)
  - id does not contain ':thinking'/'extended-thinking' variants (we test vanilla)
  - context_length >= 16,000 tokens
  - completion price <= $3.00 / 1M tokens
  - prompt price <= $1.50 / 1M tokens
  - supported_parameters includes 'temperature' AND 'max_tokens'
  - excludes embeddings/rerank/image/audio models (heuristic on id)
  - excludes obvious code-only / math-only models by id keyword

Soft ranking (lower is better):
  - Preferred providers first (tier 1, 2, 3 by writing reputation)
  - Newer models first (higher 'created' timestamp)
  - Cheaper first as tiebreaker

Then: enforce provider diversity (max N per provider) and cap at TARGET_COUNT.
"""
from __future__ import annotations

from dataclasses import dataclass

from .openrouter import ModelInfo

TARGET_COUNT = 50
MAX_PER_PROVIDER = 6

# Tier 1 — mainstream, strong at English long-form writing.
TIER_1 = {
    "anthropic", "openai", "google", "meta-llama", "mistralai",
    "deepseek", "qwen", "x-ai", "cohere", "nvidia",
}
# Tier 2 — capable, widely used, secondary preference.
TIER_2 = {
    "amazon", "microsoft", "ai21", "perplexity", "liquid",
    "nousresearch", "thedrummer", "moonshotai", "z-ai", "inflection",
    "01-ai", "baichuan", "stepfun-ai", "tngtech",
}
# Everything else falls into tier 3.

# Keywords in the id that disqualify the model outright.
BAD_ID_KEYWORDS = (
    "embedding", "rerank", "tts-", "whisper", "transcribe", "vision-only",
    "image", "dall-e", "stable-diffusion", "flux-", "imagen",
    "guard", "moderation",
    "coder", "code-", "math-",  # specialists; we want general writers
    "audio", "lyria", "music", "speech",  # audio/music generation, wrong output
    "-vl",  # vision-language specialists
)

# Version/variant suffixes to skip (thinking/reasoning modes are a separate test).
BAD_ID_SUFFIXES = (":free", ":thinking", ":extended", ":beta", ":online")


@dataclass
class SelectedModel:
    info: ModelInfo
    tier: int

    @property
    def id(self) -> str:
        return self.info.id


def _tier_for(provider: str) -> int:
    if provider in TIER_1:
        return 1
    if provider in TIER_2:
        return 2
    return 3


def _passes_hard_filters(m: ModelInfo) -> bool:
    mid = m.id.lower()
    if any(mid.endswith(sfx) for sfx in BAD_ID_SUFFIXES):
        return False
    if any(kw in mid for kw in BAD_ID_KEYWORDS):
        return False
    if m.context_length < 16_000:
        return False
    # Exclude zero-cost entries: music/audio models and promotional free tiers.
    if m.completion_price_per_m <= 0 or m.prompt_price_per_m <= 0:
        return False
    if m.completion_price_per_m > 3.0:
        return False
    if m.prompt_price_per_m > 1.5:
        return False
    params = set(m.supported_parameters)
    if "temperature" not in params or "max_tokens" not in params:
        return False
    return True


def select(catalog: list[ModelInfo], *, target: int = TARGET_COUNT) -> list[SelectedModel]:
    passed = [m for m in catalog if _passes_hard_filters(m)]

    # Sort: tier ASC, created DESC, completion_price ASC.
    passed.sort(key=lambda m: (_tier_for(m.provider), -m.created, m.completion_price_per_m))

    # Enforce provider diversity.
    selected: list[SelectedModel] = []
    per_provider: dict[str, int] = {}
    for m in passed:
        if per_provider.get(m.provider, 0) >= MAX_PER_PROVIDER:
            continue
        selected.append(SelectedModel(info=m, tier=_tier_for(m.provider)))
        per_provider[m.provider] = per_provider.get(m.provider, 0) + 1
        if len(selected) >= target:
            break

    # If we did not reach target, relax diversity cap and fill from the rest.
    if len(selected) < target:
        chosen_ids = {s.id for s in selected}
        for m in passed:
            if m.id in chosen_ids:
                continue
            selected.append(SelectedModel(info=m, tier=_tier_for(m.provider)))
            if len(selected) >= target:
                break

    return selected


def format_list(selected: list[SelectedModel]) -> str:
    lines = []
    for i, s in enumerate(selected, 1):
        m = s.info
        lines.append(
            f"{i:3d}. T{s.tier} {m.id:<55} ctx={m.context_length:>7,} "
            f"in=${m.prompt_price_per_m:.2f} out=${m.completion_price_per_m:.2f}"
        )
    return "\n".join(lines)
