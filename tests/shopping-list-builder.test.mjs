import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "src/pages/tools/shopping-list-builder/index.astro");

test("shopping list builder is driven by real recipe collection data", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /getCollection\("articles"/);
  assert.match(source, /data\.category === "recipes"/);
  assert.match(source, /import \{ isReleased \} from "\.\.\/\.\.\/\.\.\/content\/release"/);
  assert.match(source, /isReleased\(article\)/);
  assert.match(source, /Boolean\(article\.data\.ingredients\?\.length\)/);
  assert.match(source, /servings: data\.servings/);
  assert.match(source, /ingredients: data\.ingredients/);
});

test("shopping list builder exposes search, per-recipe servings, copy, print, and links", async () => {
  const source = await readFile(sourcePath, "utf8");
  for (const signal of [
    'id="slb-search"',
    'data-servings="',
    'id="slb-copy"',
    'id="slb-print"',
    "navigator.clipboard.writeText",
    "window.print()",
    "recipe.slug",
  ]) assert.match(source, new RegExp(signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), signal);
});

test("recipe selection is visibly clickable and can be removed from either surface", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /Click a card to add it\. Click the orange selected card to remove it\. That's the whole ceremony\./);
  assert.match(source, /active\?'On the list - click to remove':'Add to the plan'/);
  assert.match(source, /aria-label="'\+\(active\?'Remove ':'Add '\)/);
  assert.match(source, /data-remove-recipe=/);
  assert.match(source, />×<\/span> Remove recipe/);
  assert.match(source, /recipe\.title\+' is off the list\. Dinner will recover\.'/);
  assert.match(source, /\.recipe-choice:hover/);
  assert.match(source, /\.recipe-choice:active\{transform:translateY\(0\) scale\(\.97\)/);
  assert.match(source, /cursor:pointer/);
});

test("ingredient math fails safely instead of inventing conversions", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /if\(!amount\)return\{safe:false,text:line\}/);
  assert.match(source, /if\(!unit\)unit='item'/);
  assert.match(source, /var key=unit\+'\|'\+name\.toLowerCase/);
  assert.match(source, /\[niceNumber\(item\.amount\),unitLabel\(item\.unit,item\.amount\),item\.name\]\.filter\(Boolean\)\.join\(' '\)/);
  assert.match(source, /check amount in recipe/);
  assert.doesNotMatch(source, /convertUnit|unitConversion/);
});

test("page includes WebApplication and matching five-entry FAQ schema", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /"@type": "WebApplication"/);
  assert.match(source, /"@type": "FAQPage"/);
  assert.match(source, /mainEntity: faqs\.map/);
  assert.match(source, /\{faqs\.map\(\(\[question, answer\]\)/);
  const faqBlock = source.match(/const faqs = \[(.*?)\];/s)?.[1] ?? "";
  assert.equal((faqBlock.match(/^\s*\["/gm) ?? []).length, 5);
});

test("privacy copy and anonymous tool analytics contract are preserved", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /stay in this browser tab/);
  assert.match(source, /doesn't send recipe names, serving counts, or shopping-list contents/);
  assert.match(source, /id="shopping-list-builder-app"/);
  assert.match(source, /window\.gtag\('event','tool_action',\{tool_name:'shopping-list-builder',action:'first_recipe_selected'\}\)/);
  assert.match(source, /if\(state\.tracked\)return/);
  const trackingCall = source.match(/window\.gtag\('event','tool_action',\{(.*?)\}\)/)?.[1] ?? "";
  assert.doesNotMatch(trackingCall, /slug|title|servings|recipe\.title|recipe\.slug/);
  assert.doesNotMatch(source, /localStorage|fetch\(|XMLHttpRequest/);
});

test("David Miller hard bans stay out and inline program parses", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.doesNotMatch(source, /—|Furthermore|Moreover|In conclusion|Delve into|Dive into|It's important to note|It's worth noting|In today's world|Unlock|Elevate|Navigating|Game-changer|Revolutionize|Take it to the next level|Mouthwatering/);
  assert.doesNotMatch(source, /your [^.!?]{0,40} will thank you/i);
  const inline = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline, "inline shopping-list program exists");
  assert.doesNotThrow(() => new Function(inline));
});
