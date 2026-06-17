from __future__ import annotations

import http.client
import importlib.util
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "stage_1_5" / "openrouter.py"


def _load_openrouter():
    spec = importlib.util.spec_from_file_location("new_pipeline_openrouter_retry", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_chat_completion_wraps_incomplete_chunk_reads(monkeypatch):
    openrouter = _load_openrouter()

    class BrokenResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            raise http.client.IncompleteRead(b"partial")

    monkeypatch.setattr(openrouter.urllib.request, "urlopen", lambda *_args, **_kwargs: BrokenResponse())

    with pytest.raises(openrouter.OpenRouterError, match="network incomplete read"):
        openrouter.chat_completion(
            api_key="test",
            model_id="minimax/minimax-m2.5",
            system="system",
            user="user",
            timeout=1,
        )


def test_incomplete_and_partial_json_errors_are_retryable():
    openrouter = _load_openrouter()

    assert openrouter._is_retryable("network incomplete read: IncompleteRead")
    assert openrouter._is_retryable("invalid JSON response: b'{partial'")
