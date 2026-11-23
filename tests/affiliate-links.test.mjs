import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  AFFILIATE_REL,
  DISCLOSURE_PATH,
  affiliateDisclosureHtml,
  affiliateLinksEnabled,
  articleViolations,
  collectAffiliateViolations,
  hasAffiliateMarker,
  pageExclusion,
  readArticleFields,
  renderAffiliateLink,
  studySlugsFromRegistry,
} from "../src/content/affiliate-policy.mjs";
import { transformAffiliateTree } from "../scripts/rehype-affiliate-links.mjs";
import { findAffiliateViolations } from "../scripts/check-affiliate-policy.mjs";

const root = process.cwd();
const studySlugs = studySlugsFromRegistry(
  readFileSync(join(root, "src", "content", "datasets.ts"), "utf8"),
);

const HEALTH_CLAIM_SLUGS = [
  "artichoke-recipes-for-gut-health",
  "best-high-fiber-fruits-for-weight-loss-list",
  "easy-high-fiber-breakfast-ideas-for-gut-health",
  "fiber-rich-soup-for-weight-loss-cabbage",
  "gut-friendly-high-fiber-smoothies-for-daily-wellness",
  "gut-health-tea-peppermint-ginger",
  "high-fiber-meals-for-constipation-relief",
  "high-protein-high-fiber-meals-for-weight-loss",
  "natto-japanese-fermented-soybeans-gut-health",
  "prebiotic-foods-beyond-the-buzzwords",
  "prune-juice-alternatives-for-constipation",
  "water-and-fiber-the-golden-rule",
];

const CANDIDATE_SLUGS = [
  "kitchen-tools-that-save-time-and-money",
  "baking-sheet-liners-parchment-silicone-when-to-use",
  "how-to-measure-sourdough-discard-grams",
];

function el(tagName, properties, children) {
  return { type: "element", tagName, properties, children };
}

function text(value) {
  return { type: "text", value };
}

function affiliateTree(href = "https://example.com/scale", label = "kitchen scale") {
  return {
    type: "root",
    children: [
      el("p", {}, [
        text("Use a "),
        el("a", { href, dataAffiliate: "true" }, [text(label)]),
        text(" for the grams."),
      ]),
    ],
  };
}

test("the affiliate flag defaults off", () => {
  assert.equal(affiliateLinksEnabled({}), false);
  assert.equal(affiliateLinksEnabled({ AFFILIATE_LINKS_ENABLED: "" }), false);
  assert.equal(affiliateLinksEnabled({ AFFILIATE_LINKS_ENABLED: "false" }), false);
  assert.equal(affiliateLinksEnabled({ AFFILIATE_LINKS_ENABLED: "off" }), false);
  assert.equal(affiliateLinksEnabled({ AFFILIATE_LINKS_ENABLED: "true" }), true);
  assert.equal(affiliateLinksEnabled({ AFFILIATE_LINKS_ENABLED: "TRUE" }), true);
});

test("a disabled affiliate link leaves the fixture text unchanged", () => {
  const html = "<em>kitchen scale</em>";
  assert.equal(
    renderAffiliateLink({ enabled: false, href: "https://example.com/scale", html }),
    html,
  );
  assert.equal(
    renderAffiliateLink({ enabled: false, href: "https://example.com/scale", text: "kitchen scale" }),
    "kitchen scale",
  );
  const tree = affiliateTree();
  const before = JSON.stringify(tree);
  transformAffiliateTree(tree, {
    enabled: false,
    slug: "kitchen-tools-that-save-time-and-money",
    category: "tips",
    studySlugs,
  });
  assert.equal(JSON.stringify(tree), before);
});

