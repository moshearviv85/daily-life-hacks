"""Tests for PinBrief + PinBriefSet (scripts/lib/pin_brief.py).

TDD Task 2 — RED phase.
A PinBrief is one Pinterest pin. A PinBriefSet is the per-article wrapper
holding exactly 4 unique pins (unique slugs, unique titles).
"""
from __future__ import annotations

import pytest

try:
    from scripts.lib.pin_brief import PinBrief, PinBriefSet
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


# ── fixtures ─────────────────────────────────────────────────────────────────

VALID_TITLES = [
    "5 Pantry Swaps That Cut Your Grocery Bill in Half",
    "The Ingredient Costing You $40 a Week",
    "Why Bulk Buying Backfires for Most Families",
    "Cheap Dinners My Kids Actually Eat",
]
VALID_SLUGS = [
    "pantry-swaps-cut-grocery-bill",
    "ingredient-costing-week",
    "bulk-buying-backfires-families",
    "cheap-dinners-kids-eat",
]
VALID_ALTS = [
    "An overhead photo of a kitchen pantry with neatly arranged glass jars on a wooden shelf.",
    "A close-up photo of a grocery receipt next to a single ingredient highlighted in red.",
    "A wide photo of a family cart at the supermarket checkout filled with bulk packages.",
    "A photo of a smiling child holding a plate of pasta with simple toppings on it.",
]
VALID_DESCRIPTIONS = [
    "Stop overspending at the store. Click for 5 pantry swaps that quietly cut your bill in half this week.",
    "One ingredient is eating $40 a week from your budget. Find out which one and what to swap it with.",
    "Bulk buying sounds smart but wastes money for most families. See the rule that fixes it tonight.",
    "Picky kids and tight budgets do not mix. Get the dinner formula that works on both, every weeknight.",
]


def _prompt_with(title: str) -> str:
    return f'A cinematic overhead photo. Render the text "{title}" prominently across the top.'


def _valid_pin(idx: int) -> "PinBrief":
    return PinBrief(
        slug=VALID_SLUGS[idx],
        title=VALID_TITLES[idx],
        prompt=_prompt_with(VALID_TITLES[idx]),
        alt=VALID_ALTS[idx],
        description=VALID_DESCRIPTIONS[idx],
    )


# ── 1. module exists ─────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.lib.pin_brief"


# ── 2. PinBrief valid construction ───────────────────────────────────────────

def test_valid_pin_brief_constructs():
    pb = _valid_pin(0)
    assert pb.slug == VALID_SLUGS[0]
    assert pb.title == VALID_TITLES[0]
    assert pb.alt == VALID_ALTS[0]


# ── 3. empty fields rejected ─────────────────────────────────────────────────

def test_empty_slug_rejected():
    with pytest.raises(Exception):
        PinBrief(slug="", title=VALID_TITLES[0], prompt=_prompt_with(VALID_TITLES[0]), alt=VALID_ALTS[0], description=VALID_DESCRIPTIONS[0])


def test_empty_title_rejected():
    with pytest.raises(Exception):
        PinBrief(slug="x", title="", prompt="render the text in bold", alt=VALID_ALTS[0], description=VALID_DESCRIPTIONS[0])


def test_empty_prompt_rejected():
    with pytest.raises(Exception):
        PinBrief(slug="x", title=VALID_TITLES[0], prompt="", alt=VALID_ALTS[0], description=VALID_DESCRIPTIONS[0])


def test_empty_alt_rejected():
    with pytest.raises(Exception):
        PinBrief(slug="x", title=VALID_TITLES[0], prompt=_prompt_with(VALID_TITLES[0]), alt="", description=VALID_DESCRIPTIONS[0])


# ── 4. alt length bounds (30-200 inclusive) ──────────────────────────────────

def test_alt_too_short_rejected():
    with pytest.raises(Exception):
        PinBrief(slug="x", title=VALID_TITLES[0], prompt=_prompt_with(VALID_TITLES[0]), alt="too short", description=VALID_DESCRIPTIONS[0])


