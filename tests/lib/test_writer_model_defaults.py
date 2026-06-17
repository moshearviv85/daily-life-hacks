from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08"

if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def test_canonical_writer_default_is_minimax():
    from lib.model_defaults import BRIEF_MODEL, WRITER_MODEL

    write = _load("new_pipeline_write_defaults", SCRIPT_DIR / "write.py")
    run_pipeline = _load("new_pipeline_run_pipeline_defaults", SCRIPT_DIR / "run_pipeline.py")
    hero = _load("new_pipeline_hero_defaults", SCRIPT_DIR / "generate_hero_brief.py")
    pins = _load("new_pipeline_pin_defaults", SCRIPT_DIR / "generate_pin_briefs.py")
    polish = _load("new_pipeline_polish_defaults", SCRIPT_DIR / "polish_article_text.py")

    assert WRITER_MODEL == "minimax/minimax-m2.5"
    assert BRIEF_MODEL == "minimax/minimax-m2.5"
    assert write.DEFAULT_MODEL == "minimax/minimax-m2.5"
    assert run_pipeline.DEFAULT_WRITER_MODEL == "minimax/minimax-m2.5"
    assert hero.DEFAULT_MODEL == "minimax/minimax-m2.5"
    assert pins.DEFAULT_MODEL == "minimax/minimax-m2.5"
    assert polish.DEFAULT_MODEL == "minimax/minimax-m2.5"


def test_writer_polish_and_medical_llm_are_opt_in():
    write = _load("new_pipeline_write_flags", SCRIPT_DIR / "write.py")

    args = write.parse_args(["--count", "1"])

    assert args.model == "minimax/minimax-m2.5"
    assert args.polish is False
    assert args.polish_model is None
    assert args.medical_llm_check is False


def test_run_pipeline_review_is_opt_in_and_db_reaches_brief_steps():
    source = (SCRIPT_DIR / "run_pipeline.py").read_text(encoding="utf-8")

    assert 'p.add_argument("--review", action="store_true"' in source
    assert "if args.review:" in source
    assert 'log("SKIP Stage 2: LLM Review (opt-in only)")' in source

    hero_step = source.split('str(SCRIPT_DIR / "generate_hero_brief.py")', 1)[1]
    hero_step = hero_step.split('str(SCRIPT_DIR / "generate_pin_briefs.py")', 1)[0]
    assert '"--db", args.db' in hero_step

    pin_step = source.split('str(SCRIPT_DIR / "generate_pin_briefs.py")', 1)[1]
    pin_step = pin_step.split("if not args.skip_images:", 1)[0]
    assert '"--db", args.db' in pin_step

    hero_image_step = source.split('str(SCRIPT_DIR / "generate_images.py")', 1)[1]
    hero_image_step = hero_image_step.split('str(SCRIPT_DIR / "generate_pin_images.py")', 1)[0]
    assert '"--db", args.db' in hero_image_step

    pin_image_step = source.split('str(SCRIPT_DIR / "generate_pin_images.py")', 1)[1]
    pin_image_step = pin_image_step.split("if not args.skip_deploy:", 1)[0]
    assert '"--db", args.db' in pin_image_step
