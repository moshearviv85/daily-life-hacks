/**
 * Runs the n8n Pinterest workflow inside ADS POWER browser (no WebSocket needed)
 * Uses CDP to control the browser directly via JavaScript injection
 * Run: node scripts/run-workflow-in-adspower.cjs
 */

const http = require('http');

const ADS_API            = 'http://local.adspower.net:50325';
const ADS_KEY            = '9e8265a2a91e8b30658908cef8d51ce30079525b1c553f0b';
const ADS_PROFILE_SERIAL = '77';
const N8N_URL            = 'http://localhost:5678';
const N8N_EMAIL          = 'admin@dlh.com';
const N8N_PASSWORD       = 'DLH@2026admin!';
const WORKFLOW_ID        = 'kSs8FdWFyZGU46Vg';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const opts = new URL(url);
    const req = http.request({
      hostname: opts.hostname, port: opts.port || 80,
      path: opts.pathname + opts.search,
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

// CDP: send command to browser tab
function cdpSend(debugPort, tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify({ id: 1, method, params });
    const req = http.request({
      hostname: '127.0.0.1', port: debugPort,
      path: '/json/send/' + tabId,  // might not work this way
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// CDP via WebSocket - execute JS in a tab
function cdpEval(debugPort, tabWsUrl, jsCode) {
  return new Promise((resolve, reject) => {
    const url = new URL(tabWsUrl);
    const net = require('net');
    const socket = net.createConnection(debugPort, '127.0.0.1');

    const key = Buffer.from(Math.random().toString(36)).toString('base64');
    const msgId = Math.floor(Math.random() * 10000);

    socket.on('connect', () => {
      const handshake = [
        `GET ${url.pathname} HTTP/1.1`,
        `Host: 127.0.0.1:${debugPort}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: ${key}`,
        `Sec-WebSocket-Version: 13`,
        '', ''
      ].join('\r\n');
      socket.write(handshake);
    });

    let buffer = Buffer.alloc(0);
    let upgraded = false;
    let result = '';

    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);

      if (!upgraded) {
        const str = buffer.toString();
        if (str.includes('\r\n\r\n')) {
          upgraded = true;
          buffer = buffer.slice(buffer.indexOf('\r\n\r\n') + 4);

          // Send CDP Runtime.evaluate command
          const msg = JSON.stringify({
            id: msgId,
            method: 'Runtime.evaluate',
            params: { expression: jsCode, awaitPromise: true, returnByValue: true }
          });
          // Frame it as WebSocket text frame
          const msgBuf = Buffer.from(msg);
          const frame = Buffer.alloc(2 + 4 + msgBuf.length);
          frame[0] = 0x81; // text frame, fin
          frame[1] = 0x80 | msgBuf.length; // masked
          const mask = Buffer.from([0x37, 0xfa, 0x21, 0x3d]);
          frame.writeUInt8(0x80 | (msgBuf.length & 0x7f), 1);
          // Simple framing for small messages
          if (msgBuf.length < 126) {
            const f2 = Buffer.alloc(6 + msgBuf.length);
            f2[0] = 0x81;
            f2[1] = 0x80 | msgBuf.length;
            mask.copy(f2, 2);
            for (let i = 0; i < msgBuf.length; i++) f2[6 + i] = msgBuf[i] ^ mask[i % 4];
            socket.write(f2);
          }
        }
      } else {
        // Parse WebSocket frame
        if (buffer.length > 2) {
          const payloadLen = buffer[1] & 0x7f;
          if (buffer.length >= 2 + payloadLen) {
            const payload = buffer.slice(2, 2 + payloadLen).toString();
            try {
              const parsed = JSON.parse(payload);
              if (parsed.id === msgId) {
                result = parsed.result?.result?.value;
                socket.destroy();
                resolve(result);
              }
            } catch(e) {}
          }
        }
      }
    });

    socket.on('error', reject);
    setTimeout(() => { socket.destroy(); resolve(result || 'timeout'); }, 15000);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('  n8n Workflow Runner - ADS POWER Profile 77');
  console.log('='.repeat(60));

  // Step 1: Get ADS POWER browser
  console.log('\n[1] Connecting to ADS POWER profile 77...');
  const activeRes = await httpGet(
    `${ADS_API}/api/v1/browser/active?serial_number=${ADS_PROFILE_SERIAL}`,
    { Authorization: `Bearer ${ADS_KEY}` }
  );
  let browserData = JSON.parse(activeRes.body);
  let debugPort;

  if (browserData.code === 0 && browserData.data?.debug_port) {
    debugPort = browserData.data.debug_port;
    console.log('    Profile already open, debug port:', debugPort);
  } else {
    console.log('    Opening profile...');
    const startRes = await httpGet(
      `${ADS_API}/api/v1/browser/start?serial_number=${ADS_PROFILE_SERIAL}&open_tabs=0`,
      { Authorization: `Bearer ${ADS_KEY}` }
    );
    const startData = JSON.parse(startRes.body);
    if (startData.code !== 0) throw new Error('Failed to open profile: ' + startData.msg);
    debugPort = startData.data.debug_port;
    console.log('    Opened. Debug port:', debugPort);
  }

  // Step 2: Open n8n workflow page in ADS POWER
  console.log('\n[2] Opening n8n in ADS POWER browser...');
  const workflowUrl = `${N8N_URL}/workflow/${WORKFLOW_ID}`;
  const encodedUrl = encodeURIComponent(workflowUrl);
  const tabRes = await new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${debugPort}/json/new?${encodedUrl}`, { method: 'PUT' }, res => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
  console.log('    Tab opened:', tabRes.id);
  await sleep(3000);

  // Step 3: Login to n8n via REST API (direct, not through browser)
  console.log('\n[3] Logging into n8n via API...');
  const loginRes = await httpPost(`${N8N_URL}/rest/login`, {
    emailOrLdapLoginId: N8N_EMAIL, password: N8N_PASSWORD
  });
  const cookies = loginRes.headers['set-cookie']?.join('; ') || '';
  console.log('    Logged in');

  // Step 4: Execute workflow via REST API
  console.log('\n[4] Executing workflow via n8n REST API...');
  const versionRes = await httpGet(`${N8N_URL}/rest/workflows/${WORKFLOW_ID}`, { Cookie: cookies });
  const wfData = JSON.parse(versionRes.body).data;
  const versionId = wfData.versionId;

  const execRes = await httpPost(
    `${N8N_URL}/rest/workflows/${WORKFLOW_ID}/run`,
    { runData: {}, startNodes: [], destinationNode: '' },
    { Cookie: cookies }
  );
  console.log('    Execution started:', execRes.status);
  const execData = JSON.parse(execRes.body);
  console.log('    Response:', execRes.body.substring(0, 150));

  // Step 5: Wait for completion and navigate to executions
  console.log('\n[5] Waiting for workflow to complete...');
  await sleep(8000);

  const execsRes = await httpGet(
    `${N8N_URL}/rest/executions?workflowId=${WORKFLOW_ID}&limit=1`,
    { Cookie: cookies }
  );
  const execs = JSON.parse(execsRes.body);
  const lastExec = (execs.data?.results || execs.data?.data || [])[0];
  if (lastExec) {
    console.log('    Status:', lastExec.status);
    console.log('    Duration:', Math.round((new Date(lastExec.stoppedAt) - new Date(lastExec.startedAt)) / 1000) + 's');
  }

  // Step 6: Navigate browser to executions page
  console.log('\n[6] Opening executions page in ADS POWER...');
  const execPageUrl = `${N8N_URL}/workflow/${WORKFLOW_ID}/executions`;
  const execEncoded = encodeURIComponent(execPageUrl);
  await new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${debugPort}/json/new?${execEncoded}`, { method: 'PUT' }, res => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.end();
  });

  console.log('\n' + '='.repeat(60));
  if (lastExec?.status === 'success') {
    console.log('  SUCCESS! Workflow ran and pin was created.');
    console.log('  ADS POWER now shows the executions page.');
    console.log('  Click on the execution to see each node result.');
  } else {
    console.log('  Workflow status:', lastExec?.status || 'unknown');
  }
  console.log('='.repeat(60));
}

main().catch(err => console.error('\n  ERROR:', err.message));
