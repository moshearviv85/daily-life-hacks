import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/components/NewsletterPopup.astro", import.meta.url),
  "utf8",
);
const fn = source.slice(
  source.indexOf("const POPUP_SCROLL_RATIO"),
  source.indexOf("function recordSessionPageview"),
);

function popupMayOpen(state) {
  return vm.runInNewContext(`${fn}; popupMayOpen(input)`, { input: state });
}

test("newsletter popup opens only after 60% scroll, a second pageview, and a desktop width", () => {
  assert.equal(
    popupMayOpen({ scrollRatio: 0.6, pageviews: 2, viewportWidth: 768 }),
    true,
  );
  assert.equal(
    popupMayOpen({ scrollRatio: 1, pageviews: 3, viewportWidth: 1280 }),
    true,
  );
  assert.equal(
    popupMayOpen({ scrollRatio: 0.59, pageviews: 2, viewportWidth: 1280 }),
    false,
  );
  assert.equal(
    popupMayOpen({ scrollRatio: 1, pageviews: 1, viewportWidth: 1280 }),
    false,
  );
  assert.equal(
    popupMayOpen({ scrollRatio: 1, pageviews: 2, viewportWidth: 767 }),
    false,
  );
  assert.equal(
    popupMayOpen({ scrollRatio: 0.6, pageviews: 2, viewportWidth: 390 }),
    false,
  );
});

test("newsletter popup source has no delay timer and stays hidden under 768px", () => {
  assert.doesNotMatch(source, /POPUP_DELAY/);
  assert.doesNotMatch(source, /setTimeout\(\s*showPopup/);
  assert.doesNotMatch(source, /mouseleave/);
  assert.match(source, /max-width:\s*767px/);
  assert.match(source, /#newsletter-popup[\s\S]*display:\s*none/);
  assert.match(source, /dlh_popup_pageviews/);
});
