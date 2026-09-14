// This measures browser executions, not unique people or verified human visits.
export function trafficSource(href, referrer = '') {
  const url = new URL(href);
  const campaign = (url.searchParams.get('utm_source') || '').toLowerCase().slice(0, 80);
  if (campaign) return campaign === 'pinterest' ? 'pinterest' : `campaign:${campaign}`;
  let host;
  try { host = new URL(referrer).hostname.replace(/^www\./, ''); } catch { return 'direct'; }
  const matches = domain => host === domain || host.endsWith(`.${domain}`);
  if (host === url.hostname.replace(/^www\./, '')) return 'internal';
  if (['chatgpt.com', 'openai.com', 'perplexity.ai', 'copilot.microsoft.com', 'gemini.google.com', 'claude.ai'].some(matches)) return `ai:${host}`;
  if (['google.com', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'search.brave.com', 'ecosia.org'].some(matches) || /(^|\.)google\.[a-z.]{2,6}$/.test(host)) return `search:${host}`;
  if (/(^|\.)pinterest\.[a-z.]{2,6}$/.test(host) || host === 'com.pinterest') return 'pinterest';
  if (['reddit.com', 'redd.it'].some(matches)) return 'reddit';
  if (['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com', 'threads.net'].some(matches)) return `social:${host}`;
  return `referral:${host}`;
}

export function startPageTracking(win = window, doc = document) {
  if (win.__dlhBrowserTracking) return;
  win.__dlhBrowserTracking = true;
  let lastPath = null;
  function send() {
    // A hidden/prerendered page does not count until it is actually displayed.
    if (doc.visibilityState !== 'visible' || win.navigator.webdriver) return;
    const path = win.location.pathname;
    if (lastPath === path) return;
    const previousPath = lastPath;
    lastPath = path;
    if (/^\/(admin|dashboard|deploy-proof|404)(\/|\.|$)/.test(path)) return;
    if (doc.querySelector('meta[name="robots"]')?.content.includes('noindex')) return;
    win.fetch('/api/event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ event_type: 'browser_page_view', page: path,
        source: trafficSource(win.location.href, previousPath ? new URL(previousPath, win.location.href).href : doc.referrer),
        metadata: { measurement_version: 2 } }),
    }).catch(() => {});
  }
  send();
  doc.addEventListener('visibilitychange', send);
  doc.addEventListener('astro:page-load', send);
}
