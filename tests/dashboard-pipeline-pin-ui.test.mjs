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
  assert.match(dashboard, /production_publish_status \|\| pin\.publish_status/);
});

test("production pipeline list hides live articles once all pins are queued or posted", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /const articleIsPublished = \(article\) =>/);
  assert.match(dashboard, /production_status/);
  assert.match(dashboard, /const pinIsInPublishing = \(pin\) => \['PENDING', 'POSTED'\]/);
  assert.match(dashboard, /const articlePinsInPublishing = \(article\) =>/);
  assert.match(dashboard, /pins\.every\(pinIsInPublishing\)/);
  assert.match(dashboard, /const articleIsDoneForPipelineControl = \(article\) => articleIsPublished\(article\) && articlePinsInPublishing\(article\)/);
  assert.match(dashboard, /articles = articles\.filter\(article => !articleIsDoneForPipelineControl\(article\)\)/);
  assert.match(dashboard, /live article\(s\) with queued\/posted pins hidden/);
  assert.doesNotMatch(dashboard, /fully published article\(s\) hidden/);
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
  assert.match(dashboard, /class="pipeline-pin-select-label"/);
  assert.match(dashboard, /id="pl-select-visible-pins"/);
  assert.match(dashboard, /Select visible pins/);
  assert.match(dashboard, /All visible selected/);
  assert.match(dashboard, /Publish selected pins/);
  assert.match(dashboard, /id="ps-upcoming-more-btn"/);
  assert.match(dashboard, /Show next 10/);
  assert.match(dashboard, /Active Board Routing/);
  assert.match(dashboard, /Easy Dinner Recipes/);
  assert.match(dashboard, /Budget Meals and Grocery Hacks/);
  assert.match(dashboard, /Food Storage and Freezer Tips/);
  assert.match(dashboard, /let pinsUpcomingLimit = PINS_UPCOMING_PAGE_SIZE/);
  assert.match(dashboard, /&limit=\$\{pinsUpcomingLimit\}/);
  assert.match(dashboard, /function showNextUpcomingPins/);
  assert.match(dashboard, /function getSelectedPipelinePinsInterleaved/);
  assert.match(dashboard, /function selectVisiblePipelinePins/);
  assert.match(dashboard, /function approveSelectedPipelinePins/);
  assert.match(dashboard, /window\.selectVisiblePipelinePins = selectVisiblePipelinePins/);
  assert.match(dashboard, /window\.approveSelectedPipelinePins = approveSelectedPipelinePins/);
  assert.match(dashboard, /let pipelineFilter = 'all'/);
  assert.match(dashboard, /renderPipelineTable\(pipelineFilter\)/);
  assert.match(dashboard, /pipelineFilter = filter \|\| 'all'/);
  assert.match(dashboard, /filterPipeline\('queued', this\)/);
  assert.match(dashboard, /Queued\/Posted/);
  assert.match(dashboard, /const savedScrollY = window\.scrollY/);
  assert.match(dashboard, /window\.scrollTo\(\{ top: savedScrollY, behavior: 'auto' \}\)/);
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
  assert.match(dashboard, /const supportImageVersions = new Map\(\)/);
  assert.match(dashboard, /const supportDisplaySrc = `\$\{supportSrc\}\?v=\$\{supportVersion\}`/);
  assert.match(dashboard, /Regenerate image/);
  assert.match(dashboard, /Regenerate support/);
  assert.match(dashboard, /function regenerateHeroImage/);
  assert.match(dashboard, /function regenerateSupportImage/);
  assert.match(dashboard, /window\.regenerateHeroImage = regenerateHeroImage/);
  assert.match(dashboard, /window\.regenerateSupportImage = regenerateSupportImage/);
  assert.match(dashboard, /action: 'regenerate_hero'/);
  assert.match(dashboard, /action: 'regenerate_support'/);
  assert.match(dashboard, /const heroImageVersions = new Map\(\)/);
  assert.match(dashboard, /const heroVersion = encodeURIComponent/);
  assert.match(dashboard, /const supportVersion = encodeURIComponent/);
  assert.match(dashboard, /heroImageVersions\.get\(a\.slug\) \|\| a\.updated_at/);
  assert.match(dashboard, /supportImageVersions\.get\(a\.slug\) \|\| a\.updated_at/);
  assert.match(dashboard, /const heroDisplaySrc = `\$\{heroSrc\}\?v=\$\{heroVersion\}`/);
  assert.match(dashboard, /pipeline-hero-status-/);
  assert.match(dashboard, /pipeline-support-status-/);
  assert.match(dashboard, /function watchHeroImageReplacement/);
  assert.match(dashboard, /function watchSupportImageReplacement/);
  assert.match(dashboard, /const img = document\.getElementById\(`pipeline-hero-img-\$\{slug\}`\);/);
  assert.match(dashboard, /const img = document\.getElementById\(`pipeline-support-img-\$\{slug\}`\);/);
  assert.match(dashboard, /heroImageVersions\.set\(slug, version\)/);
  assert.match(dashboard, /supportImageVersions\.set\(slug, version\)/);
  assert.match(dashboard, /img\.src = `\$\{heroSrc\}\$\{heroSrc\.includes\('\?'\) \? '&' : '\?'\}v=\$\{version\}`/);
  assert.match(dashboard, /img\.src = `\$\{supportSrc\}\$\{supportSrc\.includes\('\?'\) \? '&' : '\?'\}v=\$\{version\}`/);
  assert.match(dashboard, /Workflow sent\. Watching for the new image/);
  assert.match(dashboard, /Workflow sent\. Watching for the new support image/);
  assert.match(dashboard, /New image is live\. Thumbnail refreshed/);
  assert.match(dashboard, /New support image is live\. Thumbnail refreshed/);
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
  assert.match(dashboard, /Queue Selected to Staging/);
  assert.match(dashboard, /function produceSelectedTopics/);
  assert.match(dashboard, /function pollPipelineForSlugs/);
  assert.match(dashboard, /Full staging package ready/);
  assert.match(dashboard, /View GitHub Actions/);
  assert.match(dashboard, /topic_ids: ids/);
  assert.match(dashboard, /postTopicStatus\('approve', ids\)/);
  assert.match(dashboard, /move to queued while the workflow runs/);
  assert.match(dashboard, /failed topics return to approved for retry/);
  assert.doesNotMatch(dashboard, /postTopicStatus\('produced', ids\)/);
  assert.match(dashboard, /Queue \$\{ids\.length\} selected topic/);
  assert.match(dashboard, /count: ids\.length/);
  assert.doesNotMatch(dashboard, /limited to 1 topic per run/);
});

