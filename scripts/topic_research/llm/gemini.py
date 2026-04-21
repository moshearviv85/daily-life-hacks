"""Gemini 3.1 Pro client for the topic-research pipeline.

Uses the REST generateContent endpoint directly (no google-generativeai dep).
Supports plain-text and structured-output (JSON) modes.

Failures raise GeminiError — unlike the source fetchers which swallow
failures, an LLM failure stops the stage because the orchestrator has
no output to persist.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

DEFAULT_MODEL = "gemini-3.1-pro-preview"
_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiError(RuntimeError):
    """Raised when the Gemini API call fails or returns unusable content."""


def generate(
    prompt: str,
    api_key: str,
    schema: dict[str, Any] | None = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.2,
    timeout: int = 60,
) -> str | dict[str, Any] | list[Any]:
    """Call Gemini and return text (or parsed JSON if schema is given).

    Args:
        prompt: User prompt sent as a single content part.
        api_key: Google AI Studio API key. Required.
        schema: Optional JSON schema for structured output. When set, the
            response is parsed and returned as a dict/list.
        model: Model name. Defaults to gemini-3.1-pro-preview.
        temperature: Sampling temperature. Lower = more deterministic.
        timeout: HTTP timeout in seconds.

    Raises:
        ValueError: if api_key is empty.
        GeminiError: on HTTP failure, empty candidates, safety block, or
            invalid JSON when schema is provided.
    """
    if not api_key:
        raise ValueError("api_key is required")

    url = f"{_API_BASE}/{model}:generateContent?key={api_key}"

    body: dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}], "role": "user"}],
        "generationConfig": {"temperature": temperature},
    }
    if schema is not None:
        body["generationConfig"]["response_mime_type"] = "application/json"
        body["generationConfig"]["response_schema"] = schema

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8", errors="replace")[:500] if e.fp else ""
        except Exception:
            pass
        raise GeminiError(f"Gemini HTTP {e.code}: {e.reason}. {detail}") from e
    except urllib.error.URLError as e:
        raise GeminiError(f"Gemini network error: {e.reason}") from e
    except Exception as e:
        raise GeminiError(f"Gemini request failed: {e}") from e

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise GeminiError(f"Gemini returned non-JSON response: {e}") from e

    candidates = data.get("candidates") or []
    if not candidates:
        raise GeminiError(f"Gemini returned no candidates. Response: {data}")

    cand = candidates[0]
    finish = cand.get("finishReason")
    parts = (cand.get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))

    if not text:
        raise GeminiError(
            f"Gemini returned empty content (finishReason={finish!r})"
        )

    if finish and finish not in {"STOP", "MAX_TOKENS"}:
        raise GeminiError(f"Gemini stopped abnormally: finishReason={finish!r}")

    if schema is None:
        return text

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise GeminiError(
            f"Gemini response was not valid JSON despite schema: {e}. "
            f"Raw text: {text[:500]}"
        ) from e


if __name__ == "__main__":
    import os
    import sys
    from pathlib import Path

    # Load .env
    env_path = Path(".env")
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("GEMINI_API_KEY not set in environment", file=sys.stderr)
        sys.exit(1)

    prompt = sys.argv[1] if len(sys.argv) > 1 else "Say 'hello' in one word."
    print(generate(prompt=prompt, api_key=key))
