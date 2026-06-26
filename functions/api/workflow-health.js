/**
 * GET /api/workflow-health?key=DASHBOARD_PASSWORD
 *
 * Read-only GitHub Actions health summary for the dashboard.
 */

import { isDashboardAuthorized } from "./_dashboard-auth.js";

const REPO = "moshearviv85/daily-life-hacks";
const GITHUB_API = `https://api.github.com/repos/${REPO}`;

const WORKFLOWS = [
  {
    key: "deploy",
    name: "Deploy Cloudflare Pages",
    workflow: "deploy-cloudflare-pages.yml",
    mode: "automatic",
    trigger: "push to main/staging + daily 06:15 UTC",
    effect: "Builds and deploys the site to Cloudflare Pages.",
  },
  {
    key: "post-pins",
    name: "Pinterest Auto-Poster",
    workflow: "post-pins.yml",
    mode: "automatic",
    trigger: "every 30 minutes",
    effect: "Posts up to one due production pin per run.",
  },
  {
    key: "analytics",
    name: "Pinterest Analytics Fetcher",
    workflow: "fetch-analytics.yml",
    mode: "automatic",
    trigger: "every 6 hours",
    effect: "Refreshes Pinterest analytics data.",
  },
  {
    key: "publisher",
    name: "Daily Article Publisher",
    workflow: "publish-articles.yml",
    mode: "automatic",
    trigger: "daily 07:00 UTC",
    effect: "Publishes due production articles.",
  },
  {
    key: "discover",
    name: "Pipeline Discover",
    workflow: "pipeline-discover.yml",
    mode: "automatic",
    trigger: "Mondays 06:00 UTC + manual",
    effect: "Adds filtered topic candidates to staging D1.",
  },
  {
    key: "produce",
    name: "Pipeline Produce",
    workflow: "pipeline-produce.yml",
    mode: "manual",
    trigger: "dashboard/manual only",
    effect: "Generates one staging article package.",
  },
  {
    key: "assets",
    name: "Pipeline Article Assets",
    workflow: "pipeline-article-assets.yml",
    mode: "manual",
    trigger: "dashboard/manual only",
    effect: "Generates or regenerates staging article images and pins.",
  },
  {
    key: "queue-pins",
    name: "Queue Pipeline Pins",
    workflow: "queue-pipeline-pins.yml",
    mode: "manual",
    trigger: "dashboard/manual only",
    effect: "Queues selected approved pins for production publishing.",
  },
  {
    key: "promote",
    name: "Promote Staging to Production",
    workflow: "promote-staging.yml",
    mode: "manual",
    trigger: "explicit manual confirmation only",
    effect: "Promotes reviewed staging content to production.",
  },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GH_PAT}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "daily-life-hacks-dashboard",
  };
}

async function githubJson(env, path) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: ghHeaders(env) });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 1000) };
  }
  if (!res.ok) {
    throw new Error(data?.message || text || `GitHub API returned ${res.status}`);
  }
  return data;
}

function normalizeRun(run) {
  if (!run) return null;
  return {
    id: run.id,
    run_number: run.run_number,
    status: run.status,
    conclusion: run.conclusion,
    event: run.event,
    branch: run.head_branch,
    sha: String(run.head_sha || "").slice(0, 7),
    title: run.display_title || run.name || "",
    url: run.html_url,
    created_at: run.created_at,
    updated_at: run.updated_at,
    started_at: run.run_started_at,
  };
}

export function isProblemRun(run) {
  if (!run || run.status !== "completed") return false;
  return run.conclusion && !["success", "skipped"].includes(run.conclusion);
}

export function isRecentRun(run, hours = 24) {
  const stamp = run?.created_at || run?.updated_at;
  if (!stamp) return false;
  return Date.now() - new Date(stamp).getTime() <= hours * 60 * 60 * 1000;
}

export function classify(meta, latest, recentProblem) {
  if (!latest) return "unknown";
  if (latest.status !== "completed") return "running";
  if (["failure", "timed_out", "action_required", "startup_failure"].includes(latest.conclusion)) {
    return "danger";
  }
  if (latest.conclusion === "cancelled") {
    return meta.mode === "automatic" ? "warn" : "unknown";
  }
  if (recentProblem && meta.mode === "automatic") return "warn";
  if (latest.conclusion === "success" || latest.conclusion === "skipped") return "ok";
  return "unknown";
}

export function findRecentProblemRun(runs, latest, hours = 24) {
  const latestTime = latest ? new Date(latest.created_at || latest.updated_at || 0).getTime() : 0;
  return runs.find((run) => {
    if (!isProblemRun(run) || !isRecentRun(run, hours)) return false;
    const runTime = new Date(run.created_at || run.updated_at || 0).getTime();
    return !latestTime || runTime >= latestTime;
  }) || null;
}

async function getProblemDetail(env, runId) {
  if (!runId) return null;
  try {
    const data = await githubJson(env, `/actions/runs/${runId}/jobs?per_page=20`);
    const job = (data.jobs || []).find((item) => item.conclusion && item.conclusion !== "success");
    if (!job) return null;
    const step = (job.steps || []).find((item) => item.conclusion && item.conclusion !== "success");
    return {
      job: job.name,
      conclusion: job.conclusion,
      step: step?.name || "",
    };
  } catch (err) {
    return { error: String(err).slice(0, 240) };
  }
}

async function loadWorkflow(env, meta) {
  const data = await githubJson(
    env,
    `/actions/workflows/${encodeURIComponent(meta.workflow)}/runs?per_page=6&exclude_pull_requests=true`
  );
  const runs = (data.workflow_runs || []).map(normalizeRun);
  const latest = runs[0] || null;
  const recentProblem = findRecentProblemRun(runs, latest, 24);
  const status = classify(meta, latest, recentProblem);
  const detailRun = status === "danger" ? latest : recentProblem;
  const detail = detailRun ? await getProblemDetail(env, detailRun.id) : null;

  return {
    ...meta,
    status,
    latest,
    recent_problem: recentProblem,
    problem_detail: detail,
    actions_url: `https://github.com/${REPO}/actions/workflows/${meta.workflow}`,
  };
}

function summarizeOverall(workflows) {
  const automatic = workflows.filter((item) => item.mode === "automatic");
  if (automatic.some((item) => item.status === "danger")) {
    return { status: "danger", label: "Automatic workflow failing" };
  }
  if (automatic.some((item) => ["warn", "running", "unknown"].includes(item.status))) {
    return { status: "warn", label: "Needs attention" };
  }
  return { status: "ok", label: "Automation healthy" };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!(await isDashboardAuthorized(env, key, request))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.GH_PAT) {
    return json({ error: "GH_PAT not configured" }, 500);
  }

  try {
    const workflows = await Promise.all(WORKFLOWS.map((workflow) => loadWorkflow(env, workflow)));
    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      overall: summarizeOverall(workflows),
      workflows,
    });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 502);
  }
}
