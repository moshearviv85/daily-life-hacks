"""Image model routing decisions for the 2026 Daily Life Hacks pipeline.

This file is intentionally small: brief generation decides what to show, and
these constants decide which image model renders each image slot.
"""
from __future__ import annotations

from typing import TypedDict


class ImageModelDecision(TypedDict):
    slot: int
    model_id: str
    provider: str
    role: str
    estimated_cost_usd: float


PIN_IMAGE_MODEL_ROTATION: list[ImageModelDecision] = [
    {
        "slot": 1,
        "model_id": "gpt-image-2",
        "provider": "OpenAI via fal",
        "role": "clean readable Pinterest text",
        "estimated_cost_usd": 0.005,
    },
    {
        "slot": 2,
        "model_id": "nano-banana-2",
        "provider": "Google via fal",
        "role": "bold commercial Pinterest variation",
        "estimated_cost_usd": 0.080,
    },
    {
        "slot": 3,
        "model_id": "krea-2-large",
        "provider": "Krea via fal",
        "role": "bright editorial food/lifestyle",
        "estimated_cost_usd": 0.060,
    },
    {
        "slot": 4,
        "model_id": "seedream-v5-lite",
        "provider": "ByteDance via fal",
        "role": "clean lifestyle backup style",
        "estimated_cost_usd": 0.035,
    },
]

PIN_IMAGE_BACKUP_MODEL_IDS = [
    "qwen-image-2512",
]

HERO_IMAGE_MODEL_ID = "krea-2-large"
HERO_IMAGE_BACKUP_MODEL_IDS = [
    "flux-2-pro",
    "seedream-v5-lite",
]

SUPPORT_IMAGE_MODEL_ID = "nano-banana-2"
SUPPORT_IMAGE_BACKUP_MODEL_IDS = [
    "seedream-v5-lite",
    "flux-2-pro",
]


def model_for_pin_slot(slot: int) -> str:
    """Return the configured model for a 1-based pin slot."""
    if slot < 1:
        raise ValueError("pin slot must be >= 1")
    index = (slot - 1) % len(PIN_IMAGE_MODEL_ROTATION)
    return PIN_IMAGE_MODEL_ROTATION[index]["model_id"]


def pin_rotation_summary() -> str:
    return ", ".join(
        f"pin {decision['slot']}={decision['model_id']}"
        for decision in PIN_IMAGE_MODEL_ROTATION
    )
