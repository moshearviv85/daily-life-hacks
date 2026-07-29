"""Re-export shim. The canonical module is scripts/lib/d1_csv.py.

This file used to hold a second, independent copy of the Pinterest board
routing, and it drifted. On 2026-07-28 it still carried the pre-2026-07-26
router — retired board names, the old if-chain, no knowledge of the 13 narrow
boards created 2026-07-27, and a board_name_to_id() that returned "" instead
of raising. Routing 80 pins through it sent every one to an old broad board.

The drift was invisible because both copies are importable as `lib.d1_csv`:
anything run with scripts/NEW_PIPELINE_2026-05-08 on sys.path silently got
this one. There is now nothing here to drift — the routing tables live in
exactly one place.

Do not add logic to this file. Edit scripts/lib/d1_csv.py instead.
tests/lib/test_d1_csv.py keeps this a shim.

The canonical module is loaded by path rather than by import because the name
`lib` is already bound to this package: 40+ modules in NEW_PIPELINE_2026-05-08
import `from lib.X`, so `import lib.d1_csv` here would resolve back to this
file. It imports stdlib only, so path-loading it is safe.
"""
from __future__ import annotations

import importlib.util
import types
from pathlib import Path

_CANONICAL = Path(__file__).resolve().parents[2] / "lib" / "d1_csv.py"

if not _CANONICAL.is_file():
    raise ImportError(
        f"canonical router not found at {_CANONICAL}. "
        "scripts/NEW_PIPELINE_2026-05-08/lib/d1_csv.py is a shim over it."
    )

_spec = importlib.util.spec_from_file_location("scripts_lib_d1_csv", _CANONICAL)
_canonical = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_canonical)

# Re-export every public name, so a symbol added to the canonical module shows
# up here without anyone having to remember to update a list.
for _name in dir(_canonical):
    if _name.startswith("_"):
        continue
    _value = getattr(_canonical, _name)
    if isinstance(_value, types.ModuleType):
        continue  # canonical's own stdlib imports, not part of its API
    globals()[_name] = _value

del _name, _value, _spec
