/**
 * Build-time image optimizer.
 *
 * Reads public/images/*-main.jpg and generates WebP at 400w, 800w, 1200w
 * into public/images/opt/. Skips files whose output is newer than source.
 *
 * Usage:
 *   node scripts/optimize-images.mjs
 *   node scripts/optimize-images.mjs --force   (regenerate all)
 */
import { readdirSync, statSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SRC_DIR = join(REPO_ROOT, "public", "images");
const OUT_DIR = join(REPO_ROOT, "public", "images", "opt");
const WIDTHS = [400, 800, 1200];
const QUALITY = 80;

const force = process.argv.includes("--force");

function isNewer(src, dest) {
  try {
    return statSync(dest).mtimeMs >= statSync(src).mtimeMs;
  } catch {
    return false;
  }
}

async function optimizeImage(srcPath, name) {
  const results = [];
  for (const w of WIDTHS) {
    const outName = name.replace(/\.jpg$/, `-${w}w.webp`);
    const outPath = join(OUT_DIR, outName);

    if (!force && isNewer(srcPath, outPath)) {
      results.push({ width: w, skipped: true });
      continue;
    }

    const img = sharp(srcPath);
    const meta = await img.metadata();
    const targetWidth = Math.min(w, meta.width);

    await img
      .resize(targetWidth)
      .webp({ quality: QUALITY })
      .toFile(outPath);

    results.push({ width: w, skipped: false });
  }
  return results;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const files = readdirSync(SRC_DIR)
    .filter((f) => f.endsWith("-main.jpg"))
    .sort();

  console.error(`Found ${files.length} source images.`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const srcPath = join(SRC_DIR, file);
    try {
      const results = await optimizeImage(srcPath, file);
      const allSkipped = results.every((r) => r.skipped);
      if (allSkipped) {
        skipped++;
      } else {
        processed++;
      }
    } catch (err) {
      console.error(`ERROR: ${file}: ${err.message}`);
      errors++;
    }
  }

  console.error(`\nDone: ${processed} processed, ${skipped} skipped (up-to-date), ${errors} errors.`);
  console.error(`Output: ${OUT_DIR}`);

  if (errors > 0) process.exit(1);
}

main();
