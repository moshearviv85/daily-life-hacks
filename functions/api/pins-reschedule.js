/**
 * POST /api/pins-reschedule?key=SECRET
 * Shuffles the scheduled_time of all PENDING pins — keeps their scheduled_date intact.
 * Pins on the same day are spread across 2-hour windows in US active hours (13:00–01:00 UTC).
 * Use this to randomize posting times without changing the overall date schedule.
 *
 * Response: { ok, rescheduled }
 */

// 13:00 UTC = 9am ET (EDT/summer). Covers 9am–1am ET — US active hours.
const START_HOUR = 13;
const WINDOW_H   = 2; // 2-hour windows

/** Assign random times to an array of row_ids for a single day, keeping the date fixed. */
function assignTimesForDay(rowIds, date) {
  // Shuffle slot order so different pins get different windows each time
  const slots = rowIds.map((_, i) => i).sort(() => Math.random() - 0.5);
  return rowIds.map((row_id, i) => {
    const slot = slots[i];
    const windowStartMin  = (START_HOUR + slot * WINDOW_H) * 60;
    const randomOffsetMin = Math.floor(Math.random() * WINDOW_H * 60); // 0–119
    const totalMin = windowStartMin + randomOffsetMin;
    const h = Math.floor(totalMin / 60) % 24; // stay within 00–23
    const m = totalMin % 60;
    return {
      row_id,
      scheduled_date: date,
      scheduled_time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
    };
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.STATS_KEY;

  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  if (key && reqKey !== key) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: "D1 not bound" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch all PENDING pins with their current scheduled_date
  const { results } = await db.prepare(`
    SELECT row_id, scheduled_date FROM pins_schedule
    WHERE status = 'PENDING'
    ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC, row_id ASC
  `).all();

  if (!results.length) {
    return new Response(JSON.stringify({ ok: true, rescheduled: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Group by date — keeps dates intact, only times change
  const byDate = {};
  for (const row of results) {
    const d = row.scheduled_date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(row.row_id);
  }

  const toUpdate = [];
  for (const [date, rowIds] of Object.entries(byDate)) {
    toUpdate.push(...assignTimesForDay(rowIds, date));
  }

  for (const row of toUpdate) {
    await db.prepare(`
      UPDATE pins_schedule
      SET scheduled_time = ?, updated_at = datetime('now')
      WHERE row_id = ?
    `).bind(row.scheduled_time, row.row_id).run();
  }

  return new Response(JSON.stringify({ ok: true, rescheduled: toUpdate.length }), {
    headers: { "Content-Type": "application/json" },
  });
}
