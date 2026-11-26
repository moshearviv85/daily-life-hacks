import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
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
    if (INDEX_PRUNE_SLUGS.has(slug)) {
      assert.equal(
        entry,
        undefined,
        `pruned recipe leaked into sitemap via ingredients photo: ${filename}`,
      );
      continue;
    }
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

test("AI hero images carry a visible caption and ImageObject credit", () => {
  const credit = "Illustration generated with AI";
  const cases = [
    {
      slug: "easy-sourdough-discard-recipes-beginners",
      type: "Recipe",
      image: `${SITE}/images/easy-sourdough-discard-recipes-beginners-main.jpg`,
      dateModified: "2026-11-23T00:00:00.000Z",
    },
    {
      slug: "protein-per-dollar-adjusted-for-quality",
      type: "Article",
      image: `${SITE}/images/protein-per-dollar-adjusted-for-quality-main.jpg`,
      dateModified: "2026-11-23T00:00:00.000Z",
    },
  ];

  for (const sample of cases) {
    const url = `${SITE}/${sample.slug}/`;
    const html = readFileSync(distHtmlFor(url), "utf8");
    assert.match(
      html,
      /<figcaption[^>]*class="[^"]*\btext-xs\b[^"]*"[^>]*>\s*Illustration generated with AI\s*<\/figcaption>/,
      `${sample.slug} missing the visible AI caption`,
    );
    assert.equal(
      [...html.matchAll(/Illustration generated with AI/g)].length >= 2,
      true,
      `${sample.slug} should disclose the hero in both the caption and JSON-LD`,
    );

    const entities = [];
    const credited = [];
    for (const block of jsonLdBlocks(html, url)) {
      visit(block, (node) => {
        if (node["@type"] === sample.type) entities.push(node);
        if (node["@type"] === "ImageObject" && node.creditText) credited.push(node);
      });
    }

    assert.equal(entities.length, 1, sample.slug);
    const entity = entities[0];
    assert.equal(entity.dateModified, sample.dateModified, sample.slug);
    assert.equal(entity.image[0]["@type"], "ImageObject", sample.slug);
    assert.equal(entity.image[0].url, sample.image, sample.slug);
    assert.equal(entity.image[0].contentUrl, sample.image, sample.slug);
    assert.equal(entity.image[0].creditText, credit, sample.slug);
    assert.equal(entity.image[0].caption, credit, sample.slug);
    assert.equal(entity.image[0].description, `${credit}.`, sample.slug);
    assert.equal(entity.image[0].digitalSourceType, undefined, sample.slug);
    assert.ok(
      credited.some((node) => node["@id"]?.endsWith("#primary-image")),
      `${sample.slug} primary image is missing the AI credit`,
    );
  }

  const chartUrl = `${SITE}/low-sodium-budget-foods-ranked/`;
  const chartHtml = readFileSync(distHtmlFor(chartUrl), "utf8");
  assert.doesNotMatch(chartHtml, /Illustration generated with AI/);
  for (const block of jsonLdBlocks(chartHtml, chartUrl)) {
    visit(block, (node) => {
      if (node["@type"] === "Article") {
        assert.ok(
          Array.isArray(node.image) && node.image.every((item) => typeof item === "string"),
          "the data-chart hero stays a plain image URL",
        );
      }
      assert.equal(node.creditText, undefined);
      assert.equal(node.digitalSourceType, undefined);
    });
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
          assert.equal(
            typeof node.recipeCategory,
            "string",
            `Recipe missing recipeCategory: ${entry.loc}`,
          );
          assert.ok(
            node.recipeCategory.trim(),
            `Recipe recipeCategory is blank: ${entry.loc}`,
          );
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

test("reported recipe posts publish a derived recipeCategory", () => {
  const expected = {
    "beans-and-rice-complete-protein-meal": "Main Course",
    "best-way-to-cook-chicken": "Dinner",
    "easy-sourdough-discard-recipes-beginners": "Main Course",
    "split-pea-soup-recipe-high-fiber": "Soup",
    "quick-20-minute-high-fiber-meals-for-busy-days": "Main Course",
  };

  for (const [slug, category] of Object.entries(expected)) {
    const url = `${SITE}/${slug}/`;
    const html = readFileSync(distHtmlFor(url), "utf8");
    const categories = [];
    for (const block of jsonLdBlocks(html, url)) {
      visit(block, (node) => {
        if (node["@type"] === "Recipe") categories.push(node.recipeCategory);
      });
    }
    assert.deepEqual(categories, [category], slug);
  }
});

test("fiber and protein flagships publish the Hugging Face dataset mirror in HTML and Dataset JSON-LD", () => {
  const hf =
    "https://huggingface.co/datasets/moshiko123/daily-life-hacks-grocery-nutrition-per-dollar";
  const flagships = [
    {
      slug: "fiber-per-dollar-cheapest-high-fiber-foods",
      csv: `${SITE}/data/fiber-per-dollar-2026.csv`,
      huggingfaceCsv: `${hf}/resolve/main/fiber-per-dollar-2026.csv`,
    },
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      csv: `${SITE}/data/protein-per-dollar-2026.csv`,
      huggingfaceCsv: `${hf}/resolve/main/protein-per-dollar-2026.csv`,
    },
  ];

  for (const flagship of flagships) {
    const landingUrl = flagship.csv.replace(/\.csv$/, "/");
    const html = readFileSync(distHtmlFor(landingUrl), "utf8");
    assert.match(html, new RegExp(hf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /Hugging Face/);

    const datasetNodes = [];
    for (const block of jsonLdBlocks(html, landingUrl)) {
      visit(block, (node) => {
        if (node["@type"] === "Dataset") datasetNodes.push(node);
      });
    }
    assert.ok(datasetNodes.length > 0, `missing Dataset JSON-LD: ${flagship.slug}`);
    for (const node of datasetNodes) {
      const downloads = Array.isArray(node.distribution)
        ? node.distribution
        : [node.distribution];
      const contentUrls = downloads.map((item) => item?.contentUrl);
      assert.ok(
        contentUrls.includes(flagship.csv),
        `${flagship.slug} dropped the on-site CSV DataDownload`,
      );
      assert.ok(
        contentUrls.includes(flagship.huggingfaceCsv),
        `${flagship.slug} missing Hugging Face CSV DataDownload`,
      );
      assert.ok(
        contentUrls.includes(hf),
        `${flagship.slug} missing Hugging Face dataset page DataDownload`,
      );
      assert.equal(
        node.license,
        "https://creativecommons.org/licenses/by/4.0/",
        `${flagship.slug} Dataset license should be CC-BY-4.0`,
      );
      assert.equal(
        node.creator?.name,
        "David Miller",
        `${flagship.slug} Dataset creator should be David Miller`,
      );
      assert.equal(node["@id"], `${landingUrl}#dataset`);
    }

    assert.match(html, /Cite this dataset/);
    assert.doesNotMatch(html, /10\.5281|zenodo\.org/i);
  }

  const sourdough = readFileSync(
    distHtmlFor(`${SITE}/easy-sourdough-discard-recipes-beginners/`),
    "utf8",
  );
  assert.doesNotMatch(sourdough, /huggingface\.co/);
  assert.doesNotMatch(sourdough, /Cite this study/);

  const otherStudy = readFileSync(
    distHtmlFor(`${SITE}/animal-protein-per-dollar-ranked/`),
    "utf8",
  );
  assert.doesNotMatch(
    otherStudy,
    /Cite this study/,
    "APA/BibTeX cite block is flagship-only",
  );

  const dataHub = readFileSync(distHtmlFor(`${SITE}/data/`), "utf8");
  assert.match(dataHub, new RegExp(hf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const catalog = jsonLdBlocks(dataHub, `${SITE}/data/`).find(
    (node) => node["@type"] === "DataCatalog",
  );
  assert.ok(catalog, "rendered /data/ should include a DataCatalog node");
  assert.equal(catalog.isAccessibleForFree, true);
  assert.equal(catalog.license, "https://creativecommons.org/licenses/by/4.0/");
  assert.equal(catalog.creditText, "Daily Life Hacks. Licensed under CC BY 4.0.");
  assert.ok(Array.isArray(catalog.keywords));
  assert.ok(catalog.keywords.includes("Hugging Face"));
  assert.ok(catalog.keywords.includes("fiber per dollar"));

  for (const flagship of flagships) {
    const landingUrl = flagship.csv.replace(/\.csv$/, "/");
    const landingHtml = readFileSync(distHtmlFor(landingUrl), "utf8");
    assert.match(landingHtml, /Cite this dataset/);
    assert.match(landingHtml, /Download CSV/);
    assert.match(landingHtml, new RegExp(hf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(landingHtml, /easy-sourdough-discard-recipes-beginners/);

    const landingDatasets = [];
    for (const block of jsonLdBlocks(landingHtml, landingUrl)) {
      visit(block, (node) => {
        if (node["@type"] === "Dataset") landingDatasets.push(node);
      });
    }
    assert.equal(landingDatasets.length, 1, `${landingUrl} should have one Dataset node`);
    const landingNode = landingDatasets[0];
    const sameAs = Array.isArray(landingNode.sameAs)
      ? landingNode.sameAs
      : [landingNode.sameAs];
    assert.ok(sameAs.includes(hf), `${landingUrl} sameAs should include Hugging Face`);
    assert.equal(landingNode["@id"], `${landingUrl}#dataset`);
    assert.equal(landingNode.license, "https://creativecommons.org/licenses/by/4.0/");
    assert.equal(landingNode.isAccessibleForFree, true);
    assert.equal(landingNode.temporalCoverage, "2026-07/2026-09");
    assert.equal(landingNode.creator?.name, "David Miller");
    assert.equal(landingNode.publisher?.name, "Daily Life Hacks");
    assert.ok(Array.isArray(landingNode.keywords));
    assert.ok(landingNode.keywords.includes("Hugging Face"));
    const downloads = Array.isArray(landingNode.distribution)
      ? landingNode.distribution
      : [landingNode.distribution];
    const contentUrls = downloads.map((item) => item?.contentUrl);
    assert.ok(contentUrls.includes(flagship.csv), `${landingUrl} missing on-site CSV contentUrl`);
    assert.ok(
      contentUrls.includes(flagship.huggingfaceCsv),
      `${landingUrl} missing Hugging Face CSV contentUrl`,
    );
    assert.ok(
      contentUrls.includes(hf),
      `${landingUrl} missing Hugging Face dataset page DataDownload`,
    );
    const csvDownloads = downloads.filter((item) =>
      String(item?.contentUrl ?? "").endsWith(".csv"),
    );
    assert.ok(
      csvDownloads.every((item) => item?.encodingFormat === "text/csv"),
      `${landingUrl} CSV DataDownload encodingFormat should be text/csv`,
    );
    assert.ok(
      downloads.every(
        (item) => item?.license === "https://creativecommons.org/licenses/by/4.0/",
      ),
      `${landingUrl} DataDownload license should be CC-BY-4.0`,
    );

    const catalogNode = catalog.dataset.find(
      (node) => node["@id"] === `${landingUrl}#dataset`,
    );
    assert.ok(catalogNode, `catalog missing Dataset node for ${flagship.slug}`);
    assert.equal(catalogNode.url, landingUrl);
    assert.equal(catalogNode.creator?.name, "David Miller");
    assert.equal(catalogNode.temporalCoverage, "2026-07/2026-09");
    const catalogSameAs = Array.isArray(catalogNode.sameAs)
      ? catalogNode.sameAs
      : [catalogNode.sameAs];
    assert.ok(catalogSameAs.includes(hf), `catalog sameAs missing HF for ${flagship.slug}`);
  }

  const sitemapLocs = new Set(sitemapEntries().map((entry) => entry.loc));
  assert.ok(!sitemapLocs.has(`${SITE}/data/fiber-per-dollar-2026/`));
  assert.ok(!sitemapLocs.has(`${SITE}/data/protein-per-dollar-2026/`));
  assert.ok(sitemapLocs.has(`${SITE}/data/`));
  assert.ok(!sitemapLocs.has(`${SITE}/fiber-per-dollar-cheapest-high-fiber-foods/`));
  assert.ok(!sitemapLocs.has(`${SITE}/protein-per-dollar-cheapest-protein-sources/`));
  assert.ok(sitemapLocs.has(`${SITE}/what-30-grams-of-fiber-costs-per-day/`));
  assert.ok(sitemapLocs.has(`${SITE}/protein-per-dollar-adjusted-for-quality/`));
  assert.ok(!robotsFor(`${SITE}/data/`).includes("noindex"));
  assert.ok(!robotsFor(`${SITE}/what-30-grams-of-fiber-costs-per-day/`).includes("noindex"));
  assert.ok(!robotsFor(`${SITE}/protein-per-dollar-adjusted-for-quality/`).includes("noindex"));
});

test("two utility tools render noindex, follow and are absent from sitemap XML", () => {
  const dropped = [
    "/tools/shopping-list-builder/",
    "/tools/grocery-trip-savings-calculator/",
  ];
  const sitemapFiles = readdirSync(DIST).filter((name) => /^sitemap-.*\.xml$/.test(name));
  assert.ok(sitemapFiles.length > 0, "expected dist/sitemap-*.xml");
  const sitemapXml = sitemapFiles.map((name) => readFileSync(new URL(name, DIST), "utf8")).join("\n");
  const hub = readFileSync(distHtmlFor(`${SITE}/tools/`), "utf8");

  for (const path of dropped) {
    const url = `${SITE}${path}`;
    assert.equal(sitemapXml.includes(url), false, `${path} leaked into sitemap-*.xml`);
    assert.ok(existsSync(distHtmlFor(url)), `${path} must stay reachable`);
    assert.equal(robotsFor(url), "noindex, follow", path);
    assert.match(hub, new RegExp(`href="${path.replaceAll("/", "\\/")}"`), `${path} dropped from /tools/`);
  }

  const toolsDir = fileURLToPath(new URL("tools/", DIST));
  const toolPages = [];
  function walkTools(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walkTools(full);
      else if (entry.name === "index.html") toolPages.push(full);
    }
  }
  walkTools(toolsDir);
  assert.ok(toolPages.length > dropped.length, "expected the rest of the tool pages in dist");

  for (const file of toolPages) {
    const relative = file.slice(toolsDir.length);
    const path = `/tools/${relative.replace(/index\.html$/, "")}`;
    if (dropped.includes(path)) continue;
    const url = `${SITE}${path}`;
    assert.equal(sitemapXml.includes(url), true, `${path} missing from sitemap-*.xml`);
    const robots = robotsFor(url);
    assert.match(robots, /(^|, )index(,|$)/, `${path} lost its index directive: ${robots}`);
    assert.match(robots, /follow/, `${path} lost follow`);
    assert.doesNotMatch(robots, /noindex/, `${path} was noindexed`);
  }
  assert.equal(robotsFor(`${SITE}/tools/grocery-budget-calculator/`).includes("noindex"), false);
  assert.equal(sitemapXml.includes(`${SITE}/tools/grocery-budget-calculator/`), true);
});

test("dataset CSV landings and printables are noindex, follow, and absent from the sitemap", () => {
  const entries = new Set(sitemapEntries().map((entry) => entry.loc));
  const paths = [
    "/data/fiber-per-dollar-2026/",
    "/data/protein-per-dollar-2026/",
    "/printables/bean-conversion-card/",
    "/printables/sourdough-discard-grams-cheat-sheet/",
    "/printables/weekly-grocery-budget-planner/",
    "/printables/smoke-point-chart/",
    "/printables/fridge-life-card/",
  ];

  for (const path of paths) {
    const url = `${SITE}${path}`;
    assert.ok(!entries.has(url), `${path} leaked into the sitemap`);
    assert.ok(existsSync(distHtmlFor(url)), `${path} must stay reachable`);
    const robots = robotsFor(url);
    assert.match(robots, /noindex/, `${path} missing noindex`);
    assert.match(robots, /follow/, `${path} missing follow`);
    assert.doesNotMatch(robots, /nofollow/, `${path} must stay follow`);
    if (path === "/data/fiber-per-dollar-2026/" || path === "/data/protein-per-dollar-2026/") {
      const landing = readFileSync(distHtmlFor(url), "utf8");
      assert.match(landing, /"@type":\s*"Dataset"/, `${path} dropped Dataset markup`);
      assert.match(landing, new RegExp(`"@id":"${SITE}${path}#dataset"`));
    }
  }

  const dataHub = readFileSync(distHtmlFor(`${SITE}/data/`), "utf8");
  assert.match(dataHub, /"@type":\s*"Dataset"/, "/data/ dropped Dataset markup");
  assert.ok(!robotsFor(`${SITE}/data/`).includes("noindex"), "/data/ was noindexed");
  assert.ok(entries.has(`${SITE}/data/`), "/data/ missing from sitemap");

  for (const path of [
    "/fiber-per-dollar-cheapest-high-fiber-foods/",
    "/protein-per-dollar-cheapest-protein-sources/",
    "/high-protein-on-a-budget-complete-guide/",
    "/how-to-eat-more-fiber-on-a-budget-complete-guide/",
  ]) {
    assert.equal(existsSync(distHtmlFor(`${SITE}${path}`)), false, `${path} should 301, not stay as HTML`);
    assert.ok(!entries.has(`${SITE}${path}`), `${path} should stay out of the sitemap`);
  }
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
  const keepFlagship = "usda-thrifty-food-plan-weekly-cost";

  assert.equal(INDEX_PRUNE_SLUGS.size, 105);
  assert.equal(INDEX_PRUNE_SLUGS.has("can-you-refreeze-frozen-vegetables-after-thawing"), false);
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
  assert.equal(noindexed, 105);
  for (const playbook of [
    "eat-healthy-on-a-budget-complete-playbook",
    "meal-prep-for-beginners-complete-system",
  ]) {
    assert.equal(INDEX_PRUNE_SLUGS.has(playbook), true, playbook);
    assert.equal(INDEX_KEEP_PATHS.has(playbook), false, playbook);
    assert.ok(!entries.has(locFor(playbook)), `${playbook} leaked into the sitemap`);
    const playbookRobots = robotsFor(locFor(playbook));
    assert.ok(playbookRobots.includes("noindex"), `${playbook} missing noindex`);
    assert.ok(playbookRobots.includes("follow"), `${playbook} missing follow`);
  }
  for (const slug of [
    "protein-per-dollar-cheapest-protein-sources",
    "high-protein-on-a-budget-complete-guide",
    "fiber-per-dollar-cheapest-high-fiber-foods",
    "how-to-eat-more-fiber-on-a-budget-complete-guide",
  ]) {
    assert.equal(INDEX_KEEP_PATHS.has(slug), false, slug);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, slug);
    assert.ok(!entries.has(locFor(slug)), `${slug} leaked into the sitemap`);
    assert.equal(existsSync(distHtmlFor(locFor(slug))), false, `${slug} should 301`);
  }
  const restored = "can-you-refreeze-frozen-vegetables-after-thawing";
  assert.ok(entries.has(locFor(restored)), `${restored} should return to the sitemap`);
  const restoredRobots = robotsFor(locFor(restored));
  assert.ok(restoredRobots.includes("index"), `${restored} missing index`);
  assert.ok(!restoredRobots.includes("noindex"), `${restored} still noindexed`);
  assert.ok(restoredRobots.includes("follow"), `${restored} missing follow`);

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

test("food value database SERP copy leads with food value and grocery cost", () => {
  const html = readFileSync(distHtmlFor(`${SITE}/food-value-database/`), "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "";
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1] ??
    "";
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ?? "";
  const description = metaContent(html, "description") ?? "";

  assert.equal(title, "Food Value Database: Grocery Cost for 79 Foods");
  assert.equal(ogTitle, title);
  assert.equal(h1, title);
  assert.match(title, /^Food Value Database:/);
  assert.match(title, /Grocery Cost/);
  assert.equal(title.includes("Compare"), false);
  assert.match(html, /"dateModified":"2026-09-24"/);
  assert.equal(
    description,
    "Protein and fiber per dollar for 79 grocery foods in one searchable table. July 2026 US prices, USDA FoodData Central nutrition, free CSV download.",
  );
  assert.equal(description.includes("Not USDA-endorsed"), false);
  assert.match(html, /Not USDA-endorsed/);
  assert.ok(description.length <= 160, `clamped meta too long: ${description.length}`);
});

test("David Miller author profile is indexable, in the sitemap, and used by article schema", () => {
  const authorUrl = `${SITE}/author/david-miller/`;
  const locs = new Set(sitemapEntries().map((entry) => entry.loc));
  assert.ok(locs.has(authorUrl), "author profile missing from sitemap");

  const html = readFileSync(distHtmlFor(authorUrl), "utf8");
  const robots = metaContent(html, "robots") ?? "";
  assert.ok(robots.includes("index"), "author profile missing index");
  assert.ok(!robots.includes("noindex"), "author profile is noindex");
  assert.equal(canonicalHref(html), authorUrl);
  assert.equal(metaContent(html, "author"), "David Miller");
  assert.match(html, /David Miller is a pen name/);

  const people = [];
  const profiles = [];
  for (const block of jsonLdBlocks(html, authorUrl)) {
    visit(block, (node) => {
      if (node["@type"] === "Person") people.push(node);
      if (node["@type"] === "ProfilePage") profiles.push(node);
    });
  }
  assert.ok(profiles.length > 0, "author profile missing ProfilePage");
  assert.ok(people.some((person) => person.name === "David Miller" && person.url === authorUrl));
  assert.ok(people.every((person) => person.image == null), "author Person must not invent a photo");

  for (const sample of [
    `${SITE}/how-to-quick-soak-dried-beans-same-day/`,
    `${SITE}/sheet-pan-salmon-and-vegetables-30-minutes/`,
  ]) {
    const articleHtml = readFileSync(distHtmlFor(sample), "utf8");
    assert.equal(metaContent(articleHtml, "author"), "David Miller", sample);
    assert.match(
      articleHtml,
      /href="\/author\/david-miller\/"[^>]*rel="author"/,
      sample,
    );
    assert.match(
      articleHtml,
      /<link rel="author" href="https:\/\/www\.daily-life-hacks\.com\/author\/david-miller\/"/,
      sample,
    );
    assert.doesNotMatch(articleHtml, /Daily Life Hacks Team/);
    const authors = [];
    for (const block of jsonLdBlocks(articleHtml, sample)) {
      visit(block, (node) => {
        if (node["@type"] === "Article" || node["@type"] === "Recipe") authors.push(node.author);
      });
    }
    assert.ok(authors.length > 0, `${sample} missing Article or Recipe author`);
    for (const author of authors) {
      assert.equal(author?.["@type"], "Person", sample);
      assert.equal(author?.name, "David Miller", sample);
      assert.equal(author?.url, authorUrl, sample);
    }
  }

  const feed = JSON.parse(read("dist/feed.json"));
  assert.equal(feed.authors?.[0]?.name, "David Miller");
  assert.equal(feed.authors?.[0]?.url, authorUrl);
  assert.ok(feed.items.every((item) => item.authors?.[0]?.name === "David Miller"));

  const atom = read("dist/atom.xml");
  assert.match(atom, new RegExp(`<uri>${authorUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</uri>`));
  assert.doesNotMatch(atom, /Daily Life Hacks Team/);

  const rss = read("dist/rss.xml");
  assert.match(rss, /<dc:creator>David Miller<\/dc:creator>/);
  assert.doesNotMatch(rss, /Daily Life Hacks Team/);
});

test("per-100g index pages cite the #258 dataset records without a second Dataset node", () => {
  const pages = [
    {
      slug: "foods-highest-in-protein-per-100-grams",
      csv: "/data/protein-per-dollar-2026.csv",
      datasetKey: "protein-per-dollar-cheapest-protein-sources",
      datasetId: `${SITE}/data/protein-per-dollar-2026/#dataset`,
      stat: "TVP led the same study at 52.17 g on a label proxy",
      excerpt:
        "Foods highest in protein per 100g: TVP 52.17g (label proxy). Exact USDA matches: dry brown lentils 24.63g, drained sardines 24.62g. 49-food July 2026 study.",
    },
    {
      slug: "best-high-fiber-foods-ranked-by-fiber-content",
      csv: "/data/fiber-per-dollar-2026.csv",
      datasetKey: "fiber-per-dollar-cheapest-high-fiber-foods",
      datasetId: `${SITE}/data/fiber-per-dollar-2026/#dataset`,
      stat: "chia seeds had the most fiber per 100 g at 34.4 g",
      excerpt:
        "Best high-fiber foods ranked by fiber per 100g: chia seeds 34.4g, whole flaxseed 27.3g, dry split peas 22.2g. USDA dry weight, 53-food study, not servings.",
    },
  ];

  for (const page of pages) {
    const url = `${SITE}/${page.slug}/`;
    const html = readFileSync(distHtmlFor(url), "utf8");
    const description = metaContent(html, "description") ?? "";
    assert.equal(description, page.excerpt, `${page.slug} meta description`);
    assert.ok(html.includes(page.excerpt), `${page.slug} dek should equal the excerpt`);
    assert.ok(html.includes(page.stat), `${page.slug} quotable stat`);
    assert.match(html, /Cite this dataset/);
    assert.doesNotMatch(html, /Cite this study/);
    assert.match(html, new RegExp(`href="${page.csv.replaceAll("/", "\\/")}"[^>]*\\sdownload`));
    assert.match(html, /Download the CSV/);
    assert.match(html, new RegExp(`data-dataset-id="${page.datasetKey}"`));
    assert.match(html, /David Miller/);

    const articles = [];
    const datasets = [];
    for (const block of jsonLdBlocks(html, url)) {
      visit(block, (node) => {
        if (node["@type"] === "Article") articles.push(node);
        if (node["@type"] === "Dataset") datasets.push(node);
      });
    }
    assert.equal(datasets.length, 0, `${page.slug} should not emit a Dataset node`);
    assert.equal(articles.length, 1, `${page.slug} should have one Article node`);
    assert.equal(articles[0].isBasedOn?.["@id"], page.datasetId);
    assert.equal(articles[0].author?.name, "David Miller");
    assert.equal(articles[0].dateModified?.slice(0, 10), "2026-11-23");

    const lastmod = sitemapEntries().find((entry) => entry.loc === url)?.lastmod ?? "";
    assert.equal(
      lastmod.slice(0, 10),
      "2026-11-23",
      `${page.slug} lastmod should stay on the existing public day`,
    );
  }
});

function pruneSlugFromHref(href) {
  const value = String(href ?? "").trim();
  if (!value || value.startsWith("#")) return null;
  if (/^(?:mailto|tel|javascript|data):/i.test(value)) return null;
  let target;
  try {
    target = new URL(value, `${SITE}/`);
  } catch {
    return null;
  }
  if (target.origin !== SITE) return null;
  const slug = target.pathname.replace(/^\/+|\/+$/g, "");
  if (!slug || slug.includes("/") || slug.includes(".")) return null;
  return INDEX_PRUNE_SLUGS.has(slug) ? slug : null;
}

function metaProperty(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    html.match(
      new RegExp(
        `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    )?.[1] ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`,
        "i",
      ),
    )?.[1]
  );
}

function jsonLdDates(html, pageUrl) {
  const dates = [];
  for (const block of jsonLdBlocks(html, pageUrl)) {
    visit(block, (node) => {
      if (typeof node.datePublished === "string" && typeof node.dateModified === "string") {
        dates.push(node);
      }
    });
  }
  return dates;
}

test("article OG times match JSON-LD dates on every sitemap article", () => {
  let articles = 0;
  for (const entry of sitemapEntries()) {
    const html = readFileSync(distHtmlFor(entry.loc), "utf8");
    const published = metaProperty(html, "article:published_time");
    const modified = metaProperty(html, "article:modified_time");
    const ogType = metaProperty(html, "og:type");
    if (ogType !== "article") {
      assert.equal(published, undefined, entry.loc);
      assert.equal(modified, undefined, entry.loc);
      continue;
    }
    articles += 1;
    assert.ok(published, `missing article:published_time: ${entry.loc}`);
    assert.ok(modified, `missing article:modified_time: ${entry.loc}`);
    const dates = jsonLdDates(html, entry.loc);
    assert.ok(dates.length > 0, `missing JSON-LD dates: ${entry.loc}`);
    for (const node of dates) {
      assert.equal(node.datePublished, published, entry.loc);
      assert.equal(node.dateModified, modified, entry.loc);
    }
    if (entry.lastmod) assert.equal(modified, entry.lastmod, entry.loc);
  }
  assert.ok(articles >= 100, `expected the sitemap articles, found ${articles}`);
});

test("built article tables have a hidden caption and scoped header cells", () => {
  let tables = 0;
  for (const entry of sitemapEntries()) {
    const html = readFileSync(distHtmlFor(entry.loc), "utf8");
    if (metaProperty(html, "og:type") !== "article") continue;
    const start = html.indexOf('class="article-content');
    if (start === -1) continue;
    const content = html.slice(start);
    for (const match of content.matchAll(/<table\b[\s\S]*?<\/table>/g)) {
      tables += 1;
      const table = match[0];
      assert.match(table, /<caption\b[^>]*class="sr-only"[^>]*>[^<]+<\/caption>/, entry.loc);
      const thead = table.match(/<thead\b[\s\S]*?<\/thead>/)?.[0] ?? "";
      const headers = [...thead.matchAll(/<th\b[^>]*>/g)];
      assert.ok(headers.length > 0, `table without header cells: ${entry.loc}`);
      for (const header of headers) {
        assert.match(header[0], /\sscope="col"/, `${entry.loc} ${header[0]}`);
      }
    }
  }
  assert.ok(tables >= 50, `expected markdown tables in article HTML, found ${tables}`);
});

test("indexable sitemap pages do not link to pruned slugs", () => {
  const failures = [];
  for (const entry of sitemapEntries()) {
    const html = readFileSync(distHtmlFor(entry.loc), "utf8");
    for (const match of html.matchAll(/(?:href|url)\s*[=:]\s*(["'])([^"']+)\1/gi)) {
      const slug = pruneSlugFromHref(match[2]);
      if (!slug) continue;
      failures.push(`${entry.loc} -> /${slug}/ via ${match[2]}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("matched top landing pages render one early signup and keep the end form", () => {
  const samples = [
    ["/cooking-oils-smoke-points-best-uses/", "oils"],
    ["/how-to-store-homemade-salad-dressing-safely/", "storage"],
    ["/costco-rotisserie-chicken-meal-ideas-dinner/", "budget"],
    ["/high-fiber-bran-muffins-that-taste-good/", "fiber"],
    ["/easy-sourdough-discard-recipes-beginners/", "sourdough"],
    ["/canned-beans-vs-dried-beans-nutrition/", "beans"],
  ];
  for (const [path, offer] of samples) {
    const html = readFileSync(distHtmlFor(`${SITE}${path}`), "utf8");
    const early = html.match(/data-signup-placement="early"/g) || [];
    const forms = html.match(/<form\b/gi) || [];
    assert.equal(early.length, 1, `${path} early forms`);
    assert.ok(forms.length <= 2 && forms.length >= 1, `${path} form count ${forms.length}`);
    assert.match(html, new RegExp(`data-signup-offer="${offer}"`));
    assert.match(html, /data-signup-placement="inline"/);
    assert.doesNotMatch(html, /NewsletterPopup|id="popup-email"/);
  }

  const selenium = readFileSync(distHtmlFor(`${SITE}/selenium-containing-foods-easy-ways/`), "utf8");
  assert.doesNotMatch(selenium, /data-signup-placement="early"/);
  assert.match(selenium, /data-signup-offer="generic"/);
  assert.match(selenium, /data-signup-placement="inline"/);
});