test("an enabled fixture link renders rel, the marker, and one disclosure", () => {
  const html = renderAffiliateLink({
    enabled: true,
    href: "https://example.com/scale?utm=1&id=2",
    text: "kitchen scale",
  });
  assert.match(html, new RegExp(`rel="${AFFILIATE_REL}"`));
  assert.match(html, /rel="sponsored nofollow noopener"/);
  assert.match(html, /\(affiliate\)/);
  assert.match(html, new RegExp(`href="${DISCLOSURE_PATH}"`));
  assert.doesNotMatch(affiliateDisclosureHtml(), /\n/);
  assert.ok(html.indexOf("affiliate-disclosure") < html.indexOf(`rel="${AFFILIATE_REL}"`));
  assert.doesNotMatch(
    affiliateDisclosureHtml(),
    /rel="sponsored/,
  );
  assert.throws(
    () => renderAffiliateLink({ enabled: true, href: "javascript:alert(1)", text: "x" }),
    /http/,
  );

  const tree = affiliateTree();
  const second = el("p", {}, [
    el("a", { href: "https://example.com/pan", dataAffiliate: "true" }, [text("sheet pan")]),
  ]);
  tree.children.push(second);
  transformAffiliateTree(tree, {
    enabled: true,
    slug: "kitchen-tools-that-save-time-and-money",
    title: "Kitchen Tools That Save Time and Money",
    category: "tips",
    tags: [],
    studySlugs,
  });
  assert.equal(tree.children[0].tagName, "p");
  assert.ok(tree.children[0].properties.className.includes("affiliate-disclosure"));
  const disclosures = tree.children.filter((node) =>
    node.properties?.className?.includes("affiliate-disclosure"),
  );
  assert.equal(disclosures.length, 1);
  assert.equal(disclosures[0].children[1].properties.href, DISCLOSURE_PATH);
  const links = [];
  const walk = (node) => {
    if (node.tagName === "a" && node.properties?.href?.startsWith("https://")) links.push(node);
    for (const child of node.children || []) walk(child);
  };
  walk(tree);
  assert.equal(links.length, 2);
  for (const link of links) {
    assert.deepEqual(link.properties.rel, ["sponsored", "nofollow", "noopener"]);
    assert.equal(link.properties.target, "_blank");
  }
  assert.match(JSON.stringify(links[0]), /\(affiliate\)/);
});

