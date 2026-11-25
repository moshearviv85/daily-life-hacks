import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  AI_IMAGE_CREDIT,
  DIGITAL_SOURCE_TYPE,
  MAX_STAMP_GROWTH_BYTES,
  hasAiImageCredit,
  hasDigitalSourceType,
  isAiHeroFilename,
  isAiHeroWebpVariant,
  isPng,
  stampHeroBytes,
  stampHeroDirectory,
  stampJpeg,
  webpWithDigitalSourceType,
} from "../scripts/lib/ai-image-iptc.mjs";

const root = process.cwd();
const heroesDir = join(root, "public", "images");
const heroes = readdirSync(heroesDir).filter(isAiHeroFilename).sort();

function sampleNames() {
  assert.ok(heroes.length >= 5, `expected the AI hero set, found ${heroes.length}`);
  const indexes = [0, 74, 148, 222, heroes.length - 1];
  return indexes.map((index) => heroes[Math.min(index, heroes.length - 1)]);
}

test("hero filenames are the AI set and charts and the logo are not", () => {
  assert.equal(heroes.length, 299);
  assert.equal(isAiHeroFilename("logo.png"), false);
  assert.equal(isAiHeroFilename("fiber-per-dollar-five-dollars.jpg"), false);
  assert.equal(isAiHeroFilename("sheet-pan-ginger-tofu-broccoli-sticky-glaze-ingredients.jpg"), false);
  assert.equal(isAiHeroWebpVariant("fiber-per-dollar-five-dollars-800w.webp"), false);
  assert.equal(isAiHeroWebpVariant("how-to-store-homemade-bread-main-800w.webp"), true);
  assert.match(readFileSync(join(root, "scripts", "optimize-images.mjs"), "utf8"), /webpWithDigitalSourceType/);
  assert.match(readFileSync(join(root, "astro.config.mjs"), "utf8"), /stampHeroDirectory/);
});

