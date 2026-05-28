from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_pipeline_produce_stops_before_image_generation_until_article_approval():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    assert "--article-only" in workflow
    assert "--article-only" in workflow.split("Verify generated staging artifacts", 1)[1]


def test_run_pipeline_article_only_exits_before_briefs_and_images():
    source = (
        ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "run_pipeline.py"
    ).read_text(encoding="utf-8")

    article_only_block = source.split("if args.article_only:", 1)[1].split("init_brief_schema", 1)[0]
    assert "bulk_deploy_articles.py" in article_only_block
    assert "generate_hero_brief.py" not in article_only_block
    assert "generate_pin_briefs.py" not in article_only_block
    assert "generate_images.py" not in article_only_block
    assert "generate_pin_images.py" not in article_only_block
