"""FAL.AI HTTP client for the pinterest-50 image discovery.

Two flows supported:
  * Sync (``fal.run/{endpoint}``) — short-running, single POST returns result.
  * Queue (``queue.fal.run/{endpoint}`` + poll) — recommended for slow models
    like GPT Image 2 that take several minutes per call.

Which flow runs is a per-model config: set ``use_queue: True`` in
``models.FAL_CANDIDATES`` to route that model through the queue API.

Common plumbing: 429/503 retry with exponential backoff on the initial POST,
hard-fail on 4xx non-429, auth header from .env, optional image save to disk.

No FAL SDK dependency. Uses ``requests`` directly so the HTTP layer is easy
to mock in tests.
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Optional

import requests

from .models import FAL_CANDIDATES

REPO_ROOT = Path(__file__).resolve().parents[4]
ENV_PATH = REPO_ROOT / ".env"

POLL_INTERVAL_SECONDS = 5.0
QUEUE_STATUS_TIMEOUT_SECONDS = 600.0


class FalError(Exception):
    """Base error for FAL client."""


class FalClientError(FalError):
    """4xx non-429 or caller-side error (unknown model, malformed response)."""


class FalServerError(FalError):
    """5xx / 429 exhausted after max retries, or network/queue timeout."""


def _load_api_key() -> str:
    if ENV_PATH.exists():
        for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("FAL_KEY=") or line.startswith("FAL_API_KEY="):
                _, _, value = line.partition("=")
                return value.strip().strip('"').strip("'")
    key = os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY")
    if not key:
        raise FalError("FAL_KEY / FAL_API_KEY not found in .env or environment")
    return key


def _extract_image_url(raw: Any) -> Optional[str]:
    if not isinstance(raw, dict):
        return None
    images = raw.get("images")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, dict):
            return first.get("url")
    image = raw.get("image")
    if isinstance(image, dict):
        return image.get("url")
    if isinstance(image, str):
        return image
    return None


def _build_payload(
    model_id: str,
    prompt: str,
    aspect_ratio: str,
    seed: Optional[int],
) -> dict[str, Any]:
    config = FAL_CANDIDATES[model_id]
    payload: dict[str, Any] = {"prompt": prompt}
    shape_param = config.get("shape_param", "aspect_ratio")
    if shape_param == "aspect_ratio":
        payload["aspect_ratio"] = aspect_ratio
    elif shape_param == "image_size":
        shape_values = config.get("shape_values") or {}
        payload["image_size"] = shape_values.get(aspect_ratio, aspect_ratio)
    else:
        raise FalClientError(
            f"Unknown shape_param {shape_param!r} for model {model_id}; "
            f"expected 'aspect_ratio' or 'image_size'."
        )
    if seed is not None:
        payload["seed"] = seed
    return payload


def _sync_generate(
    endpoint: str,
    payload: dict,
    headers: dict,
    max_retries: int,
    base_backoff_seconds: float,
    request_timeout_seconds: float,
) -> dict:
    url = f"https://fal.run/{endpoint}"
    last_error: Optional[str] = None
    resp = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=request_timeout_seconds)
        except requests.exceptions.RequestException as exc:
            last_error = f"network: {exc}"
            time.sleep(base_backoff_seconds * (2 ** attempt))
            continue
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 429 or resp.status_code >= 500:
            last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
            time.sleep(base_backoff_seconds * (2 ** attempt))
            continue
        if 400 <= resp.status_code < 500:
            raise FalClientError(f"HTTP {resp.status_code}: {resp.text[:500]}")
        last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
        time.sleep(base_backoff_seconds * (2 ** attempt))
    raise FalServerError(
        f"FAL sync generate exhausted {max_retries} retries. Last error: {last_error}"
    )


def _queued_generate(
    endpoint: str,
    payload: dict,
    headers: dict,
    max_retries: int,
    base_backoff_seconds: float,
    request_timeout_seconds: float,
) -> dict:
    submit_url = f"https://queue.fal.run/{endpoint}"
    last_error: Optional[str] = None
    submit_body: Optional[dict] = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(
                submit_url, json=payload, headers=headers, timeout=request_timeout_seconds
            )
        except requests.exceptions.RequestException as exc:
            last_error = f"network: {exc}"
            time.sleep(base_backoff_seconds * (2 ** attempt))
            continue
        if resp.status_code == 200:
            submit_body = resp.json()
            break
        if 400 <= resp.status_code < 500 and resp.status_code != 429:
            raise FalClientError(f"HTTP {resp.status_code}: {resp.text[:500]}")
        last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
        time.sleep(base_backoff_seconds * (2 ** attempt))
    if submit_body is None:
        raise FalServerError(
            f"FAL queue submit exhausted {max_retries} retries. Last error: {last_error}"
        )

    status_url = submit_body.get("status_url")
    response_url = submit_body.get("response_url")
    if not status_url or not response_url:
        raise FalClientError(
            f"Queue submit response missing status_url/response_url: {str(submit_body)[:500]}"
        )

    deadline = time.time() + QUEUE_STATUS_TIMEOUT_SECONDS
    while True:
        s_resp = requests.get(status_url, headers=headers, timeout=request_timeout_seconds)
        if s_resp.status_code == 200:
            s_body = s_resp.json()
            status = s_body.get("status")
            if status == "COMPLETED":
                break
            if status not in {"IN_QUEUE", "IN_PROGRESS"}:
                raise FalServerError(
                    f"Unexpected queue status {status!r} for {endpoint}: {str(s_body)[:300]}"
                )
        elif 400 <= s_resp.status_code < 500 and s_resp.status_code != 429:
            raise FalClientError(
                f"Queue status HTTP {s_resp.status_code}: {s_resp.text[:500]}"
            )
        if time.time() > deadline:
            raise FalServerError(
                f"Queue poll timeout after {QUEUE_STATUS_TIMEOUT_SECONDS}s for {endpoint}"
            )
        time.sleep(POLL_INTERVAL_SECONDS)

    last_error: Optional[str] = None
    raw: Optional[dict] = None
    for attempt in range(max_retries):
        try:
            r_resp = requests.get(response_url, headers=headers, timeout=request_timeout_seconds)
        except requests.exceptions.RequestException as exc:
            last_error = f"network: {exc}"
            time.sleep(base_backoff_seconds * (2 ** attempt))
            continue
        if r_resp.status_code == 200:
            raw = r_resp.json()
            break
        if 400 <= r_resp.status_code < 500 and r_resp.status_code != 429:
            raise FalClientError(
                f"Queue response fetch HTTP {r_resp.status_code}: {r_resp.text[:500]}"
            )
        last_error = f"HTTP {r_resp.status_code}: {r_resp.text[:200]}"
        time.sleep(base_backoff_seconds * (2 ** attempt))
    if raw is None:
        raise FalServerError(
            f"Queue response fetch exhausted {max_retries} retries. Last error: {last_error}"
        )
    if isinstance(raw, dict) and raw.get("error"):
        raise FalClientError(
            f"Queue result error for {endpoint}: {raw.get('error')} "
            f"(type={raw.get('error_type')})"
        )
    return raw


def generate(
    model_id: str,
    prompt: str,
    aspect_ratio: str,
    seed: Optional[int] = None,
    output_path: Optional[Path] = None,
    max_retries: int = 3,
    base_backoff_seconds: float = 2.0,
    request_timeout_seconds: float = 120.0,
) -> dict[str, Any]:
    """Generate one image via FAL (sync or queue, per model config).

    Returns dict with keys:
      image_bytes: bytes
      image_path: str | None (set only if output_path was provided and save succeeded)
      latency_ms: int (wall clock from first POST to image_bytes available)
      cost_usd: float (from FAL_CANDIDATES, not actual billing)
      raw_response: dict (the JSON FAL returned)
    """
    if model_id not in FAL_CANDIDATES:
        raise FalClientError(f"Unknown model_id: {model_id}")
    config = FAL_CANDIDATES[model_id]
    endpoint = config["fal_endpoint"]
    api_key = _load_api_key()
    payload = _build_payload(model_id, prompt, aspect_ratio, seed)
    headers = {
        "Authorization": f"Key {api_key}",
        "Content-Type": "application/json",
    }

    start = time.time()
    if config.get("use_queue"):
        raw = _queued_generate(
            endpoint,
            payload,
            headers,
            max_retries,
            base_backoff_seconds,
            request_timeout_seconds,
        )
    else:
        raw = _sync_generate(
            endpoint,
            payload,
            headers,
            max_retries,
            base_backoff_seconds,
            request_timeout_seconds,
        )

    image_url = _extract_image_url(raw)
    if not image_url:
        raise FalClientError(f"No image URL in FAL response: {str(raw)[:500]}")

    img_resp = requests.get(image_url, timeout=request_timeout_seconds)
    img_resp.raise_for_status()
    image_bytes = img_resp.content

    image_path_str: Optional[str] = None
    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(image_bytes)
        image_path_str = str(output_path)

    latency_ms = int((time.time() - start) * 1000)

    return {
        "image_bytes": image_bytes,
        "image_path": image_path_str,
        "latency_ms": latency_ms,
        "cost_usd": float(config["price_usd_estimate"]),
        "raw_response": raw,
    }
