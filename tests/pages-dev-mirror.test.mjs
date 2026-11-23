import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPreviewNoindex,
  canonicalMirrorUrl,
  onRequest,
  pagesDevHostAction,
} from "../functions/_middleware.js";

function downstream(body, { status = 200, headers = {} } = {}) {
  const response = new Response(body, { status, headers });
  return {
    response,
    async next() {
      return response;
    },
  };
}

test("production pages.dev is a redirect and preview hosts are noindex", () => {
  assert.equal(pagesDevHostAction("daily-life-hacks.pages.dev"), "redirect");
  assert.equal(pagesDevHostAction("Daily-Life-Hacks.pages.dev."), "redirect");
  assert.equal(pagesDevHostAction("77f0167e.daily-life-hacks.pages.dev"), "noindex");
  assert.equal(pagesDevHostAction("staging.daily-life-hacks.pages.dev"), "noindex");
  assert.equal(pagesDevHostAction("www.daily-life-hacks.com"), "pass");
  assert.equal(pagesDevHostAction("daily-life-hacks.com"), "pass");
  assert.equal(pagesDevHostAction("notdaily-life-hacks.pages.dev"), "pass");
});

test("the mirror URL keeps the path and query and drops the pages.dev host", () => {
  assert.equal(
    canonicalMirrorUrl(
      "https://daily-life-hacks.pages.dev/how-to-keep-sandwiches-from-getting-soggy/?utm_source=clarity",
    ),
    "https://www.daily-life-hacks.com/how-to-keep-sandwiches-from-getting-soggy/?utm_source=clarity",
  );
  assert.equal(
    canonicalMirrorUrl("https://daily-life-hacks.pages.dev/"),
    "https://www.daily-life-hacks.com/",
  );
});

test("production pages.dev 301s to the same www path and does not call next", async () => {
  let called = false;
  const response = await onRequest({
    request: new Request(
      "https://daily-life-hacks.pages.dev/how-to-keep-sandwiches-from-getting-soggy/?utm_source=clarity",
    ),
    async next() {
      called = true;
      return new Response("should not run", { status: 200 });
    },
  });

  assert.equal(called, false);
  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/how-to-keep-sandwiches-from-getting-soggy/?utm_source=clarity",
  );
});

test("a preview hash URL stays 200 and gains X-Robots-Tag noindex", async () => {
  const { next, response: page } = downstream("<html>preview</html>", {
    headers: { "content-type": "text/html", "X-Frame-Options": "SAMEORIGIN" },
  });

  const response = await onRequest({
    request: new Request("https://77f0167e.daily-life-hacks.pages.dev/article/"),
    next,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
  assert.equal(response.headers.get("X-Frame-Options"), "SAMEORIGIN");
  assert.equal(response.headers.get("location"), null);
  assert.equal(await response.text(), "<html>preview</html>");
  assert.notEqual(response, page);
});

test("staging and other branch aliases stay usable and are noindex", async () => {
  const { next } = downstream('{"ok":true}', {
    headers: { "content-type": "application/json" },
  });

  const response = await onRequest({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-status?key=test", {
      method: "GET",
    }),
    next,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
  assert.equal(await response.text(), '{"ok":true}');
});

test("preview noindex does not replace an existing noindex policy", async () => {
  const page = new Response("embed", {
    status: 200,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
  const result = applyPreviewNoindex(page);
  assert.equal(result, page);
  assert.equal(result.headers.get("X-Robots-Tag"), "noindex, nofollow");
});

test("www and the apex domain are returned untouched", async () => {
  const www = downstream("home", {
    headers: { "content-type": "text/html", "X-Frame-Options": "SAMEORIGIN" },
  });
  const wwwResponse = await onRequest({
    request: new Request("https://www.daily-life-hacks.com/how-to-keep-sandwiches-from-getting-soggy/"),
    next: www.next,
  });
  assert.equal(wwwResponse, www.response);
  assert.equal(wwwResponse.status, 200);
  assert.equal(wwwResponse.headers.get("X-Robots-Tag"), null);
  assert.equal(await wwwResponse.text(), "home");

  const apex = downstream("", {
    status: 301,
    headers: { location: "https://www.daily-life-hacks.com/article/" },
  });
  const apexResponse = await onRequest({
    request: new Request("https://daily-life-hacks.com/article"),
    next: apex.next,
  });
  assert.equal(apexResponse, apex.response);
  assert.equal(apexResponse.status, 301);
  assert.equal(apexResponse.headers.get("location"), "https://www.daily-life-hacks.com/article/");
  assert.equal(apexResponse.headers.get("X-Robots-Tag"), null);
});
