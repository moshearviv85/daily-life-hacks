import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  INDEX_KEEP_PATHS,
  INDEX_PRUNE_SLUGS,
  INDEX_PROTECTED_SLUGS,
} from "../src/content/index-prune.js";

const ROOT = new URL("../", import.meta.url);
const DIST = new URL("../dist/", import.meta.url);
const PUBLIC = new URL("../public/", import.meta.url);
const SITE = "https://www.daily-life-hacks.com";

function read(relative) {
  return readFileSync(new URL(relative, ROOT), "utf8");
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function sitemapEntries() {
  const xml = read("dist/sitemap-0.xml");
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    return {
      block,
      loc: decodeXml(block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? ""),
      lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
      images: [...block.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(
        (image) => decodeXml(image[1]),
      ),
    };
  });
}

function distHtmlFor(url) {
  const pathname = new URL(url).pathname;
  if (pathname === "/") return new URL("dist/index.html", ROOT);
  return new URL(`dist${pathname}index.html`, ROOT);
}

function localPublicAsset(url) {
  const parsed = new URL(url);
  if (parsed.origin !== SITE) return null;
  return new URL(`public${parsed.pathname}`, ROOT);
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    html.match(
      new RegExp(
        `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    )?.[1] ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`,
        "i",
      ),
    )?.[1]
  );
}

function canonicalHref(html) {
  return (
    html.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
    )?.[1]
  );
}

function jsonLdBlocks(html, pageUrl) {
  const values = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    assert.doesNotThrow(
      () => values.push(JSON.parse(match[1])),
      `Invalid JSON-LD on ${pageUrl}`,
    );
  }
  return values;
}

function visit(value, callback) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, callback);
    return;
  }
  if (!value || typeof value !== "object") return;
  callback(value);
  for (const child of Object.values(value)) visit(child, callback);
}

test("sitemap index exposes one canonical URL set with no duplicate locations", () => {
  const index = read("dist/sitemap-index.xml");
  const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    decodeXml(match[1]),
  );
  assert.deepEqual(children, [`${SITE}/sitemap-0.xml`]);

  const entries = sitemapEntries();
  assert.ok(entries.length > 0, "sitemap URL set must not be empty");
  assert.equal(
    new Set(entries.map((entry) => entry.loc)).size,
    entries.length,
    "sitemap locations must be unique",
  );
});

test("every sitemap URL is a built, self-canonical, indexable page with valid JSON-LD", () => {
  for (const entry of sitemapEntries()) {
    const parsed = new URL(entry.loc);
    assert.equal(parsed.origin, SITE, `wrong sitemap host: ${entry.loc}`);
    assert.ok(
      parsed.pathname === "/" || parsed.pathname.endsWith("/"),
      `non-canonical trailing-slash form: ${entry.loc}`,
    );

    const htmlFile = distHtmlFor(entry.loc);
    assert.ok(existsSync(htmlFile), `sitemap page is missing from dist: ${entry.loc}`);
    const html = readFileSync(htmlFile, "utf8");
    assert.equal(canonicalHref(html), entry.loc, `canonical mismatch: ${entry.loc}`);

    const robots = metaContent(html, "robots")?.toLowerCase() ?? "";
    assert.ok(robots.includes("index"), `missing index directive: ${entry.loc}`);
    assert.ok(robots.includes("follow"), `missing follow directive: ${entry.loc}`);
    assert.ok(!robots.includes("noindex"), `noindex URL leaked into sitemap: ${entry.loc}`);
    assert.ok(jsonLdBlocks(html, entry.loc).length > 0, `missing JSON-LD: ${entry.loc}`);
  }
});

test("sitemap lastmod and image entries are valid and point to shipped assets", () => {
  const now = Date.now() + 24 * 60 * 60 * 1000;
  for (const entry of sitemapEntries()) {
    if (entry.lastmod) {
      const timestamp = Date.parse(entry.lastmod);
      assert.ok(Number.isFinite(timestamp), `invalid lastmod: ${entry.loc}`);
      assert.ok(timestamp <= now, `future lastmod: ${entry.loc}`);
    }

    for (const image of entry.images) {
      const local = localPublicAsset(image);
      assert.ok(local, `image sitemap URL uses a non-canonical host: ${image}`);
      assert.ok(existsSync(local), `image sitemap URL is missing on disk: ${image}`);
    }
  }
});

test("client-injected ingredient photos remain discoverable in their article sitemap entry", () => {
  const entries = new Map(
    sitemapEntries().map((entry) => [new URL(entry.loc).pathname, entry]),
  );
  const imageDir = new URL("images/", PUBLIC);
  const ingredientFiles = readdirSync(imageDir).filter((name) =>
    name.endsWith("-ingredients.jpg"),
  );
  assert.ok(ingredientFiles.length > 0, "expected at least one ingredients photo");

  for (const filename of ingredientFiles) {
    const slug = filename.replace(/-ingredients\.jpg$/, "");
    const entry = entries.get(`/${slug}/`);
    assert.ok(entry, `ingredients photo has no canonical article: ${filename}`);
    assert.ok(
      entry.images.includes(`${SITE}/images/${filename}`),
      `ingredients photo is absent from the article sitemap entry: ${filename}`,
    );
  }
});

