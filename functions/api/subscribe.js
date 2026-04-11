const SITE_URL = "https://www.daily-life-hacks.com";
const DEFAULT_KIT_FORM_ID = 9202679;
const DEFAULT_KIT_TAG_IDS = {
  recipes: 17453985,
  nutrition: 17453986,
  tips: 17453987,
  sourceFooter: 17453988,
  sourcePopup: 17453989,
  recipesBreakfast: 17453990,
  recipesMain: 17453991,
  nutritionFoundations: 17453992,
  nutritionComparisons: 17453993,
  tipsStorage: 17453994,
  tipsSystems: 17453995,
};

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildTrackingMetadata({
  referrer,
  provider,
  source,
  page,
  category,
  base_slug,
  variant_slug,
  email_segment,
}) {
  const trackingMetadata = {
    referrer,
    provider,
  };

  if (source) trackingMetadata.source = source;
  if (page) trackingMetadata.page = page;
  if (category) trackingMetadata.category = category;
  if (base_slug) trackingMetadata.base_slug = base_slug;
  if (variant_slug) trackingMetadata.variant_slug = variant_slug;
  if (email_segment) trackingMetadata.email_segment = email_segment;

  return trackingMetadata;
}

async function logSignupEvent(env, payload) {
  if (!env.DB) return;

  try {
    await env.DB.prepare(
      "INSERT INTO subscriptions (email, source, page, referrer, status) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      payload.email,
      payload.source || "unknown",
      payload.page || "",
      payload.referrer,
      payload.status
    ).run();

    await env.DB.prepare(
      `INSERT INTO funnel_events
       (event_type, page, source, metadata)
       VALUES (?, ?, ?, ?)`
    ).bind(
      payload.status === "success" ? "signup_completed" : "signup_failed",
      payload.page || "",
      payload.source || "unknown",
      JSON.stringify(payload.metadata)
    ).run();
  } catch {
    // Don't block subscription if tracking fails.
  }
}

function buildReferrerUrl(page, source, email_segment) {
  const url = new URL(page || "/", SITE_URL);
  url.searchParams.set("utm_source", "website");
  url.searchParams.set("utm_medium", source || "newsletter");
  url.searchParams.set("utm_campaign", "site-signup");
  if (email_segment) {
    url.searchParams.set("utm_content", email_segment);
  }
  return url.toString();
}

function getKitTagIds(env, { category, source, email_segment }) {
  const rawIds = [];

  if (category === "recipes") rawIds.push(env.KIT_TAG_RECIPES || DEFAULT_KIT_TAG_IDS.recipes);
  if (category === "nutrition") rawIds.push(env.KIT_TAG_NUTRITION || DEFAULT_KIT_TAG_IDS.nutrition);
  if (category === "tips") rawIds.push(env.KIT_TAG_TIPS || DEFAULT_KIT_TAG_IDS.tips);

  if (source === "footer") rawIds.push(env.KIT_TAG_SOURCE_FOOTER || DEFAULT_KIT_TAG_IDS.sourceFooter);
  if (source === "popup") rawIds.push(env.KIT_TAG_SOURCE_POPUP || DEFAULT_KIT_TAG_IDS.sourcePopup);
  if (source === "article" && env.KIT_TAG_SOURCE_ARTICLE) {
    const articleTagId = Number.parseInt(env.KIT_TAG_SOURCE_ARTICLE, 10);
    if (Number.isInteger(articleTagId)) rawIds.push(articleTagId);
  }

  const segmentEnvMap = {
    "recipes-breakfast": env.KIT_TAG_SEGMENT_RECIPES_BREAKFAST || DEFAULT_KIT_TAG_IDS.recipesBreakfast,
    "recipes-main": env.KIT_TAG_SEGMENT_RECIPES_MAIN || DEFAULT_KIT_TAG_IDS.recipesMain,
    "nutrition-foundations":
      env.KIT_TAG_SEGMENT_NUTRITION_FOUNDATIONS || DEFAULT_KIT_TAG_IDS.nutritionFoundations,
    "nutrition-comparisons":
      env.KIT_TAG_SEGMENT_NUTRITION_COMPARISONS || DEFAULT_KIT_TAG_IDS.nutritionComparisons,
    "tips-storage": env.KIT_TAG_SEGMENT_TIPS_STORAGE || DEFAULT_KIT_TAG_IDS.tipsStorage,
    "tips-systems": env.KIT_TAG_SEGMENT_TIPS_SYSTEMS || DEFAULT_KIT_TAG_IDS.tipsSystems,
  };

  if (email_segment && segmentEnvMap[email_segment]) {
    rawIds.push(segmentEnvMap[email_segment]);
  }

  return [...new Set(rawIds.map((value) => Number.parseInt(value, 10)).filter(Number.isInteger))];
}

