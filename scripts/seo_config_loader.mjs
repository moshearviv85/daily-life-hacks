/**
 * Module-resolution hooks used by `seo_config_bridge.mjs`.
 *
 * `astro.config.mjs` is the single source of truth for sitemap exclusions, but
 * importing it normally drags in the whole Astro toolchain. These stubs replace
 * only the three bare specifiers the config imports, so the config's *own*
 * functions (`loadSitemapExclusions`, `shouldExcludeFromSitemap`, `serialize`)
 * run untouched and can be called directly. Nothing is duplicated here.
 *
 * The stubs are data: URLs so no extra files are needed and no relative-import
 * resolution changes.
 */

const STUBS = {
  'astro/config':
    'export function defineConfig(c){return c;}\n' +
    'export default { defineConfig };\n',
  '@astrojs/sitemap':
    // Capture the options object (which holds the real `serialize`) instead of
    // building an Astro integration around it.
    'export default function sitemap(options){' +
    'return { name: "@astrojs/sitemap", hooks: {}, __sitemapOptions: options };' +
    '}\n',
  '@tailwindcss/vite':
    'export default function tailwindcss(){ return { name: "tailwindcss-stub" }; }\n',
};

function stubUrl(source) {
  return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source);
}

export async function resolve(specifier, context, nextResolve) {
  if (Object.prototype.hasOwnProperty.call(STUBS, specifier)) {
    return { shortCircuit: true, url: stubUrl(STUBS[specifier]) };
  }
  return nextResolve(specifier, context);
}
