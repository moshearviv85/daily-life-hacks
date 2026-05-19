"""FAL model candidates for the pinterest-50 image pipeline.

Lookup table consumed by ``discovery.fal_client``. Each entry maps a
short ``model_id`` to the FAL endpoint plus the per-model knobs the
client needs (shape parameter name, queue vs sync flow, cost estimate).

Pricing values are FAL's published per-image rates as of 2026-04-26 and
are used only as a "cost" annotation on each generation result — billing
authority is FAL's own dashboard.

Locked production decisions (see memory/media.md, 2026-04-26):
- Hero (no overlay text): recraft-v4-pro, 16:9
- Pin (overlay text required): gpt-image-2, 3:4
"""
from __future__ import annotations


FAL_CANDIDATES: dict[str, dict] = {
    "gpt-image-2": {
        "fal_endpoint":        "openai/gpt-image-2",
        "shape_param":         "image_size",
        "shape_values":        {
            "3:4":  "portrait_4_3",
            "16:9": "landscape_16_9",
            "1:1":  "square_hd",
        },
        "quality":             "low",
        "use_queue":           True,
        "price_usd_estimate":  0.01,
        "role":                "pin",
    },
    "recraft-v4-pro": {
        "fal_endpoint":        "fal-ai/recraft/v4/pro/text-to-image",
        "shape_param":         "image_size",
        "shape_values": {
            "3:4":  "portrait_4_3",
            "16:9": "landscape_16_9",
            "1:1":  "square_hd",
        },
        "use_queue":           True,   # slow (~50s), use queue
        "price_usd_estimate":  0.04,
        "role":                "hero",
    },
    "imagen-4-ultra": {
        "fal_endpoint":        "fal-ai/imagen4/preview/ultra",
        "shape_param":         "aspect_ratio",
        "use_queue":           False,
        "price_usd_estimate":  0.05,
        "role":                "fallback",
    },
}
