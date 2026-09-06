import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), "utf8");
}

function parseCsv(source) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  const [headers, ...rows] = records;
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])),
    );
}

function extractTable(markdown, header) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.indexOf(header);
  assert.notEqual(headerIndex, -1, `Missing Markdown table header: ${header}`);
  assert.match(lines[headerIndex + 1], /^\|(?:\s*:?-+:?\s*\|)+$/);

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

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractRenderedTable(html, headerText) {
  const table = [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)]
    .map((match) => match[0])
    .find((candidate) => decodeHtml(candidate).includes(headerText));
  assert.ok(table, `Rendered table missing header: ${headerText}`);

  const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
  assert.ok(body, `Rendered table missing tbody: ${headerText}`);

  return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (rowMatch) =>
      [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
        (cellMatch) => decodeHtml(cellMatch[1]),
      ),
  );
}

function frontmatterValue(markdown, field) {
  const match = markdown.match(new RegExp(`^${field}:\\s*"([^"]+)"`, "m"));
  assert.ok(match, `Missing frontmatter field: ${field}`);
  return match[1];
}

const officialFixture = JSON.parse(
  read("tests/fixtures/usda-fdc-ranked-food-records-2026.json"),
);
const officialById = new Map(
  officialFixture.records.map((record) => [String(record.fdc_id), record]),
);

const tables = [
  {
    name: "protein-density article",
    count: 49,
    articlePath:
      "src/data/articles/foods-highest-in-protein-per-100-grams.md",
    csvPath: "public/data/protein-per-dollar-2026.csv",
    renderedPath: "dist/foods-highest-in-protein-per-100-grams/index.html",
    csvHref: "/data/protein-per-dollar-2026.csv",
    header:
      "| Food | Protein per 100 g | USDA form / status | Price per 100 g | Nutrition source |",
    renderedHeader: "Protein per 100 g",
    metric: "protein_g_per_100g",
    expectedStatuses: { exact: 39, proxy: 10, unresolved: 0 },
    expectedRow: (row) => [
      row.food,
      `${row.protein_g_per_100g} g`,
      `$${row.price_per_100g_usd}`,
    ],
    sourceCells: (row) => [row[0], row[1], row[3]],
  },
  {
    name: "fiber-density article",
    count: 53,
    articlePath:
      "src/data/articles/best-high-fiber-foods-ranked-by-fiber-content.md",
    csvPath: "public/data/fiber-per-dollar-2026.csv",
    renderedPath:
      "dist/best-high-fiber-foods-ranked-by-fiber-content/index.html",
    csvHref: "/data/fiber-per-dollar-2026.csv",
    header:
      "| Food | Fiber per 100 g | USDA form / status | Category | Nutrition source |",
    renderedHeader: "Fiber per 100 g",
    metric: "fiber_g_per_100g",
    expectedStatuses: { exact: 42, proxy: 9, unresolved: 2 },
    expectedRow: (row) => [
      row.food,
      `${row.fiber_g_per_100g} g`,
      row.category,
    ],
    sourceCells: (row) => [row[0], row[1], row[3]],
  },
];

