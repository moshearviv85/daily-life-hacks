"""Tests for the FAL queue-API flow in discovery.fal_client.

Queue flow:
  POST  https://queue.fal.run/{endpoint}         -> {request_id, status_url, response_url, ...}
  GET   status_url (poll)                        -> {status: IN_QUEUE|IN_PROGRESS|COMPLETED, ...}
  GET   response_url (when COMPLETED)            -> {images: [{url: ...}], ...} (same as sync)
  GET   image_url                                -> image bytes

All HTTP and time.sleep are mocked. No live FAL calls.
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

EXP_ROOT = Path(__file__).resolve().parents[1]
if str(EXP_ROOT) not in sys.path:
    sys.path.insert(0, str(EXP_ROOT))

from discovery import fal_client  # noqa: E402
from discovery.models import FAL_CANDIDATES  # noqa: E402


def _json_resp(status_code: int, body: dict):
    r = MagicMock()
    r.status_code = status_code
    r.json.return_value = body
    r.text = ""
    return r


def _bytes_resp(image_bytes: bytes = b"queue-img"):
    r = MagicMock()
    r.status_code = 200
    r.content = image_bytes
    r.raise_for_status = MagicMock()
    return r


def _submit_body(endpoint: str, request_id: str = "req-abc"):
    base = f"https://queue.fal.run/{endpoint}/requests/{request_id}"
    return {
        "request_id": request_id,
        "status_url": f"{base}/status",
        "response_url": f"{base}/response",
        "cancel_url": f"{base}/cancel",
        "queue_position": 0,
    }


def _candidate_with_queue() -> str:
    for mid, cfg in FAL_CANDIDATES.items():
        if cfg.get("use_queue"):
            return mid
    pytest.skip("no candidate has use_queue=True")
    return ""  # unreachable


def test_at_least_one_candidate_declares_use_queue():
    assert any(cfg.get("use_queue") for cfg in FAL_CANDIDATES.values()), (
        "queue flow is unreachable if no candidate declares use_queue=True"
    )


def test_generate_queue_path_submits_to_queue_fal_run(monkeypatch):
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()
    endpoint = FAL_CANDIDATES[mid]["fal_endpoint"]

    submit_resp = _json_resp(200, _submit_body(endpoint))
    completed_resp = _json_resp(200, {"status": "COMPLETED", "request_id": "req-abc"})
    result_resp = _json_resp(200, {"images": [{"url": "https://fake.cdn/q.jpg"}]})
    image_resp = _bytes_resp(b"queue-image-bytes")

    with patch("discovery.fal_client.time.sleep"), \
         patch("discovery.fal_client.requests.post", return_value=submit_resp) as post_mock, \
         patch(
             "discovery.fal_client.requests.get",
             side_effect=[completed_resp, result_resp, image_resp],
         ):
        result = fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")

    submit_url = post_mock.call_args.args[0] if post_mock.call_args.args else post_mock.call_args.kwargs["url"]
    assert submit_url == f"https://queue.fal.run/{endpoint}"
    assert result["image_bytes"] == b"queue-image-bytes"
    assert set(result.keys()) >= {"image_bytes", "image_path", "latency_ms", "cost_usd", "raw_response"}


def test_generate_queue_polls_until_completed(monkeypatch):
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()
    endpoint = FAL_CANDIDATES[mid]["fal_endpoint"]

    submit_resp = _json_resp(200, _submit_body(endpoint))
    statuses = [
        _json_resp(200, {"status": "IN_QUEUE", "queue_position": 3}),
        _json_resp(200, {"status": "IN_PROGRESS"}),
        _json_resp(200, {"status": "IN_PROGRESS"}),
        _json_resp(200, {"status": "COMPLETED"}),
    ]
    result_resp = _json_resp(200, {"images": [{"url": "https://fake.cdn/q.jpg"}]})
    image_resp = _bytes_resp()

    gets = statuses + [result_resp, image_resp]
    with patch("discovery.fal_client.time.sleep") as sleep_mock, \
         patch("discovery.fal_client.requests.post", return_value=submit_resp), \
         patch("discovery.fal_client.requests.get", side_effect=gets) as get_mock:
        fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")

    status_calls = [c for c in get_mock.call_args_list if "/status" in (c.args[0] if c.args else c.kwargs.get("url", ""))]
    assert len(status_calls) == 4, f"expected 4 status polls, got {len(status_calls)}"
    assert sleep_mock.call_count >= 3


def test_generate_queue_submit_uses_same_payload_as_sync(monkeypatch):
    """The payload posted to queue.fal.run must match what the sync path would
    post (prompt + shape_param mapped value + optional seed)."""
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()
    endpoint = FAL_CANDIDATES[mid]["fal_endpoint"]
    cfg = FAL_CANDIDATES[mid]

    submit_resp = _json_resp(200, _submit_body(endpoint))
    completed_resp = _json_resp(200, {"status": "COMPLETED"})
    result_resp = _json_resp(200, {"images": [{"url": "https://fake.cdn/q.jpg"}]})
    image_resp = _bytes_resp()

    with patch("discovery.fal_client.time.sleep"), \
         patch("discovery.fal_client.requests.post", return_value=submit_resp) as post_mock, \
         patch(
             "discovery.fal_client.requests.get",
             side_effect=[completed_resp, result_resp, image_resp],
         ):
        fal_client.generate(model_id=mid, prompt="the prompt", aspect_ratio="16:9", seed=77)

    payload = post_mock.call_args.kwargs["json"]
    assert payload["prompt"] == "the prompt"
    assert payload["seed"] == 77
    if cfg["shape_param"] == "image_size":
        assert payload["image_size"] == cfg["shape_values"]["16:9"]
        assert "aspect_ratio" not in payload
    else:
        assert payload["aspect_ratio"] == "16:9"
        assert "image_size" not in payload
    if cfg.get("quality"):
        assert payload["quality"] == cfg["quality"]
    for key, value in (cfg.get("payload") or {}).items():
        assert payload[key] == value


def test_generate_queue_sends_auth_header_on_submit_and_polls(monkeypatch):
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()
    endpoint = FAL_CANDIDATES[mid]["fal_endpoint"]

    submit_resp = _json_resp(200, _submit_body(endpoint))
    completed_resp = _json_resp(200, {"status": "COMPLETED"})
    result_resp = _json_resp(200, {"images": [{"url": "https://fake.cdn/q.jpg"}]})
    image_resp = _bytes_resp()

    with patch("discovery.fal_client.time.sleep"), \
         patch("discovery.fal_client.requests.post", return_value=submit_resp) as post_mock, \
         patch(
             "discovery.fal_client.requests.get",
             side_effect=[completed_resp, result_resp, image_resp],
         ) as get_mock:
        fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")

    submit_headers = post_mock.call_args.kwargs["headers"]
    assert "Authorization" in submit_headers and "test-key" in submit_headers["Authorization"]
    status_calls = [c for c in get_mock.call_args_list if "/status" in (c.args[0] if c.args else c.kwargs.get("url", ""))]
    assert status_calls, "no status polls recorded"
    first_status_headers = status_calls[0].kwargs.get("headers") or {}
    assert "Authorization" in first_status_headers and "test-key" in first_status_headers["Authorization"]


def test_generate_queue_raises_when_completed_response_has_error(monkeypatch):
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()
    endpoint = FAL_CANDIDATES[mid]["fal_endpoint"]

    submit_resp = _json_resp(200, _submit_body(endpoint))
    completed_resp = _json_resp(200, {"status": "COMPLETED"})
    error_result = _json_resp(
        200,
        {"error": "content policy violation", "error_type": "ContentPolicyError"},
    )

    with patch("discovery.fal_client.time.sleep"), \
         patch("discovery.fal_client.requests.post", return_value=submit_resp), \
         patch(
             "discovery.fal_client.requests.get",
             side_effect=[completed_resp, error_result],
         ):
        with pytest.raises(fal_client.FalError) as exc_info:
            fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")
    assert "content policy violation" in str(exc_info.value)


def test_generate_queue_submit_4xx_hard_fails_no_poll(monkeypatch):
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()

    bad_resp = MagicMock()
    bad_resp.status_code = 400
    bad_resp.text = "bad payload"
    bad_resp.json.return_value = {}

    with patch("discovery.fal_client.time.sleep"), \
         patch("discovery.fal_client.requests.post", return_value=bad_resp), \
         patch("discovery.fal_client.requests.get") as get_mock:
        with pytest.raises(fal_client.FalClientError):
            fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")
    assert get_mock.call_count == 0


def test_generate_sync_path_unchanged_for_non_queue_candidate(monkeypatch):
    """If any candidate has use_queue=False, its sync behavior is preserved.
    If all candidates use queue, this test degrades to verifying opt-out works
    via a temporary override."""
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = "flux-2-pro"
    original = dict(FAL_CANDIDATES[mid])
    try:
        FAL_CANDIDATES[mid]["use_queue"] = False
        post_resp = _json_resp(200, {"images": [{"url": "https://fake.cdn/s.jpg"}]})
        img_resp = _bytes_resp(b"sync-bytes")
        with patch("discovery.fal_client.requests.post", return_value=post_resp) as post_mock, \
             patch("discovery.fal_client.requests.get", return_value=img_resp):
            result = fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")
        url = post_mock.call_args.args[0] if post_mock.call_args.args else post_mock.call_args.kwargs["url"]
        assert url.startswith("https://fal.run/"), url
        assert "queue.fal.run" not in url
        assert result["image_bytes"] == b"sync-bytes"
    finally:
        FAL_CANDIDATES[mid].clear()
        FAL_CANDIDATES[mid].update(original)


# ── retry on transient response_url fetch failures ───────────────────────────

def test_response_fetch_retries_on_500(monkeypatch):
    """Bug observed 2026-04-26: status was COMPLETED but the GET to response_url
    returned HTTP 500 once. Without retry, one transient blip burns the whole
    pin generation. The fetch must retry with backoff like the submit path."""
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()
    endpoint = FAL_CANDIDATES[mid]["fal_endpoint"]

    submit_resp = _json_resp(200, _submit_body(endpoint))
    completed_resp = _json_resp(200, {"status": "COMPLETED"})
    failing_resp = MagicMock()
    failing_resp.status_code = 500
    failing_resp.text = "Downstream service error"
    failing_resp.json.return_value = {}
    success_resp = _json_resp(200, {"images": [{"url": "https://fake.cdn/q.jpg"}]})
    image_resp = _bytes_resp()

    gets = [completed_resp, failing_resp, success_resp, image_resp]
    with patch("discovery.fal_client.time.sleep"), \
         patch("discovery.fal_client.requests.post", return_value=submit_resp), \
         patch("discovery.fal_client.requests.get", side_effect=gets) as get_mock:
        result = fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")

    assert result["image_bytes"] == b"queue-img"
    response_calls = [c for c in get_mock.call_args_list if "/response" in (c.args[0] if c.args else c.kwargs.get("url", ""))]
    assert len(response_calls) == 2, f"expected 2 response_url fetches (1 fail + 1 retry), got {len(response_calls)}"


def test_response_fetch_4xx_hard_fails_no_retry(monkeypatch):
    """4xx on response_url is a real bug, not transient. Do not retry."""
    monkeypatch.setattr(fal_client, "_load_api_key", lambda: "test-key")
    mid = _candidate_with_queue()
    endpoint = FAL_CANDIDATES[mid]["fal_endpoint"]

    submit_resp = _json_resp(200, _submit_body(endpoint))
    completed_resp = _json_resp(200, {"status": "COMPLETED"})
    bad_resp = MagicMock()
    bad_resp.status_code = 404
    bad_resp.text = "not found"
    bad_resp.json.return_value = {}

    with patch("discovery.fal_client.time.sleep"), \
         patch("discovery.fal_client.requests.post", return_value=submit_resp), \
         patch("discovery.fal_client.requests.get", side_effect=[completed_resp, bad_resp]) as get_mock:
        with pytest.raises(fal_client.FalClientError):
            fal_client.generate(model_id=mid, prompt="x", aspect_ratio="1:1")
    response_calls = [c for c in get_mock.call_args_list if "/response" in (c.args[0] if c.args else c.kwargs.get("url", ""))]
    assert len(response_calls) == 1, f"4xx must not retry, got {len(response_calls)} response calls"
