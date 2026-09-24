import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += character;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  const [header, ...body] = rows;
  return body.map((cells) =>
    Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ""])),
  );
}

function anchorTexts(source, href) {
  const pattern = new RegExp(
    `<a\\b[^>]*href="${href}"[^>]*>([\\s\\S]*?)</a>`,
    "g",
  );
  return [...source.matchAll(pattern)].map((match) =>
    match[1].replace(/\s+/g, " ").trim(),
  );
}

const hubs = [
  "src/pages/index.astro",
  "src/pages/guides/index.astro",
  "src/pages/research/index.astro",
];

test("homepage, guides, and research link animal and fiber-day leads from the CSVs", () => {
  const protein = parseCsv(
    readFileSync(join(root, "public/data/protein-per-dollar-2026.csv"), "utf8"),
  );
  const drumsticks = protein.find(
    (row) => row.food === "Chicken drumsticks (bone-in)",
  );
  assert.ok(drumsticks, "protein CSV should include bone-in drumsticks");
  assert.equal(drumsticks.protein_g_per_dollar, "50.3");

  const fiberRows = parseCsv(
    readFileSync(join(root, "public/data/fiber-day-cost-2026.csv"), "utf8"),
  );
  const dayCosts = new Map();
  for (const row of fiberRows) {
    dayCosts.set(row.day, (dayCosts.get(row.day) ?? 0) + Number(row.cost_usd));
  }
  const costs = [...dayCosts.values()].sort((left, right) => left - right);
  assert.equal(costs[0].toFixed(2), "0.62");
  assert.equal(costs.at(-1).toFixed(2), "14.42");

  for (const file of hubs) {
    const source = readFileSync(join(root, file), "utf8");
    const animal = anchorTexts(source, "/animal-protein-per-dollar-ranked/");
    const fiber = anchorTexts(source, "/what-30-grams-of-fiber-costs-per-day/");

    assert.equal(animal.length, 1, `${file} should link the animal ranking once`);
    assert.equal(fiber.length, 1, `${file} should link the fiber-day study once`);
    assert.match(animal[0], /drumsticks/i);
    assert.match(animal[0], /50\.3g/);
    assert.match(fiber[0], /\$0\.62 vs \$14\.42/);
    assert.equal(
      /97\.9|70\.8|29\.1|\b9\.2\b/.test(`${animal[0]} ${fiber[0]}`),
      false,
      `${file} link copy should not quote retired per-dollar figures`,
    );
  }
});

test("homepage, guides, and research link breakfast combined and eggs protein leads", () => {
  const breakfast = parseCsv(
    readFileSync(join(root, "public/data/breakfast-staples-per-dollar-2026.csv"), "utf8"),
  );
  const flour = breakfast.find((row) => row.food === "Whole wheat flour");
  const oats = breakfast.find((row) => row.food === "Old-fashioned rolled oats");
  assert.ok(flour, "breakfast CSV should include whole wheat flour");
  assert.ok(oats, "breakfast CSV should include rolled oats");
  assert.equal(flour.value, "173.8");
  assert.equal(flour.protein_g_per_dollar, "96.0");
  assert.equal(flour.fiber_g_per_dollar, "77.8");
  assert.equal(
    (Number(flour.protein_g_per_dollar) + Number(flour.fiber_g_per_dollar)).toFixed(1),
    flour.value,
    "173.8 is protein plus fiber, so hub copy has to keep Combined on that anchor",
  );
  assert.equal(oats.value, "82.4");

  const eggsRows = parseCsv(
    readFileSync(join(root, "public/data/eggs-vs-everything-protein-value-2026.csv"), "utf8"),
  );
  const eggsFlour = eggsRows.find((row) => row.food === "Whole wheat flour");
  const eggs = eggsRows.find((row) => row.food === "Eggs (large)");
  assert.ok(eggsFlour, "eggs CSV should include whole wheat flour");
  assert.ok(eggs, "eggs CSV should include large eggs");
  assert.equal(eggsFlour.value, "96.0");
  assert.equal(eggs.value, "34.4");

  for (const file of hubs) {
    const source = readFileSync(join(root, file), "utf8");
    const breakfastLinks = anchorTexts(source, "/breakfast-staples-per-dollar/");
    const eggsLinks = anchorTexts(source, "/eggs-vs-everything-protein-value/");

    assert.equal(
      breakfastLinks.length,
      1,
      `${file} should link the breakfast staples study once`,
    );
    assert.equal(
      eggsLinks.length,
      1,
      `${file} should link the eggs protein study once`,
    );
    assert.match(breakfastLinks[0], /173\.8g/);
    assert.match(breakfastLinks[0], /Combined/);
    assert.match(breakfastLinks[0], /82\.4g/);
    assert.match(eggsLinks[0], /96\.0g/);
    assert.match(eggsLinks[0], /34\.4g/);
    assert.equal(
      /97\.9|70\.8|29\.1/.test(`${breakfastLinks[0]} ${eggsLinks[0]}`),
      false,
      `${file} breakfast and eggs link copy should not quote retired figures`,
    );
  }
});

test("research fiber-day card title uses the same CSV day range", () => {
  const source = readFileSync(
    join(root, "src/pages/research/index.astro"),
    "utf8",
  );
  assert.match(
    source,
    /const cheapestFiberDay = fiberDays\[0\]\.cost\.toFixed\(2\);/,
  );
  assert.match(
    source,
    /const priciestFiberDay = fiberDays\.at\(-1\)\.cost\.toFixed\(2\);/,
  );
  assert.match(
    source,
    /title: `What 30 Grams of Fiber Costs: \$\$\{cheapestFiberDay\} vs \$\$\{priciestFiberDay\}`/,
  );
});
