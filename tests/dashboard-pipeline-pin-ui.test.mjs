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
  assert.match(dashboard, /const publishButton = !publishStatus && productionReady/);
  assert.match(dashboard, /publish_status/);
});

test("production pipeline list hides only fully published article packages", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /const articleIsPublished = \(article\) =>/);
  assert.match(dashboard, /production_status/);
  assert.match(dashboard, /const articleHasPostedPins = \(article\) =>/);
  assert.match(dashboard, /const articleIsFullyPublished = \(article\) => articleIsPublished\(article\) && articleHasPostedPins\(article\)/);
  assert.match(dashboard, /articles = articles\.filter\(article => !articleIsFullyPublished\(article\)\)/);
  assert.match(dashboard, /fully published article\(s\) hidden/);
  assert.doesNotMatch(dashboard, /articleHasUnpostedPins/);
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

  assert.match(dashboard, /const publishButton = !publishStatus && productionReady/);
  assert.doesNotMatch(dashboard, /publishStatus !== 'POSTED'/);
});

test("pipeline pin details show publish metadata before queueing", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /description_with_hashtags/);
  assert.match(dashboard, /<strong>Title:<\/strong>/);
  assert.match(dashboard, /<strong>Description:<\/strong>/);
  assert.match(dashboard, /<strong>Board:<\/strong>/);
  assert.match(dashboard, /<strong>Model:<\/strong>/);
  assert.match(dashboard, /<strong>Hashtags:<\/strong>/);
  assert.match(dashboard, /<strong>Alt:<\/strong>/);
  assert.match(dashboard, /const pipelineAssetBase = 'https:\/\/staging\.daily-life-hacks\.pages\.dev'/);
  assert.match(dashboard, /class="pipeline-pin-select"/);
  assert.match(dashboard, /Publish selected pins/);
  assert.match(dashboard, /id="ps-upcoming-more-btn"/);
  assert.match(dashboard, /Show next 10/);
  assert.match(dashboard, /let pinsUpcomingLimit = PINS_UPCOMING_PAGE_SIZE/);
  assert.match(dashboard, /&limit=\$\{pinsUpcomingLimit\}/);
  assert.match(dashboard, /function showNextUpcomingPins/);
  assert.match(dashboard, /function getSelectedPipelinePinsInterleaved/);
  assert.match(dashboard, /function approveSelectedPipelinePins/);
  assert.match(dashboard, /window\.approveSelectedPipelinePins = approveSelectedPipelinePins/);
});

test("production pipeline pin statuses are labeled as metadata, not live queue", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /const formatPipelinePinStatus = \(status, productionReady\) =>/);
  assert.match(dashboard, /label: `\$\{lane\} \$\{status\}`/);
  assert.match(dashboard, /Pipeline metadata only\. Check the Pinterest Auto-Poster panel for the real production queue\./);
  assert.match(dashboard, /Staging pipeline status only\. This is not a live Pinterest production queue\./);
  assert.equal(dashboard.includes(">${publishStatus}</span>`"), false);
});

test("production dashboard gates pipeline pin publishing until production assets are live", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /pinSlugs:\s+Array\.from\(pinSlugs\)\.sort\(\)/);
  assert.match(dashboard, /const builtPinSlugs = new Set\(BUILD\.images\?\.pinSlugs \|\| \[\]\)/);
  assert.match(dashboard, /const articleLiveOnProduction = builtArticleSlugs\.has\(article\.slug\)/);
  assert.match(dashboard, /const pinLiveOnProduction = builtPinSlugs\.has\(slug\)/);
  assert.match(dashboard, /const productionReady = !IS_PRODUCTION_DASHBOARD \|\| \(articleLiveOnProduction && pinLiveOnProduction\)/);
  assert.match(dashboard, /PROMOTE FIRST/);
  assert.match(dashboard, /Promote staging to production/);
  assert.match(dashboard, /function promoteStagingToProduction/);
  assert.match(dashboard, /action: 'promote_staging'/);
  assert.match(dashboard, /window\.promoteStagingToProduction = promoteStagingToProduction/);
});

test("pipeline dashboard shows thumbnails and can regenerate hero image", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /\$\{a\.slug\}-main\.jpg/);
  assert.match(dashboard, /\$\{a\.slug\}-ingredients\.jpg/);
  assert.match(dashboard, /support image/);
  assert.match(dashboard, /const supportDisplaySrc = `\$\{supportSrc\}\?v=\$\{heroVersion\}`/);
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
  assert.match(dashboard, /width:48px;height:64px/);
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
  assert.match(dashboard, /data-topic-slug/);
  assert.match(dashboard, /Produce 1 Selected to Staging/);
  assert.match(dashboard, /function produceSelectedTopics/);
  assert.match(dashboard, /function pollPipelineForSlugs/);
  assert.match(dashboard, /Full staging package ready/);
  assert.match(dashboard, /View GitHub Actions/);
  assert.match(dashboard, /topic_ids: ids/);
  assert.match(dashboard, /postTopicStatus\('approve', ids\)/);
});

test("dashboard can dispatch bounded topic discovery and poll for new candidates", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /id="discover-limit"/);
  assert.match(dashboard, /id="discover-category"/);
  assert.match(dashboard, /Find up to \$\{limit\} new topic candidate/);
  assert.match(dashboard, /GSC opportunity queries and Google Autocomplete seed expansions/);
  assert.match(dashboard, /LLM semantic duplicate check against existing site and pipeline topics/);
  assert.match(dashboard, /body\.limit = parseInt/);
  assert.match(dashboard, /if \(category\) body\.category = category/);
  assert.match(dashboard, /function pollDiscoveryTopics/);
  assert.match(dashboard, /Found \$\{newTopics\.length\} new topic candidate/);
  assert.match(dashboard, /valid no-op when the semantic gate rejects duplicates/);
  assert.match(dashboard, /Check the discovery report in GitHub Actions/);
  assert.doesNotMatch(dashboard, /timed out without adding visible new topics/);
});

test("dashboard keeps article approval as a fallback for article-only rows", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /Approve Article/);
  assert.match(dashboard, /Generate creates one full staging package/);
  assert.match(dashboard, /Ready for Review/);
  assert.match(dashboard, /by_display_stage/);
  assert.match(dashboard, /const articleAvailable = existsInBuild/);
  assert.match(dashboard, /const stagingHref = articleAvailable/);
  assert.match(dashboard, /const canApproveArticle = articleAvailable/);
  assert.match(dashboard, /stage !== 'staging_review'/);
  assert.match(dashboard, /const builtHeroSlugs = new Set\(BUILD\.images\?\.webSlugs \|\| \[\]\)/);
  assert.match(dashboard, /const heroAvailable = builtHeroSlugs\.has\(a\.slug\)/);
  assert.match(dashboard, /data-pipeline-hero="\$\{a\.slug\}"/);
  assert.match(dashboard, /onerror="var p=this\.closest/);
  assert.match(dashboard, /function approvePipelineArticle/);
  assert.match(dashboard, /function pollArticleAssets/);
  assert.match(dashboard, /action: 'approve_article'/);
  assert.match(dashboard, /generate images \+ pin metadata on staging/);
  assert.match(dashboard, /Waiting for staging sync/);
});
