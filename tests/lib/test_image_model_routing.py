from __future__ import annotations

import importlib.util
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "scripts"
    / "NEW_PIPELINE_2026-05-08"
    / "lib"
    / "image_models.py"
)


def load_image_models():
    spec = importlib.util.spec_from_file_location("new_pipeline_image_models", MODULE_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_pin_model_rotation_is_locked_to_selected_four_models():
    image_models = load_image_models()

    assert [
        image_models.model_for_pin_slot(slot)
        for slot in range(1, 5)
    ] == [
        "gpt-image-2",
        "nano-banana-2",
        "krea-2-large",
        "seedream-v5-lite",
    ]


def test_pin_model_rotation_wraps_without_state():
    image_models = load_image_models()

    assert image_models.model_for_pin_slot(5) == "gpt-image-2"


def test_hero_and_support_defaults_are_locked():
    image_models = load_image_models()

    assert image_models.HERO_IMAGE_MODEL_ID == "krea-2-large"
    assert image_models.SUPPORT_IMAGE_MODEL_ID == "nano-banana-2"
    assert image_models.HERO_IMAGE_BACKUP_MODEL_IDS == ["flux-2-pro", "seedream-v5-lite"]
