from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_article_publisher_allows_three_articles_per_day():
    source = (ROOT / "scripts" / "publish-articles.py").read_text(encoding="utf-8")

    assert "to_publish = to_publish[:3]" in source
    assert "to_publish = to_publish[:2]" not in source
