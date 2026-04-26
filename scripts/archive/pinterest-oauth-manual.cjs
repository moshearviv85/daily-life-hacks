/**
 * Pinterest OAuth - Manual Token Exchange
 * Gets auth code from ADS POWER redirect, exchanges directly with Pinterest API,
 * then stores token in n8n credential.
 */
const http = require('http');
const https = require('https');

const ADS_API            = 'http://local.adspower.net:50325';
const ADS_KEY            = '9e8265a2a91e8b30658908cef8d51ce30079525b1c553f0b';
const ADS_PROFILE_SERIAL = '77';
const N8N_URL            = 'http://localhost:5678';
const N8N_CRED           = 'fzKNHehPNPMgZXIo';
const CLIENT_ID          = '1554902';
const CLIENT_SECRET      = 'f952dfd1d47d141bc6b170af57a54f212b5b524c';
const REDIRECT_URI       = 'http://localhost:5678/rest/oauth2-credential/callback';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', e => resolve({ status: 0, body: e.message, headers: {} }));
  });
}

function httpPost(urlStr, body, headers = {}, isForm = false) {
  return new Promise((resolve, reject) => {
    const bodyStr = isForm ? body : JSON.stringify(body);
    const u = new URL(urlStr);
    const lib = urlStr.startsWith('https') ? https : http;
    const req = lib.request({
      hostname: u.hostname, port: u.port || (urlStr.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search, method: 'POST',
      headers: {
        'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
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

function httpPatch(urlStr, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const u = new URL(urlStr);
    const req = http.request({
      hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Pinterest OAuth - Manual Token Exchange');
  console.log('='.repeat(60));

  // Step 1: Connect to ADS POWER
  console.log('\n[1] Connecting to ADS POWER profile 77...');
  const activeRes = await httpGet(`${ADS_API}/api/v1/browser/active?serial_number=${ADS_PROFILE_SERIAL}`,
    { Authorization: `Bearer ${ADS_KEY}` });
  let debugPort = JSON.parse(activeRes.body)?.data?.debug_port;
  if (!debugPort) {
    const startRes = await httpGet(`${ADS_API}/api/v1/browser/start?serial_number=${ADS_PROFILE_SERIAL}&open_tabs=0`,
      { Authorization: `Bearer ${ADS_KEY}` });
    debugPort = JSON.parse(startRes.body)?.data?.debug_port;
  }
  console.log('    Debug port:', debugPort);

  // Step 2: Login n8n
  console.log('\n[2] Logging into n8n...');
  const loginRes = await httpPost(`${N8N_URL}/rest/login`, { emailOrLdapLoginId: 'admin@dlh.com', password: 'DLH@2026admin!' });
  const cookie = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  console.log('    Logged in');

  // Step 3: Build Pinterest OAuth URL manually (so WE control the state)
  // Use a simple fixed state that we can verify
  const state = 'dlh_manual_' + Date.now();
  const oauthUrl = `https://www.pinterest.com/oauth/?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=boards%3Aread+boards%3Awrite+pins%3Aread+pins%3Awrite+user_accounts%3Aread&state=${state}`;

  console.log('\n[3] Opening Pinterest consent page in ADS POWER...');
  const newTabRes = await new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(oauthUrl)}`,
      { method: 'PUT' },
      res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } }); }
    );
    req.on('error', reject); req.end();
  });
  const tabId = newTabRes.id;
  console.log('    Tab opened:', tabId);

  console.log('\n>>> Switch to ADS POWER and click "Allow access" <<<\n');
  console.log('[4] Polling for auth code in tab URL...\n');

  // Step 4: Poll all tabs for the callback URL with auth code
  let authCode = null;
  for (let i = 0; i < 180; i++) {
    await sleep(1000);
    process.stdout.write(`\r    Waiting... ${i+1}s`);

    try {
      const tabsRes = await httpGet(`http://127.0.0.1:${debugPort}/json`);
      const tabs = JSON.parse(tabsRes.body);

      for (const tab of tabs) {
        const url = tab.url || '';
        // Look for callback URL with code parameter
        if (url.includes('localhost:5678') && url.includes('code=')) {
          const urlObj = new URL(url);
          authCode = urlObj.searchParams.get('code');
          if (authCode) { console.log('\n    Found auth code in tab URL!'); break; }
        }
        // Also check for pinterest error page that might show the redirect URL
        if (url.includes('pinterest.com/oauth') && tab.id === tabId) {
          // Tab is still on Pinterest - not clicked yet
        }
      }
      if (authCode) break;

      // Also check via CDP Runtime.evaluate for the current URL
      if (i % 5 === 0) {
        try {
          const tabsForEval = JSON.parse((await httpGet(`http://127.0.0.1:${debugPort}/json`)).body);
          const targetTab = tabsForEval.find(t => t.id === tabId);
          if (targetTab && targetTab.url && targetTab.url.includes('code=')) {
            const urlObj = new URL(targetTab.url);
            authCode = urlObj.searchParams.get('code');
            if (authCode) { console.log('\n    Found code in tab metadata!'); break; }
          }
        } catch(e) {}
      }
    } catch(e) {}
  }

  if (!authCode) {
    console.log('\n\n    No auth code found after 3 minutes.');
    console.log('    After clicking Allow, check what URL ADS POWER shows.');
    console.log('    If it shows an error on localhost:5678, paste the full URL here.');
    return;
  }

  console.log('    Auth code:', authCode.substring(0, 20) + '...');

  // Step 5: Exchange auth code for token directly (bypassing n8n)
  console.log('\n[5] Exchanging auth code with Pinterest API...');
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const tokenBody = `grant_type=authorization_code&code=${encodeURIComponent(authCode)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  const tokenRes = await httpPost(
    'https://api-sandbox.pinterest.com/v5/oauth/token',
    tokenBody,
    { 'Authorization': `Basic ${basicAuth}` },
    true  // isForm = true
  );

  console.log('    Token response status:', tokenRes.status);
  console.log('    Response:', tokenRes.body.substring(0, 200));

  if (tokenRes.status !== 200) {
    console.log('\n    Token exchange failed.');
    return;
  }

  const tokenData = JSON.parse(tokenRes.body);
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;

  console.log('    Access token:', accessToken ? accessToken.substring(0, 30) + '...' : 'NONE');
  console.log('    Refresh token:', refreshToken ? 'present' : 'NONE');

  // Step 6: Store token in n8n credential
  console.log('\n[6] Storing token in n8n credential...');
  const patchRes = await httpPatch(
    `${N8N_URL}/rest/credentials/${N8N_CRED}`,
    {
      name: 'Pinterest OAuth2 - DLH',
      type: 'oAuth2Api',
      data: {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        authUrl: 'https://www.pinterest.com/oauth/',
        accessTokenUrl: 'https://api.pinterest.com/v5/oauth/token',
        scope: 'boards:read boards:write pins:read pins:write user_accounts:read',
        authenticationMethod: 'header',
        grantType: 'authorizationCode',
        redirectUrl: REDIRECT_URI,
        accessToken: accessToken,
        ...(refreshToken ? { refreshToken } : {}),
        ...(expiresIn ? { expiresAt: (Date.now() + expiresIn * 1000).toString() } : {})
      }
    },
    { Cookie: cookie }
  );
  console.log('    PATCH status:', patchRes.status);

  // Step 7: Test credential
  console.log('\n[7] Testing credential...');
  const testRes = await httpPost(
    `${N8N_URL}/rest/credentials/test`,
    { credentials: { id: N8N_CRED, name: 'Pinterest OAuth2 - DLH', type: 'oAuth2Api' } },
    { Cookie: cookie }
  );
  const testData = JSON.parse(testRes.body);
  if (testData.data?.status === 'OK') {
    console.log('\n    *** SUCCESS! Pinterest credential connected! ***');
    console.log('    You can now run the workflow in n8n.');
  } else {
    console.log('\n    Status:', testData.data?.status, '-', testData.data?.message);
  }
  console.log('='.repeat(60));
}

main().catch(err => console.error('\n  ERROR:', err.message));
