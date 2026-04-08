/**
 * POST /api/pins-upload
 * Accepts a CSV file (multipart or raw text) and upserts all rows into D1 pins_schedule table.
 * Protected by STATS_KEY.
 *
 * Supports two CSV formats:
 *
 * Format A (native — preferred):
 *   row_id, pin_title, pin_description, alt_text, image_url, board_id,
 *   link, scheduled_date, status, pin_id, published_date, pinterest_response
 *
 * Format B (Agent 6 output — auto-detected and normalized):
 *   slug, variant, pin_title, description, alt_text, image_url,
 *   destination_url, board, scheduled_date, scheduled_time_utc, status
 */

// Board name → ID mapping (includes aliases from Agent 6)
const BOARD_IDS = {
  // Canonical names
  "High Fiber Dinner and Gut Health Recipes": "1124140825679184032",
  "Healthy Breakfast, Smoothies and Snacks":  "1124140825679184036",
  "Gut Health Tips and Nutrition Charts":     "1124140825679184034",
  // Agent 6 aliases
  "High Fiber Recipes":                       "1124140825679184032",
  "Gut Health & Nutrition Tips":              "1124140825679184034",
  "Healthy Meal Prep & Kitchen Tips":         "1124140825679184036",
  "Gut Health and Nutrition Tips":            "1124140825679184034",
  "Healthy Breakfast Smoothies and Snacks":   "1124140825679184036",
};

const REQUIRED_COLS = ["pin_title", "image_url", "scheduled_date"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Minimal CSV parser — handles quoted fields containing commas/newlines */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = splitCSVLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = splitCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (vals[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

function splitCSVLine(line) {
  const vals = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      vals.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  vals.push(cur);
  return vals;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.STATS_KEY;

  // Auth
  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") ||
    request.headers.get("x-api-key") || "";
  if (key && reqKey !== key) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Parse body — supports multipart/form-data (file upload) or text/plain / text/csv
  let csvText = "";
  const ct = request.headers.get("Content-Type") || "";

  if (ct.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") || formData.get("csv");
    if (!file) return json({ error: "No file field in form data (expected 'file' or 'csv')" }, 400);
    csvText = typeof file === "string" ? file : await file.text();
  } else {
    csvText = await request.text();
  }

  if (!csvText.trim()) return json({ error: "Empty CSV" }, 400);

  const { headers, rows } = parseCSV(csvText);

  // Detect format
  const isAgentFormat = headers.includes("slug") && headers.includes("variant") && !headers.includes("row_id");

  // Validate required columns
  const missing = REQUIRED_COLS.filter(c => !headers.includes(c) && !(isAgentFormat && c === "image_url"));
  if (missing.length) {
    return json({ error: `Missing required columns: ${missing.join(", ")}` }, 400);
  }

  if (rows.length === 0) return json({ error: "CSV has no data rows" }, 400);

  // Normalize Agent 6 format → native format
  function normalizeRow(r) {
    if (!isAgentFormat) return r;
    const slug    = r.slug || "";
    const variant = r.variant || "1";
    const board   = (r.board || "").trim();
    return {
      row_id:             `${slug}_v${variant}`,
      pin_title:          r.pin_title || "",
      pin_description:    r.description || "",
      alt_text:           r.alt_text || "",
      image_url:          r.image_url || `https://www.daily-life-hacks.com/images/pins/${slug}_v${variant}.jpg`,
      board_id:           BOARD_IDS[board] || board,
      link:               r.destination_url || `https://www.daily-life-hacks.com/${slug}`,
      scheduled_date:     r.scheduled_date || "",
      status:             r.status || "PENDING",
      pin_id:             "",
      published_date:     "",
      pinterest_response: "",
    };
  }

  // Validate all rows have row_id (after normalization)
  const normalizedRows = rows.map(normalizeRow);
  const noId = normalizedRows.filter(r => !r.row_id);
  if (noId.length) return json({ error: `${noId.length} row(s) missing row_id` }, 400);

  // Upsert into D1 in batches of 10
  const db = env.DB;
  if (!db) return json({ error: "D1 database not bound" }, 500);

  let inserted = 0, updated = 0;

  for (const row of normalizedRows) {
    // Check if exists
    const existing = await db.prepare(
      "SELECT row_id, status FROM pins_schedule WHERE row_id = ?"
    ).bind(row.row_id).first();

    if (existing) {
      // Only update non-posted rows (don't overwrite POSTED status/pin_id)
      if (existing.status === "POSTED") {
        updated++; // count as "seen" but skip update
        continue;
      }
      await db.prepare(`
        UPDATE pins_schedule SET
          pin_title = ?, pin_description = ?, alt_text = ?,
          image_url = ?, board_id = ?, link = ?,
          scheduled_date = ?, status = ?,
          updated_at = datetime('now')
        WHERE row_id = ?
      `).bind(
        row.pin_title, row.pin_description || "", row.alt_text || "",
        row.image_url, row.board_id, row.link,
        row.scheduled_date, row.status || "PENDING",
        row.row_id
      ).run();
      updated++;
    } else {
      await db.prepare(`
        INSERT INTO pins_schedule
          (row_id, pin_title, pin_description, alt_text, image_url, board_id,
           link, scheduled_date, status, pin_id, published_date, pinterest_response)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        row.row_id,
        row.pin_title,
        row.pin_description || "",
        row.alt_text || "",
        row.image_url,
        row.board_id,
        row.link,
        row.scheduled_date,
        row.status || "PENDING",
        row.pin_id || null,
        row.published_date || null,
        row.pinterest_response || null,
      ).run();
      inserted++;
    }
  }

  // Trigger GitHub Actions workflow immediately if new pins were inserted
  let triggered = false;
  if (inserted > 0 && env.GH_PAT) {
    try {
      const ghRes = await fetch(
        "https://api.github.com/repos/moshearviv85/daily-life-hacks/actions/workflows/post-pins.yml/dispatches",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GH_PAT}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "main" }),
        }
      );
      triggered = ghRes.ok;
    } catch (_) {}
  }

  return json({
    ok: true,
    total: rows.length,
    inserted,
    updated,
    skipped_posted: rows.length - inserted - updated,
    triggered,
  });
}