def test_alt_too_long_rejected():
    with pytest.raises(Exception):
        PinBrief(slug="x", title=VALID_TITLES[0], prompt=_prompt_with(VALID_TITLES[0]), alt="x" * 201, description=VALID_DESCRIPTIONS[0])


def test_alt_minimum_length_accepted():
    pb = PinBrief(slug="x", title=VALID_TITLES[0], prompt=_prompt_with(VALID_TITLES[0]), alt="x" * 30, description=VALID_DESCRIPTIONS[0])
    assert len(pb.alt) == 30


def test_alt_maximum_length_accepted():
    pb = PinBrief(slug="x", title=VALID_TITLES[0], prompt=_prompt_with(VALID_TITLES[0]), alt="x" * 200, description=VALID_DESCRIPTIONS[0])
    assert len(pb.alt) == 200


# ── 5. em-dash banned in title + alt only (prompt is unrestricted) ───────────

def test_em_dash_in_title_rejected():
    bad_title = "5 Pantry Swaps — That Cut Your Bill"
    with pytest.raises(Exception):
        PinBrief(slug="x", title=bad_title, prompt=_prompt_with(bad_title), alt=VALID_ALTS[0], description=VALID_DESCRIPTIONS[0])


def test_em_dash_in_alt_rejected():
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title=VALID_TITLES[0],
            prompt=_prompt_with(VALID_TITLES[0]),
            alt="An overhead photo — with em-dash visible in the kitchen frame view.",
            description=VALID_DESCRIPTIONS[0],
        )


def test_em_dash_allowed_in_prompt():
    """Prompt is sent only to the image model; humans never see it."""
    title = VALID_TITLES[0]
    pb = PinBrief(
        slug="x",
        title=title,
        prompt=f'A photo — with em-dash in the brief. Render the text "{title}" boldly.',
        alt=VALID_ALTS[0],
        description=VALID_DESCRIPTIONS[0],
    )
    assert "—" in pb.prompt


# ── 6. banned AI words rejected in title + alt only (prompt is unrestricted) ─

def test_banned_word_in_title_rejected():
    bad_title = "Mouthwatering Cheap Dinners My Kids Eat"
    with pytest.raises(Exception):
        PinBrief(slug="x", title=bad_title, prompt=_prompt_with(bad_title), alt=VALID_ALTS[0], description=VALID_DESCRIPTIONS[0])


def test_banned_word_in_alt_rejected():
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title=VALID_TITLES[0],
            prompt=_prompt_with(VALID_TITLES[0]),
            alt="An overhead photo. Mouthwatering close-up of a freshly cooked family dinner plate.",
            description=VALID_DESCRIPTIONS[0],
        )


# ── 7. prompt MUST contain title as a literal substring ──────────────────────

def test_prompt_without_title_rejected():
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title="Cheap Dinners My Kids Actually Eat",
            prompt="A cinematic overhead photo with bold text on top of the kitchen scene.",
            alt=VALID_ALTS[0],
            description=VALID_DESCRIPTIONS[0],
        )


def test_prompt_with_title_substring_accepted():
    title = "Cheap Dinners My Kids Actually Eat"
    prompt = f'A cinematic photo. Render the text "{title}" prominently in bold across the top.'
    pb = PinBrief(slug="x", title=title, prompt=prompt, alt=VALID_ALTS[0], description=VALID_DESCRIPTIONS[0])
    assert title in pb.prompt


# ── 8. PinBriefSet valid construction (4 unique pins) ────────────────────────

def test_valid_pin_brief_set_constructs():
    pset = PinBriefSet(
        article_slug="cheap-crockpot-meals-large-families",
        pins=[_valid_pin(i) for i in range(4)],
    )
    assert pset.article_slug == "cheap-crockpot-meals-large-families"
    assert len(pset.pins) == 4


# ── 9. PinBriefSet count constraint (must be exactly 4) ──────────────────────

def test_pin_brief_set_three_pins_rejected():
    with pytest.raises(Exception):
        PinBriefSet(article_slug="x", pins=[_valid_pin(i) for i in range(3)])


