import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const ARTICLES = join(ROOT, "src/data/articles");

/**
 * Pages already over 160 characters before this description pass. This PR does
 * not rewrite them. A new or newly lengthened excerpt still fails the gate.
 */
const OVER_160_GRANDFATHER = new Set([
  "beans-double-win-fiber-protein",
  "can-you-use-sourdough-discard-from-a-new-starter",
  "high-fiber-yogurt-parfait-for-breakfast",
  "how-long-does-sourdough-discard-last",
  "sourdough-discard-vs-active-starter",
]);

const REWRITES = {
  "low-sodium-budget-foods-ranked":
    "26 of 56 cheap staples have under 10 mg sodium per 100 g: flour 2 mg, tofu 4 mg, split peas 5 mg. The salt sits in processed picks like bread at 455 mg.",
  "high-protein-high-fiber-meals-for-weight-loss":
    "Build each plate on 30-40 g protein and a cup of beans, lentils, or whole grains. A cup of cooked lentils alone gives about 16 g fiber and 18 g protein.",
  "lentil-curry-high-fiber-vegan-dinner":
    "One-pot red lentil curry in 35 minutes, no soaking. Serves 4 at 475 calories each. Lentils carry 15.6 g fiber per cooked cup (USDA). Reheats well.",
  "high-fiber-meals-for-constipation-relief":
    "Food-first meals for occasional constipation: oats, chia pudding, beans, and soft cooked vegetables, added slowly with fluids as NIDDK advises.",
  "cooking-oils-smoke-points-best-uses":
    "Smoke points for 22 refined oils (palm 489°F, soybean 464°F, canola 457°F) plus cold-pressed lab tests, boiling-point myths, and which oil fits each pan.",
  "30-day-high-fiber-challenge-meal-plan":
    "A 4-week fiber plan: swap breakfast in week 1, add a lunch add-in in week 2, beans or grains at dinner in week 3, then lock it in. Go slow, drink water.",
  "what-30-grams-of-fiber-costs-per-day":
    "Five real ways to hit 30 grams of fiber in a day cost 62 cents to $14.42. Same fiber, 23 times the price. Every grocery figure traces to USDA data.",
};

const HELD_EXCERPT =
  "Tired of soggy sandwiches and overpriced drive-thru burgers? These high-protein, packable lunch ideas for blue collar men keep energy steady all afternoon.";

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "article is missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const fm = frontmatter(markdown);
  const lines = fm.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith(`${name}:`)) continue;
    const rest = lines[i].slice(name.length + 1).trim();
    if (rest === ">" || rest === "|" || rest === ">-" || rest === "|-") {
      const parts = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^\s+\S/.test(lines[j])) parts.push(lines[j].trim());
        else if (lines[j].trim() === "") continue;
        else break;
      }
      return parts.join(" ");
    }
    if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      return rest.slice(1, -1);
    }
    return rest;
  }
  return undefined;
}

