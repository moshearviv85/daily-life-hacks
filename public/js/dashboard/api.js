/**
 * Dashboard client API helpers (CP3.4).
 * Auth goes in x-api-key header — never in query strings.
 */
(function (global) {
  let apiKey = "";

  function setKey(key) {
    apiKey = String(key || "").trim();
  }

  function getKey() {
    return apiKey;
  }

  function clearKey() {
    apiKey = "";
  }

  function authHeaders(extra) {
    const headers = Object.assign({}, extra || {});
    if (apiKey) headers["x-api-key"] = apiKey;
    return headers;
  }

  /**
   * fetch() wrapper that injects x-api-key.
   * Callers must not put secrets in the URL.
   */
  function apiFetch(url, options) {
    const opts = Object.assign({}, options || {});
    const headers = new Headers(opts.headers || {});
    if (apiKey && !headers.has("x-api-key")) {
      headers.set("x-api-key", apiKey);
    }
    opts.headers = headers;
    return fetch(url, opts);
  }

  /** Authenticated download via blob (no key in URL / Referer). */
  async function download(url, filename) {
    const res = await apiFetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  /** Open XHR and set x-api-key (for multipart uploads with progress). */
  function openXhr(xhr, method, url) {
    xhr.open(method, url);
    if (apiKey) xhr.setRequestHeader("x-api-key", apiKey);
  }

  global.DashApi = {
    setKey,
    getKey,
    clearKey,
    authHeaders,
    fetch: apiFetch,
    download,
    openXhr,
  };
})(typeof window !== "undefined" ? window : globalThis);
