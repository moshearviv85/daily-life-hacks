import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const pairs = [
  ["fiber-per-dollar-cheapest-high-fiber-foods", "fiber-per-dollar-top-20-chart.jpg"],
  ["protein-per-dollar-cheapest-protein-sources", "protein-per-dollar-top-20-chart.jpg"],
  ["what-30-grams-of-fiber-costs-per-day", "what-30-grams-of-fiber-costs-five-ways-chart.jpg"],
  ["what-50-grams-of-protein-costs-per-day", "what-50-grams-of-protein-costs-five-ways-chart.jpg"],
  ["usda-thrifty-food-plan-weekly-cost", "usda-thrifty-food-plan-family-cost-chart.jpg"],
  ["fiber-protein-daily-values-explained", "fiber-protein-daily-values-thresholds-chart.jpg"],
];

const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");

test("research articles use editorial heroes and preserve charts in the body", async () => {
  for (const [slug, chart] of pairs) {
    const articlePath = path.join(root, "src/data/articles", `${slug}.md`);
    const heroPath = path.join(root, "public/images", `${slug}-main.jpg`);
    const chartPath = path.join(root, "public/images", chart);

    await access(heroPath);
    await access(chartPath);
    const [article, heroBytes, chartBytes] = await Promise.all([
      readFile(articlePath, "utf8"),
      readFile(heroPath),
      readFile(chartPath),
    ]);

    assert.match(article, new RegExp(`/images/${chart.replaceAll(".", "\\.")}`), slug);
    assert.notEqual(digest(heroBytes), digest(chartBytes), `${slug} still uses its chart as the hero`);
  }
});
