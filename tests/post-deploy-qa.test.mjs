import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DATEMODIFIED_DEPLOY_CAP,
  articleDateEntry,
  authorArticleUrls,
  canonicalHref,
  classifyDateChanges,
  internalLinkTargets,
  isNoindex,
  linkedUrl,
  normalizeUrl,
  parseSitemapXml,
  redirectDestinations,
  robotsContent,
  runPostDeployQa,
} from "../scripts/post-deploy-qa.mjs";
import { parseRedirectRules } from "../functions/site-redirects.js";

const workflow = readFileSync(
  new URL("../.github/workflows/post-deploy-qa.yml", import.meta.url),
  "utf8",
);
const deployWorkflow = readFileSync(
  new URL("../.github/workflows/deploy-cloudflare-pages.yml", import.meta.url),
  "utf8",
);

test("sitemap XML yields page URLs and nested sitemap locs", () => {
  const index = parseSitemapXml(`
    <sitemapindex>
      <sitemap><loc>https://www.daily-life-hacks.com/sitemap-0.xml</loc></sitemap>
    </sitemapindex>
  `);
  assert.deepEqual(index.children, ["https://www.daily-life-hacks.com/sitemap-0.xml"]);
  assert.deepEqual(index.urls, []);

  const urlset = parseSitemapXml(`
    <urlset>
      <url>
        <loc>https://www.daily-life-hacks.com/beans/</loc>
        <lastmod>2026-11-23T00:00:00.000Z</lastmod>
      </url>
    </urlset>
  `);
  assert.equal(urlset.urls[0].loc, "https://www.daily-life-hacks.com/beans/");
  assert.equal(urlset.urls[0].lastmod, "2026-11-23T00:00:00.000Z");
});

test("indexable self-canonical HTML is recognized", () => {
  const html = `
    <html><head>
      <link rel="canonical" href="https://www.daily-life-hacks.com/beans/" />
      <meta name="robots" content="index, follow, max-image-preview:large" />
    </head></html>
  `;
  assert.equal(isNoindex(robotsContent(html)), false);
  assert.equal(
    normalizeUrl(canonicalHref(html), "https://www.daily-life-hacks.com/beans/"),
    "https://www.daily-life-hacks.com/beans/",
  );
  assert.equal(isNoindex("noindex, follow"), true);
});

test("internal links keep same-host HTML paths and drop assets, hashes, and other hosts", () => {
  const html = `
    <a href="/frozen-vs-fresh-vegetables-fiber-cost/">legacy</a>
    <a href="/privacy/">privacy</a>
    <a href="#section">hash</a>
    <a href="mailto:hi@example.com">mail</a>
    <a href="https://example.com/elsewhere/">external</a>
    <a href="/images/hero.jpg">image</a>
    <a href="https://daily-life-hacks.com/beans/?utm_source=qa">apex</a>
  `;
  const links = internalLinkTargets(html, "https://www.daily-life-hacks.com/start/");
  assert.deepEqual(links, [
    "https://www.daily-life-hacks.com/frozen-vs-fresh-vegetables-fiber-cost/",
    "https://www.daily-life-hacks.com/privacy/",
    "https://www.daily-life-hacks.com/beans/",
  ]);
  assert.equal(
    linkedUrl("/sitemap-index.xml", "https://www.daily-life-hacks.com/"),
    "https://www.daily-life-hacks.com/sitemap-index.xml",
  );
});

test("author ItemList is the article list", () => {
  const html = `
    <script type="application/ld+json">
      {"@type":"ItemList","@id":"https://www.daily-life-hacks.com/author/david-miller/#articles","itemListElement":[{"url":"https://www.daily-life-hacks.com/beans/"}]}
    </script>
    <script type="application/ld+json">
      {"@type":"ItemList","@id":"https://www.daily-life-hacks.com/author/david-miller/#other","itemListElement":[{"url":"https://www.daily-life-hacks.com/ignored/"}]}
    </script>
  `;
  assert.deepEqual(authorArticleUrls(html), ["https://www.daily-life-hacks.com/beans/"]);
});

test("redirect destinations are unique paths and ignore fragments", () => {
  const rules = parseRedirectRules(`
    /a /target/ 301
    /a/ /target/#section 301
    /b / 301
    /sitemap.xml /sitemap-index.xml 301
  `);
  assert.deepEqual(redirectDestinations(rules), ["/target/", "/", "/sitemap-index.xml"]);
});

