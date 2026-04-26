/**
 * Pinterest OAuth Demo Script
 * Connects ADS POWER profile 77 to n8n Pinterest OAuth flow
 * Run: node scripts/pinterest-oauth-demo.cjs
 */

const http = require('http');
const https = require('https');

const ADS_API            = 'http://local.adspower.net:50325';
const ADS_KEY            = '9e8265a2a91e8b30658908cef8d51ce30079525b1c553f0b';
const ADS_PROFILE_SERIAL = '77';
const N8N_URL            = 'http://localhost:5678';
const N8N_CRED           = 'fzKNHehPNPMgZXIo';

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Step 1: Connect to ADS POWER profile 77 ──────────────────────────────────

async function getAdsPowerBrowser() {
  console.log('\n[1] Connecting to ADS POWER profile 77...');

  const activeRes = await get(
    `${ADS_API}/api/v1/browser/active?serial_number=${ADS_PROFILE_SERIAL}`,
    { Authorization: `Bearer ${ADS_KEY}` }
  );

  let activeData;
  try { activeData = JSON.parse(activeRes.body); } catch(e) { activeData = {}; }

  if (activeData.code === 0 && activeData.data?.ws?.puppeteer) {
    console.log('    Profile already open - connecting to existing window');
    return {
      wsUrl: activeData.data.ws.puppeteer,
      debugPort: activeData.data.debug_port
    };
  }

  console.log('    Opening profile...');
  const startRes = await get(
    `${ADS_API}/api/v1/browser/start?serial_number=${ADS_PROFILE_SERIAL}&open_tabs=0`,
    { Authorization: `Bearer ${ADS_KEY}` }
  );

  let startData;
  try { startData = JSON.parse(startRes.body); } catch(e) { startData = {}; }

  if (startData.code !== 0) {
    throw new Error(`Failed to open profile: ${startData.msg}`);
  }

  console.log('    Profile opened successfully');
  return {
    wsUrl: startData.data.ws.puppeteer,
    debugPort: startData.data.debug_port
  };
}

// ── Step 2: Get OAuth URL from n8n ───────────────────────────────────────────

async function getN8nOAuthUrl() {
  console.log('\n[2] Getting Pinterest OAuth URL from n8n...');

  const loginRes = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ emailOrLdapLoginId: 'admin@dlh.com', password: 'DLH@2026admin!' });
    const req = http.request('http://localhost:5678/rest/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, res => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', c => data += c);
      res.on('end', () => resolve({ data, cookies: cookies.join('; ') }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const cookieHeader = loginRes.cookies;

  const oauthRes = await get(
    `${N8N_URL}/rest/oauth2-credential/auth?id=${N8N_CRED}`,
    { Cookie: cookieHeader }
  );

  if (oauthRes.status === 302 || oauthRes.status === 301) {
    const redirectUrl = oauthRes.headers.location;
    if (redirectUrl && redirectUrl.includes('pinterest.com')) {
      console.log('    OAuth URL received');
      return { url: redirectUrl, cookie: cookieHeader };
    }
  }

  try {
    const body = JSON.parse(oauthRes.body);
    const url = body.data?.authUrl || body.data;
    if (typeof url === 'string' && url.includes('pinterest.com')) {
      console.log('    OAuth URL received');
      return { url, cookie: cookieHeader };
    }
  } catch(e) {}

  throw new Error('Could not get OAuth URL from n8n: ' + oauthRes.body.substring(0, 200));
}

// ── Step 3: Open URL in ADS POWER browser via CDP ────────────────────────────

async function openUrlInAdsPower(debugPort, oauthUrl) {
  console.log('\n[3] Opening Pinterest consent page in ADS POWER profile 77...');

  const encodedUrl = encodeURIComponent(oauthUrl);
  const openRes = await new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${debugPort}/json/new?${encodedUrl}`, {
      method: 'PUT'
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });

  const tab = JSON.parse(openRes);
  console.log('    Tab opened:', tab.url?.substring(0, 60) || tab.id);
  return tab;
}

// ── Step 4: Wait for n8n to receive the callback ─────────────────────────────

async function waitForOAuthComplete(cookieHeader) {
  console.log('\n[4] Waiting for you to click "Allow access" in Pinterest...');
  console.log('    (Checking every 3 seconds for n8n confirmation)\n');

  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    process.stdout.write(`    Check ${i+1}/40... `);

    const testRes = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ credentials: { id: N8N_CRED, name: 'Pinterest OAuth2 - DLH', type: 'oAuth2Api' } });
      const req = http.request('http://localhost:5678/rest/credentials/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length, Cookie: cookieHeader }
      }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    try {
      const result = JSON.parse(testRes);
      if (result.data?.status === 'OK') {
        console.log('\n');
        console.log('    *** CONNECTED! Pinterest token received by n8n ***');
        return true;
      } else {
        process.stdout.write('waiting...\n');
      }
    } catch(e) {
      process.stdout.write('check error\n');
    }
  }

  console.log('\n    TIMEOUT - no confirmation received within 2 minutes');
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  Pinterest OAuth Demo - Daily Life Hacks');
  console.log('='.repeat(60));
  console.log('\nMake sure:');
  console.log('  1. ADS POWER profile 77 is open');
  console.log('  2. Proxy fraud score is verified (low/zero)');
  console.log('  3. n8n is running on localhost:5678\n');

  try {
    const browser = await getAdsPowerBrowser();
    const { url: oauthUrl, cookie } = await getN8nOAuthUrl();
    await openUrlInAdsPower(browser.debugPort, oauthUrl);

    console.log('\n>>> Switch to ADS POWER and click "Allow access" <<<\n');

    const success = await waitForOAuthComplete(cookie);

    if (success) {
      console.log('\n  OAuth complete!');
      console.log('  Go to n8n and run workflow: DLH Lite - Pinterest Publish\n');
    }

  } catch (err) {
    console.error('\n  ERROR:', err.message);
  }
}

main();
