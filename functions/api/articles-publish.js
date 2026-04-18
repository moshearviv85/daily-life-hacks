/**
 * POST /api/articles-publish?key=STATS_KEY
 * Body: { slug }  — publish a specific article
 * Body: {}        — auto-pick: find first PENDING with image, publish it.
 *                   Duplicates (already live on GitHub) are marked DUPLICATE and skipped.
 *
 * Response on success:
 *   { ok: true, slug, title, published_at, skipped_duplicates: [slug, ...] }
 * Response when nothing publishable:
 *   { ok: false, error: '...', skipped_duplicates: [...] }
 *
 * Requires GH_PAT env var in Cloudflare.
 */

const GH_OWNER  = 'moshearviv85';
const GH_REPO   = 'daily-life-hacks';
const GH_BRANCH = 'main';
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

function cleanFrontmatter(markdown) {
  const today = new Date().toISOString().slice(0, 10);
  return markdown
    .replace(/^publishAt:\s*.*$/m, '')          // always strip publishAt (any value)
    .replace(/^date:\s*.+$/m, `date: ${today}`)
    .replace(/^author:\s*.+$/m, 'author: "David Miller"')
    .replace(/\n{3,}/g, '\n\n');
}

/** Returns true if src/data/articles/{slug}.md already exists in GitHub. */
async function articleExistsInGitHub(slug, pat) {
  const res = await ghFetch(
    `/repos/${GH_OWNER}/${GH_REPO}/contents/src/data/articles/${slug}.md`,
    { method: 'GET' },
    pat
  );
  return res.ok;
}

/** Returns true if public/images/{filename} exists in GitHub. */
async function imageExistsInGitHub(filename, pat) {
  if (!filename) return true; // no image required
  const res = await ghFetch(
    `/repos/${GH_OWNER}/${GH_REPO}/contents/public/images/${filename}`,
    { method: 'GET' },
    pat
  );
  return res.ok;
}

async function ensureRowNum(db) {
  try { await db.prepare(`ALTER TABLE articles_schedule ADD COLUMN row_num INTEGER DEFAULT 0`).run(); } catch(_) {}
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

  await ensureRowNum(env.DB);

  const body = await request.json().catch(() => ({}));
  const requestedSlug = body?.slug?.trim() || null;

  // Build candidate list
  let candidates;
  if (requestedSlug) {
    const row = await env.DB.prepare(
      `SELECT slug, title, markdown_content, image_filename
       FROM articles_schedule WHERE slug = ? AND status = 'PENDING'`
    ).bind(requestedSlug).first();
    if (!row) return Response.json({ error: 'Article not found or already published' }, { status: 404 });
    candidates = [row];
  } else {
    // Auto-pick: PENDING articles whose publish_at date has arrived (or has no date)
    const today = new Date().toISOString().slice(0, 10);
    const { results } = await env.DB.prepare(
      `SELECT slug, title, markdown_content, image_filename
       FROM articles_schedule
       WHERE status = 'PENDING'
         AND (publish_at IS NULL OR publish_at = '' OR publish_at <= ?)
       ORDER BY row_num ASC, created_at ASC`
    ).bind(today).all();
    candidates = results;
  }

  if (!candidates.length) {
    return Response.json({ ok: false, error: 'No pending articles found', skipped_duplicates: [] });
  }

  const skippedDuplicates = [];

  for (const row of candidates) {
    const { slug, title, markdown_content, image_filename } = row;

    // ── Duplicate check ───────────────────────────────────────────────────────
    const isDuplicate = await articleExistsInGitHub(slug, env.GH_PAT);
    if (isDuplicate) {
      // Mark as DUPLICATE in D1 (no duplicate_of column — just status)
      await env.DB.prepare(
        `UPDATE articles_schedule SET status = 'DUPLICATE' WHERE slug = ?`
      ).bind(slug).run().catch(() => null);
      skippedDuplicates.push(slug);

      if (requestedSlug) {
        return Response.json({
          ok: false,
          error: 'Article already live on site',
          slug,
          skipped_duplicates: skippedDuplicates,
        }, { status: 409 });
      }
      continue;
    }

    // ── Image check ───────────────────────────────────────────────────────────
    const hasImage = await imageExistsInGitHub(image_filename, env.GH_PAT);
    if (!hasImage) {
      if (requestedSlug) {
        return Response.json({ error: `Image not found in GitHub: ${image_filename}` }, { status: 400 });
      }
      continue; // no image yet — skip, try next
    }

    // ── Commit .md to GitHub ──────────────────────────────────────────────────
    const filePath  = `src/data/articles/${slug}.md`;
    const commitRes = await ghFetch(
      `/repos/${GH_OWNER}/${GH_REPO}/contents/${filePath}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          message: `feat: publish article ${slug}`,
          content: b64(cleanFrontmatter(markdown_content)),
          branch:  GH_BRANCH,
        }),
      },
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
      ? `All pending articles are already live on site (${skippedDuplicates.length} duplicates marked)`
      : 'No publishable articles — images may be missing from GitHub',
    skipped_duplicates: skippedDuplicates,
  });
}