test("pipeline topics modal shows only open topics", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /const OPEN_TOPIC_STATUSES = new Set\(\['pending', 'queued', 'approved'\]\)/);
  assert.match(dashboard, /function topicIsOpenForPipelineTopics/);
  assert.match(dashboard, /return getOpenPipelineTopics\(modalRows\)\.filter/);
  assert.match(dashboard, /No open topics found/);
  assert.doesNotMatch(dashboard, /renderTopicFilterButton\('status', 'produced'/);
  assert.doesNotMatch(dashboard, /renderTopicFilterButton\('status', 'rejected'/);
  assert.doesNotMatch(dashboard, /\['Produced', produced/);
  assert.doesNotMatch(dashboard, /\['Rejected', rejected/);
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

test("pipeline control hides article-only rows without complete staging packages", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /Generate creates full staging packages/);
  assert.match(dashboard, /Selected topics can be queued together and processed one after another/);
  assert.match(dashboard, /Ready for Review/);
  assert.match(dashboard, /by_display_stage/);
  assert.match(dashboard, /const articleHasCompleteStagingPackage = \(article\) =>/);
  assert.match(dashboard, /const hasSupport = Number\(article\.support_image_done \|\| 0\) >= 1/);
  assert.match(dashboard, /const hasPipelinePins = pinCount >= 4 && pinImagesDone >= pinCount/);
  assert.match(dashboard, /return hasHero && hasSupport && \(hasBuiltPins \|\| hasPipelinePins\)/);
  assert.match(dashboard, /const beforeCompletePackageFilter = articles\.length/);
  assert.match(dashboard, /articles = articles\.filter\(articleHasCompleteStagingPackage\)/);
  assert.match(dashboard, /incomplete staging package\(s\) hidden/);
  assert.match(dashboard, /const articleAvailable = existsInBuild/);
  assert.match(dashboard, /const stagingHref = articleAvailable/);
  assert.match(dashboard, /const builtHeroSlugs = new Set\(BUILD\.images\?\.webSlugs \|\| \[\]\)/);
  assert.match(dashboard, /const heroAvailable = builtHeroSlugs\.has\(a\.slug\)/);
  assert.match(dashboard, /data-pipeline-hero="\$\{a\.slug\}"/);
  assert.match(dashboard, /onerror="var p=this\.closest/);
  assert.doesNotMatch(dashboard, /Approve Article/);
  assert.doesNotMatch(dashboard, /const canApproveArticle = articleAvailable/);
  assert.doesNotMatch(dashboard, /articleHasHeroAndPins/);
  assert.match(dashboard, /function approvePipelineArticle/);
  assert.match(dashboard, /function pollArticleAssets/);
  assert.match(dashboard, /action: 'approve_article'/);
  assert.match(dashboard, /generate images \+ pin metadata on staging/);
  assert.match(dashboard, /Waiting for staging sync/);
});
