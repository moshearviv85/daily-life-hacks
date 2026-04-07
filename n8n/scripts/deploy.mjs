#!/usr/bin/env node
/**
 * Deploy DLH Lite Pinterest workflow to local n8n via REST API.
 * Requires: n8n/.env (copy from n8n/.env.example)
 *
 * Usage: node n8n/scripts/deploy.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ENV_PATH = join(ROOT, 'n8n', '.env');
const WORKFLOW_PATH = join(ROOT, 'n8n', 'DLH-Lite-Pinterest-Publish.json');

function loadEnv(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Copy n8n/.env.example to n8n/.env and fill keys.`);
  }
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function bearerToken(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  return /^Bearer\s+/i.test(t) ? t : `Bearer ${t}`;
}

async function api(env, method, path, body) {
  const url = `${env.N8N_BASE_URL.replace(/\/$/, '')}${path}`;
  const headers = {
    'X-N8N-API-KEY': env.N8N_API_KEY,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === 'object' && data?.message ? data.message : text;
    throw new Error(`${method} ${path} -> ${res.status}: ${msg}`);
  }
  return data;
}

async function listAllPaged(env, pathBase) {
  const out = [];
  let cursor = null;
  for (;;) {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=100` : '?limit=100';
    const page = await api(env, 'GET', `${pathBase}${q}`);
    const chunk = page?.data;
    if (Array.isArray(chunk)) out.push(...chunk);
    if (!page?.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out;
}

async function findCredentialByName(env, name) {
  const rows = await listAllPaged(env, '/api/v1/credentials');
  return rows.find((c) => c.name === name) || null;
}

async function findOrCreatePinterest(env) {
  const name = 'Pinterest API Token';
  const existing = await findCredentialByName(env, name);
  const data = {
    name: 'Authorization',
    value: bearerToken(env.PINTEREST_ACCESS_TOKEN),
  };
  if (existing?.id) {
    await api(env, 'PATCH', `/api/v1/credentials/${existing.id}`, {
      name,
      type: 'httpHeaderAuth',
      data,
    });
    return { id: existing.id, name };
  }
  const created = await api(env, 'POST', '/api/v1/credentials', {
    name,
    type: 'httpHeaderAuth',
    data,
  });
  return { id: created.id, name: created.name || name };
}

async function findOrCreateGoogle(env) {
  const saPath = env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim();
  if (saPath) {
    const abs = resolve(saPath);
    const raw = await readFile(abs, 'utf8');
    const j = JSON.parse(raw);
    const name = 'DLH Google Service Account';
    const existing = await findCredentialByName(env, name);
    const data = {
      region: 'us-central1',
      email: j.client_email,
      privateKey: j.private_key,
      inpersonate: false,
      delegatedEmail: '',
      httpNode: false,
      scopes: '',
    };
    if (existing?.id) {
      await api(env, 'PATCH', `/api/v1/credentials/${existing.id}`, {
        name,
        type: 'googleApi',
        data,
      });
      return { id: existing.id, name, kind: 'serviceAccount' };
    }
    const created = await api(env, 'POST', '/api/v1/credentials', {
      name,
      type: 'googleApi',
      data,
    });
    return { id: created.id, name: created.name || name, kind: 'serviceAccount' };
  }

  const oauthName = env.GOOGLE_OAUTH_CREDENTIAL_NAME || 'Google Sheets OAuth2';
  const c = await findCredentialByName(env, oauthName);
  if (!c?.id) {
    throw new Error(
      `Google OAuth credential "${oauthName}" not found. Create it in n8n (Google Sheets OAuth2) or set GOOGLE_SERVICE_ACCOUNT_FILE in .env.`,
    );
  }
  return { id: c.id, name: c.name, kind: 'oauth2' };
}

function patchWorkflowJson(wf, { spreadsheetId, sheetTab, sheetGid, pinterestCred, googleCred }) {
  const w = JSON.parse(JSON.stringify(wf));
  const doc = {
    __rl: true,
    value: spreadsheetId,
    mode: 'id',
  };
  /** Tab: either GOOGLE_SHEET_GID (numeric, from URL #gid=) as mode list, or GOOGLE_SHEET_TAB as mode name */
  const sheet =
    sheetGid != null && String(sheetGid).trim() !== ''
      ? { __rl: true, value: Number(sheetGid), mode: 'list' }
      : { __rl: true, value: sheetTab, mode: 'name' };

  for (const node of w.nodes) {
    if (node.type !== 'n8n-nodes-base.googleSheets') continue;

    if (!node.parameters) node.parameters = {};
    node.parameters.resource = 'sheet';
    if (node.name === 'Get Next Pending Row') {
      node.parameters.operation = 'read';
    } else if (node.name === 'Mark Row Result') {
      node.parameters.operation = 'update';
    }
    node.parameters.documentId = doc;
    node.parameters.sheetName = sheet;

    if (googleCred.kind === 'serviceAccount') {
      node.parameters.authentication = 'serviceAccount';
      node.credentials = {
        googleApi: { id: googleCred.id, name: googleCred.name },
      };
    } else {
      node.parameters.authentication = 'oAuth2';
      node.credentials = {
        googleSheetsOAuth2Api: { id: googleCred.id, name: googleCred.name },
      };
    }
  }

  if (pinterestCred) {
    for (const node of w.nodes) {
      if (node.name === 'Create Pinterest Pin' && node.credentials?.httpHeaderAuth) {
        node.credentials.httpHeaderAuth = { id: pinterestCred.id, name: pinterestCred.name };
      }
    }
  }

  return w;
}

