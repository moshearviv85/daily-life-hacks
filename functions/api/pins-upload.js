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
  const isAgentFormat  = headers.includes("slug") && headers.includes("variant") && !headers.includes("row_id");
  const isPublerFormat = headers.includes("Title - For the video, pin, PDF ..") ||
                         headers.includes("Media URL(s) - Separated by comma");

  // Validate required columns (skip for Publer/Agent formats — they map differently)
  if (!isAgentFormat && !isPublerFormat) {
    const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
    if (missing.length) {
      return json({ error: `Missing required columns: ${missing.join(", ")}` }, 400);
    }
  }

  if (rows.length === 0) return json({ error: "CSV has no data rows" }, 400);

  // Normalize Publer format → native format
  function normalizePublerRow(r) {
    const imageUrl = (r["Media URL(s) - Separated by comma"] || "").split(",")[0].trim();
    const link     = (r["Link(s) - Separated by comma for FB carousels"] || "").split(",")[0].trim();
    const board    = (r["Pin board, FB album, or Google category"] || "").trim();
    const dateRaw  = (r["Date - Intl. format or prompt"] || "").trim();
    // Extract row_id from image URL: .../pins/slug_v1.jpg → slug_v1
    const imgMatch = imageUrl.match(/\/pins\/(.+?)\.jpg$/i);
    const rowId    = imgMatch ? imgMatch[1] : `pin_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    return {
      row_id:             rowId,
      pin_title:          r["Title - For the video, pin, PDF .."] || "",
      pin_description:    r["Text"] || "",
      alt_text:           (r["Alt text(s) - Separated by ||"] || "").split("||")[0].trim(),
      image_url:          imageUrl,
      board_id:           BOARD_IDS[board] || board,
      link:               link,
      scheduled_date:     dateRaw.split(" ")[0], // "2026-04-09 08:15" → "2026-04-09"
      status:             "PENDING",
      pin_id:             "",
      published_date:     "",
      pinterest_response: "",
    };
  }

  // Normalize Agent 6 format → native format
  function normalizeRow(r) {
    if (isPublerFormat) return normalizePublerRow(r);
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
  let normalizedRows = rows.map(normalizeRow);
  const noId = normalizedRows.filter(r => !r.row_id);
  if (noId.length) return json({ error: `${noId.length} row(s) missing row_id` }, 400);

  // Shuffle: interleave pins from different articles so same-article pins are spread out
  // Then reassign scheduled_date: 8 pins/day, 3 hours apart, starting today UTC
  function shuffleAndReschedule(rows) {
    // Group by base slug (strip _v1, _v2 suffix)
    const groups = {};
    for (const row of rows) {
      const base = row.row_id.replace(/_v\d+$/, "");
      if (!groups[base]) groups[base] = [];
      groups[base].push(row);
    }
    // Sort within each group by variant number
    for (const base in groups) {
      groups[base].sort((a, b) => {
        const va = parseInt(a.row_id.match(/_v(\d+)$/)?.[1] ?? 0);
        const vb = parseInt(b.row_id.match(/_v(\d+)$/)?.[1] ?? 0);
        return va - vb;
      });
    }
    // Round-robin interleave across all slugs
    const slugs = Object.keys(groups).sort();
    const interleaved = [];
    const maxLen = Math.max(...slugs.map(s => groups[s].length));
    for (let i = 0; i < maxLen; i++) {
      for (const slug of slugs) {
        if (groups[slug][i]) interleaved.push(groups[slug][i]);
      }
    }
    // Reassign dates: start today, 6–8 pins/day (random), ~3h apart from 06:00 UTC
    // Each slot gets ±30 min random jitter to feel human
    const START_HOUR = 6;
    const INTERVAL_H = 3;
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const scheduled = [];
    let idx = 0;
    let dayOffset = 0;
    while (idx < interleaved.length) {
      // Pick a random number of pins for this day: 6, 7, or 8
      const pinsToday = 6 + Math.floor(Math.random() * 3); // 6, 7, or 8
      for (let slot = 0; slot < pinsToday && idx < interleaved.length; slot++, idx++) {
        const d = new Date(todayUTC);
        d.setUTCDate(d.getUTCDate() + dayOffset);
        // Base time: START_HOUR + slot * INTERVAL_H
        // Jitter: random offset between -30 and +30 minutes
        const jitterMin = Math.floor(Math.random() * 61) - 30; // -30..+30
        const totalMin  = (START_HOUR + slot * INTERVAL_H) * 60 + jitterMin;
        const h = Math.floor(totalMin / 60) % 24;
        const m = ((totalMin % 60) + 60) % 60;
        d.setUTCHours(h, m, 0, 0);
        const scheduled_time = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
        scheduled.push({ ...interleaved[idx], scheduled_date: d.toISOString().split("T")[0], scheduled_time });
      }
      dayOffset++;
    }
    return scheduled;
  }

  normalizedRows = shuffleAndReschedule(normalizedRows);

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
          scheduled_date = ?, scheduled_time = ?, status = ?,
          updated_at = datetime('now')
        WHERE row_id = ?
      `).bind(
        row.pin_title, row.pin_description || "", row.alt_text || "",
        row.image_url, row.board_id, row.link,
        row.scheduled_date, row.scheduled_time || null, row.status || "PENDING",
        row.row_id
      ).run();
      updated++;
    } else {
      await db.prepare(`
        INSERT INTO pins_schedule
          (row_id, pin_title, pin_description, alt_text, image_url, board_id,
           link, scheduled_date, scheduled_time, status, pin_id, published_date, pinterest_response)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        row.row_id,
        row.pin_title,
        row.pin_description || "",
        row.alt_text || "",
        row.image_url,
        row.board_id,
        row.link,
        row.scheduled_date,
        row.scheduled_time || null,
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
