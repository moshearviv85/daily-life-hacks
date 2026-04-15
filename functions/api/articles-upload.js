/**
 * POST /api/articles-upload?key=STATS_KEY
 * Accepts a CSV (production-sheet.csv) as text body.
 * Parses rows and upserts into articles_schedule D1 table.
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
        pos++; // skip opening "
        field = '';
        while (pos < len) {
          if (text[pos] === '"') {
            if (pos + 1 < len && text[pos + 1] === '"') {
              field += '"'; pos += 2;
            } else {
              pos++; break; // closing "
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

  const text = await request.text().catch(() => '');
  if (!text) return Response.json({ error: 'Empty body' }, { status: 400 });

  const rows = parseCSV(text);
  if (rows.length < 2) return Response.json({ error: 'CSV has no data rows' }, { status: 400 });

  const headers = rows[0].map(h => h.trim());
  const col = name => headers.indexOf(name);

  const iSlug     = col('slug');
  const iTitle    = col('title');
  const iCat      = col('category');
  const iMarkdown = col('article_markdown');
  const iImage    = col('image_main_filename');
  const iPublish  = col('publishAt');

  if ([iSlug, iTitle, iMarkdown].some(i => i === -1)) {
    return Response.json({ error: 'Missing required columns: slug, title, article_markdown' }, { status: 400 });
  }

  let inserted = 0, skipped = 0;
  const now = new Date().toISOString();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const slug     = row[iSlug]?.trim();
    const title    = row[iTitle]?.trim();
    const markdown = row[iMarkdown]?.trim();
    if (!slug || !title || !markdown) { skipped++; continue; }

    const category   = iCat    >= 0 ? (row[iCat]?.trim()   || '') : '';
    const imagefile  = iImage  >= 0 ? (row[iImage]?.trim()  || '') : '';
    const publishAt  = iPublish >= 0 ? (row[iPublish]?.trim() || '') : '';

    await env.DB.prepare(
      `INSERT INTO articles_schedule (slug, title, category, markdown_content, image_filename, publish_at, status, created_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(slug) DO UPDATE SET
         title=excluded.title, category=excluded.category,
         markdown_content=excluded.markdown_content,
         image_filename=excluded.image_filename,
         publish_at=excluded.publish_at,
         created_at=excluded.created_at`
    ).bind(slug, title, category, markdown, imagefile, publishAt, 'PENDING', now)
     .run().catch(() => null);
    inserted++;
  }

  return Response.json({ ok: true, inserted, skipped });
}
