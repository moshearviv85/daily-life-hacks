import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const articleDir = path.join(process.cwd(), "src/data/articles");

const staleVoicePatterns = [
  ["em dash", /\u2014/u],
  ["mojibake em dash", /â€”/u],
  ["Oh, honey", /\boh,? honey\b/iu],
  ["groovy", /\bgroovy\b/iu],
  ["Dude", /\bdude\b/iu],
  ["real MVP", /\breal MVP\b/iu],
  ["hits different", /\bhits? different\b/iu],
  ["Okay, so", /\bokay,? so\b/iu],
  ["elevate", /\belevat(?:e|es|ed|ing)\b/iu],
  ["game changer", /\bgame[- ]changer\b/iu],
  ["delve", /\bdelv(?:e|es|ed|ing)\b/iu],
  ["tapestry", /\btapestry\b/iu],
  ["unlock", /\bunlock(?:s|ed|ing)?\b/iu],
  ["treasure trove", /\btreasure trove\b/iu],
  ["journey", /\bjourney\b/iu],
  ["world of", /\bworld of\b/iu],
  ["not just ... but also", /\bnot just\b.{0,100}\bbut also\b/isu],
  ["your ... will thank you", /\byour\b.{0,80}\bwill thank you\b/isu],
];

test("all published articles stay clear of stale AI voice markers", async () => {
  const files = (await readdir(articleDir))
    .filter((file) => file.endsWith(".md"))
    .sort();

  assert.ok(files.length >= 200, `expected full article inventory, found ${files.length}`);

  const failures = [];
  for (const file of files) {
    const source = await readFile(path.join(articleDir, file), "utf8");
    for (const [label, pattern] of staleVoicePatterns) {
      if (pattern.test(source)) failures.push(`${file}: ${label}`);
    }
  }

  assert.deepEqual(failures, []);
});
