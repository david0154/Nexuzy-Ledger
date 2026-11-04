import { createServer } from 'node:http';
import { isIP } from 'node:net';
import Bonjour from 'bonjour-service';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nexuzy Ledger Staff</title>
  <style>
    :root{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#172033;background:#f3f6fb}
    body{margin:0;min-height:100vh;display:grid;place-items:center}
    main{box-sizing:border-box;width:min(620px,calc(100% - 32px));padding:32px;background:#fff;border:1px solid #dfe6f0;border-radius:18px;box-shadow:0 16px 48px #13233a14}
    h1{margin:0 0 8px;font-size:1.6rem}p{color:#586579;margin:8px 0 20px}
    .host{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #e8edf4}
    .host a,button{display:inline-block;border:0;border-radius:9px;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;font:inherit;font-weight:650;cursor:pointer}
    .host a:hover,button:hover{background:#1d4ed8}.muted{font-size:.9rem;color:#68778d}
    label{display:block;font-weight:650;margin:24px 0 8px}input{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}
    form{display:grid;grid-template-columns:1fr 112px auto;gap:8px;align-items:end}
    form label{grid-column:1/-1;margin:0}form button{height:44px}
    #status{min-height:24px;margin-top:12px;font-size:.92rem;color:#586579}
    @media(max-width:520px){main{padding:24px}form{grid-template-columns:1fr 90px}form button{grid-column:1/-1}}
  </style>
</head>
<body>
  <main>
    <h1>Nexuzy Ledger Staff</h1>
    <p>Choose your business host. This staff client only finds and opens the host app; it does not create a local business server or administrator.</p>
    <div id="hosts" aria-live="polite"></div>
    <div id="status">Looking for Nexuzy Ledger on your local network…</div>
    <form id="manual">
      <label for="hostname">Host name fallback</label>
      <input id="hostname" autocomplete="off" placeholder="For example: office-pc.local" required>
      <input id="port" type="number" min="1" max="65535" value="47372" aria-label="Host port" required>
      <button type="submit">Connect</button>
    </form>
    <p class="muted">Before connecting, trust the Nexuzy Lab Local Network CA certificate supplied by your administrator. Then sign in with your staff account.</p>
  </main>
  <script>
    const hosts = document.querySelector('#hosts');
    const status = document.querySelector('#status');
    const selectHost = async (url) => {
      try {
        const response = await fetch('/api/host', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!response.ok) throw new Error('The host could not be saved.');
      } catch {
        status.textContent = 'Could not save this host setup. Please try again.';
        return;
      }
      window.location.href = url;
    };
    const render = async () => {
      try {
        const response = await fetch('/api/servers');
        const result = await response.json();
        hosts.replaceChildren();
        for (const server of result.servers) {
          const row = document.createElement('div');
          row.className = 'host';
          const name = document.createElement('span');
          name.textContent = server.name || server.host;
          const link = document.createElement('a');
          link.href = server.url;
          link.textContent = 'Open host';
          link.addEventListener('click', (event) => {
            event.preventDefault();
            selectHost(server.url);
          });
          row.append(name, link);
          hosts.append(row);
        }
        status.textContent = result.discoveryError
          ? 'Network discovery is unavailable. Enter the host name below.'
          : result.servers.length ? 'Select a host to sign in through this staff app.'
            : 'No host found yet. Check that the host is on and LAN access is enabled.';
      } catch {
        status.textContent = 'Could not refresh host discovery. You can still enter the host name below.';
      }
    };
    document.querySelector('#manual').addEventListener('submit', (event) => {
      event.preventDefault();
      const host = document.querySelector('#hostname').value.trim().replace(/\\.$/, '');
      const port = Number(document.querySelector('#port').value);
      if (!/^[a-z0-9.-]+$/i.test(host) || host.startsWith('.') || host.endsWith('.')
        || host.includes('..') || !Number.isInteger(port) || port < 1 || port > 65535) {
        status.textContent = 'Enter a host name (not a web address) and a valid port.';
        return;
      }
      selectHost('https://' + host + ':' + port + '/');
    });
    render();
    window.setInterval(render, 3000);
  </script>
</body>
</html>`;

function serviceUrl(service) {
  const address = service.addresses?.find((value) => isIP(String(value)) === 4);
  const host = String(address || service.host || '').replace(/\.$/, '');
  const port = Number(service.port);
  if (!(isIP(host) === 4 || /^[a-z0-9.-]+$/i.test(host)) || host.startsWith('.') || host.endsWith('.')
    || host.includes('..') || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port, url: `https://${host}:${port}/`, name: String(service.name || host) };
}

export async function createStaffClient({ BonjourClass = Bonjour, port = 0, configPath } = {}) {
  const servers = new Map();
  let discoveryError = '';
  const bonjour = new BonjourClass({}, (err) => {
    discoveryError = err.message;
    console.error(`LAN host discovery error: ${err.message}`);
  });
  const browser = bonjour.find({ type: 'nexuzy-ledger', protocol: 'tcp' });
  browser.on('up', (service) => {
    const found = serviceUrl(service);
    if (found) servers.set(found.url, found);
  });
  browser.on('down', (service) => {
    const found = serviceUrl(service);
    if (found) servers.delete(found.url);
  });

  const readSavedHost = () => {
    if (!configPath || !fs.existsSync(configPath)) return '';
    try {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8')).hostUrl;
      return typeof saved === 'string' && /^https:\/\/[^/]+(:[1-9][0-9]*)?\/$/.test(saved) ? saved : '';
    } catch {
      return '';
    }
  };
  const writeSavedHost = (hostUrl) => {
    savedHost = hostUrl;
    if (!configPath) return;
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify({ hostUrl }, null, 2)}\n`, 'utf8');
  };
  let savedHost = readSavedHost();

  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (request.method === 'POST' && pathname === '/api/host') {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        try {
          const url = JSON.parse(body).url;
          if (typeof url !== 'string' || !/^https:\/\/[^/]+(:[1-9][0-9]*)?\/$/.test(url)) throw new Error('Invalid host URL.');
          writeSavedHost(url);
          response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify({ saved: true, url }));
        } catch (error) {
          response.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/host/reset') {
      writeSavedHost('');
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ saved: false }));
      return;
    }
    if (request.method === 'GET' && pathname === '/api/servers') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ servers: [...servers.values()], discoveryError }));
      return;
    }
    if (request.method === 'GET' && pathname === '/') {
      const query = new URL(request.url, 'http://127.0.0.1').searchParams;
      if (savedHost && !query.has('setup')) {
        response.writeHead(302, { Location: savedHost, 'Cache-Control': 'no-store' });
        response.end();
        return;
      }
      if (query.has('setup') && savedHost) writeSavedHost('');
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(PAGE);
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  const localUrl = `http://127.0.0.1:${address.port}/`;
  let idleTimer;
  const close = async () => {
    clearTimeout(idleTimer);
    browser.stop();
    bonjour.destroy();
    await new Promise((resolve) => server.close(resolve));
  };
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(close, 15 * 60 * 1000);
    idleTimer.unref();
  };
  server.on('request', resetIdleTimer);
  resetIdleTimer();
  return { server, localUrl, close, servers };
}
