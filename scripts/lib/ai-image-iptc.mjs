/**
 * IPTC/XMP label for AI-generated article heroes.
 *
 * Google reads IPTC DigitalSourceType off the image file. Every `{slug}-main.jpg`
 * hero on this site is Imagen output. Charts, ingredient shots, support
 * graphics, and the logo are left untouched.
 *
 * JPEG bytes are patched in place (no re-encode) so the file grows by the
 * metadata packet only. WebP variants get the same XMP packet.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { crc32 } from "node:zlib";
import sharp from "sharp";

export const DIGITAL_SOURCE_TYPE =
  "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";

export const AI_IMAGE_CREDIT = "Daily Life Hacks (AI illustration)";

/** Metadata larger than this means we re-encoded or duplicated a packet. */
export const MAX_STAMP_GROWTH_BYTES = 2048;

const XMP_NS = "http://ns.adobe.com/xap/1.0/\0";

export function xmpPacket() {
  return (
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Daily Life Hacks">\n' +
    ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
    '  <rdf:Description rdf:about=""\n' +
    '    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"\n' +
    '    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">\n' +
    `   <Iptc4xmpExt:DigitalSourceType>${DIGITAL_SOURCE_TYPE}</Iptc4xmpExt:DigitalSourceType>\n` +
    `   <photoshop:Credit>${AI_IMAGE_CREDIT}</photoshop:Credit>\n` +
    "  </rdf:Description>\n" +
    " </rdf:RDF>\n" +
    "</x:xmpmeta>\n" +
    '<?xpacket end="w"?>'
  );
}

export function isAiHeroFilename(name) {
  const base = String(name).split(/[/\\]/).pop() || "";
  return /^[^/\\]+-main\.jpe?g$/i.test(base);
}

export function isAiHeroWebpVariant(name) {
  const base = String(name).split(/[/\\]/).pop() || "";
  return /^[^/\\]+-main-\d+w\.webp$/i.test(base);
}

export function hasDigitalSourceType(buffer) {
  return buffer.includes(Buffer.from(DIGITAL_SOURCE_TYPE));
}

export function hasAiImageCredit(buffer) {
  return buffer.includes(Buffer.from(AI_IMAGE_CREDIT));
}

function appSegment(marker, payload) {
  const length = payload.length + 2;
  if (length > 65535) {
    throw new Error(`JPEG APP segment is ${length} bytes (max 65535)`);
  }
  const out = Buffer.alloc(4 + payload.length);
  out[0] = 0xff;
  out[1] = marker;
  out.writeUInt16BE(length, 2);
  payload.copy(out, 4);
  return out;
}

function iptcDataset(record, dataset, value) {
  if (value.length > 32767) throw new Error("IPTC value is too long");
  const out = Buffer.alloc(5 + value.length);
  out[0] = 0x1c;
  out[1] = record;
  out[2] = dataset;
  out.writeUInt16BE(value.length, 3);
  value.copy(out, 5);
  return out;
}

