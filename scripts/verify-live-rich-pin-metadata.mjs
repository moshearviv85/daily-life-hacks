const targetUrl =
  process.argv[2] ||
  "https://www.daily-life-hacks.com/best-way-to-cook-baked-potatoes/";

const maxAttempts = Number(process.env.RICH_PIN_VERIFY_ATTEMPTS || 24);
const delayMs = Number(process.env.RICH_PIN_VERIFY_DELAY_MS || 10000);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function metaContent(html, selector) {
  return html.match(selector)?.[1] || null;
}

function parseJsonLd(html) {
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => JSON.parse(match[1]));
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "DailyLifeHacks-RichPinVerifier/1.0",
    },
  });
  const html = await response.text();
  return { status: response.status, html };
}

function verify(html, status) {
  assert(status === 200, `Expected HTTP 200, got ${status}`);

  const ogImage = metaContent(
    html,
    /<meta property="og:image" content="([^"]+)"/,
  );
  const twitterImage = metaContent(
    html,
    /<meta name="twitter:image" content="([^"]+)"/,
  );
  const jsonLdBlocks = parseJsonLd(html);
  const recipe = jsonLdBlocks.find((node) => node["@type"] === "Recipe");

  assert(recipe, "Expected Recipe JSON-LD block");
  assert(
    ogImage?.startsWith("https://www.daily-life-hacks.com/images/"),
    `Expected absolute og:image, got ${ogImage}`,
  );
  assert(
    twitterImage?.startsWith("https://www.daily-life-hacks.com/images/"),
    `Expected absolute twitter:image, got ${twitterImage}`,
  );
  assert(recipe.image?.[0] === ogImage, "Expected Recipe image to match og:image");
  assert(
    recipe.thumbnailUrl === ogImage,
    "Expected Recipe thumbnailUrl to match og:image",
  );
  assert(
    recipe.mainEntityOfPage?.["@id"] === recipe.url,
    "Expected mainEntityOfPage to point at Recipe URL",
  );
  assert(recipe.author?.["@type"] === "Person", "Expected Person author");
  assert(recipe.prepTime, "Expected prepTime");
  assert(recipe.cookTime, "Expected cookTime");
  assert(recipe.totalTime, "Expected totalTime");
  assert(recipe.nutrition?.calories, "Expected nutrition calories");
  assert(
    Array.isArray(recipe.recipeIngredient) &&
      recipe.recipeIngredient.length >= 3,
    "Expected recipe ingredients",
  );
  assert(
    Array.isArray(recipe.recipeInstructions) &&
      recipe.recipeInstructions.length >= 3,
    "Expected recipe instructions",
  );

  return {
    ogImage,
    twitterImage,
    recipeUrl: recipe.url,
    ingredients: recipe.recipeIngredient.length,
    instructions: recipe.recipeInstructions.length,
  };
}

let lastError;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const { status, html } = await fetchHtml(targetUrl);
    const result = verify(html, status);
    console.log(
      JSON.stringify(
        {
          ok: true,
          attempt,
          url: targetUrl,
          ...result,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(
      `[verify-live-rich-pin] attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
    );
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }
}

throw lastError;
