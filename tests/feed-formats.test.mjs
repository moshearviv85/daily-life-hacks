import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("all public feed formats are built and advertise the same site", async () => {
  const [rss, atom, json, home] = await Promise.all([
    readFile(path.join(root, "dist", "rss.xml"), "utf8"),
    readFile(path.join(root, "dist", "atom.xml"), "utf8"),
    readFile(path.join(root, "dist", "feed.json"), "utf8"),
    readFile(path.join(root, "dist", "index.html"), "utf8"),
  ]);

  assert.match(rss, /<rss version="2\.0"/);
  assert.match(rss, /https:\/\/www\.daily-life-hacks\.com\/rss\.xml/);
  assert.match(atom, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/);
  assert.match(atom, /https:\/\/www\.daily-life-hacks\.com\/atom\.xml/);

  const parsed = JSON.parse(json);
  assert.equal(parsed.version, "https://jsonfeed.org/version/1.1");
  assert.equal(parsed.feed_url, "https://www.daily-life-hacks.com/feed.json");
  assert.equal(parsed.items.length, 25);
  assert.ok(parsed.items.every((item) => item.id === item.url));

  assert.match(home, /type="application\/rss\+xml"[^>]+rss\.xml/);
  assert.match(home, /type="application\/atom\+xml"[^>]+atom\.xml/);
  assert.match(home, /type="application\/feed\+json"[^>]+feed\.json/);
});