function releaseDay(markdown) {
  return field(markdown, "publishAt") || field(markdown, "date");
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function stuffedOpener(slug, excerpt) {
  const lower = excerpt.trim().toLowerCase();
  return (
    lower.startsWith(`this ${slug.replaceAll("-", " ")}`) ||
    lower.startsWith("try this")
  );
}

function readArticle(slug) {
  return readFileSync(join(ARTICLES, `${slug}.md`), "utf8");
}

test("answer-first excerpts match the proposed SERP text and stay under 160 characters", () => {
  for (const [slug, excerpt] of Object.entries(REWRITES)) {
    const actual = field(readArticle(slug), "excerpt");
    assert.equal(actual, excerpt, slug);
    assert.ok(excerpt.length < 160, `${slug} excerpt is ${excerpt.length} characters`);
    assert.equal(stuffedOpener(slug, excerpt), false, slug);
  }

  const database = readFileSync(
    join(ROOT, "src/pages/food-value-database/index.astro"),
    "utf8",
  );
  assert.match(
    database,
    /Protein and fiber per dollar for \$\{foods\.length\} grocery foods in one searchable table\. July 2026 US prices, USDA FoodData Central nutrition, free CSV download\./,
  );
  assert.match(database, /const dateModified = "2026-09-24";/);
  assert.match(database, /Not USDA-endorsed\./);
});

test("description-only and citation edits do not bump the public modified day", () => {
  const expected = {
    "low-sodium-budget-foods-ranked": {
      dateModified: "2026-11-25",
      substantiveUpdate: "2026-11-25",
    },
    "high-protein-high-fiber-meals-for-weight-loss": {
      dateModified: "2026-11-25",
      substantiveUpdate: "2026-11-25",
    },
    "high-fiber-meals-for-constipation-relief": {
      dateModified: "2026-11-25",
      substantiveUpdate: "2026-11-25",
    },
    "30-day-high-fiber-challenge-meal-plan": {
      dateModified: "2026-07-20",
      substantiveUpdate: undefined,
    },
    "lentil-curry-high-fiber-vegan-dinner": {
      dateModified: "2026-11-23",
      substantiveUpdate: "2026-11-23",
    },
    "what-30-grams-of-fiber-costs-per-day": {
      dateModified: "2026-11-23",
      substantiveUpdate: "2026-11-23",
    },
    "foods-highest-in-protein-per-100-grams": {
      dateModified: "2026-11-23",
      substantiveUpdate: "2026-11-23",
    },
    "best-high-fiber-foods-ranked-by-fiber-content": {
      dateModified: "2026-11-23",
      substantiveUpdate: "2026-11-23",
    },
    "healthy-blue-collar-lunch-ideas-men": {
      dateModified: "2026-11-23",
      substantiveUpdate: "2026-11-23",
    },
  };

  for (const [slug, dates] of Object.entries(expected)) {
    const markdown = readArticle(slug);
    assert.equal(field(markdown, "dateModified"), dates.dateModified, `${slug} dateModified`);
    assert.equal(
      field(markdown, "substantiveUpdate"),
      dates.substantiveUpdate,
      `${slug} substantiveUpdate`,
    );
    assert.equal(field(markdown, "author"), "David Miller", slug);
  }

  assert.equal(field(readArticle("healthy-blue-collar-lunch-ideas-men"), "excerpt"), HELD_EXCERPT);
});

test("no published excerpt is over 160 characters or opens with a stuffed This/Try this line", () => {
  const today = todayUtc();
  const tooLong = [];
  for (const name of readdirSync(ARTICLES)) {
    if (!name.endsWith(".md")) continue;
    const slug = name.slice(0, -3);
    const markdown = readArticle(slug);
    const released = releaseDay(markdown);
    if (!released || released > today) continue;
    const excerpt = field(markdown, "excerpt");
    assert.ok(excerpt, `${slug} is missing an excerpt`);
    assert.equal(stuffedOpener(slug, excerpt), false, `${slug} excerpt opens with a stuffed line`);
    if (excerpt.length > 160 && !OVER_160_GRANDFATHER.has(slug)) {
      tooLong.push(`${slug} (${excerpt.length})`);
    }
  }
  assert.deepEqual(tooLong, []);
});

test("per-100g index pages quote the table leaders and link the existing dataset records", () => {
  const protein = readArticle("foods-highest-in-protein-per-100-grams");
  const fiber = readArticle("best-high-fiber-foods-ranked-by-fiber-content");
  assert.match(
    protein,
    /In our July 2026 study of 49 foods, dry brown lentils \(24\.63 g\) and drained sardines \(24\.62 g\) had the most protein per 100 g among exact USDA matches\. TVP led the same study at 52\.17 g on a label proxy\./,
  );
  assert.match(protein, /\]\(\/data\/protein-per-dollar-2026\.csv\)/);
  assert.match(
    fiber,
    /In our July 2026 study of 53 foods, chia seeds had the most fiber per 100 g at 34\.4 g, whole flaxseed followed at 27\.3 g, and dry green split peas at 22\.2 g\./,
  );
  assert.match(fiber, /\]\(\/data\/fiber-per-dollar-2026\.csv\)/);

  const page = readFileSync(join(ROOT, "src/pages/[slug].astro"), "utf8");
  const registry = readFileSync(join(ROOT, "src/content/datasets.ts"), "utf8");
  assert.match(page, /datasetSchemaId\(linkedDataset, siteUrl\)/);
  assert.match(page, /"foods-highest-in-protein-per-100-grams":\s*"protein-per-dollar-cheapest-protein-sources"/);
  assert.match(page, /"best-high-fiber-foods-ranked-by-fiber-content":\s*"fiber-per-dollar-cheapest-high-fiber-foods"/);
  assert.match(page, /cannot both own and link a Dataset/);
  assert.match(page, /if \(dataset\)/);
  assert.doesNotMatch(page, /buildDatasetSchema/);
  assert.match(registry, /export const FIBER_RANKING_STUDY = "\/what-30-grams-of-fiber-costs-per-day\/"/);
  assert.match(registry, /export const PROTEIN_RANKING_STUDY = "\/protein-per-dollar-adjusted-for-quality\/"/);
  assert.match(
    registry,
    /"fiber-per-dollar-cheapest-high-fiber-foods": \{[\s\S]*?studyUrl: FIBER_RANKING_STUDY/,
  );
  assert.match(
    registry,
    /"protein-per-dollar-cheapest-protein-sources": \{[\s\S]*?studyUrl: PROTEIN_RANKING_STUDY/,
  );
});
