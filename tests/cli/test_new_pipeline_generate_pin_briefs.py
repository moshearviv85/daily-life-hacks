from __future__ import annotations

import importlib.util
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = REPO_ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "generate_pin_briefs.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("new_pipeline_generate_pin_briefs", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def _good_raw():
    return {
        "pins": [
            {
                "title": "5 Pantry Swaps That Cut Your Grocery Bill in Half",
                "prompt": 'A pantry photo with jars. Render the text "5 Pantry Swaps That Cut Your Grocery Bill in Half" across the top.',
                "alt": "An overhead photo of a kitchen pantry with neatly arranged glass jars on a wooden shelf.",
                "description": "Stop overspending at the store. Click for 5 pantry swaps that quietly cut your bill in half this week.",
            },
            {
                "title": "The Ingredient Costing You $40 a Week",
                "prompt": 'A receipt close-up. Render the text "The Ingredient Costing You $40 a Week" across the top.',
                "alt": "A close-up photo of a grocery receipt next to a single ingredient highlighted in red.",
                "description": "One ingredient is eating $40 a week from your budget. Find out which one and what to swap it with.",
            },
            {
                "title": "Why Bulk Buying Backfires for Most Families",
                "prompt": 'A supermarket cart photo. Render the text "Why Bulk Buying Backfires for Most Families" across the top.',
                "alt": "A wide photo of a family cart at the supermarket checkout filled with bulk packages.",
                "description": "Bulk buying sounds smart but wastes money for most families. See the rule that fixes it tonight.",
            },
            {
                "title": "Cheap Dinners My Kids Actually Eat",
                "prompt": 'A bowl of simple pasta on a clean kitchen table. Render the text "Cheap Dinners My Kids Actually Eat" across the top.',
                "alt": "A bowl of simple pasta with tomato sauce and cheese on a clean kitchen table.",
                "description": "Picky kids and tight budgets do not mix. Get the dinner formula that works on both, every weeknight.",
            },
        ]
    }


def test_new_pipeline_pin_alt_comes_from_alt_field_not_image_prompt():
    module = _load_module()
    pset = module._build_pin_brief_set("demo-article", _good_raw())

    assert pset.pins[0].alt == "An overhead photo of a kitchen pantry with neatly arranged glass jars on a wooden shelf."
    assert "Render the text" not in pset.pins[0].alt
