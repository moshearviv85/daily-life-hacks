import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articleUrl = new URL(
  "../src/data/articles/high-fiber-fast-food-options-guide.md",
  import.meta.url,
);
const csvUrl = new URL(
  "../public/data/high-fiber-fast-food-2026.csv",
  import.meta.url,
);
const article = readFileSync(articleUrl, "utf8");
const csvText = readFileSync(csvUrl, "utf8");

function extractTable(markdown) {
  const header =
    "| Chain | Exact order or build | Fiber | Calories | Fiber per 100 kcal | Protein | Sodium | Checked | Official source |";
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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

test("guide has 29 dated rows with direct official sources", () => {
  const rows = extractTable(article);
  const allowedOfficialHosts = new Set([
    "www.chipotle.com",
    "www.chick-fil-a.com",
    "api.app.prd.wendys.digital",
    "www.panerabread.com",
    "www.starbucks.com",
    "media.subway.com",
    "www.tacobell.com",
    "assets.ctfassets.net",
    "plk-use1-prod.sites.rbictg.com",
    "www.elpolloloco.com",
  ]);

  assert.equal(rows.length, 29);
  const chains = new Set(rows.map((row) => row[0]));
  assert.ok(chains.size >= 10 && chains.size <= 12, `chain count ${chains.size}`);

  for (const row of rows) {
    assert.equal(row.length, 9, `incomplete table row: ${row.join(" | ")}`);
    assert.ok(row[0], "chain is required");
    assert.ok(row[1].length >= 10, "exact order or build is required");
    assert.match(row[2], /^\d+ g \(\d+% DV\)$/);
    assert.match(row[3], /^\d+$/);
    assert.match(row[4], /^\d+\.\d g$/);
    assert.match(row[5], /^\d+ g$/);
    assert.match(row[6], /^\d{1,3}(?:,\d{3})* mg$/);
    assert.equal(row[7], "2026-11-23");

    const links = [
      ...row[8].matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g),
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

test("the public CSV matches the article table row for row", () => {
  const table = extractTable(article);
  const csv = parseCsv(csvText);
  const [header, ...body] = csv;
  assert.deepEqual(header, [
    "chain",
    "item",
    "fiber_g",
    "calories",
    "fiber_per_100_kcal",
    "protein_g",
    "sodium_mg",
    "source",
    "official_url",
    "checked_date",
    "priced_month",
    "retailer",
    "price_location",
    "audit_note",
  ]);
  assert.equal(body.length, table.length);

  table.forEach((row, index) => {
    const csvRow = body[index];
    assert.equal(csvRow[0], row[0], `chain mismatch at row ${index + 1}`);
    assert.equal(csvRow[1], row[1], `item mismatch at row ${index + 1}`);
    assert.equal(`${csvRow[2]} g`, row[2].replace(/ \(.*/, ""));
    assert.equal(csvRow[3], row[3]);
    assert.equal(`${csvRow[4]} g`, row[4]);
    assert.equal(`${csvRow[5]} g`, row[5]);
    const sodium = Number(csvRow[6]).toLocaleString("en-US");
    assert.equal(`${sodium} mg`, row[6]);
    assert.equal(csvRow[9], row[7]);
    assert.ok(row[8].includes(csvRow[8]), `source URL missing at row ${index + 1}`);
  });
});

test("requested current corrections and winner distinctions are explicit", () => {
  assert.match(
    article,
    /\| Chick-fil-A \| Chick-fil-A Cool Wrap[^|\n]+\| 14 g \(50% DV\) \| 660 \| 2\.1 g \| 43 g \| 1,420 mg \|/,
  );
  assert.match(
    article,
    /\| Panera \| Whole Mediterranean Veggie on Tomato Basil \| 8 g \(29% DV\) \| 520 \| 1\.5 g \| 18 g \| 1,260 mg \|/,
  );
  assert.match(
    article,
    /highest-fiber custom order[^.]+Chipotle[^.]+25 grams/i,
  );
  assert.doesNotMatch(article, /ready-made leader/i);
  assert.match(article, /no fixed menu item wins outright/i);
  assert.match(
    article,
    /Subway's Veggie Patty Protein Bowl carries the most fiber at 19 grams/i,
  );
  assert.match(article, /\*\*8 grams of fiber\*\*, not 10/i);
  assert.doesNotMatch(article, /(?:highest|leads|winner|best)[^.\n]{0,60}\bin the table\b/i);
  assert.doesNotMatch(article, /(?:highest|leads|winner|best)[^.\n]{0,60}\bchecked here\b/i);
  assert.doesNotMatch(article, /Fruit & Maple Oatmeal[^.\n]{0,80}\d+ grams of fiber/i);
});

test("the Chick-fil-A soup row uses the current allergens-table serving", () => {
  assert.match(
    article,
    /\| Chick-fil-A \| Chicken Tortilla Soup[^|\n]*\| 18 g \(64% DV\) \| 350 \| 5\.1 g \| 25 g \| 1,115 mg \|/,
  );
  assert.doesNotMatch(article, /usda/i);
  assert.doesNotMatch(article, /17 g \(61% DV\) \| 280/);

  const rows = extractTable(article);
  const soupRow = rows.find(([, build]) => build.startsWith("Chicken Tortilla Soup"));
  assert.ok(soupRow, "missing Chick-fil-A Chicken Tortilla Soup row");
  assert.match(soupRow[1], /265 g serving/i);
  assert.match(soupRow[8], /https:\/\/www\.chick-fil-a\.com\/nutrition-allergens/);
  assert.match(article, /5\.1 grams of fiber per 100 kcal/);
});

test("quickAnswer carries the same scope as the body", () => {
  const quick = article.match(/^quickAnswer: "([\s\S]*?)"$/m);
  assert.ok(quick, "missing quickAnswer");
  const answer = quick[1];

  assert.match(answer, /29 orders/i);
  assert.match(answer, /November 23, 2026/);
  assert.doesNotMatch(answer, /leads the ready-made items/i);
  assert.doesNotMatch(answer, /tops the list/i);
  assert.match(answer, /25 grams/);
  assert.match(answer, /725 calories/);
  assert.match(answer, /1,130 milligrams/);
  assert.match(answer, /19 grams/);
  assert.match(answer, /540 calories/);
  assert.match(answer, /1,550 milligrams/);
});

test("source fetchability is disclosed honestly, per host", () => {
  assert.match(article, /nutrition and allergens page returned the Cool Wrap and the soup/i);
  assert.match(article, /plain download of that PDF returned 403/i);
  assert.match(article, /September 21, 2026 archive capture/i);
  assert.doesNotMatch(article, /Panera's PDF is not blocked/i);
  assert.doesNotMatch(
    article,
    /Chick-fil-A's site and Panera's PDF both return a 403/i,
  );
});

test("the Subway build is spelled out ingredient by ingredient", () => {
  const rows = extractTable(article);
  const subwayRow = rows.find(([, build]) => build.startsWith("Veggie Patty Protein Bowl"));

  assert.ok(subwayRow, "missing Subway protein bowl row");
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
    /\| Panera \| Green Goddess Chicken Wrap[^|\n]*\| 14 g \(50% DV\) \| 460 \| 3\.0 g \| 32 g \| 1,340 mg \|/,
  );
  assert.match(
    article,
    /\| Panera \| Chicken Caesar Wrap[^|\n]*\| 14 g \(50% DV\) \| 480 \| 2\.9 g \| 32 g \| 1,510 mg \|/,
  );
  assert.match(
    article,
    /\| Subway \| Veggie Patty Protein Bowl[^|\n]+\| 19 g \(68% DV\) \| 540 \| 3\.5 g \| 22 g \| 1,550 mg \|/,
  );
});

test("Wendy's tuple describes the Saltine Packet only as far as Wendy's publishes it", () => {
  const rows = extractTable(article);
  const wendysRow = rows.find(([, build]) => build.startsWith("Plain Baked Potato"));

  assert.ok(wendysRow, "missing Wendy's table row");
  assert.deepEqual(wendysRow.slice(0, 7), [
    "Wendy's",
    "Plain Baked Potato plus Small Chili; Wendy's lists the Small Chili at 280 calories and the Saltine Packet as a default component, without breaking the packet out separately",
    "10 g (36% DV)",
    "550",
    "1.8 g",
    "26 g",
    "1,090 mg",
  ]);
  assert.match(
    article,
    /potato and Small Chili provide the table's 10 grams of fiber, 550 calories, 26 grams of protein, and 1,090 milligrams of sodium/i,
  );
  assert.doesNotMatch(article, /default 280-calorie Chili/i);
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
    /older lists keep repeating/i,
    /Older 10-gram figures/i,
    /not a 16-gram one/i,
  ];

  for (const claim of bannedClaims) {
    assert.doesNotMatch(article, claim);
  }

  assert.doesNotMatch(article, /\u2014/, "David Miller copy cannot use em dashes");
  assert.match(article, /^author: "David Miller"$/m);
  assert.match(article, /^title: "High-Fiber Fast Food: Chipotle Leads at 25g"$/m);
});
