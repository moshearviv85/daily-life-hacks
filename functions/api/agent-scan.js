/**
 * Agent scan log endpoint.
 * POST /api/agent-scan?key=DASHBOARD_PASSWORD
 * Body JSON: { scan_type, notes, issues_found, issues_fixed, details }
 *
 * Called automatically by the inspection agent after each scan run.
 * The agent writes a summary here so the /dashboard shows the last scan time.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.DASHBOARD_PASSWORD || key !== env.DASHBOARD_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB not bound" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    scan_type = "general",
    notes = "",
    issues_found = 0,
    issues_fixed = 0,
    details = "",
  } = body;

  try {
    await env.DB.prepare(
      `INSERT INTO agent_scans (scan_type, notes, issues_found, issues_fixed, details)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(scan_type, notes, Number(issues_found), Number(issues_fixed), typeof details === "string" ? details : JSON.stringify(details))
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
