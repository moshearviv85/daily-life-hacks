/**
 * POST /api/articles-upload?key=STATS_KEY
 * Accepts a CSV (production-sheet.csv) as text body.
 * Parses rows and upserts into articles_schedule D1 table.
 *
 * Row ordering: uses the "row" column from CSV (or insertion index) to preserve
 * original CSV order — articles-due.js sorts by row_num ASC.
 *
 * On re-upload: updates content/image only, never resets status or row_num.
 */

function parseCSV(text) {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let pos = 0;
  const len = text.length;

  while (pos < len) {
    const row = [];
    do {
      let field;
      if (pos < len && text[pos] === '"') {
        pos++;
        field = '';
        while (pos < len) {
          if (text[pos] === '"') {
            if (pos + 1 < len && text[pos + 1] === '"') {
              field += '"'; pos += 2;
            } else {
              pos++; break;
            }
          } else {
            field += text[pos++];
          }
        }
      } else {
        field = '';
        while (pos < len && text[pos] !== ',' && text[pos] !== '\n') {
          field += text[pos++];
        }
      }
      row.push(field);
      if (pos < len && text[pos] === ',') { pos++; } else { break; }
    } while (true);

    if (pos < len && text[pos] === '\n') pos++;
    if (row.some(f => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const statsKey = env.STATS_KEY;
  const reqKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
  if (statsKey && reqKey !== statsKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: 'DB not bound' }, { status: 500 });

  // Ensure table + columns exist (safe to run on every request)
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS articles_schedule (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        markdown_content TEXT NOT NULL,
        image_filename TEXT,
        publish_at TEXT,
        row_num INTEGER DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        published_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    // Migrate older tables that don't have row_num yet
    // (ALTER TABLE fails silently if column already exists — that's expected)
    try { await env.DB.prepare(`ALTER TABLE articles_schedule ADD COLUMN row_num INTEGER DEFAULT 0`).run(); } catch(_) {}
    try { await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_artsch_status  ON articles_schedule(status)`).run(); } catch(_) {}
    try { await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_artsch_row_num ON articles_schedule(row_num)`).run(); } catch(_) {}
  } catch (e) {
    return Response.json({ error: 'DB setup failed: ' + e.message }, { status: 500 });
  }

  const text = await request.text().catch(() => '');
  if (!text) return Response.json({ error: 'Empty body' }, { status: 400 });

  const rows = parseCSV(text);
  if (rows.length < 2) return Response.json({ error: 'CSV has no data rows' }, { status: 400 });

  const headers = rows[0].map(h => h.trim());
  const col = name => headers.indexOf(name);

  const iRow      = col('row');
  const iSlug     = col('slug');
  const iTitle    = col('title');
  const iCat      = col('category');
  const iMarkdown = col('article_markdown');
  const iImage    = col('image_main_filename');
  const iPublish  = col('publishAt');

  if ([iSlug, iTitle, iMarkdown].some(i => i === -1)) {
    return Response.json({ error: 'Missing required columns: slug, title, article_markdown' }, { status: 400 });
  }

  let inserted = 0, updated = 0, skipped = 0;
  const errors = [];
  const now = new Date().toISOString();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const slug     = row[iSlug]?.trim();
    const title    = row[iTitle]?.trim();
    const markdown = row[iMarkdown]?.trim();
    if (!slug || !title || !markdown) { skipped++; continue; }

    const category  = iCat     >= 0 ? (row[iCat]?.trim()     || '') : '';
    const imagefile = iImage   >= 0 ? (row[iImage]?.trim()    || '') : '';
    const publishAt = iPublish >= 0 ? (row[iPublish]?.trim()  || '') : '';
    // Preserve original CSV row order: use "row" column if present, else loop index
    const rowNum    = iRow     >= 0 ? (parseInt(row[iRow]) || r) : r;

    try {
      // Check if row already exists
      const existing = await env.DB.prepare(
        `SELECT slug, status FROM articles_schedule WHERE slug = ?`
      ).bind(slug).first();

      if (existing) {
        // Re-upload: update content + image, but NEVER reset status or row_num
        await env.DB.prepare(
          `UPDATE articles_schedule
           SET title=?, category=?, markdown_content=?, image_filename=?, publish_at=?
           WHERE slug=?`
        ).bind(title, category, markdown, imagefile, publishAt, slug).run();
        updated++;
      } else {
        // New row: insert with PENDING status
        await env.DB.prepare(
          `INSERT INTO articles_schedule
             (slug, title, category, markdown_content, image_filename, publish_at, row_num, status, created_at)
           VALUES (?,?,?,?,?,?,?,'PENDING',?)`
        ).bind(slug, title, category, markdown, imagefile, publishAt, rowNum, now).run();
        inserted++;
      }
    } catch (e) {
      errors.push(`${slug}: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    return Response.json({
      ok: false,
      error: `${errors.length} row(s) failed`,
      details: errors.slice(0, 5),
      inserted,
      updated,
      skipped,
    }, { status: 500 });
  }

  return Response.json({ ok: true, inserted, updated, skipped });
}