def test_pin_brief_set_five_pins_rejected():
    extra = PinBrief(
        slug="extra-pin-slug",
        title="The 5th Bonus Title for This Article",
        prompt=_prompt_with("The 5th Bonus Title for This Article"),
        alt="A close-up photo of an extra fifth scene with kitchen utensils on a clean countertop.",
        description=VALID_DESCRIPTIONS[0],
    )
    pins = [_valid_pin(i) for i in range(4)] + [extra]
    with pytest.raises(Exception):
        PinBriefSet(article_slug="x", pins=pins)


# ── 10. PinBriefSet uniqueness constraints ───────────────────────────────────

def test_duplicate_slug_in_set_rejected():
    pins = [_valid_pin(i) for i in range(4)]
    pins[1] = PinBrief(
        slug=pins[0].slug,
        title=VALID_TITLES[1],
        prompt=_prompt_with(VALID_TITLES[1]),
        alt=VALID_ALTS[1],
        description=VALID_DESCRIPTIONS[1],
    )
    with pytest.raises(Exception):
        PinBriefSet(article_slug="x", pins=pins)


def test_duplicate_title_in_set_rejected():
    pins = [_valid_pin(i) for i in range(4)]
    pins[1] = PinBrief(
        slug="different-unique-slug",
        title=VALID_TITLES[0],
        prompt=_prompt_with(VALID_TITLES[0]),
        alt=VALID_ALTS[1],
        description=VALID_DESCRIPTIONS[1],
    )
    with pytest.raises(Exception):
        PinBriefSet(article_slug="x", pins=pins)


# ── 11. PinBriefSet article_slug ─────────────────────────────────────────────

def test_pin_brief_set_empty_article_slug_rejected():
    with pytest.raises(Exception):
        PinBriefSet(article_slug="", pins=[_valid_pin(i) for i in range(4)])


# ── 12. description field (Pinterest pin description, CTA-driven) ────────────

def test_empty_description_rejected():
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title=VALID_TITLES[0],
            prompt=_prompt_with(VALID_TITLES[0]),
            alt=VALID_ALTS[0],
            description="",
        )


def test_description_too_short_rejected():
    """Pinterest descriptions need enough body to drive clicks. Reject under 80 chars."""
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title=VALID_TITLES[0],
            prompt=_prompt_with(VALID_TITLES[0]),
            alt=VALID_ALTS[0],
            description="Click here.",
        )


def test_description_too_long_rejected():
    """Pinterest description hard cap is 500 chars; we cap at 200 for SEO weight."""
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title=VALID_TITLES[0],
            prompt=_prompt_with(VALID_TITLES[0]),
            alt=VALID_ALTS[0],
            description="x" * 201,
        )


def test_description_em_dash_rejected():
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title=VALID_TITLES[0],
            prompt=_prompt_with(VALID_TITLES[0]),
            alt=VALID_ALTS[0],
            description="Stop overspending — click for the 5 pantry swaps that quietly cut your bill in half.",
        )


def test_description_banned_word_rejected():
    with pytest.raises(Exception):
        PinBrief(
            slug="x",
            title=VALID_TITLES[0],
            prompt=_prompt_with(VALID_TITLES[0]),
            alt=VALID_ALTS[0],
            description="Mouthwatering pantry swaps are inside the article. Click here for the full list and start saving.",
        )


def test_description_minimum_length_accepted():
    pb = PinBrief(
        slug="x",
        title=VALID_TITLES[0],
        prompt=_prompt_with(VALID_TITLES[0]),
        alt=VALID_ALTS[0],
        description="x" * 80,
    )
    assert len(pb.description) == 80


def test_description_maximum_length_accepted():
    pb = PinBrief(
        slug="x",
        title=VALID_TITLES[0],
        prompt=_prompt_with(VALID_TITLES[0]),
        alt=VALID_ALTS[0],
        description="x" * 200,
    )
    assert len(pb.description) == 200
