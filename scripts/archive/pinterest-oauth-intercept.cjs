/**
 * Pinterest OAuth Intercept Script
 * Opens consent page in ADS POWER, intercepts the callback redirect via CDP,
 * and delivers the auth code to n8n directly from localhost (bypassing proxy).
 */

const http = require('http');
const net = require('net');

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
    }).on('error', reject);
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

// Connect to CDP WebSocket and listen for navigation to localhost callback
function interceptOAuthCallback(debugPort, tabWsPath) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(debugPort, '127.0.0.1');
    const key = Buffer.from(Math.random().toString(36)).toString('base64');
    let upgraded = false;
    let buffer = Buffer.alloc(0);
    let msgId = 1;
    let resolved = false;

    function sendCdp(method, params = {}) {
      const msg = JSON.stringify({ id: msgId++, method, params });
      const msgBuf = Buffer.from(msg);
      if (msgBuf.length < 126) {
        const frame = Buffer.alloc(6 + msgBuf.length);
        const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
        frame[0] = 0x81;
        frame[1] = 0x80 | msgBuf.length;
        mask.copy(frame, 2);
        for (let i = 0; i < msgBuf.length; i++) frame[6 + i] = msgBuf[i] ^ mask[i % 4];
        socket.write(frame);
      } else {
        // Extended payload for larger messages
        const frame = Buffer.alloc(8 + msgBuf.length);
        const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
        frame[0] = 0x81;
        frame[1] = 0x80 | 126;
        frame.writeUInt16BE(msgBuf.length, 2);
        mask.copy(frame, 4);
        for (let i = 0; i < msgBuf.length; i++) frame[8 + i] = msgBuf[i] ^ mask[i % 4];
        socket.write(frame);
      }
    }

    socket.on('connect', () => {
      const handshake = [
        `GET ${tabWsPath} HTTP/1.1`,
        `Host: 127.0.0.1:${debugPort}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: ${key}`,
        `Sec-WebSocket-Version: 13`,
        '', ''
      ].join('\r\n');
      socket.write(handshake);
    });

    function parseWsFrame(buf) {
      if (buf.length < 2) return null;
      const payloadLen = buf[1] & 0x7f;
      if (payloadLen < 126) {
        if (buf.length < 2 + payloadLen) return null;
        return { payload: buf.slice(2, 2 + payloadLen), consumed: 2 + payloadLen };
      } else if (payloadLen === 126) {
        if (buf.length < 4) return null;
        const len = buf.readUInt16BE(2);
        if (buf.length < 4 + len) return null;
        return { payload: buf.slice(4, 4 + len), consumed: 4 + len };
      }
      return null;
    }

    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);

      if (!upgraded) {
        const str = buffer.toString();
        if (str.includes('\r\n\r\n')) {
          upgraded = true;
          const headerEnd = buffer.indexOf('\r\n\r\n') + 4;
          buffer = buffer.slice(headerEnd);
          // Enable Page and Network events
          sendCdp('Page.enable');
          sendCdp('Network.enable');
          console.log('    CDP connected, listening for Pinterest callback...');
        }
        return;
      }

      // Parse WebSocket frames
      while (buffer.length > 0) {
        const frame = parseWsFrame(buffer);
        if (!frame) break;
        buffer = buffer.slice(frame.consumed);

        try {
          const msg = JSON.parse(frame.payload.toString());

          // Listen for navigation events that contain our callback URL
          if (msg.method === 'Page.frameNavigated' || msg.method === 'Page.frameStartedNavigating') {
            const url = msg.params?.frame?.url || msg.params?.url || '';
            if (url.includes('localhost:5678/rest/oauth2-credential/callback') ||
                url.includes('oauth2-credential/callback')) {
              if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(url);
              }
            }
          }

          // Also listen for network requests
          if (msg.method === 'Network.requestWillBeSent') {
            const url = msg.params?.request?.url || '';
            if (url.includes('localhost:5678/rest/oauth2-credential/callback') ||
                url.includes('oauth2-credential/callback')) {
              if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(url);
              }
            }
          }

          // Also check for failed navigations (the browser might try and fail)
          if (msg.method === 'Page.navigatedWithinDocument') {
            const url = msg.params?.url || '';
            if (url.includes('oauth2-credential/callback')) {
              if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(url);
              }
            }
          }

        } catch(e) {}
      }
    });

    socket.on('error', reject);
    setTimeout(() => {
      if (!resolved) {
        socket.destroy();
        reject(new Error('CDP timeout - no callback intercepted within 3 minutes'));
      }
    }, 180000);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Pinterest OAuth - Intercept Mode');
  console.log('='.repeat(60));

  // Step 1: Connect to ADS POWER
  console.log('\n[1] Connecting to ADS POWER profile 77...');
  const activeRes = await httpGet(
    `${ADS_API}/api/v1/browser/active?serial_number=${ADS_PROFILE_SERIAL}`,
    { Authorization: `Bearer ${ADS_KEY}` }
  );
  const activeData = JSON.parse(activeRes.body);

  let debugPort;
  if (activeData.code === 0 && activeData.data?.debug_port) {
    debugPort = activeData.data.debug_port;
    console.log('    Profile open, debug port:', debugPort);
  } else {
    const startRes = await httpGet(
      `${ADS_API}/api/v1/browser/start?serial_number=${ADS_PROFILE_SERIAL}&open_tabs=0`,
      { Authorization: `Bearer ${ADS_KEY}` }
    );
    const startData = JSON.parse(startRes.body);
    if (startData.code !== 0) throw new Error('Cannot open profile: ' + startData.msg);
    debugPort = startData.data.debug_port;
    console.log('    Profile opened, debug port:', debugPort);
  }

  // Step 2: Get OAuth URL from n8n
  console.log('\n[2] Getting Pinterest OAuth URL from n8n...');
  const loginRes = await httpPost(`${N8N_URL}/rest/login`, {
    emailOrLdapLoginId: 'admin@dlh.com', password: 'DLH@2026admin!'
  });
  const cookie = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  const oauthRes = await httpGet(`${N8N_URL}/rest/oauth2-credential/auth?id=${N8N_CRED}`, { Cookie: cookie });
  let oauthUrl;
  if (oauthRes.status === 302) {
    oauthUrl = oauthRes.headers.location;
  } else {
    const body = JSON.parse(oauthRes.body);
    oauthUrl = body.data?.authUrl || body.data;
  }
  if (!oauthUrl || !oauthUrl.includes('pinterest.com')) {
    throw new Error('Could not get OAuth URL: ' + oauthRes.body.substring(0, 200));
  }
  console.log('    OAuth URL ready');

  // Step 3: Get list of tabs to find one to attach CDP to
  console.log('\n[3] Setting up CDP listener...');
  const tabsRes = await httpGet(`http://127.0.0.1:${debugPort}/json`);
  const tabs = JSON.parse(tabsRes.body);
  console.log('    Found', tabs.length, 'tab(s)');

  // Open new tab with OAuth URL
  const newTabRes = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(oauthUrl)}`,
      { method: 'PUT' },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); }
    );
    req.on('error', reject);
    req.end();
  });
  const newTabId = newTabRes.id;
  const newTabWsPath = new URL(newTabRes.webSocketDebuggerUrl || `ws://127.0.0.1:${debugPort}/devtools/page/${newTabId}`).pathname;
  console.log('    Opened Pinterest tab:', newTabId);

  await sleep(2000);

  console.log('\n>>> Switch to ADS POWER and click "Allow access" <<<\n');
  console.log('[4] Intercepting callback via CDP...');

  // Step 4: Intercept the callback
  const callbackUrl = await interceptOAuthCallback(debugPort, newTabWsPath);
  console.log('\n    Intercepted callback URL!');
  console.log('   ', callbackUrl.substring(0, 100));

  // Step 5: Deliver callback to n8n locally (bypassing proxy)
  console.log('\n[5] Delivering callback to n8n...');
  const cbRes = await httpGet(callbackUrl, { Cookie: cookie });
  console.log('    n8n response:', cbRes.status, cbRes.body.substring(0, 100));

  await sleep(2000);

  // Step 6: Verify credential is connected
  console.log('\n[6] Verifying credential...');
  const testRes = await httpPost(`${N8N_URL}/rest/credentials/test`,
    { credentials: { id: N8N_CRED, name: 'Pinterest OAuth2 - DLH', type: 'oAuth2Api' } },
    { Cookie: cookie }
  );
  const testData = JSON.parse(testRes.body);

  if (testData.data?.status === 'OK') {
    console.log('\n    *** SUCCESS! Pinterest credential connected! ***');
    console.log('    You can now run the workflow.');
  } else {
    console.log('\n    Status:', testData.data?.status, testData.data?.message);
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(err => console.error('\n  ERROR:', err.message));
