import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const baseLayout = read("src/layouts/BaseLayout.astro");
const articlePage = read("src/pages/[slug].astro");
const aboutPage = read("src/pages/about.astro");
const contactPage = read("src/pages/contact.astro");
const methodologyPage = read("src/pages/methodology.astro");
const editorialPage = read("src/pages/editorial-policy.astro");
const footer = read("src/components/Footer.astro");

test("site and article schemas expose one canonical publishing-principles URL", () => {
  assert.match(
    baseLayout,
    /publishingPrinciples: `\$\{SITE_URL\}\/editorial-policy\/`/,
  );
  assert.match(
    baseLayout,
    /founder: \{[\s\S]*?"@type": "Person"[\s\S]*?"@id": `\$\{SITE_URL\}\/about\/#david-miller`[\s\S]*?jobTitle: "Founder and Editor"/,
  );
  assert.match(aboutPage, /jobTitle: 'Founder and Editor'/);
  assert.equal(
    [...articlePage.matchAll(/publishingPrinciples: `\$\{siteUrl\}\/editorial-policy\/`/g)].length,
    2,
    "Recipe and Article must link the same editorial standards",
  );
});

test("editorial page names ownership, source rules, automation, and correction steps", () => {
  assert.match(editorialPage, /David Miller is the site's founder and editor/);
  assert.match(editorialPage, /USDA FoodData Central/);
  assert.match(editorialPage, /Software and AI tools may help/);
  assert.match(editorialPage, /If a factual error changes a number/);
  assert.match(editorialPage, /page URL, the exact sentence or number/);
  assert.match(editorialPage, /dateModified: "2026-07-29"/);
});

test("trust policy is reachable from persistent and relevant site surfaces", () => {
  for (const [name, source] of [
    ["footer", footer],
    ["about", aboutPage],
    ["contact", contactPage],
    ["methodology", methodologyPage],
  ]) {
    assert.match(
      source,
      /href="\/editorial-policy\/"/,
      `${name} must link the editorial standards`,
    );
  }
});

test("contact page preserves deliberate noindex while giving actionable correction instructions", () => {
  assert.match(contactPage, /robots="noindex, follow"/);
  assert.match(contactPage, /page URL, the exact sentence or number/);
  assert.match(contactPage, /hello@daily-life-hacks\.com/);
});

test("new public copy respects David Miller hard bans", () => {
  const publicCopy = [editorialPage, contactPage].join("\n");
  assert.doesNotMatch(publicCopy, /\u2014/);
  assert.doesNotMatch(
    publicCopy,
    /\b(Furthermore|Moreover|In conclusion|Delve into|Dive into|Unlock|Elevate|Navigating|Game-changer|Revolutionize|Mouthwatering)\b/i,
  );
  assert.doesNotMatch(publicCopy, /your .+ will thank you/i);
});
