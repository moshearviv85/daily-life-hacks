const ALLOWED_ORIGINS = new Set([
  "https://www.daily-life-hacks.com",
  "https://daily-life-hacks.pages.dev",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.has(origin)
        ? origin
        : "https://www.daily-life-hacks.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function badRequest(origin, message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: corsHeaders(origin),
  });
}

async function getRatingSnapshot(db, slug, userKey) {
  const aggregate = await db
    .prepare(
      `SELECT ROUND(AVG(rating), 2) AS average, COUNT(*) AS count
       FROM article_ratings
       WHERE slug = ?`,
    )
    .bind(slug)
    .first();

  let userRating = null;
  if (userKey) {
    const mine = await db
      .prepare(
        `SELECT rating
         FROM article_ratings
         WHERE slug = ? AND user_key = ?`,
      )
      .bind(slug, userKey)
      .first();

    userRating = mine?.rating ?? null;
  }

  return {
    slug,
    average: Number(aggregate?.average ?? 0),
    count: Number(aggregate?.count ?? 0),
    userRating,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: "Database not configured" }),
      { status: 500, headers },
    );
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const slug = (url.searchParams.get("slug") || "").trim();
      const userKey = (url.searchParams.get("user_key") || "").trim();

      if (!slug) return badRequest(origin, "slug is required");
      if (slug.length > 200) return badRequest(origin, "slug is too long");

      const snapshot = await getRatingSnapshot(env.DB, slug, userKey);
      return new Response(JSON.stringify({ ok: true, ...snapshot }), {
        status: 200,
        headers,
      });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const slug = String(body?.slug || "").trim();
      const userKey = String(body?.user_key || "").trim();
      const rating = Number(body?.rating);

      if (!slug) return badRequest(origin, "slug is required");
      if (slug.length > 200) return badRequest(origin, "slug is too long");
      if (!userKey) return badRequest(origin, "user_key is required");
      if (userKey.length > 200) return badRequest(origin, "user_key is too long");
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return badRequest(origin, "rating must be an integer between 1 and 5");
      }

      await env.DB
        .prepare(
          `INSERT INTO article_ratings (slug, user_key, rating)
           VALUES (?, ?, ?)
           ON CONFLICT(slug, user_key)
           DO UPDATE SET
             rating = excluded.rating,
             updated_at = datetime('now')`,
        )
        .bind(slug, userKey, rating)
        .run();

      const snapshot = await getRatingSnapshot(env.DB, slug, userKey);
      return new Response(JSON.stringify({ ok: true, ...snapshot }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers,
    });
  }
}
