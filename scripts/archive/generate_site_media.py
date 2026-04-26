"""Wrapper module.

The project has legacy scripts with hyphens in filenames (e.g. generate-site-media.py),
which cannot be imported as Python modules.

`scripts.image_engine.ImageEngine` expects to import `scripts.generate_site_media`.
This file bridges that gap by loading the hyphen script with runpy and re-exporting
the small API surface the engine needs.
"""

from __future__ import annotations

import runpy
from pathlib import Path


_NS = runpy.run_path(str(Path(__file__).with_name("generate-site-media.py")))

call_api = _NS["call_api"]
need_regen = _NS["need_regen"]
