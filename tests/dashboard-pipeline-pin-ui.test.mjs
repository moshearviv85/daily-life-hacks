import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("pipeline pin staging action queues into the staging lane", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /PENDING/);
  assert.match(dashboard, /GitHub Actions/);
  assert.match(dashboard, /publish_now: false/);
});

test("pipeline table can publish every unposted pin and hides posted pins", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.doesNotMatch(dashboard, /idx === 0/);
  assert.match(dashboard, /const publishButton = !publishStatus/);
  assert.match(dashboard, /publish_status/);
});

test("pipeline publish button queues pins instead of dispatching immediate publish", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /publish_now: false/);
  assert.doesNotMatch(dashboard, /publish_now: isProductionDashboard/);
});

test("dashboard exposes staging environment and queue state", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /id="env-badge"/);
  assert.match(dashboard, /STAGING/);
  assert.match(dashboard, /id="ps-queue-label"/);
  assert.match(dashboard, /Queue: \$\{queue\}/);
  assert.match(dashboard, /Legacy Publish חסום בסטייג׳ינג/);
  assert.match(dashboard, /Run Publisher חסום בסטייג׳ינג/);
  assert.match(dashboard, /Publish Now חסום בסטייג׳ינג/);
});

test("pipeline pin button is hidden once a pin has any queue status", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /const publishButton = !publishStatus/);
  assert.doesNotMatch(dashboard, /publishStatus !== 'POSTED'/);
});

test("pipeline pin details show publish metadata before queueing", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /description_with_hashtags/);
  assert.match(dashboard, /<strong>Title:<\/strong>/);
  assert.match(dashboard, /<strong>Description:<\/strong>/);
  assert.match(dashboard, /<strong>Board:<\/strong>/);
  assert.match(dashboard, /<strong>Hashtags:<\/strong>/);
  assert.match(dashboard, /<strong>Alt:<\/strong>/);
  assert.match(dashboard, /const dashboardBase = IS_PRODUCTION_DASHBOARD/);
  assert.match(dashboard, /class="pipeline-pin-select"/);
  assert.match(dashboard, /Publish selected pins/);
  assert.match(dashboard, /function getSelectedPipelinePinsInterleaved/);
  assert.match(dashboard, /function approveSelectedPipelinePins/);
  assert.match(dashboard, /window\.approveSelectedPipelinePins = approveSelectedPipelinePins/);
});

test("pipeline dashboard shows thumbnails and can regenerate hero image", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /\$\{a\.slug\}-main\.jpg/);
  assert.match(dashboard, /Regenerate image/);
  assert.match(dashboard, /function regenerateHeroImage/);
  assert.match(dashboard, /window\.regenerateHeroImage = regenerateHeroImage/);
  assert.match(dashboard, /action: 'regenerate_hero'/);
  assert.match(dashboard, /const heroImageVersions = new Map\(\)/);
  assert.match(dashboard, /const heroVersion = encodeURIComponent/);
  assert.match(dashboard, /heroImageVersions\.get\(a\.slug\) \|\| a\.updated_at/);
  assert.match(dashboard, /const heroDisplaySrc = `\$\{heroSrc\}\?v=\$\{heroVersion\}`/);
  assert.match(dashboard, /pipeline-hero-status-/);
  assert.match(dashboard, /function watchHeroImageReplacement/);
  assert.match(dashboard, /const img = document\.getElementById\(`pipeline-hero-img-\$\{slug\}`\);/);
  assert.match(dashboard, /heroImageVersions\.set\(slug, version\)/);
  assert.match(dashboard, /img\.src = `\$\{heroSrc\}\$\{heroSrc\.includes\('\?'\) \? '&' : '\?'\}v=\$\{version\}`/);
  assert.match(dashboard, /Workflow sent\. Watching for the new image/);
  assert.match(dashboard, /New image is live\. Thumbnail refreshed/);
  assert.match(dashboard, /refreshed repeatedly without reloading the dashboard/);
  assert.match(dashboard, /width:72px;height:96px/);
});

test("hero image watcher refreshes the visible thumbnail after table rerender", async () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");
  const watchStart = dashboard.indexOf("async function watchHeroImageReplacement");
  const regenerateStart = dashboard.indexOf("async function regenerateHeroImage", watchStart);
  const watchSource = watchStart >= 0 && regenerateStart > watchStart
    ? dashboard.slice(watchStart, regenerateStart)
    : "";

  assert.ok(watchSource, "watchHeroImageReplacement source should be present");

  const staleImage = { src: "/images/example-main.jpg?v=old" };
  const visibleImage = { src: "/images/example-main.jpg?v=old" };
  let delayCompleted = false;
  let statusMessage = "";
  let busyState = true;
  let fetchPipelineStatusCalls = 0;

  const context = {
    document: {
      getElementById(id) {
        assert.equal(id, "pipeline-hero-img-example");
        return delayCompleted ? visibleImage : staleImage;
      },
    },
    delay: async () => {
      delayCompleted = true;
    },
    getHeroImageSignal: async () => "new-signal",
    setHeroImageStatus: (_slug, message) => {
      statusMessage = message;
    },
    setHeroImageBusy: (_slug, busy) => {
      busyState = busy;
    },
    fetchPipelineStatus: () => {
      fetchPipelineStatusCalls += 1;
    },
    heroImageVersions: new Map(),
    Date: { now: () => 12345 },
  };

  vm.createContext(context);
  vm.runInContext(`${watchSource}; this.watchHeroImageReplacement = watchHeroImageReplacement;`, context);
  await context.watchHeroImageReplacement("example", "/images/example-main.jpg", "old-signal");

  assert.equal(staleImage.src, "/images/example-main.jpg?v=old");
  assert.equal(visibleImage.src, "/images/example-main.jpg?v=12345");
  assert.equal(context.heroImageVersions.get("example"), "12345");
  assert.equal(statusMessage, "New image is live. Thumbnail refreshed.");
  assert.equal(busyState, false);
  assert.equal(fetchPipelineStatusCalls, 1);
});

test("replaceable images are not cached as immutable assets", () => {
  const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");

  assert.match(headers, /\/images\/\*\s+Cache-Control: public, max-age=300, must-revalidate/);
  assert.match(headers, /\/images\/pins\/\*\s+Cache-Control: public, max-age=300, must-revalidate/);
  assert.doesNotMatch(headers, /\/images\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});

test("dashboard can select topics and produce selected topics", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /class="topic-select"/);
  assert.match(dashboard, /Produce Selected to Staging/);
  assert.match(dashboard, /function produceSelectedTopics/);
  assert.match(dashboard, /topic_ids: ids/);
  assert.match(dashboard, /postTopicStatus\('approve', ids\)/);
});

test("dashboard exposes article approval before image generation", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /Approve Article/);
  assert.match(dashboard, /function approvePipelineArticle/);
  assert.match(dashboard, /action: 'approve_article'/);
  assert.match(dashboard, /generate images \+ pin metadata on staging/);
});
