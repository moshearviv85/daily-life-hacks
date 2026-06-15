from __future__ import annotations

import importlib.util
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "scripts"
    / "NEW_PIPELINE_2026-05-08"
    / "generate_support_image.py"
)


def load_support_image_module():
    spec = importlib.util.spec_from_file_location("generate_support_image", MODULE_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_support_prompt_uses_recipe_ingredients_and_blocks_bad_elements():
    mod = load_support_image_module()
    prompt = mod.support_prompt_from_frontmatter(
        {
            "title": "One Pot Pasta Primavera",
            "ingredients": [
                "8 ounces short pasta",
                "1 zucchini, sliced",
                "1 cup cherry tomatoes",
            ],
        },
        "one-pot-pasta-primavera-20-minutes",
    )

    assert "One Pot Pasta Primavera" in prompt
    assert "8 ounces short pasta" in prompt
    assert "1 zucchini, sliced" in prompt
    assert "No people, no hands, no text" in prompt
    assert "no brand packaging" in prompt


def test_support_prompt_falls_back_to_tags_without_ingredients():
    mod = load_support_image_module()
    prompt = mod.support_prompt_from_frontmatter(
        {
            "title": "How To Store Fresh Herbs",
            "tags": ["fresh herbs", "kitchen storage"],
        },
        "how-to-store-fresh-herbs",
    )

    assert "a practical prep scene for How To Store Fresh Herbs" in prompt
    assert "fresh herbs, kitchen storage" in prompt
