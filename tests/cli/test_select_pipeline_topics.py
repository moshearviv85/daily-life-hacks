import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "select_pipeline_topics.py"
spec = importlib.util.spec_from_file_location("select_pipeline_topics", SCRIPT)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)


def test_select_topics_rejects_generic_approved_topics_before_produce():
    topics = [
        {"id": 1, "topic": "food prep guide blog recipes", "category": "recipes"},
        {"id": 2, "topic": "food prep guide recipes", "category": "recipes"},
        {"id": 3, "topic": "how to keep berries fresh longer", "category": "tips"},
    ]

    selected, rejected = mod.select_topics(topics, count=3, known_titles=[])

    assert [t["id"] for t in selected] == [3]
    assert [t["id"] for t in rejected] == [1, 2]
    assert all("generic" in t["reject_reason"] for t in rejected)


def test_select_topics_applies_gate_to_explicit_topic_ids():
    topics = [
        {"id": 10, "topic": "food prep guide recipes", "category": "recipes"},
        {"id": 11, "topic": "how to freeze soup in single servings", "category": "tips"},
    ]

    selected, rejected = mod.select_topics(
        topics,
        count=2,
        topic_ids={10, 11},
        known_titles=[],
    )

    assert [t["id"] for t in selected] == [11]
    assert [t["id"] for t in rejected] == [10]
