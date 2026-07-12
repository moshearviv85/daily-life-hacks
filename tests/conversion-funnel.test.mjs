import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const ROOT = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}


test("newsletter forms expose an accessible email field and stable anchor", () => {
  const inline = read("src/components/Newsletter.astro");
  const popup = read("src/components/NewsletterPopup.astro");

  assert.match(inline, /id="newsletter"/);
  assert.match(inline, /<label for="footer-email"/);
  assert.match(inline, /name="email"/);
  assert.match(inline, /autocomplete="email"/);
  assert.match(inline, /href="\/privacy\/"/);

  assert.match(popup, /<label for="popup-email"/);
  assert.match(popup, /name="email"/);
  assert.match(popup, /autocomplete="email"/);
  assert.match(popup, /href="\/privacy\/"/);
});


test("thank-you page delivers and measures the promised meal plan", () => {
  const page = read("src/pages/thank-you.astro");
  const pdf = path.join(
    ROOT,
    "public",
    "downloads",
    "7-day-high-fiber-meal-plan.pdf",
  );

  assert.equal(fs.existsSync(pdf), true);
  assert.match(page, /href: "\/downloads\/7-day-high-fiber-meal-plan\.pdf"/);
  assert.match(page, /data-lead-magnet-download/);
  assert.match(page, /event_type: "lead_magnet_download"/);
  assert.match(page, /One useful email a week/);
  assert.doesNotMatch(page, /One email a day/);
  assert.doesNotMatch(page, /PDF meal plans are coming next/);
});


test("static contact page uses a real mailto instead of a dead form", () => {
  const page = read("src/pages/contact.astro");

  assert.match(page, /href="mailto:hello@daily-life-hacks\.com/);
  assert.doesNotMatch(page, /<form\b/);
  assert.doesNotMatch(page, /type="submit"/);
});
