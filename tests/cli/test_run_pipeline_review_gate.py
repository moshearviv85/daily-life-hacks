from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUN_PIPELINE = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "run_pipeline.py"


def test_review_stage_is_opt_in_not_default():
    source = RUN_PIPELINE.read_text(encoding="utf-8")

    assert 'p.add_argument("--review", action="store_true"' in source
    assert 'p.add_argument("--model", default=DEFAULT_WRITER_MODEL)' in source
    assert "if args.review:" in source
    assert "run_review(args.db, slug, api_key, model_id=args.review_model)" in source
    assert 'log("SKIP Stage 2: LLM Review (opt-in only)")' in source


def test_article_only_and_skip_images_do_not_require_fal_key():
    source = RUN_PIPELINE.read_text(encoding="utf-8")

    assert "not args.skip_images and not args.article_only" in source
    article_only_block = source.split("if args.article_only:", 1)[1].split("init_brief_schema", 1)[0]
    assert "generate_images.py" not in article_only_block
    assert "generate_pin_images.py" not in article_only_block


def test_run_pipeline_passes_db_to_downstream_asset_stages():
    source = RUN_PIPELINE.read_text(encoding="utf-8")

    for script_name in (
        "generate_hero_brief.py",
        "generate_pin_briefs.py",
        "generate_images.py",
        "generate_pin_images.py",
        "bulk_deploy_articles.py",
    ):
        block = source.split(f'str(SCRIPT_DIR / "{script_name}")', 1)[1]
        assert '"--db", args.db' in block