async function deleteDuplicateWorkflows(env, name) {
  const all = await listAllPaged(env, '/api/v1/workflows');
  const matches = all.filter((w) => w.name === name);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].id;

  const sorted = matches.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const keep = sorted[0];
  for (const w of matches) {
    if (w.id !== keep.id) {
      await api(env, 'DELETE', `/api/v1/workflows/${w.id}`);
    }
  }
  return keep.id;
}

async function main() {
  const env = loadEnv(ENV_PATH);
  if (!env.N8N_API_KEY) throw new Error('N8N_API_KEY is required in n8n/.env');
  if (!env.N8N_BASE_URL) env.N8N_BASE_URL = 'http://127.0.0.1:5678';
  if (!env.GOOGLE_SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID is required');
  const hasGid = env.GOOGLE_SHEET_GID?.trim();
  const hasTab = env.GOOGLE_SHEET_TAB?.trim();
  if (!hasGid && !hasTab) {
    throw new Error('Set GOOGLE_SHEET_GID (from URL #gid=) or GOOGLE_SHEET_TAB (tab name)');
  }
  if (!env.PINTEREST_ACCESS_TOKEN) throw new Error('PINTEREST_ACCESS_TOKEN is required');

  const json = JSON.parse(await readFile(WORKFLOW_PATH, 'utf8'));
  const wfName = json.name;

  if (!env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim() && !env.GOOGLE_OAUTH_CREDENTIAL_NAME) {
    env.GOOGLE_OAUTH_CREDENTIAL_NAME = 'Google Sheets OAuth2';
  }

  const pinterestCred = await findOrCreatePinterest(env);
  const googleCred = await findOrCreateGoogle(env);

  const patched = patchWorkflowJson(json, {
    spreadsheetId: env.GOOGLE_SPREADSHEET_ID.trim(),
    sheetTab: hasTab ? env.GOOGLE_SHEET_TAB.trim() : null,
    sheetGid: hasGid ? env.GOOGLE_SHEET_GID.trim() : null,
    pinterestCred,
    googleCred,
  });

  const existingId = await deleteDuplicateWorkflows(env, wfName);

  if (existingId) {
    const current = await api(env, 'GET', `/api/v1/workflows/${existingId}`);
    const payload = {
      ...current,
      name: patched.name,
      nodes: patched.nodes,
      connections: patched.connections,
      settings: patched.settings || current.settings || {},
    };
    delete payload.pinData;
    await api(env, 'PUT', `/api/v1/workflows/${existingId}`, payload);
    console.log(`Updated workflow "${wfName}" (${existingId}).`);
  } else {
    const created = await api(env, 'POST', '/api/v1/workflows', {
      name: patched.name,
      nodes: patched.nodes,
      connections: patched.connections,
      settings: patched.settings || {},
    });
    console.log(`Created workflow "${wfName}" (${created.id}).`);
  }

  console.log('Done. Open n8n and run "DLH Lite - Pinterest Publish" manually (Manual Trigger).');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