test("dateModified cap ignores substantive updates and fails past the cap", () => {
  const within = classifyDateChanges(
    Array.from({ length: DATEMODIFIED_DEPLOY_CAP }, (_, index) => ({
      slug: `page-${index}`,
      beforeDay: "2026-07-20",
      afterDay: "2026-11-23",
      substantiveDay: null,
    })),
  );
  assert.equal(within.ok, true);
  assert.equal(within.unexplained.length, DATEMODIFIED_DEPLOY_CAP);

  const over = classifyDateChanges([
    ...within.unexplained.map((row) => ({
      slug: row.slug,
      beforeDay: row.beforeDay,
      afterDay: row.afterDay,
      substantiveDay: null,
    })),
    {
      slug: "one-more",
      beforeDay: "2026-07-20",
      afterDay: "2026-11-23",
      substantiveDay: null,
    },
    {
      slug: "real-edit",
      beforeDay: "2026-09-23",
      afterDay: "2026-11-23",
      substantiveDay: "2026-11-23",
    },
    {
      slug: "untouched",
      beforeDay: "2026-09-23",
      afterDay: "2026-09-23",
      substantiveDay: null,
    },
  ]);
  assert.equal(over.ok, false);
  assert.equal(over.unexplained.length, DATEMODIFIED_DEPLOY_CAP + 1);
  assert.equal(over.explained.length, 1);
  assert.equal(over.explained[0].slug, "real-edit");
});

test("article public day uses substantiveUpdate when it is set", () => {
  const before = "---\ndate: 2026-07-01\ndateModified: 2026-07-20\n---\nBody\n";
  const after = "---\ndate: 2026-07-01\ndateModified: 2026-07-20\nsubstantiveUpdate: 2026-11-23\n---\nBody changed\n";
  const entry = articleDateEntry("beans", before, after);
  assert.equal(entry.beforeDay, "2026-07-20");
  assert.equal(entry.afterDay, "2026-11-23");
  assert.equal(entry.substantiveDay, "2026-11-23");
  assert.equal(classifyDateChanges([entry]).ok, true);
});

test("a live pass fails on noindex sitemap URLs, noindex redirect targets, and 4xx links", async () => {
  const html = (robots, canonical, body = "") =>
    `<html><head><link rel="canonical" href="${canonical}" /><meta name="robots" content="${robots}" /></head><body>${body}</body></html>`;
  const origin = "https://www.daily-life-hacks.com";
  const pages = new Map([
    [`${origin}/sitemap-index.xml`, {
      status: 200,
      type: "application/xml",
      body: `<urlset>
        <url><loc>${origin}/ok/</loc></url>
        <url><loc>${origin}/bad/</loc></url>
      </urlset>`,
    }],
    [`${origin}/ok/`, {
      status: 200,
      type: "text/html",
      body: html("index, follow", `${origin}/ok/`, `<a href="/missing/">gone</a><a href="/ok/">self</a>`),
    }],
    [`${origin}/bad/`, {
      status: 200,
      type: "text/html",
      body: html("noindex, follow", `${origin}/bad/`),
    }],
    [`${origin}/`, {
      status: 200,
      type: "text/html",
      body: html("index, follow", `${origin}/`),
    }],
    [`${origin}/missing/`, { status: 404, type: "text/plain", body: "missing" }],
    [`${origin}/author/david-miller/`, {
      status: 200,
      type: "text/html",
      body: `${html("index, follow", `${origin}/author/david-miller/`)}
        <script type="application/ld+json">
          {"@type":"ItemList","@id":"${origin}/author/david-miller/#articles","itemListElement":[{"url":"${origin}/ok/"}]}
        </script>`,
    }],
  ]);
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const page = pages.get(String(url));
    if (!page) throw new Error(`unexpected fetch ${url}`);
    return {
      status: page.status,
      text: async () => page.body,
      headers: { get: (name) => (name.toLowerCase() === "content-type" ? page.type : null) },
    };
  };
  try {
    const result = await runPostDeployQa({
      base: origin,
      redirectsSource: "/legacy /bad/ 301\n/home / 301\n/sitemap.xml /sitemap-index.xml 301\n",
      concurrency: 2,
    });
    assert.equal(result.ok, false);
    assert.match(result.summary, /Post-deploy live QA: FAIL/);
    assert.ok(result.sections.sitemap.some((line) => line.includes("/bad/") && line.includes("noindex")));
    assert.ok(result.sections.redirects.some((line) => line.includes("/bad/") && line.includes("noindex")));
    assert.ok(result.sections.internalLinks.some((line) => line.includes("/missing/") && line.includes("404")));
    assert.deepEqual(result.sections.author, []);
    assert.match(result.summary, /dateModified: skipped/);
  } finally {
    globalThis.fetch = original;
  }
});

test("post-deploy QA is its own read-only workflow after Deploy Cloudflare Pages", () => {
  assert.match(workflow, /name: Post-deploy live QA/);
  assert.match(workflow, /workflows: \["Deploy Cloudflare Pages"\]/);
  assert.match(workflow, /types: \[completed\]/);
  assert.match(workflow, /head_branch == 'main'/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /node scripts\/post-deploy-qa\.mjs/);
  assert.doesNotMatch(workflow, /wrangler|pages deploy|CLOUDFLARE_API_TOKEN|npm ci/);
  assert.doesNotMatch(deployWorkflow, /post-deploy-qa/);
});
