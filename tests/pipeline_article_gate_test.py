from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _workflow(name: str) -> str:
    return (ROOT / ".github" / "workflows" / name).read_text(encoding="utf-8")


def _step(workflow: str, start_name: str, end_name: str) -> str:
    return workflow.split(f"- name: {start_name}", 1)[1].split(f"- name: {end_name}", 1)[0]


def test_pipeline_produce_generates_full_staging_package():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")
    produce_step = _step(workflow, "Produce articles", "Verify generated")
    verify_step = workflow.split("- name: Verify generated staging artifacts", 1)[1].split("- uses: actions/setup-node", 1)[0]

    assert "default: '1'" in workflow
    assert "run_pipeline.py" in produce_step
    assert "--article-only" not in produce_step
    assert "--article-only" not in verify_step
    assert '--report "pipeline-data/reports/pipeline-produce-${{ github.run_id }}.json"' in verify_step


def test_pipeline_produce_keeps_successful_topics_when_one_topic_fails():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    assert "pipeline-data/produced-topics.json" in workflow
    assert "pipeline-data/failed-topics.json" in workflow
    assert "/tmp/produced-topic-ids.json" in workflow
    assert "/tmp/failed-topic-ids.json" in workflow
    assert "--selected-topics pipeline-data/produced-topics.json" in workflow
    assert "No topics produced successfully." in workflow
    assert "Report failed topics without rejecting" in workflow
    assert "id: produce" in workflow
    assert "has_produced=false" in workflow
    assert "Fail if no articles were produced" in workflow
    assert "steps.produce.outputs.has_produced == 'true'" in workflow


def test_pipeline_produce_reports_failed_topics_before_final_failure():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    failed_idx = workflow.index("Report failed topics without rejecting")
    sync_idx = workflow.index("Sync pipeline status to D1")
    final_fail_idx = workflow.index("Fail if no articles were produced")
    produce_step = workflow.split("- name: Produce articles", 1)[1].split("- name: Verify generated", 1)[0]

    assert "sys.exit(1)" not in produce_step
    assert failed_idx < sync_idx < final_fail_idx


def test_staging_generation_workflows_build_before_push():
    for name in ("pipeline-produce.yml", "pipeline-daily.yml"):
        workflow = _workflow(name)

        verify_idx = workflow.index("Verify generated staging artifacts")
        build_idx = workflow.index("Build staging site")
        commit_idx = workflow.index("Commit and push generated files")
        deploy_idx = workflow.index("Deploy staging to Cloudflare Pages")

        assert verify_idx < build_idx < commit_idx < deploy_idx
        assert "pipeline-data/reports/" in workflow


def test_pipeline_discover_is_bounded_and_reported():
    workflow = _workflow("pipeline-discover.yml")

    assert "default: '12'" in workflow
    assert "--limit \"$DISCOVER_LIMIT\"" in workflow
    assert "--report \"pipeline-data/reports/pipeline-discover-${{ github.run_id }}.json\"" in workflow
    assert "OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}" in workflow
    assert "--semantic-dedup" in workflow
    assert "--semantic-model \"$DISCOVER_SEMANTIC_MODEL\"" in workflow
    assert "Semantic duplicate gate" in workflow
    assert "--require-added" in workflow
    assert "actions/upload-artifact@v4" in workflow
    assert "GITHUB_STEP_SUMMARY" in workflow


def test_pipeline_daily_tracks_produced_and_failed_topics_separately():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-daily.yml").read_text(encoding="utf-8")

    assert "pipeline-data/produced-topics.json" in workflow
    assert "pipeline-data/failed-topics.json" in workflow
    assert "/tmp/produced-topic-ids.json" in workflow
    assert "/tmp/failed-topic-ids.json" in workflow
    assert "Mark failed topics as rejected" in workflow
    assert "IDS=$(cat /tmp/produced-topic-ids.json)" in workflow
    assert "--selected-topics pipeline-data/produced-topics.json" in workflow
    assert "Fail if no articles were produced" in workflow


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
