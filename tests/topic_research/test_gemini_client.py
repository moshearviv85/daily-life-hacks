"""Tests for Gemini 3.1 Pro client used by stage1/stage2 orchestrators."""
import json
import urllib.error
from unittest.mock import patch, MagicMock

import pytest

try:
    from scripts.topic_research.llm.gemini import (
        generate,
        GeminiError,
        DEFAULT_MODEL,
    )
except ImportError:
    generate = None
    GeminiError = None
    DEFAULT_MODEL = None


def _mock_response(body: dict | str):
    """Build a MagicMock that fakes urlopen's context-manager response."""
    raw = body if isinstance(body, str) else json.dumps(body)
    mock = MagicMock()
    mock.return_value.__enter__.return_value.read.return_value = raw.encode("utf-8")
    return mock


# Realistic Gemini generateContent response shape
def _gemini_response(text: str) -> dict:
    return {
        "candidates": [
            {
                "content": {"parts": [{"text": text}], "role": "model"},
                "finishReason": "STOP",
            }
        ],
        "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 20},
    }


# ─────────────────────────────────────────────────────────────────

def test_module_exists():
    assert generate is not None
    assert GeminiError is not None


def test_default_model_is_gemini_31_pro_preview():
    assert DEFAULT_MODEL == "gemini-3.1-pro-preview"


def test_generate_returns_plain_text_when_no_schema():
    mock = _mock_response(_gemini_response("hello world"))
    with patch("urllib.request.urlopen", mock):
        result = generate(prompt="hi", api_key="fake-key")
    assert result == "hello world"


def test_generate_parses_json_when_schema_provided():
    payload = {"keywords": ["a", "b", "c"]}
    mock = _mock_response(_gemini_response(json.dumps(payload)))
    schema = {
        "type": "object",
        "properties": {"keywords": {"type": "array", "items": {"type": "string"}}},
    }
    with patch("urllib.request.urlopen", mock):
        result = generate(prompt="list", api_key="fake-key", schema=schema)
    assert result == payload


def test_generate_builds_correct_url_with_api_key():
    mock = _mock_response(_gemini_response("ok"))
    with patch("urllib.request.urlopen", mock) as m:
        generate(prompt="hi", api_key="SECRET_KEY_123")

    req = m.call_args[0][0]
    url = req.full_url if hasattr(req, "full_url") else req.get_full_url()
    assert "generativelanguage.googleapis.com" in url
    assert "gemini-3.1-pro-preview" in url
    assert ":generateContent" in url
    assert "key=SECRET_KEY_123" in url


def test_generate_sends_prompt_in_request_body():
    mock = _mock_response(_gemini_response("ok"))
    with patch("urllib.request.urlopen", mock) as m:
        generate(prompt="analyze this text", api_key="k")

    req = m.call_args[0][0]
    body = json.loads(req.data.decode("utf-8"))
    assert body["contents"][0]["parts"][0]["text"] == "analyze this text"


def test_generate_sets_structured_output_when_schema_provided():
    mock = _mock_response(_gemini_response('{"a": 1}'))
    schema = {"type": "object", "properties": {"a": {"type": "integer"}}}
    with patch("urllib.request.urlopen", mock) as m:
        generate(prompt="x", api_key="k", schema=schema)

    req = m.call_args[0][0]
    body = json.loads(req.data.decode("utf-8"))
    cfg = body["generationConfig"]
    assert cfg["response_mime_type"] == "application/json"
    assert cfg["response_schema"] == schema


def test_generate_respects_temperature():
    mock = _mock_response(_gemini_response("ok"))
    with patch("urllib.request.urlopen", mock) as m:
        generate(prompt="x", api_key="k", temperature=0.15)

    req = m.call_args[0][0]
    body = json.loads(req.data.decode("utf-8"))
    assert body["generationConfig"]["temperature"] == 0.15


def test_generate_uses_custom_model_when_passed():
    mock = _mock_response(_gemini_response("ok"))
    with patch("urllib.request.urlopen", mock) as m:
        generate(prompt="x", api_key="k", model="gemini-2.5-flash")

    req = m.call_args[0][0]
    url = req.full_url if hasattr(req, "full_url") else req.get_full_url()
    assert "gemini-2.5-flash:generateContent" in url


def test_generate_raises_on_http_error():
    http_err = urllib.error.HTTPError(
        url="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
        code=429,
        msg="Too Many Requests",
        hdrs={},
        fp=None,
    )
    mock = MagicMock(side_effect=http_err)
    with patch("urllib.request.urlopen", mock):
        with pytest.raises(GeminiError, match="429"):
            generate(prompt="x", api_key="k")


def test_generate_raises_on_empty_candidates():
    mock = _mock_response({"candidates": []})
    with patch("urllib.request.urlopen", mock):
        with pytest.raises(GeminiError, match="no candidates"):
            generate(prompt="x", api_key="k")


def test_generate_raises_on_blocked_finish_reason():
    """Gemini returns finishReason='SAFETY' with no text when safety filters trigger."""
    blocked = {
        "candidates": [
            {
                "finishReason": "SAFETY",
                "content": {"parts": [], "role": "model"},
            }
        ]
    }
    mock = _mock_response(blocked)
    with patch("urllib.request.urlopen", mock):
        with pytest.raises(GeminiError, match="SAFETY"):
            generate(prompt="x", api_key="k")


def test_generate_raises_on_bad_json_when_schema_given():
    mock = _mock_response(_gemini_response("not-valid-json {{"))
    schema = {"type": "object"}
    with patch("urllib.request.urlopen", mock):
        with pytest.raises(GeminiError, match="JSON"):
            generate(prompt="x", api_key="k", schema=schema)


def test_generate_requires_api_key():
    with pytest.raises(ValueError, match="api_key"):
        generate(prompt="x", api_key="")
