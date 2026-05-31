from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_pipeline_produce_stops_before_image_generation_until_article_approval():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    assert "--article-only" in workflow
    assert "--article-only" in workflow.split("Verify generated staging artifacts", 1)[1]


def test_pipeline_produce_keeps_successful_topics_when_one_topic_fails():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    assert "pipeline-data/produced-topics.json" in workflow
    assert "pipeline-data/failed-topics.json" in workflow
    assert "/tmp/produced-topic-ids.json" in workflow
    assert "/tmp/failed-topic-ids.json" in workflow
    assert "--selected-topics pipeline-data/produced-topics.json" in workflow
    assert "No topics produced successfully." in workflow
    assert "Mark failed topics as rejected" in workflow


def test_staging_pipeline_workflows_use_staging_dashboard_api():
    for name in ("pipeline-produce.yml", "pipeline-daily.yml", "pipeline-article-assets.yml", "pipeline-discover.yml"):
        workflow = (ROOT / ".github" / "workflows" / name).read_text(encoding="utf-8")

        assert 'PIPELINE_DASHBOARD_BASE_URL: "https://staging.daily-life-hacks.pages.dev"' in workflow
        assert '--base-url "$PIPELINE_DASHBOARD_BASE_URL"' in workflow
        if name in ("pipeline-produce.yml", "pipeline-daily.yml"):
            assert '${PIPELINE_DASHBOARD_BASE_URL}/api/pipeline-topics' in workflow


def test_staging_pipeline_workflows_do_not_sync_pipeline_to_production_api():
    for name in ("pipeline-produce.yml", "pipeline-daily.yml", "pipeline-article-assets.yml", "pipeline-discover.yml"):
        workflow = (ROOT / ".github" / "workflows" / name).read_text(encoding="utf-8")

        assert "https://www.daily-life-hacks.com/api/pipeline-topics" not in workflow
        assert "sync_pipeline_to_d1.py --key" not in workflow


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


def test_article_assets_workflow_runs_only_after_approval():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-article-assets.yml").read_text(encoding="utf-8")

    assert "workflow_dispatch" in workflow
    assert "continue_article_assets.py" in workflow
    assert "verify_pipeline_artifacts.py" in workflow
    assert "--article-only" not in workflow


def test_continue_article_assets_does_not_rewrite_article_content():
    source = (
        ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "continue_article_assets.py"
    ).read_text(encoding="utf-8")

    assert "generate_hero_brief.py" in source
    assert "generate_pin_briefs.py" in source
    assert "generate_images.py" in source
    assert "generate_pin_images.py" in source
    assert "write.py" not in source
    assert "run_review" not in source


def test_article_assets_can_regenerate_only_hero_image():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-article-assets.yml").read_text(encoding="utf-8")
    source = (
        ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "continue_article_assets.py"
    ).read_text(encoding="utf-8")

    assert "mode:" in workflow
    assert "--hero-only --force-images" in workflow
    assert "verify_pipeline_artifacts.py" in workflow
    assert "--hero-only" in workflow
    assert "--hero-only" in source
    assert "--force-images" in source
    assert "if not args.hero_only" in source