async function subscribeWithKit(env, payload) {
  const kitHeaders = {
    "Content-Type": "application/json",
    "X-Kit-Api-Key": env.KIT_API_KEY,
  };

  const subscriberRes = await fetch("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers: kitHeaders,
    body: JSON.stringify({
      email_address: payload.email,
      state: "active",
      fields: {
        Source: payload.source || "",
        Page: payload.page || "",
        Category: payload.category || "",
        "Base Slug": payload.base_slug || "",
        "Variant Slug": payload.variant_slug || "",
        "Email Segment": payload.email_segment || "",
      },
    }),
  });

  const subscriberBody = await subscriberRes.json().catch(() => null);
  if (!subscriberRes.ok || !subscriberBody?.subscriber?.id) {
    return {
      ok: false,
      status: subscriberRes.status,
      detail: JSON.stringify(subscriberBody || { error: "Kit subscriber creation failed" }),
      provider: "kit",
    };
  }

  const subscriberId = subscriberBody.subscriber.id;
  const formRes = await fetch(
    `https://api.kit.com/v4/forms/${env.KIT_FORM_ID || DEFAULT_KIT_FORM_ID}/subscribers/${subscriberId}`,
    {
      method: "POST",
      headers: kitHeaders,
      body: JSON.stringify({
        referrer: buildReferrerUrl(payload.page, payload.source, payload.email_segment),
      }),
    }
  );

  const formBody = await formRes.json().catch(() => null);
  if (!formRes.ok) {
    return {
      ok: false,
      status: formRes.status,
      detail: JSON.stringify(formBody || { error: "Kit form subscription failed" }),
      provider: "kit",
    };
  }

  const tagIds = getKitTagIds(env, payload);
  for (const tagId of tagIds) {
    await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers/${subscriberId}`, {
      method: "POST",
      headers: kitHeaders,
      body: JSON.stringify({}),
    }).catch(() => null);
  }

  return {
    ok: true,
    status: formRes.status,
    detail: "",
    provider: "kit",
  };
}

async function subscribeWithBeehiiv(env, payload) {
  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUB_ID || "pub_99ff482f-ae3d-436b-b0b9-637220faa120"}/subscriptions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify({
        email: payload.email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: "website",
        referring_site: SITE_URL,
      }),
    }
  );

  return {
    ok: res.ok || res.status === 409,
    status: res.status,
    detail: res.ok || res.status === 409 ? "" : await res.text(),
    provider: "beehiiv",
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://www.daily-life-hacks.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      source,
      page,
      category,
      base_slug,
      variant_slug,
      email_segment,
    } = await request.json();

    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Valid email required" }, 400, corsHeaders);
    }

    const providerPayload = {
      email,
      source,
      page,
      category,
      base_slug,
      variant_slug,
      email_segment,
    };

    let providerResult;
    if (env.KIT_API_KEY) {
      providerResult = await subscribeWithKit(env, providerPayload);
    } else if (env.BEEHIIV_API_KEY) {
      providerResult = await subscribeWithBeehiiv(env, providerPayload);
    } else {
      return jsonResponse({ error: "Newsletter service not configured" }, 500, corsHeaders);
    }

    const referrer = request.headers.get("Referer") || "";
    const status = providerResult.ok ? "success" : "failed";
    const trackingMetadata = buildTrackingMetadata({
      referrer,
      provider: providerResult.provider,
      source,
      page,
      category,
      base_slug,
      variant_slug,
      email_segment,
    });

    await logSignupEvent(env, {
      email,
      source,
      page,
      referrer,
      status,
      metadata: trackingMetadata,
    });

    if (providerResult.ok) {
      return jsonResponse({ success: true, provider: providerResult.provider }, 200, corsHeaders);
    }

    return jsonResponse(
      { error: "Subscription failed", detail: providerResult.detail, provider: providerResult.provider },
      providerResult.status || 500,
      corsHeaders
    );
  } catch (err) {
    return jsonResponse({ error: "Server error" }, 500, corsHeaders);
  }
}