test("a sample of built hero images carries DigitalSourceType and still decodes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dlh-hero-iptc-"));
  try {
    for (const name of sampleNames()) {
      const original = readFileSync(join(heroesDir, name));
      const jpeg = stampJpeg(original);
      const jpegPath = join(dir, name);
      writeFileSync(jpegPath, jpeg);
      const builtJpeg = readFileSync(jpegPath);

      assert.ok(hasDigitalSourceType(builtJpeg), `${name} JPEG missing DigitalSourceType`);
      assert.ok(hasAiImageCredit(builtJpeg), `${name} JPEG missing IPTC credit`);
      assert.ok(
        builtJpeg.length - original.length < MAX_STAMP_GROWTH_BYTES,
        `${name} JPEG grew by ${builtJpeg.length - original.length} bytes`,
      );
      assert.equal(stampJpeg(builtJpeg), builtJpeg, `${name} JPEG stamp is not idempotent`);

      const jpegMeta = await sharp(builtJpeg).metadata();
      assert.equal(jpegMeta.format, "jpeg", name);
      assert.ok(jpegMeta.width > 0 && jpegMeta.height > 0, name);
      assert.ok(jpegMeta.xmp?.includes(Buffer.from(DIGITAL_SOURCE_TYPE)), `${name} XMP`);
      assert.ok(jpegMeta.iptc?.includes(Buffer.from(AI_IMAGE_CREDIT)), `${name} IPTC Credit`);
      await sharp(builtJpeg).resize(8).raw().toBuffer();

      const plain = await sharp(original).resize(400).webp({ quality: 80 }).toBuffer();
      const webp = await webpWithDigitalSourceType(original, { width: 400, quality: 80 });
      const webpName = name.replace(/\.jpe?g$/i, "-400w.webp");
      const webpPath = join(dir, webpName);
      writeFileSync(webpPath, webp);
      const builtWebp = readFileSync(webpPath);

      assert.ok(hasDigitalSourceType(builtWebp), `${webpName} missing DigitalSourceType`);
      assert.ok(hasAiImageCredit(builtWebp), `${webpName} missing credit`);
      assert.ok(
        builtWebp.length - plain.length < MAX_STAMP_GROWTH_BYTES,
        `${webpName} grew by ${builtWebp.length - plain.length} bytes`,
      );
      const webpMeta = await sharp(builtWebp).metadata();
      assert.equal(webpMeta.format, "webp", webpName);
      assert.equal(webpMeta.width, 400, webpName);
      assert.ok(webpMeta.xmp?.includes(DIGITAL_SOURCE_TYPE) || hasDigitalSourceType(builtWebp));
      await sharp(builtWebp).resize(8).raw().toBuffer();
    }

    const pngName = "animal-protein-per-dollar-ranked-main.jpg";
    const pngOriginal = readFileSync(join(heroesDir, pngName));
    assert.equal(isPng(pngOriginal), true, `${pngName} is PNG data in a .jpg name`);
    const pngStamped = stampHeroBytes(pngOriginal, pngName);
    assert.ok(pngStamped.length - pngOriginal.length < MAX_STAMP_GROWTH_BYTES);
    assert.equal(stampHeroBytes(pngStamped, pngName), pngStamped);
    const pngMeta = await sharp(pngStamped).metadata();
    assert.equal(pngMeta.format, "png");
    assert.ok(pngMeta.width > 0);
    assert.ok(hasDigitalSourceType(pngStamped));
    assert.ok(hasAiImageCredit(pngStamped));
    assert.ok(pngMeta.xmp?.includes(Buffer.from(DIGITAL_SOURCE_TYPE)));
    await sharp(pngStamped).resize(8).raw().toBuffer();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the hero stamp skips charts in a built directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "dlh-hero-dir-"));
  try {
    const hero = heroes[0];
    const chart = "fiber-per-dollar-five-dollars.jpg";
    const heroBytes = readFileSync(join(heroesDir, hero));
    const chartBytes = readFileSync(join(heroesDir, chart));
    writeFileSync(join(dir, hero), heroBytes);
    writeFileSync(join(dir, chart), chartBytes);
    const stamped = stampHeroDirectory(dir);
    assert.equal(stamped.heroes, 1);
    assert.ok(hasDigitalSourceType(readFileSync(join(dir, hero))));
    assert.deepEqual(readFileSync(join(dir, chart)), chartBytes);
    assert.equal(hasDigitalSourceType(readFileSync(join(dir, chart))), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every deployed AI hero carries DigitalSourceType", async () => {
  const distImages = join(root, "dist", "images");
  if (!existsSync(distImages)) {
    if (process.env.CI) assert.fail("dist/images is missing in CI");
    return;
  }
  const built = readdirSync(distImages).filter(isAiHeroFilename).sort();
  assert.equal(built.length, heroes.length);
  for (const name of built) {
    const bytes = readFileSync(join(distImages, name));
    assert.ok(hasDigitalSourceType(bytes), name);
    assert.ok(hasAiImageCredit(bytes), name);
  }
  const optDir = join(distImages, "opt");
  if (existsSync(optDir)) {
    const variants = readdirSync(optDir).filter(isAiHeroWebpVariant);
    assert.ok(variants.length >= built.length, "hero WebP variants were not built");
    for (const name of variants) {
      const bytes = readFileSync(join(optDir, name));
      assert.ok(hasDigitalSourceType(bytes), name);
      assert.ok(hasAiImageCredit(bytes), name);
    }
  }
  const sample = sampleNames();
  for (const name of sample) {
    const meta = await sharp(readFileSync(join(distImages, name))).metadata();
    assert.ok(meta.format === "jpeg" || meta.format === "png", name);
    assert.ok(meta.width > 0, name);
    await sharp(readFileSync(join(distImages, name))).resize(8).raw().toBuffer();
  }
  const chart = readFileSync(join(distImages, "fiber-per-dollar-five-dollars.jpg"));
  assert.equal(hasDigitalSourceType(chart), false);
  const logo = readFileSync(join(root, "dist", "logo.png"));
  assert.equal(hasDigitalSourceType(logo), false);
});
