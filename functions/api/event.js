export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get("Origin");
  const allowedOrigins = new Set([
    "https://www.daily-life-hacks.com",
    "https://daily-life-hacks.pages.dev",
  ]);

  const corsHeaders = {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin)
      ? origin
      : "https://www.daily-life-hacks.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "DB not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const eventType = body.event_type;

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: "event_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await env.DB.prepare(
      `INSERT INTO funnel_events
       (event_type, page, base_slug, variant_slug, category, source, cta_variant, email_segment, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      eventType,
      body.page || "",
      body.base_slug || "",
      body.variant_slug || "",
      body.category || "",
      body.source || "",
      body.cta_variant || "",
      body.email_segment || "",
      body.metadata ? JSON.stringify(body.metadata) : null
    ).run();

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
