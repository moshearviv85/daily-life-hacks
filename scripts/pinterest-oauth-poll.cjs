/**
 * Pinterest OAuth - Poll Tab URL Method
 * After user clicks Allow, polls the ADS POWER tab URL via CDP REST API
 * and delivers the callback to n8n directly from localhost.
 */

const http = require('http');

const ADS_API            = 'http://local.adspower.net:50325';
const ADS_KEY            = '9e8265a2a91e8b30658908cef8d51ce30079525b1c553f0b';
const ADS_PROFILE_SERIAL = '77';
const N8N_URL            = 'http://localhost:5678';
const N8N_CRED           = 'fzKNHehPNPMgZXIo';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : http;
    lib.get(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', e => resolve({ status: 0, headers: {}, body: e.message }));
  });
}

function httpPost(urlStr, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const u = new URL(urlStr);
    const req = http.request({
      hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Pinterest OAuth - URL Poll Method');
  console.log('='.repeat(60));

  // Step 1: Connect to ADS POWER
  console.log('\n[1] Connecting to ADS POWER profile 77...');
  const activeRes = await httpGet(
    `${ADS_API}/api/v1/browser/active?serial_number=${ADS_PROFILE_SERIAL}`,
    { Authorization: `Bearer ${ADS_KEY}` }
  );
  const activeData = JSON.parse(activeRes.body);
  let debugPort = activeData.data?.debug_port;
  if (!debugPort) {
    const startRes = await httpGet(
      `${ADS_API}/api/v1/browser/start?serial_number=${ADS_PROFILE_SERIAL}&open_tabs=0`,
      { Authorization: `Bearer ${ADS_KEY}` }
    );
    debugPort = JSON.parse(startRes.body).data.debug_port;
  }
  console.log('    Debug port:', debugPort);

  // Step 2: Login to n8n and get OAuth URL
  console.log('\n[2] Getting Pinterest OAuth URL from n8n...');
  const loginRes = await httpPost(`${N8N_URL}/rest/login`, {
    emailOrLdapLoginId: 'admin@dlh.com', password: 'DLH@2026admin!'
  });
  const cookie = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  const oauthRes = await httpGet(`${N8N_URL}/rest/oauth2-credential/auth?id=${N8N_CRED}`, { Cookie: cookie });
  let oauthUrl = oauthRes.status === 302 ? oauthRes.headers.location : JSON.parse(oauthRes.body).data?.authUrl || JSON.parse(oauthRes.body).data;
  if (!oauthUrl?.includes('pinterest.com')) throw new Error('No OAuth URL: ' + oauthRes.body.substring(0, 150));
  console.log('    OAuth URL ready');

  // Step 3: Open tab in ADS POWER
  console.log('\n[3] Opening Pinterest consent page in ADS POWER...');
  const newTabRes = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(oauthUrl)}`,
      { method: 'PUT' },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } }); }
    );
    req.on('error', reject); req.end();
  });
  const newTabId = newTabRes.id;
  console.log('    Tab opened:', newTabId);

  console.log('\n>>> Switch to ADS POWER and click "Allow access" <<<\n');
  console.log('[4] Polling tab URLs every second for callback...\n');

  // Step 4: Poll all tabs every second looking for the callback URL
  let callbackUrl = null;
  for (let i = 0; i < 180; i++) {
    await sleep(1000);
    process.stdout.write(`\r    Waiting... ${i+1}s`);

    try {
      const tabsRes = await httpGet(`http://127.0.0.1:${debugPort}/json`);
      const tabs = JSON.parse(tabsRes.body);

      for (const tab of tabs) {
        const url = tab.url || '';
        // Check if any tab has navigated to our callback URL
        if (url.includes('oauth2-credential/callback') || url.includes('localhost:5678/rest/oauth2')) {
          callbackUrl = url;
          break;
        }
        // Also check if Pinterest showed an error page with the redirect URL embedded
        if (url.includes('pinterest.com') && tab.id === newTabId) {
          // Get page content via CDP evaluate to check for redirect attempts
        }
      }

      if (callbackUrl) break;

      // Also try fetching the tab details which sometimes includes pending navigation URL
      const tabDetail = await httpGet(`http://127.0.0.1:${debugPort}/json/${newTabId}`);
      const detail = JSON.parse(tabDetail.body || '{}');
      if (Array.isArray(detail)) {
        const t = detail.find(x => x.id === newTabId);
        if (t?.url?.includes('callback')) { callbackUrl = t.url; break; }
      }

    } catch(e) { /* ignore polling errors */ }
  }

  if (!callbackUrl) {
    console.log('\n\n    Tab polling found nothing after 3 minutes.');
    console.log('    Trying to read current URL of Pinterest tab via CDP eval...');

    // Last resort: use CDP WebSocket to eval document.location.href
    // and also check if there's a redirect happening in the page
    const evalResult = await new Promise(resolve => {
      const net = require('net');
      const tabsStr = '';
      httpGet(`http://127.0.0.1:${debugPort}/json`).then(r => {
        const tabs = JSON.parse(r.body);
        const tab = tabs.find(t => t.id === newTabId) || tabs[0];
        if (!tab?.webSocketDebuggerUrl) { resolve(null); return; }
        const wsUrl = new URL(tab.webSocketDebuggerUrl);
        const socket = net.createConnection(debugPort, '127.0.0.1');
        const key = Buffer.from(Math.random().toString(36)).toString('base64');
        let buf = Buffer.alloc(0), upgraded = false;

        socket.on('connect', () => {
          socket.write([`GET ${wsUrl.pathname} HTTP/1.1`, `Host: 127.0.0.1:${debugPort}`,
            `Upgrade: websocket`, `Connection: Upgrade`, `Sec-WebSocket-Key: ${key}`,
            `Sec-WebSocket-Version: 13`, '', ''].join('\r\n'));
        });
        socket.on('data', chunk => {
          buf = Buffer.concat([buf, chunk]);
          if (!upgraded && buf.toString().includes('\r\n\r\n')) {
            upgraded = true;
            buf = buf.slice(buf.indexOf('\r\n\r\n') + 4);
            const msg = JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: 'document.location.href', returnByValue: true } });
            const mb = Buffer.from(msg);
            const f = Buffer.alloc(6 + mb.length);
            const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
            f[0] = 0x81; f[1] = 0x80 | mb.length; mask.copy(f, 2);
            for (let i = 0; i < mb.length; i++) f[6+i] = mb[i] ^ mask[i%4];
            socket.write(f);
          } else if (upgraded && buf.length > 2) {
            const len = buf[1] & 0x7f;
            if (buf.length >= 2 + len) {
              try {
                const parsed = JSON.parse(buf.slice(2, 2+len).toString());
                if (parsed.id === 1) { socket.destroy(); resolve(parsed.result?.result?.value); }
              } catch(e) { socket.destroy(); resolve(null); }
            }
          }
        });
        socket.on('error', () => resolve(null));
        setTimeout(() => { socket.destroy(); resolve(null); }, 5000);
      });
    });

    console.log('    Current tab URL:', evalResult);
    if (evalResult?.includes('callback') || evalResult?.includes('oauth2')) {
      callbackUrl = evalResult;
    }
  }

  if (!callbackUrl) {
    console.log('\n    Could not find callback URL. Did you click Allow?');
    console.log('    Make sure Local network access is enabled for localhost:5678 in ADS POWER profile 77 settings.');
    return;
  }

  console.log('\n\n    Found callback URL!');
  console.log('   ', callbackUrl.substring(0, 120));

  // Step 5: Deliver to n8n
  console.log('\n[5] Delivering callback to n8n...');
  const cbRes = await httpGet(callbackUrl, { Cookie: cookie });
  console.log('    Response:', cbRes.status, cbRes.body.substring(0, 150));

  await sleep(2000);

  // Step 6: Verify
  console.log('\n[6] Testing credential...');
  const testRes = await httpPost(`${N8N_URL}/rest/credentials/test`,
    { credentials: { id: N8N_CRED, name: 'Pinterest OAuth2 - DLH', type: 'oAuth2Api' } },
    { Cookie: cookie }
  );
  const testData = JSON.parse(testRes.body);
  if (testData.data?.status === 'OK') {
    console.log('\n    *** SUCCESS! Pinterest credential connected! ***');
  } else {
    console.log('\n    Result:', testData.data?.status, '-', testData.data?.message);
  }
  console.log('='.repeat(60));
}

main().catch(err => console.error('\n  ERROR:', err.message));
