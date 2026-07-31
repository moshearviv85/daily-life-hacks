import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articleUrl = new URL(
  "../src/data/articles/high-fiber-fast-food-options-guide.md",
  import.meta.url,
);
const article = readFileSync(articleUrl, "utf8");

function extractTable(markdown) {
  const header =
    "| Chain | Exact order or build | Fiber | Calories | Protein | Sodium | Checked | Official source |";
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.indexOf(header);

  assert.notEqual(headerIndex, -1, "missing the answer-first nutrition table");
  assert.match(
    lines[headerIndex + 1],
    /^\|(?:\s*:?-+:?\s*\|)+$/,
    "missing the Markdown table divider",
  );

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    rows.push(
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
  }
  return rows;
}

test("guide has complete dated rows with direct official sources", () => {
  const rows = extractTable(article);
  const allowedOfficialHosts = new Set([
    "www.chipotle.com",
    "www.chick-fil-a.com",
    "order.wendys.com",
    "www.panerabread.com",
    "www.starbucks.com",
    "media.subway.com",
  ]);

  assert.equal(rows.length, 10);

  for (const row of rows) {
    assert.equal(row.length, 8, `incomplete table row: ${row.join(" | ")}`);
    assert.ok(row[0], "chain is required");
    assert.ok(row[1].length >= 20, "exact order or build is required");
    assert.match(row[2], /^\d+ g \(\d+% DV\)$/);
    assert.match(row[3], /^\d+$/);
    assert.match(row[4], /^\d+ g$/);
    assert.match(row[5], /^\d{1,3}(?:,\d{3})* mg$/);
    assert.equal(row[6], "2026-07-30");

    const links = [
      ...row[7].matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g),
    ].map((match) => match[1]);
    assert.ok(links.length >= 1, `missing official source in ${row[0]} row`);

    for (const link of links) {
      const source = new URL(link);
      assert.ok(
        allowedOfficialHosts.has(source.hostname),
        `non-official source host in ${row[0]} row: ${source.hostname}`,
      );
    }
  }
});

test("requested current corrections and winner distinctions are explicit", () => {
  assert.match(
    article,
    /\| Chick-fil-A \|[^|\n]+\| 14 g \(50% DV\) \| 660 \| 43 g \| 1,420 mg \|/,
  );
  assert.match(
    article,
    /\| Panera \| Whole Mediterranean Veggie on Tomato Basil \| 8 g \(29% DV\) \| 520 \| 18 g \| 1,260 mg \|/,
  );
  assert.match(
    article,
    /highest-fiber custom order[^.]+Chipotle[^.]+25 grams/i,
  );
  // No single "ready-made leader" crown: Subway wins on raw fiber, the
  // Chick-fil-A soup wins on calories, sodium, protein and fiber per calorie,
  // so the two are presented side by side with both caveats attached.
  assert.doesNotMatch(article, /ready-made leader/i);
  assert.match(article, /no fixed menu item wins outright/i);
  assert.match(
    article,
    /Subway's Veggie Patty Protein Bowl carries the most fiber at 19 grams/i,
  );
  assert.match(article, /\*\*8 grams of fiber\*\*, not 10/i);

  // Superlatives must state their real scope, never "in the table"/"checked here".
  assert.doesNotMatch(article, /(?:highest|leads|winner|best)[^.\n]{0,60}\bin the table\b/i);
  assert.doesNotMatch(article, /(?:highest|leads|winner|best)[^.\n]{0,60}\bchecked here\b/i);
});

test("the Chick-fil-A soup row is present, sourced to the chain, and flagged seasonal", () => {
  // Chick-fil-A's own page lists the cup at 280 cal / 17 g fiber / 24 g protein
  // / 1,060 mg sodium. Restaurant menu facts never come from USDA.
  assert.match(
    article,
    /\| Chick-fil-A \| Chicken Tortilla Soup[^|\n]*\| 17 g \(61% DV\) \| 280 \| 24 g \| 1,060 mg \|/,
  );
  assert.doesNotMatch(article, /usda/i);

  const rows = extractTable(article);
  const soupRow = rows.find(([, build]) => build.startsWith("Chicken Tortilla Soup"));
  assert.ok(soupRow, "missing Chick-fil-A Chicken Tortilla Soup row");

  // Chick-fil-A calls it a seasonal item; the run ended 2026-03-07, so the row
  // must carry that limit rather than reading as a year-round order.
  assert.match(soupRow[1], /seasonal/i);
  assert.match(soupRow[1], /cup portion/i);
  assert.match(soupRow[7], /https:\/\/www\.chick-fil-a\.com\/menu\/sides\/chicken-tortilla-soup/);
  assert.match(article, /last run[^.\n]{0,60}March 7, 2026/i);

  // It also has to appear in the fiber-per-calorie ranking, above Subway.
  assert.match(article, /\| Chick-fil-A Chicken Tortilla Soup, cup \| 6\.1 g \|/);
});

