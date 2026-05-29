import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROMPT_BUILDER = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "lib" / "prompt_builder.py"
HERO_BRIEF = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "generate_hero_brief.py"


def load_prompt_builder():
    sys.path.insert(0, str(PROMPT_BUILDER.parents[1]))
    spec = importlib.util.spec_from_file_location("new_pipeline_prompt_builder", PROMPT_BUILDER)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_hero_prompt_demands_bright_colorful_images():
    prompt_builder = load_prompt_builder()
    prompt = prompt_builder.build_hero_system().lower()

    assert "bright, fresh, colorful" in prompt
    assert "natural daylight" in prompt
    assert "avoid dark" in prompt
    assert "gloomy" in prompt
    assert "underexposed" in prompt


def test_actual_hero_brief_script_demands_bright_colorful_images():
    source = HERO_BRIEF.read_text(encoding="utf-8").lower()

    assert "bright, fresh, colorful" in source
    assert "natural daylight" in source
    assert "avoid dark" in source
    assert "underexposed" in source
