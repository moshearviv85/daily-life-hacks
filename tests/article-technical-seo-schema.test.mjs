import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articlePage = readFileSync(
  new URL("../src/pages/[slug].astro", import.meta.url),
  "utf8",
);
const methodologyPage = readFileSync(
  new URL("../src/pages/methodology.astro", import.meta.url),
  "utf8",
);

test("Article and Recipe schemas share the visible author and organization publisher", () => {
  assert.match(articlePage, /const authorName = article\.data\.author \?\? "David Miller"/);
  assert.match(articlePage, /"@type": "Person",[\s\S]*?"@id": `\$\{siteUrl\}\/about\/`/);
  assert.match(articlePage, /name: authorName,[\s\S]*?url: `\$\{siteUrl\}\/about\/`/);
  assert.equal(
    [...articlePage.matchAll(/author: articleAuthor/g)].length,
    2,
    "Recipe and Article must use the same resolved author entity",
  );
  assert.equal(
    [...articlePage.matchAll(/publisher: publisherSchema/g)].length,
    3,
    "Recipe, Article, and Dataset must use the same publisher entity",
  );
  assert.match(
    articlePage,
    /authorName === "Daily Life Hacks Team"[\s\S]*?"@type": "Organization"[\s\S]*?name: authorName/,
  );
  assert.match(articlePage, /"@id": `\$\{siteUrl\}\/#organization`/);
  assert.match(articlePage, /logo: \{[\s\S]*?"@type": "ImageObject"[\s\S]*?logo\.png/);
  assert.match(
    articlePage,
    /<a[\s\S]*?href="\/about\/"[\s\S]*?rel="author"[\s\S]*?\{article\.data\.author\}[\s\S]*?<\/a>/,
    "The visible byline must resolve to the same author page as the Person schema",
  );
});

test("primary article schemas retain canonical, image, language, and date signals", () => {
  assert.equal(
    [...articlePage.matchAll(/mainEntityOfPage: \{/g)].length,
    2,
    "Recipe and Article must each declare mainEntityOfPage",
  );
  assert.equal(
    [...articlePage.matchAll(/"@id": articleEntityId/g)].length,
    3,
    "Recipe, Article, and WebPage.mainEntity must share the canonical entity id",
  );
  assert.equal([...articlePage.matchAll(/datePublished: publishedDate/g)].length, 3);
  assert.equal([...articlePage.matchAll(/dateModified: modifiedDate/g)].length, 3);
  assert.equal([...articlePage.matchAll(/image: \[imageUrl\]/g)].length, 2);
  assert.equal(
    [...articlePage.matchAll(/inLanguage: "en-US"/g)].length,
    3,
    "Recipe, Article, and WebPage must use the same language signal",
  );
  assert.match(articlePage, /thumbnailUrl: imageUrl/);
  assert.match(
    articlePage,
    /releaseDate\.toLocaleDateString\("en-US"/,
    "The visible byline date must match the schema datePublished release date",
  );
  assert.doesNotMatch(articlePage, /article\.data\.date\.toLocaleDateString/);
});

test("Dataset schema remains attached to its canonical article and CSV", () => {
  const datasetBlock = articlePage.match(
    /if \(dataset\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nif \(article\.data\.faq/,
  );

  assert.ok(datasetBlock, "Dataset schema block must remain present");
  assert.match(articlePage, /"@type": "Dataset"/);
  assert.match(articlePage, /url: articleUrl/);
  assert.match(articlePage, /creator: publisherSchema/);
  assert.match(articlePage, /"@type": "DataDownload"/);
  assert.match(articlePage, /contentUrl: `\$\{siteUrl\}\$\{dataset\.csv\}`/);
  assert.match(articlePage, /measurementTechnique: `\$\{siteUrl\}\/methodology\/`/);
  assert.match(
    datasetBlock[1],
    /license: `\$\{siteUrl\}\/methodology\/#data-license`/,
    "Dataset must identify the site's existing public-data reuse terms",
  );
  assert.doesNotMatch(
    datasetBlock[1],
    /isPartOf:/,
    "Dataset isPartOf may only point to a URL or another Dataset in Google's policy",
  );
  assert.match(
    methodologyPage,
    /<h2 id="data-license"[\s\S]*?>Every study ships its raw data<\/h2>/,
    "The Dataset license URL must resolve to the published reuse terms",
  );
});

test("future and variant pages are noindex and do not emit rich-result schemas", () => {
  assert.match(
    articlePage,
    /const robotsMeta = \(!released \|\| isVariant\) \? "noindex, follow" : undefined/,
  );
  assert.match(
    articlePage,
    /const publishedSchemas = released && !isVariant \? allSchemas : undefined/,
  );
  assert.match(articlePage, /jsonLd=\{publishedSchemas\}/);
  assert.match(articlePage, /canonicalURL=\{articleUrl\}/);
});
