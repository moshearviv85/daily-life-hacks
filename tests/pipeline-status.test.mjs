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
        review_model: "review-test",
        word_count: 800,
        hero_model: "krea-2-large",
        hero_image_done: 1,
        support_model: "nano-banana-2",
        support_image_done: 1,
        review_state: "staging_review",
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
      { article_slug: "demo-article", pin_slug: "demo-pin-1", pin_index: 0, title: "Budget Pin 1", description: "Desc", alt: "Alt", model_id: "gpt-image-2", image_status: "done", category: "tips", publish_status: "POSTED", pin_id: "123" },
      { article_slug: "demo-article", pin_slug: "demo-pin-2", pin_index: 1, title: "Pin 2", description: "Desc", alt: "Alt", model_id: "nano-banana-2", image_status: "done", category: "tips", publish_status: null, pin_id: null },
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
  assert.equal(data.articles[0].display_stage, "staging_review");
  assert.equal(data.articles[0].full_assets_ready, 1);
  assert.equal(data.articles[0].hero_image_url, "https://staging.daily-life-hacks.pages.dev/images/demo-article-main.jpg");
  assert.equal(data.articles[0].support_image_url, "https://staging.daily-life-hacks.pages.dev/images/demo-article-ingredients.jpg");
  assert.equal(data.articles[0].pins[0].publish_status, "POSTED");
  assert.equal(data.articles[0].pins[0].model_id, "gpt-image-2");
  assert.equal(data.articles[0].pins[0].pin_id, "123");
  assert.equal(data.articles[0].pins[0].board_id, "1124140825679184036");
  assert.equal(data.articles[0].pins[0].board_name, "Healthy Meal Prep & Kitchen Tips");
  assert.match(data.articles[0].pins[0].hashtags, /#BudgetMeals/);
  assert.match(data.articles[0].pins[0].description_with_hashtags, /#DailyLifeHacks/);
  assert.equal(data.summary.by_display_stage.staging_review, 1);
  assert.equal(data.pin_rows.length, 2);
});

test("production dashboard reads pipeline status from staging instead of production D1", async (t) => {
  const stagingPayload = {
    articles: [{ slug: "staging-article", pins: [] }],
    summary: { total: 1, by_stage: { deployed: 1 }, by_category: {} },
    topics: { approved: 3 },
    pins: {},
    pin_rows: [],
  };
  const fetched = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    fetched.push(String(url));
    if (String(url).startsWith("https://www.daily-life-hacks.com/")) {
      return new Response(null, { status: 404 });
    }
    return new Response(JSON.stringify(stagingPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const response = await onRequestGet({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-status?key=test-key"),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      CF_PAGES_BRANCH: "main",
      DB: {
        prepare() {
          return {
            bind() {
              return {
                async all() {
                  return { results: [] };
                },
              };
            },
          };
        },
      },
    },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.source, "staging");
  assert.equal(data.articles[0].slug, "staging-article");
  assert.equal(fetched.length, 2);
  assert.match(fetched[0], /^https:\/\/staging\.daily-life-hacks\.pages\.dev\/api\/pipeline-status\?key=test-key$/);
  assert.match(fetched[1], /^https:\/\/www\.daily-life-hacks\.com\/staging-article\/$/);
});
