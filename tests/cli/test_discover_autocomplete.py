import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "discover_autocomplete.py"
spec = importlib.util.spec_from_file_location("discover_autocomplete", SCRIPT)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)


GENERIC_SEEDS = {
    "healthy meal prep",
    "quick dinner recipes",
    "easy breakfast ideas",
    "nutrition tips for",
    "healthy snack ideas",
    "simple lunch recipes",
    "food prep tips",
    "kitchen hacks for",
    "healthy eating habits",
    "budget meal ideas",
}


def test_default_autocomplete_seeds_do_not_start_from_generic_heads():
    assert not (set(mod.DEFAULT_SEEDS) & GENERIC_SEEDS)


def test_discover_from_seeds_skips_seed_echo(monkeypatch):
    def fake_fetch(query):
        return [
            query,
            f"{query} for freezer meals",
            f"{query} for freezer meals",
        ]

    monkeypatch.setattr(mod, "fetch_autocomplete", fake_fetch)

    topics = mod.discover_from_seeds(["meal prep rice bowls"], delay=0)

    assert topics == [
        {
            "topic": "meal prep rice bowls for freezer meals",
            "source": "autocomplete",
            "seed": "meal prep rice bowls",
        }
    ]
