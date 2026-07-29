import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const landingPath = "src/pages/printables/weekly-grocery-budget-planner/index.astro";
const pdfPath = "public/downloads/weekly-grocery-budget-planner.pdf";
const toolsPath = "src/pages/tools/index.astro";
const shoppingListPath = "src/pages/tools/shopping-list-builder/index.astro";

test("printable PDF exists and is a nontrivial PDF file", () => {
  assert.ok(fs.existsSync(pdfPath), "PDF should exist");
  const pdf = fs.readFileSync(pdfPath);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 4_000, `PDF is unexpectedly small: ${pdf.length}`);
});

test("landing page exposes the PDF, structured data, and private telemetry", () => {
  const page = fs.readFileSync(landingPath, "utf8");
  assert.match(page, /weekly-grocery-budget-planner\.pdf/);
  assert.match(page, /"@type": "DigitalDocument"/);
  assert.match(page, /"@type": "FAQPage"/);
  assert.match(page, /data-printable-download/);
  assert.match(page, /printable_download/);
  assert.doesNotMatch(page, /email_address|user_id|budget_value/);
});

test("tools hub and shopping list builder link to the printable", () => {
  assert.match(fs.readFileSync(toolsPath, "utf8"), /\/printables\/weekly-grocery-budget-planner\//);
  assert.match(fs.readFileSync(shoppingListPath, "utf8"), /\/printables\/weekly-grocery-budget-planner\//);
});

test("public printable copy avoids David Miller hard bans", () => {
  const page = fs.readFileSync(landingPath, "utf8");
  const banned = [
    "\u2014",
    "Oh, honey",
    "Dude",
    "groovy",
    "game-changer",
    "your body will thank you",
    "Conclusion",
  ];
  for (const phrase of banned) {
    assert.equal(page.includes(phrase), false, `Found banned phrase: ${phrase}`);
  }
});
