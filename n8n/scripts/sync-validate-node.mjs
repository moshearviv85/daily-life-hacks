/**
 * One-off: push only "Validate and Build Payload" jsCode from repo JSON into live n8n.
 * Needs: n8n/.env with N8N_API_KEY (+ optional N8N_BASE_URL)
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ENV_PATH = join(ROOT, 'n8n', '.env');
const WF_FILE = join(ROOT, 'n8n', 'DLH-Lite-Pinterest-Publish.json');
const WF_NAME = 'DLH Lite - Pinterest Publish';

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const o = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    o[m[1]] = v;
  }
  return o;
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const base = (env.N8N_BASE_URL || 'http://127.0.0.1:5678').replace(/\/$/, '');
  const key = env.N8N_API_KEY;
  if (!key) {
    console.error('Missing N8N_API_KEY in n8n/.env');
    process.exit(1);
  }

  const headers = {
    'X-N8N-API-KEY': key,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const all = [];
  let cursor = null;
  for (;;) {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=100` : '?limit=100';
    const r = await fetch(`${base}/api/v1/workflows${q}`, {
      headers: { 'X-N8N-API-KEY': key, Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`List workflows ${r.status}`);
    const page = await r.json();
    all.push(...(page.data || []));
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  const matches = all.filter((w) => w.name === WF_NAME);
  if (!matches.length) throw new Error(`No workflow named "${WF_NAME}"`);
  const id = matches.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0].id;

  const gr = await fetch(`${base}/api/v1/workflows/${id}`, {
    headers: { 'X-N8N-API-KEY': key, Accept: 'application/json' },
  });
  if (!gr.ok) throw new Error(`Get workflow ${gr.status}`);
  const current = await gr.json();

  const fileWf = JSON.parse(readFileSync(WF_FILE, 'utf8'));
  const srcNode = fileWf.nodes.find((n) => n.name === 'Validate and Build Payload');
  const idx = current.nodes.findIndex((n) => n.name === 'Validate and Build Payload');
  if (!srcNode || idx < 0) throw new Error('Validate and Build Payload node not found');

  current.nodes[idx] = {
    ...current.nodes[idx],
    parameters: {
      ...current.nodes[idx].parameters,
      jsCode: srcNode.parameters.jsCode,
    },
  };

  const payload = {
    name: current.name,
    nodes: current.nodes,
    connections: current.connections,
    settings: current.settings || {},
    staticData: current.staticData ?? null,
  };

  const pr = await fetch(`${base}/api/v1/workflows/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!pr.ok) {
    const t = await pr.text();
    throw new Error(`PUT ${pr.status}: ${t.slice(0, 400)}`);
  }

  console.log(`Updated "${WF_NAME}" (${id}) — Validate and Build Payload jsCode synced from repo.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