test("quickAnswer carries the same scope as the body", () => {
  const quick = article.match(/^quickAnswer: "([\s\S]*?)"$/m);
  assert.ok(quick, "missing quickAnswer");
  const answer = quick[1];

  // The most-extracted field must not out-claim what was actually verified.
  assert.match(answer, /ten orders/i);
  assert.match(answer, /July 30, 2026/);
  assert.doesNotMatch(answer, /leads the ready-made items/i);
  assert.doesNotMatch(answer, /tops the list/i);

  // Self-contained: fiber, calories and sodium for both crowned orders.
  assert.match(answer, /25 grams/);
  assert.match(answer, /725 calories/);
  assert.match(answer, /1,130 milligrams/);
  assert.match(answer, /19 grams/);
  assert.match(answer, /540 calories/);
  assert.match(answer, /1,550 milligrams/);
});

test("source fetchability is disclosed honestly, per host", () => {
  // Chick-fil-A's site does 403 automated fetches, so its figures must be
  // re-checked against Internet Archive captures.
  assert.match(article, /Chick-fil-A's site returns a 403 to automated requests/i);
  assert.match(article, /web\.archive\.org/i);

  // Panera's PDF is NOT blocked: a plain automated request returns the full
  // 36-page file (verified 2026-07-31: default curl UA -> HTTP 200, 513,680
  // bytes, %PDF-1.6; a Chrome UA string is what gets 403'd). The earlier
  // assertion here required the article to state the opposite, which is why
  // it is gone. Panera sources four rows, so that dependence stays stated.
  assert.match(article, /Panera's PDF is not blocked/i);
  assert.match(article, /Panera sources four rows/i);
  assert.doesNotMatch(
    article,
    /Chick-fil-A's site and Panera's PDF both return a 403/i,
  );
});

test("the Subway build is spelled out ingredient by ingredient", () => {
  const rows = extractTable(article);
  const subwayRow = rows.find(([chain]) => chain === "Subway");

  assert.ok(subwayRow, "missing Subway table row");
  for (const part of [
    "footlong patty portion",
    "lettuce",
    "spinach",
    "tomatoes",
    "onions",
    "green peppers",
    "cucumbers",
    "olives",
    "no dressing or cheese",
    "participating locations only",
  ]) {
    assert.ok(
      subwayRow[1].includes(part),
      `Subway build cell is missing "${part}"`,
    );
  }
});

test("the two Panera Grab N Go wraps that tie the Cool Wrap are present", () => {
  assert.match(
    article,
    /\| Panera \| Green Goddess Chicken Wrap[^|\n]*\| 14 g \(50% DV\) \| 460 \| 32 g \| 1,340 mg \|/,
  );
  assert.match(
    article,
    /\| Panera \| Chicken Caesar Wrap[^|\n]*\| 14 g \(50% DV\) \| 480 \| 32 g \| 1,510 mg \|/,
  );
  assert.match(
    article,
    /\| Subway \|[^|\n]+\| 19 g \(68% DV\) \| 540 \| 22 g \| 1,550 mg \|/,
  );
});

test("Wendy's tuple describes the Saltine Packet only as far as Wendy's publishes it", () => {
  const rows = extractTable(article);
  const wendysRow = rows.find(([chain]) => chain === "Wendy's");

  assert.ok(wendysRow, "missing Wendy's table row");
  assert.deepEqual(wendysRow.slice(0, 6), [
    "Wendy's",
    "Plain Baked Potato plus Small Chili; Wendy's lists the Small Chili at 280 calories and the Saltine Packet as a default component, without breaking the packet out separately",
    "10 g (36% DV)",
    "550",
    "26 g",
    "1,090 mg",
  ]);
  assert.match(
    article,
    /potato and Small Chili provide the table's 10 grams of fiber, 550 calories, 26 grams of protein, and 1,090 milligrams of sodium/i,
  );
  assert.doesNotMatch(article, /default 280-calorie Chili/i);

  // Wendy's never states whether the packet is inside its published totals.
  assert.doesNotMatch(article, /totals assume the packet is eaten/i);
  assert.doesNotMatch(article, /eaten Saltine Packet/i);
  assert.doesNotMatch(article, /which includes a default Saltine Packet/i);
});

test("guide cites the FDA benchmark and avoids unsupported legacy claims", () => {
  assert.match(
    article,
    /\[FDA Daily Value for dietary fiber is 28 grams\]\(https:\/\/www\.fda\.gov\/food\/nutrition-facts-label\/daily-value-nutrition-and-supplement-facts-labels\)/,
  );

  const bannedClaims = [
    /clear win for your gut/i,
    /good for your gut/i,
    /gut health/i,
    /damage control/i,
    /fiber emergencies/i,
    /fiber digests slowly/i,
    /keep you full/i,
    /undisputed fiber king/i,
    /nothing else in the drive-thru universe comes close/i,
    /\bI dug through\b/i,
    /\bI (?:researched|tested|verified|calculated)\b/i,
    // Legacy figures nobody can source: state only what the current guide says.
    /older lists keep repeating/i,
    /Older 10-gram figures/i,
    /not a 16-gram one/i,
  ];

  for (const claim of bannedClaims) {
    assert.doesNotMatch(article, claim);
  }

  assert.doesNotMatch(article, /\u2014/, "David Miller copy cannot use em dashes");
});
