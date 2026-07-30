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
  ]);

  assert.equal(rows.length, 6);

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
    /highest-fiber verified custom order[^.]+Chipotle[^.]+25 grams/i,
  );
  assert.match(
    article,
    /highest ready-made single item[^.]+Chick-fil-A Cool Wrap at 14 grams/i,
  );
  assert.match(article, /\*\*8 grams of fiber\*\*, not 10/i);
});

test("Wendy's tuple names the saltine-inclusive Small Chili build", () => {
  const rows = extractTable(article);
  const wendysRow = rows.find(([chain]) => chain === "Wendy's");

  assert.ok(wendysRow, "missing Wendy's table row");
  assert.deepEqual(wendysRow.slice(0, 6), [
    "Wendy's",
    "Plain Baked Potato plus Small Chili, including the default Saltine Packet; totals assume the packet is eaten",
    "10 g (36% DV)",
    "550",
    "26 g",
    "1,090 mg",
  ]);
  assert.match(
    article,
    /potato, Small Chili, and eaten Saltine Packet provide the table's 10 grams of fiber, 550 calories, 26 grams of protein, and 1,090 milligrams of sodium/i,
  );
  assert.doesNotMatch(article, /default 280-calorie Chili/i);
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
  ];

  for (const claim of bannedClaims) {
    assert.doesNotMatch(article, claim);
  }

  assert.doesNotMatch(article, /\u2014/, "David Miller copy cannot use em dashes");
});