test("hard exclusions reject health claims, recipe nutrition, and study tables", () => {
  for (const slug of HEALTH_CLAIM_SLUGS) {
    const article = readArticleFields(
      readFileSync(join(root, "src", "data", "articles", `${slug}.md`), "utf8"),
      slug,
    );
    assert.equal(pageExclusion(article, studySlugs), "health-claim page", slug);
    const violations = articleViolations(
      { ...article, affiliateEligible: true },
      studySlugs,
      { enabled: false },
    );
    assert.ok(violations.some((line) => line.includes("affiliateEligible")), slug);
  }

  for (const slug of CANDIDATE_SLUGS) {
    const article = readArticleFields(
      readFileSync(join(root, "src", "data", "articles", `${slug}.md`), "utf8"),
      slug,
    );
    assert.equal(pageExclusion(article, studySlugs), null, slug);
    assert.equal(
      articleViolations({ ...article, affiliateEligible: true }, studySlugs, { enabled: false }).length,
      0,
      slug,
    );
  }

  const nutrition = articleViolations(
    {
      slug: "sheet-pan-ginger-tofu-broccoli-sticky-glaze",
      title: "Sheet Pan Ginger Tofu and Broccoli",
      tags: ["sheet pan dinner"],
      category: "recipes",
      affiliateEligible: false,
      body: "## Nutrition\n\n<a data-affiliate href=\"https://example.com/whey\">whey</a>\n\n## Method\n\nCook it.",
      raw: "<a data-affiliate href=\"https://example.com/whey\">whey</a>",
    },
    studySlugs,
    { enabled: true },
  );
  assert.ok(nutrition.some((line) => line.includes("recipe nutrition block")));

  assert.throws(
    () => transformAffiliateTree(
      {
        type: "root",
        children: [
          el("h2", {}, [text("Nutrition")]),
          el("p", {}, [
            el("a", { href: "https://example.com/whey", dataAffiliate: "true" }, [text("whey")]),
          ]),
        ],
      },
      {
        enabled: true,
        slug: "sheet-pan-ginger-tofu-broccoli-sticky-glaze",
        category: "recipes",
        title: "Sheet Pan Ginger Tofu and Broccoli",
        tags: [],
        studySlugs,
      },
    ),
    /recipe nutrition block/,
  );

  const studySlug = "what-30-grams-of-fiber-costs-per-day";
  assert.ok(studySlugs.has(studySlug));
  const study = articleViolations(
    {
      slug: studySlug,
      title: "What 30 Grams of Fiber Costs",
      tags: [],
      category: "nutrition",
      affiliateEligible: true,
      body: "| food | fiber |\n| --- | --- |\n| oats | <a data-affiliate href=\"https://example.com\">oats</a> |",
      raw: "<a data-affiliate href=\"https://example.com\">oats</a>",
    },
    studySlugs,
    { enabled: true },
  );
  assert.ok(study.some((line) => line.includes("affiliateEligible")));
  assert.ok(study.some((line) => line.includes("study data table")));

  assert.throws(
    () => transformAffiliateTree(
      {
        type: "root",
        children: [
          el("table", {}, [
            el("tbody", {}, [
              el("tr", {}, [
                el("td", {}, [
                  el("a", { href: "https://example.com", dataAffiliate: "true" }, [text("oats")]),
                ]),
              ]),
            ]),
          ]),
        ],
      },
      {
        enabled: true,
        slug: studySlug,
        category: "nutrition",
        title: "What 30 Grams of Fiber Costs",
        tags: [],
        studySlugs,
      },
    ),
    /study data table/,
  );

  const dataPage = collectAffiliateViolations({
    articles: [],
    dataPages: [{
      path: "src/pages/data/index.astro",
      source: '<a data-affiliate href="https://example.com">catalog</a>',
    }],
    studySlugs,
    enabled: true,
  });
  assert.ok(dataPage.some((line) => line.includes("data page")));

  const nutritionBar = collectAffiliateViolations({
    articles: [],
    recipeMetaBar: '<span><a data-affiliate href="https://example.com">kcal</a></span>',
    nutritionSchema: "nutrition: article.data.calories",
    studySlugs,
    enabled: true,
  });
  assert.ok(nutritionBar.some((line) => line.includes("recipe nutrition block")));
});

test("published content has no affiliate links and the build gate is clean", () => {
  const articlePage = readFileSync(join(root, "src", "pages", "[slug].astro"), "utf8");
  assert.doesNotMatch(articlePage, /rel="sponsored/);
  assert.doesNotMatch(articlePage, /affiliate-disclosure/);
  assert.doesNotMatch(articlePage, /AffiliateLink/);
  assert.match(
    readFileSync(join(root, "src", "content.config.ts"), "utf8"),
    /affiliateEligible: z\.boolean\(\)\.default\(false\)/,
  );
  assert.match(
    readFileSync(join(root, "astro.config.mjs"), "utf8"),
    /if \(affiliateLinksEnabled\(\)\) articleRehypePlugins\.push\(rehypeAffiliateLinks\)/,
  );
  assert.match(
    readFileSync(join(root, "src", "components", "AffiliateLink.astro"), "utf8"),
    /renderAffiliateLink/,
  );

  const violations = findAffiliateViolations(root);
  assert.deepEqual(violations, []);

  for (const slug of [...HEALTH_CLAIM_SLUGS, ...CANDIDATE_SLUGS]) {
    const article = readArticleFields(
      readFileSync(join(root, "src", "data", "articles", `${slug}.md`), "utf8"),
      slug,
    );
    assert.equal(article.affiliateEligible, false, slug);
    assert.equal(hasAffiliateMarker(article.raw), false, slug);
  }

  const check = spawnSync(process.execPath, ["scripts/check-affiliate-policy.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(check.status, 0, check.stderr);
});
