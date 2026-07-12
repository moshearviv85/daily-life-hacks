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
    assert "Finalize queued topics" in workflow
    assert "id: produce" in workflow
    assert "has_produced=false" in workflow
    assert "Fail if no articles were produced" in workflow
    assert "steps.produce.outputs.has_produced == 'true'" in workflow


def test_pipeline_produce_selected_topics_can_run_as_a_batch():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    assert "timeout-minutes: 180" in workflow
    assert 'TOPIC_IDS="${{ inputs.topic_ids }}"' in workflow
    assert 'STATUS_FILTER="&status=approved"' in workflow
    assert 'if [ -n "$TOPIC_IDS" ]; then' in workflow
    assert 'STATUS_FILTER=""' in workflow
    assert '${PIPELINE_DASHBOARD_BASE_URL}/api/pipeline-topics?key=${DASHBOARD_PASSWORD}${STATUS_FILTER}' in workflow


def test_pipeline_produce_reports_failed_topics_before_final_failure():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    failed_idx = workflow.index("Finalize queued topics")
    sync_idx = workflow.index("Sync pipeline status to D1")
    final_fail_idx = workflow.index("Fail if no articles were produced")
    produce_step = workflow.split("- name: Produce articles", 1)[1].split("- name: Verify generated", 1)[0]

    assert "sys.exit(1)" not in produce_step
    assert failed_idx < sync_idx < final_fail_idx


def test_pipeline_produce_marks_topics_produced_only_after_staging_deploy():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-produce.yml").read_text(encoding="utf-8")

    deploy_idx = workflow.index("- name: Wait for staging Pages deploy")
    produced_idx = workflow.index("- name: Mark topics as produced")
    sync_idx = workflow.index("- name: Sync pipeline status to D1")

    assert deploy_idx < produced_idx < sync_idx
    assert "steps.produce.outputs.has_produced == 'true'" in _step(
        workflow,
        "Mark topics as produced",
        "Finalize queued topics",
    )
    assert "inputs.dry_run != true" in _step(
        workflow,
        "Mark topics as produced",
        "Finalize queued topics",
    )


def test_pipeline_produce_supports_dry_run_without_publish_side_effects():
    workflow = _workflow("pipeline-produce.yml")

    assert "dry_run:" in workflow
    assert "default: 'false'" in workflow
    assert "assert_pin_destinations.py" in workflow
    assert "--topics pipeline-data/produced-topics.json" in workflow
    assert "Dry-run summary (skip publish side effects)" in workflow
    assert "inputs.dry_run == true" in workflow
    assert "inputs.dry_run != true" in _step(
        workflow,
        "Commit and push generated files",
        "Wait for staging Pages deploy",
    )
    assert "inputs.dry_run != true" in _step(
        workflow,
        "Wait for staging Pages deploy",
        "Mark topics as produced",
    )
    assert "inputs.dry_run != true" in _step(
        workflow,
        "Reject low-quality approved topics",
        "Mark selected topics as queued",
    )
    assert "inputs.dry_run != true" in _step(
        workflow,
        "Mark selected topics as queued",
        "Produce articles",
    )


def test_pipeline_produce_always_releases_queued_topics_after_failure():
    workflow = _workflow("pipeline-produce.yml")
    prepare_idx = workflow.index("Prepare selected topic ids")
    reject_idx = workflow.index("Reject low-quality approved topics")
    queue_idx = workflow.index("Mark selected topics as queued")
    finalize = _step(
        workflow,
        "Finalize queued topics",
        "Sync pipeline status to D1",
    )

    assert prepare_idx < reject_idx < queue_idx
    assert "if: always() && inputs.dry_run != true" in finalize
    assert "steps.mark_produced.outcome" in finalize
    assert "/tmp/failed-topic-ids.json" in finalize
    assert "/tmp/selected-topic-ids.json" in finalize
    assert "action=approve" in finalize
    assert "id: mark_produced" in workflow


def test_staging_generation_workflows_build_before_push():
    workflow = _workflow("pipeline-produce.yml")

    verify_idx = workflow.index("Verify generated staging artifacts")
    build_idx = workflow.index("Build staging site")
    commit_idx = workflow.index("Commit and push generated files")
    wait_idx = workflow.index("Wait for staging Pages deploy")
    dry_idx = workflow.index("Dry-run summary (skip publish side effects)")

    assert verify_idx < build_idx < dry_idx < commit_idx < wait_idx
    assert "npm run build:checked" in workflow
    assert "pipeline-data/reports/" in workflow
    assert "wrangler-action" not in workflow


