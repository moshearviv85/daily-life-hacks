"""Wrapper module.

Loads `generate-pinterest-pins.py` (hyphen filename) and re-exports helpers used by
`scripts.image_engine.ImageEngine`.
"""

from __future__ import annotations

import runpy
from pathlib import Path


_NS = runpy.run_path(str(Path(__file__).with_name("generate-pinterest-pins.py")))

is_portrait = _NS["is_portrait"]
generate_pin = _NS["generate_pin"]
