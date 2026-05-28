from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "post-pins.py"


def test_pin_row_id_is_applied_to_pins_next_request_not_env_int():
    source = SCRIPT.read_text(encoding="utf-8")
    env_int_block = source.split("MAX_PINS_PER_RUN = _env_int", 1)[0].split("def _env_int", 1)[1]
    get_next_pin_block = source.split("def get_next_pin", 1)[1].split("#", 1)[0]

    assert 'params["row_id"] = PIN_ROW_ID' not in env_int_block
    assert 'params["row_id"] = PIN_ROW_ID' in get_next_pin_block
    assert 'print(f"Target row_id: {PIN_ROW_ID}")' in get_next_pin_block


def test_post_pins_is_safety_capped_to_one_pin_per_run():
    source = SCRIPT.read_text(encoding="utf-8")

    assert 'MAX_PINS_PER_RUN = _env_int("MAX_PINS_PER_RUN", 1, maximum=1)' in source
