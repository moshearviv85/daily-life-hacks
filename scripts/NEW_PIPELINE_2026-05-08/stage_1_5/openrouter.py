"""OpenRouter REST client and live model-catalog fetcher.

Endpoints used
--------------
GET  https://openrouter.ai/api/v1/models             (public, no auth)
POST https://openrouter.ai/api/v1/chat/completions   (requires Bearer auth)

No third-party SDK. Uses only stdlib so the script stays portable.
"""
from __future__ import annotations

import json
import http.client
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

MODELS_URL = "https://openrouter.ai/api/v1/models"
CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

HTTP_REFERER = "https://daily-life-hacks.com"
X_TITLE = "Daily Life Hacks - Stage 1.5 Discovery"


class OpenRouterError(RuntimeError):
    pass


@dataclass(frozen=True)
class ModelInfo:
    id: str
    name: str
    context_length: int
    prompt_price_per_m: float
    completion_price_per_m: float
    provider: str
    created: int
    supported_parameters: tuple[str, ...]

    @property
    def slug_provider(self) -> str:
        return self.id.split("/", 1)[0] if "/" in self.id else ""


def fetch_catalog(*, timeout: int = 30) -> list[ModelInfo]:
    req = urllib.request.Request(
        MODELS_URL,
        headers={"User-Agent": "dlh-stage1.5/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            payload = json.loads(r.read())
    except urllib.error.URLError as exc:
        raise OpenRouterError(f"failed to fetch models catalog: {exc}") from exc

    out: list[ModelInfo] = []
    for m in payload.get("data", []):
        try:
            pricing = m.get("pricing") or {}
            prompt_cost = float(pricing.get("prompt", 0) or 0) * 1_000_000
            completion_cost = float(pricing.get("completion", 0) or 0) * 1_000_000
            supp = tuple(m.get("supported_parameters") or [])
            out.append(ModelInfo(
                id=m["id"],
                name=m.get("name") or m["id"],
                context_length=int(m.get("context_length") or 0),
                prompt_price_per_m=prompt_cost,
                completion_price_per_m=completion_cost,
                provider=(m.get("id", "").split("/", 1)[0] or ""),
                created=int(m.get("created") or 0),
                supported_parameters=supp,
            ))
        except (KeyError, TypeError, ValueError):
            continue
    return out


def chat_completion(
    *,
    api_key: str,
    model_id: str,
    system: str,
    user: str,
    temperature: float = 0.7,
    max_tokens: int = 8000,
    timeout: int = 180,
) -> dict[str, Any]:
    """Make a single chat-completion call. Returns parsed JSON response.

    Raises OpenRouterError on HTTP failure or malformed response.
    """
    body = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "usage": {"include": True},
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        CHAT_URL,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": HTTP_REFERER,
            "X-Title": X_TITLE,
            "User-Agent": "dlh-stage1.5/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
    except urllib.error.HTTPError as exc:
        try:
            err_body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            err_body = ""
        raise OpenRouterError(f"HTTP {exc.code}: {err_body[:500]}") from exc
    except urllib.error.URLError as exc:
        raise OpenRouterError(f"network error: {exc}") from exc
    except (http.client.IncompleteRead, TimeoutError, ConnectionError, OSError) as exc:
        raise OpenRouterError(f"network incomplete read: {exc}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise OpenRouterError(f"invalid JSON response: {raw[:300]!r}") from exc


def extract_text(resp: dict[str, Any]) -> tuple[str, str]:
    """Return (text, finish_reason) from a chat-completion response."""
    choices = resp.get("choices") or []
    if not choices:
        raise OpenRouterError("no choices in response")
    c0 = choices[0]
    msg = c0.get("message") or {}
    content = msg.get("content") or ""
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                t = part.get("text")
                if t:
                    parts.append(t)
        content = "".join(parts)
    finish = c0.get("finish_reason") or ""
    return content, finish


def usage_cost(resp: dict[str, Any]) -> tuple[int | None, int | None, float | None]:
    """Return (tokens_in, tokens_out, cost_usd) from a chat-completion response."""
    usage = resp.get("usage") or {}
    tokens_in = usage.get("prompt_tokens")
    tokens_out = usage.get("completion_tokens")
    cost = usage.get("cost")
    try:
        tokens_in = int(tokens_in) if tokens_in is not None else None
    except (TypeError, ValueError):
        tokens_in = None
    try:
        tokens_out = int(tokens_out) if tokens_out is not None else None
    except (TypeError, ValueError):
        tokens_out = None
    try:
        cost = float(cost) if cost is not None else None
    except (TypeError, ValueError):
        cost = None
    return tokens_in, tokens_out, cost


def call_with_retry(
    *,
    api_key: str,
    model_id: str,
    system: str,
    user: str,
    temperature: float,
    max_tokens: int,
    timeout: int,
    retries: int = 2,
    backoff_seconds: float = 3.0,
) -> tuple[dict[str, Any], int]:
    """Call chat_completion with retries on transient failures.

    Returns (response, latency_ms). Raises OpenRouterError after the final retry.
    """
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        start = time.monotonic()
        try:
            resp = chat_completion(
                api_key=api_key,
                model_id=model_id,
                system=system,
                user=user,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )
            latency_ms = int((time.monotonic() - start) * 1000)
            return resp, latency_ms
        except OpenRouterError as exc:
            last_err = exc
            msg = str(exc)
            if attempt < retries and _is_retryable(msg):
                time.sleep(backoff_seconds * (attempt + 1))
                continue
            raise
    assert last_err is not None
    raise last_err


def _is_retryable(msg: str) -> bool:
    lower = msg.lower()
    if "http 4" in lower and "http 408" not in lower and "http 429" not in lower:
        return False
    return any(kw in lower for kw in (
        "timeout", "timed out", "network", "http 5", "http 408", "http 429",
        "temporarily", "overloaded", "bad gateway", "incomplete read",
        "invalid json response", "chunked",
    ))
