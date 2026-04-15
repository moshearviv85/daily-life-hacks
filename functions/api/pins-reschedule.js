/**
 * POST /api/pins-reschedule?key=SECRET
 * Re-schedules all PENDING pins in D1 using the 2-hour window logic.
 * Preserves current interleave order (sorted by scheduled_date, scheduled_time).
 * Starts scheduling from today UTC.
 *
 * Response: { ok, rescheduled }
 */

const START_HOUR = 6;
const WINDOW_H   = 2; // 2-hour windows

function rescheduleRows(rows) {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const result = [];
  let idx = 0;
  let dayOffset = 0;

  while (idx < rows.length) {
    const pinsToday = 6 + Math.floor(Math.random() * 3); // 6, 7, or 8
    for (let slot = 0; slot < pinsToday && idx < rows.length; slot++, idx++) {
      const d = new Date(todayUTC);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      const windowStartMin  = (START_HOUR + slot * WINDOW_H) * 60;
      const randomOffsetMin = Math.floor(Math.random() * WINDOW_H * 60); // 0–119
      const totalMin = windowStartMin + randomOffsetMin;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      d.setUTCHours(h, m, 0, 0);
      result.push({
        row_id:         rows[idx].row_id,
        scheduled_date: d.toISOString().split("T")[0],
        scheduled_time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
      });
    }
    dayOffset++;
  }
  return result;
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

  // Fetch all PENDING pins in current order
  const { results } = await db.prepare(`
    SELECT row_id FROM pins_schedule
    WHERE status = 'PENDING'
    ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC, row_id ASC
  `).all();

  if (!results.length) {
    return new Response(JSON.stringify({ ok: true, rescheduled: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const rescheduled = rescheduleRows(results);

  // Update in batches of 20
  for (const row of rescheduled) {
    await db.prepare(`
      UPDATE pins_schedule
      SET scheduled_date = ?, scheduled_time = ?, updated_at = datetime('now')
      WHERE row_id = ?
    `).bind(row.scheduled_date, row.scheduled_time, row.row_id).run();
  }

  return new Response(JSON.stringify({ ok: true, rescheduled: rescheduled.length }), {
    headers: { "Content-Type": "application/json" },
  });
}
