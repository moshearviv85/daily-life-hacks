"""FAL model candidates used by the Daily Life Hacks image pipeline.

Lookup table consumed by ``discovery.fal_client``. Each entry maps a short
``model_id`` to the FAL endpoint, request shape, small model-specific payload,
and a cost estimate for reporting only.

Locked image decisions as of 2026-06-14:
- Pin rotation: gpt-image-2, nano-banana-2, krea-2-large, seedream-v5-lite.
- Hero default: krea-2-large.
- Support-image default: nano-banana-2.
- Hero backups: flux-2-pro, seedream-v5-lite.

Recraft and Ideogram are intentionally not active candidates here.
"""
from __future__ import annotations


PIN_SIZE_2_3 = {"width": 1024, "height": 1536}
HERO_SIZE_16_9 = {"width": 1536, "height": 864}
GPT_HERO_SIZE_16_9 = {"width": 1920, "height": 1080}
SEEDREAM_PIN_SIZE_2_3 = {"width": 1920, "height": 2880}
SEEDREAM_HERO_SIZE_16_9 = {"width": 2560, "height": 1440}


FAL_CANDIDATES: dict[str, dict] = {
    "gpt-image-2": {
        "fal_endpoint": "openai/gpt-image-2",
        "shape_param": "image_size",
        "shape_values": {
            "2:3": PIN_SIZE_2_3,
            "3:4": "portrait_4_3",
            "16:9": GPT_HERO_SIZE_16_9,
            "1:1": "square_hd",
        },
        "quality": "low",
        "payload": {
            "num_images": 1,
            "output_format": "png",
        },
        "use_queue": True,
        "price_usd_estimate": 0.005,
        "role": "pin-slot-1",
    },
    "nano-banana-2": {
        "fal_endpoint": "fal-ai/nano-banana-2",
        "shape_param": "aspect_ratio",
        "payload": {
            "num_images": 1,
            "resolution": "1K",
            "limit_generations": True,
            "output_format": "png",
        },
        "use_queue": True,
        "price_usd_estimate": 0.080,
        "role": "pin-slot-2,support-default",
    },
    "krea-2-large": {
        "fal_endpoint": "krea/v2/large/text-to-image",
        "shape_param": "aspect_ratio",
        "payload": {
            "creativity": "low",
            "image_style_references": [],
            "styles": [],
            "moodboards": [],
        },
        "use_queue": True,
        "price_usd_estimate": 0.060,
        "role": "pin-slot-3,hero-default",
    },
    "seedream-v5-lite": {
        "fal_endpoint": "fal-ai/bytedance/seedream/v5/lite/text-to-image",
        "shape_param": "image_size",
        "shape_values": {
            "2:3": SEEDREAM_PIN_SIZE_2_3,
            "3:4": "portrait_4_3",
            "16:9": SEEDREAM_HERO_SIZE_16_9,
            "1:1": "square_hd",
        },
        "payload": {
            "num_images": 1,
            "max_images": 1,
            "enable_safety_checker": True,
        },
        "use_queue": True,
        "price_usd_estimate": 0.035,
        "role": "pin-slot-4,hero-backup,support-backup",
    },
    "flux-2-pro": {
        "fal_endpoint": "fal-ai/flux-2-pro",
        "shape_param": "image_size",
        "shape_values": {
            "2:3": PIN_SIZE_2_3,
            "3:4": "portrait_4_3",
            "16:9": HERO_SIZE_16_9,
            "1:1": "square_hd",
        },
        "payload": {
            "enable_safety_checker": True,
            "output_format": "jpeg",
        },
        "use_queue": True,
        "price_usd_estimate": 0.045,
        "role": "hero-backup,support-backup",
    },
    "qwen-image-2512": {
        "fal_endpoint": "fal-ai/qwen-image-2512",
        "shape_param": "image_size",
        "shape_values": {
            "2:3": PIN_SIZE_2_3,
            "3:4": "portrait_4_3",
            "16:9": HERO_SIZE_16_9,
            "1:1": "square_hd",
        },
        "payload": {
            "num_images": 1,
            "enable_safety_checker": True,
            "output_format": "png",
            "acceleration": "regular",
        },
        "use_queue": True,
        "price_usd_estimate": 0.030,
        "role": "pin-backup",
    },
}
