import assert from "node:assert/strict";
import test from "node:test";

import {
  onRequestGet,
  onRequestPost,
} from "../functions/api/subscribe.js";

const ENDPOINT = "https://www.daily-life-hacks.com/api/subscribe";
const EMPTY_BODY_ERROR = "Request body is empty. Send JSON with an email field.";

function makeDb() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...params) {
          calls.push({ sql, params });
          return {
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
  };
}

function post(body, { headers = {}, env = {} } = {}) {
  const request = new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
  return onRequestPost({ request, env, waitUntil() {} });
}

test("GET /api/subscribe stays a crawl-cleanup 410", async () => {
  const response = await onRequestGet();
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, follow");
});

test("empty and whitespace-only bodies return 400", async () => {
  const cases = [
    ["no body", undefined],
    ["empty string", ""],
    ["spaces", "   "],
    ["whitespace", "\n\t  \n"],
  ];

  for (const [name, body] of cases) {
    const response = await post(body);
    assert.equal(response.status, 400, name);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.deepEqual(await response.json(), { error: EMPTY_BODY_ERROR }, name);
  }
});

test("an unreadable body returns 400", async () => {
  const stream = new ReadableStream({
    pull(controller) {
      controller.error(new Error("read failed"));
    },
  });
  const request = new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    duplex: "half",
  });

  const response = await onRequestPost({ request, env: {}, waitUntil() {} });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Request body could not be read. Send JSON with an email field.",
  });
});

test("bad JSON returns 400", async () => {
  const cases = ["{not json", "{", "{\"email\":", "undefined"];

  for (const body of cases) {
    const response = await post(body);
    assert.equal(response.status, 400, body);
    assert.deepEqual(await response.json(), {
      error: "Request body could not be parsed. Send JSON with an email field.",
    }, body);
  }
});

test("non-object JSON returns 400", async () => {
  const cases = ["null", "[]", "[{\"email\":\"reader@example.com\"}]", "\"reader@example.com\"", "42", "true", "false"];

  for (const body of cases) {
    const response = await post(body);
    assert.equal(response.status, 400, body);
    assert.deepEqual(await response.json(), {
      error: "Request body must be a JSON object with an email field.",
    }, body);
  }
});

test("invalid email JSON still returns the existing 400", async () => {
  for (const body of [{}, { email: "" }, { email: "not-an-email" }]) {
    const response = await post(JSON.stringify(body));
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(await response.json(), { error: "Valid email required" });
  }
});

test("a valid subscription still forwards to Kit and stores the signup", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const fetches = [];
  globalThis.fetch = async (url, init) => {
    fetches.push({ url: String(url), init });
    if (String(url) === "https://api.kit.com/v4/subscribers") {
      return Response.json({ subscriber: { id: 99, state: "active" } });
    }
    return Response.json({ ok: true });
  };

  const db = makeDb();
  const response = await post(
    JSON.stringify({
      email: "reader@example.com",
      source: "footer",
      page: "/high-fiber-foods/",
      category: "nutrition",
      base_slug: "high-fiber-foods",
      variant_slug: "",
      email_segment: "nutrition-foundations",
    }),
    {
      headers: { Referer: "https://www.daily-life-hacks.com/high-fiber-foods/" },
      env: { KIT_API_KEY: "kit-test-key", DB: db },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, provider: "kit" });

  assert.equal(fetches.length >= 2, true);
  assert.equal(fetches[0].url, "https://api.kit.com/v4/subscribers");
  assert.equal(fetches[0].init.method, "POST");
  assert.equal(fetches[0].init.headers["X-Kit-Api-Key"], "kit-test-key");
  assert.deepEqual(JSON.parse(fetches[0].init.body), {
    email_address: "reader@example.com",
    state: "active",
    fields: {
      Source: "footer",
      Page: "/high-fiber-foods/",
      Category: "nutrition",
      "Base Slug": "high-fiber-foods",
      "Variant Slug": "",
      "Email Segment": "nutrition-foundations",
    },
  });

  assert.match(fetches[1].url, /\/forms\/9202679\/subscribers\/99$/);
  assert.deepEqual(JSON.parse(fetches[1].init.body), {
    referrer: "https://www.daily-life-hacks.com/high-fiber-foods/?utm_source=website&utm_medium=footer&utm_campaign=site-signup&utm_content=nutrition-foundations",
  });

  const tagCalls = fetches.slice(2).map((call) => call.url);
  assert.ok(tagCalls.some((url) => url.includes("/tags/17453986/subscribers/99")));
  assert.ok(tagCalls.some((url) => url.includes("/tags/17453988/subscribers/99")));
  assert.ok(tagCalls.some((url) => url.includes("/tags/17453992/subscribers/99")));

  const subscriptionInsert = db.calls.find((call) => call.sql.startsWith("INSERT INTO subscriptions"));
  assert.ok(subscriptionInsert);
  assert.equal(subscriptionInsert.params[0], "reader@example.com");
  assert.equal(subscriptionInsert.params[1], "footer");
  assert.equal(subscriptionInsert.params[2], "/high-fiber-foods/");
  assert.equal(subscriptionInsert.params[3], "https://www.daily-life-hacks.com/high-fiber-foods/");
  assert.equal(subscriptionInsert.params[4], "success");
  assert.equal(subscriptionInsert.params[5], "99");

  const funnelInsert = db.calls.find((call) => call.sql.includes("INSERT INTO funnel_events"));
  assert.ok(funnelInsert);
  assert.equal(funnelInsert.params[0], "signup_completed");
});

test("rejected bodies do not call Kit", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await post("", { env: { KIT_API_KEY: "kit-test-key" } });
  assert.equal(response.status, 400);
  assert.equal(called, false);
});