def test_pipeline_discover_is_bounded_and_reported():
    workflow = _workflow("pipeline-discover.yml")

    assert "default: '12'" in workflow
    assert "--limit \"$DISCOVER_LIMIT\"" in workflow
    assert "--report \"pipeline-data/reports/pipeline-discover-${{ github.run_id }}.json\"" in workflow
    assert "OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}" in workflow
    assert "Discover from LLM content gaps" in workflow
    assert "discover_llm_gaps.py" in workflow
    assert "DISCOVER_GAP_COUNT" in workflow
    assert "LLM gaps" in workflow
    assert "--semantic-dedup" in workflow
    assert "--semantic-model \"$DISCOVER_SEMANTIC_MODEL\"" in workflow
    assert "--semantic-pool \"$SEMANTIC_POOL\"" in workflow
    assert "Semantic duplicate gate" in workflow
    assert "--require-added" not in workflow
    assert "no new topics were added; discovery completed without technical errors" in workflow
    assert "actions/upload-artifact@v4" in workflow
    assert "GITHUB_STEP_SUMMARY" in workflow


def test_pipeline_daily_archived_out_of_active_workflows():
    active = ROOT / ".github" / "workflows" / "pipeline-daily.yml"
    archived = ROOT / "archive" / "github-workflows" / "pipeline-daily.yml"
    assert not active.exists()
    assert archived.exists()
    assert "pipeline-produce-staging" in archived.read_text(encoding="utf-8")


def test_staging_pipeline_workflows_use_staging_dashboard_api():
    for name in ("pipeline-produce.yml", "pipeline-article-assets.yml", "pipeline-discover.yml"):
        workflow = _workflow(name)

        assert 'PIPELINE_DASHBOARD_BASE_URL: "https://staging.daily-life-hacks.pages.dev"' in workflow
        assert '--base-url "$PIPELINE_DASHBOARD_BASE_URL"' in workflow
        if name == "pipeline-produce.yml":
            assert '${PIPELINE_DASHBOARD_BASE_URL}/api/pipeline-topics' in workflow


def test_staging_pipeline_workflows_do_not_sync_pipeline_to_production_api():
    for name in ("pipeline-produce.yml", "pipeline-article-assets.yml", "pipeline-discover.yml"):
        workflow = _workflow(name)

        assert "https://www.daily-life-hacks.com/api/pipeline-topics" not in workflow
        assert "sync_pipeline_to_d1.py --key" not in workflow


def test_publish_articles_archived_out_of_active_workflows():
    active = ROOT / ".github" / "workflows" / "publish-articles.yml"
    archived = ROOT / "archive" / "github-workflows" / "publish-articles.yml"
    assert not active.exists()
    assert archived.exists()
    assert "workflow_dispatch" in archived.read_text(encoding="utf-8")


def test_deploy_concurrency_is_branch_scoped():
    workflow = _workflow("deploy-cloudflare-pages.yml")
    assert "cloudflare-pages-deploy-${{ github.ref_name }}" in workflow
    assert "npm run build:checked" in workflow
    assert "wrangler-action" in workflow  # only deploy path may wrangler-deploy


def test_ci_runs_build_checked_on_prs():
    workflow = _workflow("ci.yml")
    assert "pull_request:" in workflow
    assert "npm run build:checked" in workflow
    assert "canonical-routing.test.mjs" in workflow
    assert "pipeline_article_gate_test.py" in workflow


def test_active_workflows_inventory_excludes_archived_publishers():
    active_dir = ROOT / ".github" / "workflows"
    names = sorted(p.name for p in active_dir.glob("*.yml"))
    assert "ci.yml" in names
    assert "deploy-cloudflare-pages.yml" in names
    assert "pipeline-produce.yml" in names
    assert "promote-staging.yml" in names
    assert "publish-articles.yml" not in names
    assert "pipeline-daily.yml" not in names
    # Only deploy workflow may call wrangler pages deploy
    for name in names:
        text = (active_dir / name).read_text(encoding="utf-8")
        if name == "deploy-cloudflare-pages.yml":
            assert "wrangler-action" in text or "pages deploy" in text
        else:
            assert "wrangler-action" not in text


def test_article_assets_build_before_push_and_no_wrangler():
    workflow = _workflow("pipeline-article-assets.yml")
    build_idx = workflow.index("Build staging site")
    commit_idx = workflow.index("Commit and push generated assets")
    wait_idx = workflow.index("Wait for staging Pages deploy")
    assert build_idx < commit_idx < wait_idx
    assert "npm run build:checked" in workflow
    assert "wrangler-action" not in workflow


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


def test_article_assets_can_regenerate_only_support_image():
    workflow = (ROOT / ".github" / "workflows" / "pipeline-article-assets.yml").read_text(encoding="utf-8")
    source = (
        ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "continue_article_assets.py"
    ).read_text(encoding="utf-8")
    verifier = (
        ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "verify_pipeline_artifacts.py"
    ).read_text(encoding="utf-8")

    assert "support_only" in workflow
    assert "--support-only --force-images" in workflow
    assert "--support-only" in workflow
    assert "--support-only" in source
    assert "generate_support_image.py" in source
    assert "--support-only" in verifier
    assert "support_only" in verifier
