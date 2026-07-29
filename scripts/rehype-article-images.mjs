/**
 * Rehype plugin: make in-article markdown images behave like OptImage.
 *
 * Markdown `![alt](/images/x-chart.jpg)` compiles to a bare
 * `<img src alt>` — no intrinsic dimensions (layout shift), no `loading`
 * (every chart blocks initial paint) and no WebP. That currently affects 49
 * in-body images, and those include all 31 original data charts, which are the
 * site's only genuinely unique image assets.
 *
 * This rewrites each of them to:
 *   <picture>
 *     <source type="image/webp" srcset="…400w, …800w, …1200w" sizes="…">
 *     <img src="…jpg" alt="…" width height loading="lazy" decoding="async">
 *   </picture>
 *
 * `<picture>` is phrasing content, so it is valid inside the `<p>` that
 * markdown wraps a standalone image in. The `<img>` keeps the JPEG `src` —
 * Google Images indexes the `src`, and the JPEG is the universally
 * fetchable original.
 *
 * Widths and heights come from public/images/opt/manifest.json, written by
 * scripts/optimize-images.mjs at prebuild. If the manifest or a specific
 * entry is missing, the image is left exactly as it was — no <picture>
 * pointing at a file that does not exist.
 *
 * Wired into Astro's Markdown pipeline in astro.config.mjs. Keep the original
 * JPEG on the `<img>`: Pinterest metadata, schema.org image URLs, and Google
 * Images discovery continue to use the stable source asset while browsers can
 * choose the smaller responsive WebP.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MANIFEST_PATH = join(__dirname, "..", "public", "images", "opt", "manifest.json");
const SIZES = "(max-width: 768px) 100vw, 768px";

let manifest = null;
function loadManifest() {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    manifest = {};
  }
  return manifest;
}

function walk(node, parent, index, fn) {
  if (!node || typeof node !== "object") return;
  fn(node, parent, index);
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (let i = 0; i < children.length; i++) walk(children[i], node, i, fn);
}

export default function rehypeArticleImages() {
  return (tree) => {
    const m = loadManifest();

    walk(tree, null, 0, (node, parent, index) => {
      if (node.type !== "element" || node.tagName !== "img" || !parent) return;

      const src = node.properties?.src;
      if (typeof src !== "string" || !src.startsWith("/images/")) return;

      const entry = m[src];
      if (!entry) return;

      node.properties.width = entry.width;
      node.properties.height = entry.height;
      node.properties.loading = "lazy";
      node.properties.decoding = "async";

      const byWidth = new Map();
      for (const v of entry.variants || []) byWidth.set(v.w, v.file);
      const srcset = [...byWidth.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([w, file]) => `${file} ${w}w`)
        .join(", ");
      if (!srcset) return;

      parent.children[index] = {
        type: "element",
        tagName: "picture",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "source",
            properties: { type: "image/webp", srcSet: srcset, sizes: SIZES },
            children: [],
          },
          node,
        ],
      };
    });
  };
}