for (const table of tables) {
  test(`${table.name} contains every source row in descending metric order`, () => {
    const sourceRows = parseCsv(read(table.csvPath));
    const expected = sourceRows
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .sort(
        (left, right) =>
          Number(right.row[table.metric]) - Number(left.row[table.metric]) ||
          left.sourceIndex - right.sourceIndex,
      )
      .map(({ row }) => table.expectedRow(row));
    const actual = extractTable(read(table.articlePath), table.header);
    const orderedSourceRows = sourceRows
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .sort(
        (left, right) =>
          Number(right.row[table.metric]) - Number(left.row[table.metric]) ||
          left.sourceIndex - right.sourceIndex,
      )
      .map(({ row }) => row);

    assert.equal(
      actual.length,
      expected.length,
      `${table.name} is truncated: expected ${expected.length} rows, found ${actual.length}`,
    );
    assert.equal(
      expected.length,
      table.count,
      `${table.name} count contract differs from its source CSV`,
    );
    assert.deepEqual(actual.map(table.sourceCells), expected);
    for (const [index, cells] of actual.entries()) {
      const sourceRow = orderedSourceRows[index];
      assert.equal(cells[2], sourceRow.nutrition_source_form);
      if (sourceRow.nutrition_source_status === "unresolved") {
        assert.match(cells[4], /unresolved/i);
      } else {
        assert.match(cells[4], new RegExp(sourceRow.nutrition_source_id));
      }
    }
  });

  test(`${table.name} has auditable row-level nutrition provenance`, () => {
    const csvSource = read(table.csvPath);
    const sourceRows = parseCsv(csvSource);
    const statuses = { exact: 0, proxy: 0, unresolved: 0 };

    assert.doesNotMatch(
      csvSource,
      /https:\/\/fdc\.nal\.usda\.gov\/food-search\//,
      "Human FoodData Central search URLs currently return a shell without the requested record",
    );

    for (const row of sourceRows) {
      assert.ok(
        Object.hasOwn(statuses, row.nutrition_source_status),
        `${row.food} has invalid provenance status "${row.nutrition_source_status}"`,
      );
      statuses[row.nutrition_source_status] += 1;
      assert.ok(row.nutrition_source_form, `${row.food} is missing source form`);

      if (row.nutrition_source_status === "unresolved") {
        assert.equal(row.nutrition_source_id, "");
        assert.equal(row.nutrition_source_form, "Not resolved");
        assert.ok(
          row.nutrition_source_note.length >= 40,
          `${row.food} needs a specific unresolved reason`,
        );
        if (row.nutrition_source_url) {
          assert.equal(row.nutrition_source_type, "Manufacturer label");
          assert.match(row.nutrition_source_url, /^https:\/\/www\.bobsredmill\.com\//);
        } else {
          assert.equal(row.nutrition_source_type, "Unresolved");
        }
        continue;
      }

      // A row can be legitimately sourced to something other than USDA at ANY status,
      // not just "unresolved". TVP is the live case: FoodData Central publishes no
      // textured vegetable protein record at all, so the row cites the manufacturer's
      // own label and is graded "proxy" rather than pretending to a USDA match. Keying
      // this branch off status alone forced such a row to invent an FDC ID, which is
      // the opposite of what the provenance columns exist to prevent.
      if (row.nutrition_source_type === "Manufacturer label") {
        assert.equal(
          row.nutrition_source_id,
          "",
          `${row.food} is label-sourced and must not claim an FDC ID`,
        );
        assert.ok(
          row.nutrition_source_url,
          `${row.food} is label-sourced and needs the label URL`,
        );
        assert.ok(
          row.nutrition_source_note.length >= 40,
          `${row.food} needs a disclosure explaining why it is not a USDA record`,
        );
        assert.match(
          row.nutrition_source_note,
          /NOT A USDA RECORD/i,
          `${row.food} must state plainly that it is not USDA-sourced`,
        );
        continue;
      }

      const id = row.nutrition_source_id.match(/^FDC (\d+)$/)?.[1];
      assert.ok(id, `${row.food} is missing a valid FDC ID`);
      const official = officialById.get(id);
      assert.ok(official, `${row.food} FDC ${id} is absent from the official fixture`);
      assert.equal(row.nutrition_source_description, official.description);
      assert.match(
        row.nutrition_source_url,
        new RegExp(
          `^https://api\\.nal\\.usda\\.gov/fdc/v1/food/${id}\\?api_key=DEMO_KEY$`,
        ),
      );
      assert.equal(
        row.nutrition_source_type,
        official.data_type === "foundation_food"
          ? "USDA FoodData Central Foundation"
          : "USDA FoodData Central SR Legacy",
      );
      const decimals = (row[table.metric].split(".")[1] ?? "").length;
      assert.equal(
        Number(official[table.metric].toFixed(decimals)),
        Number(row[table.metric]),
        `${row.food} does not round to its official FDC nutrient value`,
      );
      if (row.nutrition_source_status === "proxy") {
        assert.ok(
          row.nutrition_source_note.length >= 40,
          `${row.food} proxy needs a mismatch disclosure`,
        );
      }
    }

    assert.deepEqual(statuses, table.expectedStatuses);
  });

  test(`${table.name} scopes leader claims and exposes its source CSV`, () => {
    const markdown = read(table.articlePath);
    const title = frontmatterValue(markdown, "title");
    const excerpt = frontmatterValue(markdown, "excerpt");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const opening = body.split(/\r?\n\r?\n/, 1)[0];
    const countPattern = new RegExp(
      `\\b${table.count}\\b[^\\r\\n]{0,24}\\bfoods?\\b`,
      "i",
    );

    assert.match(title, countPattern);
    assert.match(title, /\b(?:price )?study\b/i);
    assert.match(excerpt, countPattern);
    assert.match(excerpt, /\bJuly 2026\b/i);
    assert.match(opening, countPattern);
    assert.match(opening, /\bJuly 2026\b/i);
    assert.match(opening, /not a claim about every food sold worldwide/i);

    const leaderClaimLines = markdown
      .split(/\r?\n/)
      .filter(
        (line) =>
          /^(?:title:|excerpt:|\s+- question:|\s+answer:|## )/.test(line) &&
          /\b(?:best|highest|lead|leader|led|most|top)\b/i.test(line),
      );
    for (const line of leaderClaimLines) {
      assert.match(
        line,
        new RegExp(
          `(?:\\b${table.count}[- ]food\\b|\\b(?:our|your|this)\\b[^\\n]*\\bstudy\\b|\\bJuly 2026\\b[^\\n]*\\bstudy\\b)`,
          "i",
        ),
        `Broad leader claim is missing study scope: ${line}`,
      );
    }

    const prose = body
      .split(/\r?\n/)
      .filter((line) => !line.startsWith("|") && !line.startsWith("<!--"))
      .join(" ")
      .replace(/\[[^\]]+\]\([^)]+\)/g, "");
    const rankingClaims = prose
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) =>
        /\b(?:best|highest|lead(?:s|er)?|led|top|rank(?:s|ed)?\s+(?:first|last|highest)|wins?)\b/i.test(
          sentence,
        ),
      );
    for (const claim of rankingClaims) {
      assert.match(
        claim,
        new RegExp(
          `(?:\\b${table.count}\\b[^.!?]{0,30}\\bfoods?\\b|\\b(?:study|comparison|list|sample|dataset)(?:'s)?\\b|\\bAmong the other \\d+\\b)`,
          "i",
        ),
        `Body ranking claim is missing study scope: ${claim}`,
      );
    }

    assert.match(
      markdown,
      new RegExp(
        `\\[[^\\]]*raw CSV\\]\\(${table.csvHref.replaceAll("/", "\\/")}\\)`,
        "i",
      ),
    );
  });

  test(`${table.name} renders every row, provenance, and the CSV link`, () => {
    const rendered = read(table.renderedPath);
    const rows = extractRenderedTable(rendered, table.renderedHeader);
    const sourceRows = parseCsv(read(table.csvPath));
    const h1Match = rendered.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    assert.ok(h1Match, `${table.name} rendered without an H1`);
    const h1 = decodeHtml(h1Match[1]);

    assert.equal(
      rows.length,
      table.count,
      `${table.name} rendered ${rows.length} rows instead of ${table.count}`,
    );
    assert.ok(
      rows.every(
        (row) => row.length === 5 && row[2].length > 0 && row[4].length > 0,
      ),
      `${table.name} rendered a missing form or provenance column`,
    );
    assert.equal(
      rows.filter((row) => /unresolved/i.test(row[4])).length,
      table.expectedStatuses.unresolved,
      `${table.name} rendered the wrong unresolved provenance count`,
    );
    assert.doesNotMatch(
      rendered,
      /https:\/\/fdc\.nal\.usda\.gov\/food-search\//,
      `${table.name} rendered a broken FoodData Central search link`,
    );
    const renderedFdcIds = [
      ...rendered.matchAll(
        /href="https:\/\/api\.nal\.usda\.gov\/fdc\/v1\/food\/(\d+)\?api_key=DEMO_KEY"/g,
      ),
    ]
      .map((match) => match[1])
      .sort();
    // Every row that CLAIMS a USDA record must render its direct API link. Rows that
    // carry no FDC ID are excluded rather than assumed: "not unresolved" is not the
    // same as "USDA-sourced". TVP is proxy-status but label-sourced, because USDA
    // publishes no textured vegetable protein record, so it has no ID to render and
    // the old filter silently expected an empty string in the link list.
    const expectedFdcIds = sourceRows
      .filter((row) => /^FDC \d+$/.test(row.nutrition_source_id))
      .map((row) => row.nutrition_source_id.replace("FDC ", ""))
      .sort();
    assert.deepEqual(
      renderedFdcIds,
      expectedFdcIds,
      `${table.name} must render the exact direct USDA API record for every linked row`,
    );
    assert.match(
      h1,
      new RegExp(`\\b${table.count}\\b[^\\r\\n]{0,24}\\bfoods?\\b`, "i"),
    );
    assert.match(h1, /\b(?:price )?study\b/i);
    assert.match(
      rendered,
      new RegExp(`href="${table.csvHref.replaceAll("/", "\\/")}"`),
    );
  });
}

test("protein-density value copy follows the live protein-per-dollar CSV", () => {
  const rows = parseCsv(read("public/data/protein-per-dollar-2026.csv"));
  const byFood = new Map(rows.map((row) => [row.food, row]));
  const leader = rows.find((row) => row.rank === "1");
  const tvp = byFood.get("TVP (textured vegetable protein)");
  const article = read("src/data/articles/foods-highest-in-protein-per-100-grams.md");

  assert.ok(leader, "protein CSV is missing rank 1");
  assert.ok(tvp, "protein CSV is missing TVP");
  assert.match(
    article,
    new RegExp(`leads the value ranking at ${leader.protein_g_per_dollar} g per dollar`),
  );
  assert.match(
    article,
    new RegExp(
      `ranks ${tvp.rank}th on protein per dollar at ${tvp.protein_g_per_dollar} g per dollar`,
    ),
  );
  assert.match(
    article,
    new RegExp(
      `${leader.food} led our 49-food value ranking at ${leader.protein_g_per_dollar} grams of protein per dollar`,
    ),
  );
  assert.doesNotMatch(article, /97\.9/);
});
