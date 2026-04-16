/**
 * POST /api/articles-publish?key=STATS_KEY
 * Body: { slug }  — specific slug to publish
 * Body: {}        — auto-pick: publishes first PENDING that isn't a duplicate on GitHub,
 *                   marks any duplicates found along the way as DUPLICATE and skips them.
 *
 * Duplicate check: if src/data/articles/{slug}.md already exists in GitHub → duplicate.
 *
 * Response on success:
 *   { ok: true, slug, published_at, skipped_duplicates: [{slug, title, duplicate_of}] }
 * Response when all are duplicates / no pending:
 *   { ok: false, error: '...', skipped_duplicates: [...] }
 *
 * Requires GH_PAT env var in Cloudflare.
 */

const GH_OWNER  = 'moshearviv85';
const GH_REPO   = 'daily-life-hacks';
const GH_BRANCH = 'main';
const SITE_BASE = 'https://www.daily-life-hacks.com';
const API_BASE  = 'https://api.github.com';

async function ghFetch(path, options, pat) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'daily-life-hacks-cloudflare',
      ...(options.headers || {}),
    },
  });
}

function b64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/** Strip empty frontmatter fields and update date to today so article sorts as newest. */
function cleanFrontmatter(markdown) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let fixed = markdown
    // Remove publishAt with empty value
    .replace(/^publishAt:\s*["']{0,2}\s*$/m, '')
    // Update date to today (publish date)
    .replace(/^date:\s*.+$/m, `date: ${today}`)
    .replace(/\n{3,}/g, '\n\n');
  return fixed;
}

/** Check if src/data/articles/{slug}.md exists in GitHub. Returns SHA or null. */
async function getFileSha(slug, pat) {
  const res = await ghFetch(
    `/repos/${GH_OWNER}/${GH_REPO}/contents/src/data/articles/${slug}.md`,
    { method: 'GET' },
    pat
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

/** Mark article as DUPLICATE in D1. */
async function markDuplicate(slug, duplicateOf, db) {
  await db.prepare(
    `UPDATE articles_schedule SET status = 'DUPLICATE', duplicate_of = ? WHERE slug = ?`
  ).bind(duplicateOf, slug).run();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
  if (env.STATS_KEY && reqKey !== env.STATS_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.DB)     return Response.json({ error: 'DB not bound' }, { status: 500 });
  if (!env.GH_PAT) return Response.json({ error: 'GH_PAT not configured' }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const requestedSlug = body?.slug?.trim() || null;

  // Build candidate list
  let candidates;
  if (requestedSlug) {
    // Single specific article
    const row = await env.DB.prepare(
      `SELECT slug, title, markdown_content, image_filename
       FROM articles_schedule WHERE slug = ? AND status = 'PENDING'`
    ).bind(requestedSlug).first();
    if (!row) return Response.json({ error: 'Article not found or already published' }, { status: 404 });
    candidates = [row];
  } else {
    // Auto-pick: all PENDING ordered by created_at (CSV row order)
    const { results } = await env.DB.prepare(
      `SELECT slug, title, markdown_content, image_filename
       FROM articles_schedule WHERE status = 'PENDING' ORDER BY created_at ASC`
    ).all();
    candidates = results;
  }

  if (!candidates.length) {
    return Response.json({ ok: false, error: 'No pending articles found', skipped_duplicates: [] });
  }

  const skippedDuplicates = [];

  for (const row of candidates) {
    const { slug, title, markdown_content, image_filename } = row;
    const siteUrl = `${SITE_BASE}/${slug}`;

    // ── Duplicate check: does the .md file already exist in GitHub? ──────────
    const existingSha = await getFileSha(slug, env.GH_PAT);
    if (existingSha) {
      // Already live on the site — mark as duplicate and skip
      await markDuplicate(slug, siteUrl, env.DB);
      skippedDuplicates.push({ slug, title, duplicate_of: siteUrl });
      if (requestedSlug) {
        // Specific slug was requested and it's a duplicate — stop here
        return Response.json({
          ok: false,
          error: `Article already live on site`,
          slug,
          title,
          duplicate_of: siteUrl,
          skipped_duplicates: skippedDuplicates,
        }, { status: 409 });
      }
      continue; // auto-pick mode: try next
    }

    // ── Image check ───────────────────────────────────────────────────────────
    if (image_filename) {
      const imgRes = await ghFetch(
        `/repos/${GH_OWNER}/${GH_REPO}/contents/public/images/${image_filename}`,
        { method: 'GET' },
        env.GH_PAT
      );
      if (!imgRes.ok) {
        // Image missing in GitHub — skip this article (don't mark DUPLICATE, just skip for now)
        if (requestedSlug) {
          return Response.json({ error: `Image not found in GitHub: ${image_filename}` }, { status: 400 });
        }
        continue;
      }
    }

    // ── Commit .md to GitHub ──────────────────────────────────────────────────
    const filePath = `src/data/articles/${slug}.md`;
    const commitBody = {
      message: `feat: publish article ${slug}`,
      content: b64(cleanFrontmatter(markdown_content)),
      branch: GH_BRANCH,
    };

    const commitRes = await ghFetch(
      `/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`,
      { method: 'PUT', body: JSON.stringify(commitBody) },
      env.GH_PAT
    );

    if (!commitRes.ok) {
      const errText = await commitRes.text();
      return Response.json({ error: 'GitHub commit failed', detail: errText }, { status: 500 });
    }

    // ── Mark PUBLISHED in D1 ──────────────────────────────────────────────────
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE articles_schedule SET status = 'PUBLISHED', published_at = ? WHERE slug = ?`
    ).bind(now, slug).run();

    return Response.json({
      ok: true,
      slug,
      title,
      published_at: now,
      skipped_duplicates: skippedDuplicates,
    });
  }

  // All candidates were duplicates or had missing images
  return Response.json({
    ok: false,
    error: skippedDuplicates.length
      ? `All ${skippedDuplicates.length} pending articles are duplicates — already live on site`
      : 'No publishable articles found (images may be missing from GitHub)',
    skipped_duplicates: skippedDuplicates,
  });
}