test("indexable output never advertises a missing local image", () => {
  for (const entry of sitemapEntries()) {
    const html = readFileSync(distHtmlFor(entry.loc), "utf8");
    const imageUrls = new Set(
      [...html.matchAll(/https:\/\/www\.daily-life-hacks\.com\/images\/[^"'<>\\\s]+/g)].map(
        (match) => match[0],
      ),
    );
    for (const image of imageUrls) {
      const local = localPublicAsset(image);
      assert.ok(existsSync(local), `${entry.loc} advertises missing image ${image}`);
    }
  }
});

test("Dataset and Recipe nodes retain current rich-result requirements", () => {
  let datasets = 0;
  let recipes = 0;

  for (const entry of sitemapEntries()) {
    const html = readFileSync(distHtmlFor(entry.loc), "utf8");
    for (const block of jsonLdBlocks(html, entry.loc)) {
      visit(block, (node) => {
        if (node["@type"] === "Dataset") {
          datasets += 1;
          assert.ok(node.name, `Dataset missing name: ${entry.loc}`);
          assert.ok(node.description, `Dataset missing description: ${entry.loc}`);
          assert.ok(node.license, `Dataset missing license: ${entry.loc}`);
          assert.ok(node.distribution, `Dataset missing distribution: ${entry.loc}`);
          if (node.isPartOf && typeof node.isPartOf === "object") {
            assert.equal(
              node.isPartOf["@type"],
              "Dataset",
              `Dataset has invalid isPartOf object: ${entry.loc}`,
            );
          }
        }

        if (node["@type"] === "Recipe") {
          recipes += 1;
          assert.ok(node.name, `Recipe missing name: ${entry.loc}`);
          assert.ok(
            Array.isArray(node.image) && node.image.length > 0,
            `Recipe missing image: ${entry.loc}`,
          );
          assert.ok(
            Array.isArray(node.recipeInstructions) &&
              node.recipeInstructions.length > 0,
            `Recipe missing instructions: ${entry.loc}`,
          );
          for (const step of node.recipeInstructions) {
            assert.ok(step.text, `Recipe step missing text: ${entry.loc}`);
            assert.ok(step.url, `Recipe step missing URL: ${entry.loc}`);
          }
        }
      });
    }
  }

  assert.ok(datasets > 0, "expected Dataset nodes in indexable output");
  assert.ok(recipes > 0, "expected Recipe nodes in indexable output");
});

function locFor(path) {
  const normalized = String(path).replace(/^\/+|\/+$/g, "");
  return `${SITE}/${normalized}/`;
}

function robotsFor(url) {
  return (metaContent(readFileSync(distHtmlFor(url), "utf8"), "robots") ?? "").toLowerCase();
}

test("GSC thin-URL prune is noindex and absent from the sitemap; KEEP URLs stay indexed", () => {
  const entries = new Set(sitemapEntries().map((entry) => entry.loc));
  const samplePrune = "cheap-dinner-ideas-cost-per-serving";
  const keepFlagship = "fiber-per-dollar-cheapest-high-fiber-foods";

  assert.equal(INDEX_PRUNE_SLUGS.size, 107);
  assert.ok(!entries.has(locFor(samplePrune)), `${samplePrune} leaked into sitemap`);
  assert.ok(existsSync(distHtmlFor(locFor(samplePrune))), `${samplePrune} must stay live`);
  const pruneRobots = robotsFor(locFor(samplePrune));
  assert.ok(pruneRobots.includes("noindex"), `${samplePrune} missing noindex`);
  assert.ok(pruneRobots.includes("follow"), `${samplePrune} missing follow`);
  assert.ok(!pruneRobots.includes("nofollow"), `${samplePrune} must remain follow`);

  let noindexed = 0;
  for (const slug of INDEX_PRUNE_SLUGS) {
    const url = locFor(slug);
    assert.ok(!entries.has(url), `pruned slug leaked into sitemap: ${slug}`);
    assert.ok(existsSync(distHtmlFor(url)), `pruned page was deleted: ${slug}`);
    const robots = robotsFor(url);
    assert.ok(robots.includes("noindex"), `missing noindex: ${slug}`);
    assert.ok(robots.includes("follow"), `missing follow: ${slug}`);
    assert.ok(!robots.includes("nofollow"), `nofollow on live prune page: ${slug}`);
    noindexed += 1;
  }
  assert.equal(noindexed, 107);

  assert.ok(entries.has(locFor(keepFlagship)), `${keepFlagship} missing from sitemap`);
  const keepRobots = robotsFor(locFor(keepFlagship));
  assert.ok(keepRobots.includes("index"), `${keepFlagship} missing index`);
  assert.ok(!keepRobots.includes("noindex"), `${keepFlagship} was noindexed`);
  assert.ok(keepRobots.includes("follow"), `${keepFlagship} missing follow`);

  for (const path of INDEX_KEEP_PATHS) {
    const url = locFor(path);
    assert.ok(entries.has(url), `KEEP URL missing from sitemap: ${path}`);
    assert.ok(existsSync(distHtmlFor(url)), `KEEP page missing from dist: ${path}`);
    const robots = robotsFor(url);
    assert.ok(!robots.includes("noindex"), `KEEP URL was noindexed: ${path}`);
    assert.ok(robots.includes("index"), `KEEP URL missing index: ${path}`);
  }

  for (const slug of INDEX_PROTECTED_SLUGS) {
    const url = locFor(slug);
    assert.ok(entries.has(url), `protected slug missing from sitemap: ${slug}`);
    assert.ok(!robotsFor(url).includes("noindex"), `protected slug was noindexed: ${slug}`);
  }

  assert.ok(entries.has(`${SITE}/`), "homepage missing from sitemap");
});
