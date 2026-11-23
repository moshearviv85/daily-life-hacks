/**
 * Build-time image optimizer.
 *
 * Reads every JPEG directly under public/images/ (article heroes `*-main.jpg`,
 * the original data charts, `*-ingredients.jpg`, `*-support.jpg`, and any other
 * in-article graphic) and generates WebP at 400w, 800w and 1200w into
 * public/images/opt/. Skips files whose output is newer than the source.
 *
 * It also writes public/images/opt/manifest.json, which records the *actual*
 * pixel width of every variant plus the intrinsic size of every source image.
 * src/components/OptImage.astro reads that manifest so it can emit a truthful
 * `srcset` and so it can degrade to the plain JPEG when no variant exists —
 * a bare `<picture><source>` pointing at a missing file renders as a broken
 * image, it does not fall back.
 *
 * Deliberately NOT generating AVIF: public/images/opt/ is gitignored, so CI
 * regenerates every variant on every deploy. Measured: WebP does the whole
 * 293-image set in 67s cold; AVIF benchmarks 5.8x slower on the same input
 * (1408ms vs 244ms for one image at three widths), i.e. ~+7 min per deploy,
 * for a marginal byte saving that has no effect on image-search ranking.
 * Revisit only if LCP becomes a measured problem.
 *
 * The image sitemap is NOT built here. `loadArticleImages()` in
 * astro.config.mjs emits `img` entries inline in the existing sitemap-index,
 * which is strictly better than a second sitemap file.
 *
 * AI hero JPEGs (`*-main.jpg`) also get an XMP DigitalSourceType of
 * trainedAlgorithmicMedia on the WebP written here. The JPEG `img src` is
 * stamped after Astro copies `public/` into `dist/` (see astro.config.mjs),
 * because that is the file Google fetches. Charts, support images, and the
 * logo are not labeled.
 *
 * Usage:
 *   node scripts/optimize-images.mjs
 *   node scripts/optimize-images.mjs --force   (regenerate all)
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  hasAiImageCredit,
  hasDigitalSourceType,
  isAiHeroFilename,
  webpWithDigitalSourceType,
} from "./lib/ai-image-iptc.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SRC_DIR = join(REPO_ROOT, "public", "images");
const OUT_DIR = join(REPO_ROOT, "public", "images", "opt");
const MANIFEST_PATH = join(OUT_DIR, "manifest.json");
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

function variantName(name, width) {
  return name.replace(/\.jpe?g$/i, `-${width}w.webp`);
}

/**
 * @returns {Promise<{width:number,height:number,variants:{w:number,file:string}[]}>}
 */
async function writeVariant(srcPath, outPath, targetWidth, hero) {
  if (hero) {
    const webp = await webpWithDigitalSourceType(srcPath, {
      width: targetWidth,
      quality: QUALITY,
    });
    writeFileSync(outPath, webp);
    return;
  }
  await sharp(srcPath).resize(targetWidth).webp({ quality: QUALITY }).toFile(outPath);
}

async function optimizeImage(srcPath, name) {
  const hero = isAiHeroFilename(name);
  const meta = await sharp(srcPath).metadata();
  const variants = [];
  const seen = new Set();

  for (const w of WIDTHS) {
    // Never upscale. If the source is narrower than the requested width the
    // variant is emitted at the source width, and the manifest records that
    // real width so the srcset does not advertise pixels that do not exist.
    const targetWidth = Math.min(w, meta.width);
    if (seen.has(targetWidth)) continue;
    seen.add(targetWidth);

    const outName = variantName(name, w);
    const outPath = join(OUT_DIR, outName);

    if (force || !isNewer(srcPath, outPath)) {
      await writeVariant(srcPath, outPath, targetWidth, hero);
    } else if (hero) {
      const existing = readFileSync(outPath);
      if (!hasDigitalSourceType(existing) || !hasAiImageCredit(existing)) {
        await writeVariant(srcPath, outPath, targetWidth, true);
      }
    }

    variants.push({ w: targetWidth, file: `/images/opt/${outName}` });
  }

  return { width: meta.width, height: meta.height, variants };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Every JPEG directly under public/images/. Subdirectories (pins/, video/,
  // drafts/, test-*/) are intentionally excluded: none of them are rendered
  // on the site.
  const files = readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.jpe?g$/i.test(e.name))
    .map((e) => e.name)
    .sort();

  console.error(`Found ${files.length} source images.`);

  const manifest = {};
  let processed = 0;
  let errors = 0;

  for (const file of files) {
    const srcPath = join(SRC_DIR, file);
    try {
      manifest[`/images/${file}`] = await optimizeImage(srcPath, file);
      processed++;
    } catch (err) {
      console.error(`ERROR: ${file}: ${err.message}`);
      errors++;
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 0));

  console.error(`\nDone: ${processed} images in manifest, ${errors} errors.`);
  console.error(`Output: ${OUT_DIR}`);

  // The image sitemap is emitted inline by astro.config.mjs during the build,
  // from the same source of truth as the page sitemap, so it regenerates on
  // every deploy instead of going stale as a checked-in snapshot.

  if (errors > 0) process.exit(1);
}

main();
