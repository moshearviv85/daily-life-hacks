import assert from "node:assert/strict";
import test from "node:test";

import { onRequestGet } from "../functions/api/pipeline-status.js";

function makeDb() {
  const responses = [
    { results: [
      {
        slug: "demo-article",
        topic: "Demo Article",
        category: "tips",
        source: "manual",
        stage: "deployed",
        error: null,
        error_stage: null,
        write_model: "test",
        word_count: 800,
        pin_count: 4,
        pin_images_done: 4,
        tokens_total: 1000,
        cost_usd: 0.05,
        created_at: "2026-05-23 10:00:00",
        updated_at: "2026-05-23 10:10:00",
      },
    ] },
    { results: [{ stage: "deployed", cnt: 1 }] },
    { results: [{ category: "tips", stage: "deployed", cnt: 1 }] },
    { results: [{ status: "approved", cnt: 2 }] },
    { results: [{ image_status: "done", cnt: 4 }] },
    { results: [
      { article_slug: "demo-article", pin_slug: "demo-pin-1", pin_index: 0, title: "Pin 1", description: "Desc", alt: "Alt", image_status: "done", publish_status: "POSTED", pin_id: "123" },
      { article_slug: "demo-article", pin_slug: "demo-pin-2", pin_index: 1, title: "Pin 2", description: "Desc", alt: "Alt", image_status: "done", publish_status: null, pin_id: null },
    ] },
  ];
  return {
    prepare() {
      return {
        async all() {
          const next = responses.shift();
          if (!next) throw new Error("Unexpected query");
          return next;
        },
      };
    },
  };
}

test("pipeline status attaches pin rows to their article", async () => {
  const response = await onRequestGet({
    request: new Request("https://staging.example.test/api/pipeline-status?key=test-key"),
    env: { DASHBOARD_PASSWORD: "test-key", DB: makeDb() },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.articles.length, 1);
  assert.equal(data.articles[0].pins.length, 2);
  assert.equal(data.articles[0].pins[0].pin_slug, "demo-pin-1");
  assert.equal(data.articles[0].pins[0].publish_status, "POSTED");
  assert.equal(data.articles[0].pins[0].pin_id, "123");
  assert.equal(data.pin_rows.length, 2);
});
