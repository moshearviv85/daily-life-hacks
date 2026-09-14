import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { trafficSource, startPageTracking } from '../src/lib/browser-traffic.js';
import { onRequest } from '../functions/[[path]].js';
import { onRequestPost as eventPost } from '../functions/api/event.js';
import { onRequestPost as savePins } from '../functions/api/pinterest-analytics-save.js';
import { onRequestGet as readPins } from '../functions/api/pinterest-analytics.js';
import { discardAmounts, proteinPortion } from '../src/lib/kitchen-math.js';

const site = 'https://www.daily-life-hacks.com';
test('automatic newsletter overlays are suppressed on recipes and calculators', () => {
  const source = readFileSync(new URL('../src/components/NewsletterPopup.astro', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('function shouldSuppressPopup()'), source.indexOf('function showPopup()'));
  for (const present of [true, false]) {
    const result = vm.runInNewContext(`${fn}; shouldSuppressPopup()`, {
      document: { querySelector: () => present ? {} : null },
      isSubscribed: () => false, isDismissedRecently: () => false,
      window: { location: { pathname: '/example/' } }, sessionStorage: { getItem: () => null },
    });
    assert.equal(result, present);
  }
});
test('campaigns, AI and search sources stay distinct and domain suffixes are bounded', () => {
  assert.equal(trafficSource(site + '/?utm_source=pinterest'), 'pinterest');
  assert.equal(trafficSource(site, 'https://chatgpt.com/'), 'ai:chatgpt.com');
  assert.equal(trafficSource(site, 'https://www.google.com/search?q=food'), 'search:google.com');
  assert.equal(trafficSource(site, 'https://notchatgpt.com'), 'referral:notchatgpt.com');
  assert.equal(trafficSource(site, 'https://www.pinterest.co.uk/pin/1'), 'pinterest');
  assert.equal(trafficSource(site, site + '/page/'), 'internal');
});

test('visible browser views count once per navigation, not repeated lifecycle events', async () => {
  const handlers = {};
  const sent = [];
  const win = { location: new URL(site + '/first/'), navigator: {}, fetch: async (_, init) => { sent.push(JSON.parse(init.body)); } };
  const doc = { visibilityState: 'hidden', referrer: 'https://www.google.com/', querySelector: () => null,
    addEventListener: (event, fn) => { handlers[event] = fn; } };
  startPageTracking(win, doc);
  assert.equal(sent.length, 0);
  doc.visibilityState = 'visible';
  handlers.visibilitychange();
  handlers['astro:page-load']();
  startPageTracking(win, doc);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].event_type, 'browser_page_view');
  win.location = new URL(site + '/second/');
  handlers['astro:page-load']();
  assert.equal(sent.length, 2);
  assert.equal(sent[1].source, 'internal');
  doc.querySelector = () => ({ content: 'noindex, follow' });
  win.location = new URL(site + '/excluded/');
  handlers['astro:page-load']();
  assert.equal(sent.length, 2);
  doc.querySelector = () => null;
  win.location = new URL(site + '/second/');
  handlers['astro:page-load']();
  assert.equal(sent.length, 3);
});

test('server diagnostic logging excludes 404s, redirects and non-HTML responses', async () => {
  for (const [status, type, pathname, expected] of [
    [200, 'text/html', '/article/', ['server_request']],
    [404, 'text/html', '/missing/', []],
    [200, 'application/json', '/data-example/', []],
    [200, 'text/html', '/article', []],
  ]) {
    const inserts = [];
    const waits = [];
    globalThis.__PIN_DEST_MAP = null;
    const response = await onRequest({
      request: new Request(site + pathname), waitUntil: promise => waits.push(promise),
      env: {
        ASSETS: { fetch: async request => new URL(request.url).pathname === '/data/pin-destinations-flat.json'
          ? Response.json({}) : new Response('body', { status, headers: { 'Content-Type': type } }) },
        DB: { prepare: () => ({ bind: (...args) => ({ run: async () => inserts.push(args[0]) }) }) },
      },
    });
    await Promise.all(waits);
    assert.ok([200, 301, 404].includes(response.status));
    assert.deepEqual(inserts, expected, pathname);
  }
});

test('browser metric rejects foreign writes and malformed paths before any database write', async () => {
  let writes = 0;
  const DB = { prepare: () => ({ bind: () => ({ run: async () => { writes++; } }) }) };
  const payload = { event_type: 'browser_page_view', page: '/article/', source: 'direct', metadata: { measurement_version: 2 } };
  async function post(origin, body, agent = 'Mozilla/5.0') {
    return eventPost({ env: { DB }, request: new Request(site + '/api/event', { method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', 'User-Agent': agent }, body: JSON.stringify(body) }) });
  }
  assert.equal((await post('https://other.test', payload)).status, 403);
  assert.equal((await post(site, { ...payload, page: '//other.test/' })).status, 400);
  await post(site, payload, 'Googlebot');
  assert.equal(writes, 0);
  assert.equal((await post(site, payload)).status, 200);
  assert.equal(writes, 1);
});

test('Pinterest save fails honestly on a failed atomic batch', async () => {
  const context = { request: new Request(site + '/api/pinterest-analytics-save?key=test', { method: 'POST',
    body: JSON.stringify({ pins: [{ pin_id: '123', impressions: 5 }] }) }),
    env: { STATS_KEY: 'test', DB: { prepare: () => ({ bind: () => ({}) }), batch: async () => { throw new Error('DB failure'); } } } };
  const response = await savePins(context);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).saved, undefined);
});

test('Pinterest read marks stale snapshots and reports own-site clicks separately', async () => {
  const response = await readPins({ request: new Request(site + '/api/pinterest-analytics', { headers: { 'x-api-key': 'test' } }),
    data: { now: new Date('2026-09-14T12:00:00Z') },
    env: { STATS_KEY: 'test', DB: { prepare: () => ({ all: async () => ({ results: [
      { pin_id: '1', pin_link: site + '/one/', cached_at: '2026-09-13T00:00:00Z', impressions: 100, outbound_clicks: 3 },
      { pin_id: '2', pin_link: 'https://other.test/', cached_at: '2026-09-13T00:00:00Z', impressions: 200, outbound_clicks: 8 },
    ] }) }) } } });
  const data = await response.json();
  assert.equal(data.stale, true);
  assert.equal(data.fromCache, true);
  assert.equal(data.own_site.outbound_clicks, 3);
  assert.equal(data.totals.outbound_clicks, 11);
});

test('kitchen calculators preserve ingredient mass and use the actual label serving', () => {
  assert.deepEqual(discardAmounts(1, 'cups'), { grams: 227, cups: 1, flour: 113.5, water: 113.5 });
  const stiff = discardAmounts(150, 'grams', 50);
  assert.equal(stiff.flour, 100);
  assert.equal(stiff.water, 50);
  const portion = proteinPortion(25, 8, 85);
  assert.equal(portion.grams, 265.625);
  assert.equal(proteinPortion(25, 0, 85), null);
  assert.equal(discardAmounts(NaN), null);
  assert.equal(discardAmounts(-1), null);
});