function iptcCreditSegment(credit) {
  const datasets = Buffer.concat([
    iptcDataset(1, 90, Buffer.from([0x1b, 0x25, 0x47])),
    iptcDataset(2, 110, Buffer.from(credit, "utf8")),
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(datasets.length, 0);
  const pad = datasets.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  const block = Buffer.concat([
    Buffer.from("Photoshop 3.0\0", "latin1"),
    Buffer.from("8BIM", "ascii"),
    Buffer.from([0x04, 0x04]),
    Buffer.from([0x00, 0x00]),
    size,
    datasets,
    pad,
  ]);
  return appSegment(0xed, block);
}

function xmpSegment() {
  const payload = Buffer.concat([
    Buffer.from(XMP_NS, "latin1"),
    Buffer.from(xmpPacket(), "utf8"),
  ]);
  return appSegment(0xe1, payload);
}

function insertAfterJpegPreamble(jpeg, segments) {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error("not a JPEG");
  }
  let offset = 2;
  // Keep a JFIF APP0 segment first. DigitalSourceType follows it.
  if (jpeg[offset] === 0xff && jpeg[offset + 1] === 0xe0) {
    const length = jpeg.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > jpeg.length) {
      throw new Error("JPEG APP0 segment is truncated");
    }
    offset += 2 + length;
  }
  if (jpeg[offset] !== 0xff) {
    throw new Error("JPEG has no marker after the header");
  }
  return Buffer.concat([
    jpeg.subarray(0, offset),
    ...segments,
    jpeg.subarray(offset),
  ]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isPng(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

export function isJpeg(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData) >>> 0, 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * A few `{slug}-main.jpg` heroes are PNG bytes with a `.jpg` name.
 * XMP goes in an iTXt chunk, which is where readers look for IPTC Photo Metadata.
 * @param {Buffer} png
 * @returns {Buffer}
 */
export function stampPng(png) {
  if (!isPng(png)) throw new Error("not a PNG");
  if (hasDigitalSourceType(png) && hasAiImageCredit(png)) return png;
  let offset = 8;
  let insertAt = -1;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const next = offset + 12 + length;
    if (next > png.length) throw new Error("PNG chunk is truncated");
    // Readers look for XMP before the pixel data.
    if (type === "IDAT" || type === "IEND") {
      insertAt = offset;
      break;
    }
    offset = next;
  }
  if (insertAt < 0) throw new Error("PNG is missing IDAT");
  const data = Buffer.concat([
    Buffer.from("XML:com.adobe.xmp\0", "latin1"),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from(xmpPacket(), "utf8"),
  ]);
  const stamped = Buffer.concat([
    png.subarray(0, insertAt),
    pngChunk("iTXt", data),
    png.subarray(insertAt),
  ]);
  const growth = stamped.length - png.length;
  if (growth < 0 || growth >= MAX_STAMP_GROWTH_BYTES) {
    throw new Error(`PNG XMP stamp grew by ${growth} bytes`);
  }
  return stamped;
}

/**
 * Stamp a hero file whatever container it actually is.
 * @param {Buffer} buffer
 * @param {string} [name]
 * @returns {Buffer}
 */
export function stampHeroBytes(buffer, name = "hero") {
  if (isPng(buffer)) return stampPng(buffer);
  if (isJpeg(buffer)) return stampJpeg(buffer);
  throw new Error(`${name} is neither JPEG nor PNG`);
}

/**
 * @param {Buffer} jpeg
 * @returns {Buffer}
 */
export function stampJpeg(jpeg) {
  if (!Buffer.isBuffer(jpeg)) throw new Error("stampJpeg expects a Buffer");
  if (hasDigitalSourceType(jpeg) && hasAiImageCredit(jpeg)) return jpeg;
  const stamped = insertAfterJpegPreamble(jpeg, [
    xmpSegment(),
    iptcCreditSegment(AI_IMAGE_CREDIT),
  ]);
  const growth = stamped.length - jpeg.length;
  if (growth < 0 || growth >= MAX_STAMP_GROWTH_BYTES) {
    throw new Error(`JPEG IPTC stamp grew by ${growth} bytes`);
  }
  return stamped;
}

/**
 * Encode one WebP variant with the AI-disclosure XMP packet.
 * Used for `{slug}-main.jpg` heroes only. The packet is the same one stamped
 * onto the deployed JPEG.
 */
export async function webpWithDigitalSourceType(input, { width, quality }) {
  return sharp(input)
    .resize(width)
    .withXmp(xmpPacket())
    .webp({ quality })
    .toBuffer();
}

export function stampWebp(webp) {
  if (!Buffer.isBuffer(webp)) throw new Error("stampWebp expects a Buffer");
  if (hasDigitalSourceType(webp) && hasAiImageCredit(webp)) return webp;
  if (
    webp.length < 12 ||
    webp.toString("ascii", 0, 4) !== "RIFF" ||
    webp.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("not a WebP");
  }
  const payload = Buffer.from(xmpPacket(), "utf8");
  const header = Buffer.alloc(8);
  header.write("XMP ", 0, "ascii");
  header.writeUInt32LE(payload.length, 4);
  const pad = payload.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  const out = Buffer.concat([webp, header, payload, pad]);
  out.writeUInt32LE(out.length - 8, 4);
  flagWebpXmp(out);
  const growth = out.length - webp.length;
  if (growth < 0 || growth >= MAX_STAMP_GROWTH_BYTES) {
    throw new Error(`WebP XMP stamp grew by ${growth} bytes`);
  }
  return out;
}

/**
 * VP8X feature flag bit 2 (0x04) tells readers that an XMP chunk is present.
 * Simple VP8 files have no VP8X chunk; the trailing XMP chunk still stands.
 */
function flagWebpXmp(webp) {
  let offset = 12;
  while (offset + 8 <= webp.length) {
    const tag = webp.toString("ascii", offset, offset + 4);
    const size = webp.readUInt32LE(offset + 4);
    if (tag === "VP8X" && size >= 1) {
      webp[offset + 8] |= 0x04;
      return;
    }
    offset += 8 + size + (size % 2);
  }
}

/**
 * Stamp every deployed AI hero under `imagesDir` (`dist/images`).
 * Non-hero JPEGs and the logo are not modified.
 * @returns {{ jpegs: number, webps: number }}
 */
export function stampHeroDirectory(imagesDir) {
  if (!existsSync(imagesDir)) {
    throw new Error(`hero image directory does not exist: ${imagesDir}`);
  }
  const names = readdirSync(imagesDir);
  let heroes = 0;
  for (const name of names) {
    if (!isAiHeroFilename(name)) continue;
    const path = join(imagesDir, name);
    const before = readFileSync(path);
    const after = stampHeroBytes(before, name);
    if (after !== before) writeFileSync(path, after);
    if (!hasDigitalSourceType(after) || !hasAiImageCredit(after)) {
      throw new Error(`${name} is missing DigitalSourceType after stamp`);
    }
    heroes += 1;
  }
  if (heroes === 0) {
    throw new Error(`no AI hero images found in ${imagesDir}`);
  }

  const optDir = join(imagesDir, "opt");
  let webps = 0;
  if (existsSync(optDir)) {
    for (const name of readdirSync(optDir)) {
      if (!isAiHeroWebpVariant(name)) continue;
      const path = join(optDir, name);
      const before = readFileSync(path);
      const after = stampWebp(before);
      if (after !== before) writeFileSync(path, after);
      if (!hasDigitalSourceType(after) || !hasAiImageCredit(after)) {
        throw new Error(`${name} is missing DigitalSourceType after stamp`);
      }
      webps += 1;
    }
  }
  return { heroes, webps };
}
