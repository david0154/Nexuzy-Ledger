#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import forge from 'node-forge';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexuzy-auth-test-'));
const localPort = await findPort();
const child = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: {
    ...process.env,
    NEXUZY_DATA_DIR: dataDir,
    NEXUZY_PORT: String(localPort),
    NEXUZY_LAN_BIND_ADDRESS: '127.0.0.1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
child.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
child.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

const base = `http://127.0.0.1:${localPort}`;
const headersFor = (cookie, extra = {}) => ({
  ...(cookie ? { Cookie: cookie } : {}),
  ...extra,
});
async function request(pathname, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headersFor(cookie, headers),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* preserve non-JSON response for assertion messages */ }
  return { response, json, text };
}
async function requestTls(port, pathname, { method = 'GET', body, cookie, headers = {}, ca } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(`https://127.0.0.1:${port}${pathname}`, {
      method,
      rejectUnauthorized: !!ca,
      ...(ca ? { ca } : {}),
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headersFor(cookie, headers),
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { /* certificate download */ }
        resolve({ response, json, text });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
function cookieFrom(response) {
  const cookie = response.headers.get('set-cookie') || '';
  assert.match(cookie, /HttpOnly/i, 'session cookie must be HttpOnly');
  assert.match(cookie, /SameSite=Strict/i, 'session cookie must be SameSite=Strict');
  return cookie.split(';', 1)[0];
}
async function findPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}
async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Test server exited early:\n${serverOutput}`);
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Test server did not start:\n${serverOutput}`);
}

try {
  await waitForServer();
  const initialStatus = await request('/api/auth/status');
  assert.equal(initialStatus.json.setupRequired, true);
  assert.equal((await request('/api/profile')).response.status, 200, 'existing single-device use remains open until first account setup');
  assert.equal((await request('/api/profile', { headers: { Origin: 'http://untrusted.example' } })).response.status, 403);
  assert.equal((await request('/api/network', {
    method: 'POST',
    body: { enabled: true },
  })).response.status, 403, 'LAN access cannot be enabled before creating an administrator');

  const adminPassword = 'Owner26!';
  assert.equal((await request('/api/auth/setup', {
    method: 'POST', body: { username: 'short-owner', password: '12345' },
  })).response.status, 400, 'administrator passwords shorter than six characters are rejected');
  assert.equal((await request('/api/auth/setup', {
    method: 'POST', body: { username: 'long-owner', password: '12345678901234567' },
  })).response.status, 400, 'administrator passwords longer than 16 characters are rejected');
  const setup = await request('/api/auth/setup', {
    method: 'POST',
    body: { username: 'owner', password: adminPassword },
  });
  assert.equal(setup.response.status, 200, setup.text);
  const adminCookie = cookieFrom(setup.response);
  assert.equal(setup.json.user.role, 'admin');
  assert.equal((await request('/api/auth/setup', {
    method: 'POST',
    body: { username: 'second-owner', password: adminPassword },
  })).response.status, 409, 'only one bootstrap administrator can be created');
  assert.equal((await request('/api/profile')).response.status, 401, 'business APIs require a session after setup');
  assert.equal((await request('/api/profile', { cookie: adminCookie })).response.status, 200);

  const staffCreate = await request('/api/auth/users', {
    method: 'POST',
    cookie: adminCookie,
    body: { username: 'clerk', password: 'Staff26!' },
  });
  assert.equal(staffCreate.response.status, 201, staffCreate.text);
  assert.equal(staffCreate.json.user.role, 'staff');
  assert.deepEqual(staffCreate.json.user.roles, ['billing'], 'new staff default to the billing role');
  assert.equal((await request('/api/auth/users', {
    method: 'POST', cookie: adminCookie, body: { username: 'short-clerk', password: '12345' },
  })).response.status, 400, 'staff passwords shorter than six characters are rejected');
  assert.equal((await request('/api/auth/users', {
    method: 'POST', cookie: adminCookie, body: { username: 'long-clerk', password: '12345678901234567' },
  })).response.status, 400, 'staff passwords longer than 16 characters are rejected');
  assert.equal(JSON.stringify(staffCreate.json).includes('passwordHash'), false, 'account hashes must never be returned');
  const staffLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'clerk', password: 'Staff26!' },
  });
  assert.equal(staffLogin.response.status, 200, staffLogin.text);
  const staffCookie = cookieFrom(staffLogin.response);
  assert.equal((await request('/api/profile', { cookie: staffCookie })).response.status, 200);
  assert.equal((await request('/api/clients', { cookie: staffCookie })).response.status, 200, 'billing staff can view clients');
  const payrollReadDenied = await request('/api/meta/payroll', { cookie: staffCookie });
  assert.equal(payrollReadDenied.response.status, 403, 'billing staff cannot view payroll data');
  assert.equal(payrollReadDenied.json.code, 'ROLE_REQUIRED');
  assert.equal((await request('/api/purchases', { cookie: staffCookie })).response.status, 403,
    'billing staff cannot view purchase records');
  assert.equal((await request('/api/local-prefs', { cookie: staffCookie })).response.status, 200, 'staff can restore shared invoice preferences');
  assert.equal((await request('/api/local-prefs', {
    method: 'POST',
    cookie: staffCookie,
    body: { set: { gst_businessType: 'retail' }, remove: [] },
  })).response.status, 403, 'staff cannot change shared application settings through the API');
  assert.equal((await request('/api/local-prefs', {
    method: 'POST',
    cookie: adminCookie,
    body: { set: { gst_businessType: 'retail' }, remove: [] },
  })).response.status, 200, 'the administrator can save shared application settings');
  assert.equal((await request('/api/profile', { method: 'POST', cookie: staffCookie, body: { businessName: 'Blocked' } })).response.status, 403);
  assert.equal((await request('/api/clients', {
    method: 'POST', cookie: staffCookie, body: { name: 'Role test customer' },
  })).response.status, 200, 'billing staff can add clients');
  const inventoryDenied = await request('/api/products', {
    method: 'POST', cookie: staffCookie, body: { name: 'Blocked product' },
  });
  assert.equal(inventoryDenied.response.status, 403);
  assert.equal(inventoryDenied.json.code, 'ROLE_REQUIRED', 'billing staff cannot write inventory');
  assert.equal((await request(`/api/auth/users/${staffCreate.json.user.id}`, {
    method: 'PATCH', cookie: adminCookie, body: { roles: [] },
  })).response.status, 400, 'empty role assignments are rejected');
  const inventoryPayrollRoles = await request(`/api/auth/users/${staffCreate.json.user.id}`, {
    method: 'PATCH', cookie: adminCookie, body: { roles: ['inventory', 'payroll'] },
  });
  assert.deepEqual(inventoryPayrollRoles.json.user.roles, ['inventory', 'payroll']);
  assert.equal((await request('/api/products', {
    method: 'POST', cookie: staffCookie, body: { name: 'Allowed product' },
  })).response.status, 200, 'inventory staff can write products');
  assert.equal((await request('/api/meta/payroll', {
    method: 'POST', cookie: staffCookie, body: { value: { test: true } },
  })).response.status, 200, 'payroll staff can save payroll records');
  assert.equal((await request('/api/meta/payroll', { cookie: staffCookie })).response.status, 200,
    'payroll staff can view payroll records');
  assert.equal((await request('/api/clients', {
    method: 'POST', cookie: staffCookie, body: { name: 'Blocked customer' },
  })).response.status, 403, 'inventory staff cannot write billing records');
  assert.equal((await request('/api/clients', { cookie: staffCookie })).response.status, 403,
    'inventory staff cannot view billing clients');
  const readOnlyRoles = await request(`/api/auth/users/${staffCreate.json.user.id}`, {
    method: 'PATCH', cookie: adminCookie, body: { roles: ['readOnly'] },
  });
  assert.deepEqual(readOnlyRoles.json.user.roles, ['readOnly']);
  assert.equal((await request('/api/products', { cookie: staffCookie })).response.status, 200,
    'read-only staff can view business data');
  assert.equal((await request('/api/meta/payroll', { cookie: staffCookie })).response.status, 200,
    'read-only staff can view payroll data');
  assert.equal((await request('/api/products', {
    method: 'POST', cookie: staffCookie, body: { name: 'Blocked read-only product' },
  })).response.status, 403, 'read-only staff cannot change business records');
  assert.equal((await request('/api/meta/payroll', {
    method: 'POST', cookie: staffCookie, body: { value: {} },
  })).response.status, 403, 'read-only staff cannot change payroll records');
  assert.equal((await request('/api/auth/users', { cookie: staffCookie })).response.status, 403);
  assert.equal((await request('/api/network', { cookie: staffCookie })).response.status, 403);
  assert.equal((await request('/api/control-panel/status', { cookie: staffCookie })).response.status, 403);
  assert.equal((await request('/api/bills', { cookie: staffCookie, headers: { Origin: 'http://untrusted.example' } })).response.status, 403);

  const networkEnabled = await request('/api/network', {
    method: 'POST',
    cookie: adminCookie,
    body: { enabled: true },
  });
  assert.equal(networkEnabled.response.status, 200, networkEnabled.text);
  const tlsStatus = await requestTls(networkEnabled.json.port, '/api/auth/status');
  assert.equal(tlsStatus.response.statusCode, 200, tlsStatus.text);
  assert.equal((await requestTls(networkEnabled.json.port, '/api/profile')).response.statusCode, 401);
  assert.equal((await requestTls(networkEnabled.json.port, '/api/profile', {
    cookie: adminCookie,
    headers: { Origin: 'https://untrusted.example' },
  })).response.statusCode, 403);
  const certificate = await requestTls(networkEnabled.json.port, '/api/network/certificate', { cookie: adminCookie });
  assert.equal(certificate.response.statusCode, 200);
  assert.match(certificate.text, /BEGIN CERTIFICATE/);
  const caCert = forge.pki.certificateFromPem(certificate.text);
  assert.equal(caCert.subject.getField('CN').value, 'Nexuzy Lab Local Network CA');
  assert.equal(caCert.subject.getField('O').value, 'Nexuzy Lab');
  assert.match(certificate.response.headers['content-disposition'], /Nexuzy-Lab-LAN-CA\.cer/);
  assert.equal((await requestTls(networkEnabled.json.port, '/api/auth/status', { ca: certificate.text })).response.statusCode, 200,
    'the downloaded local CA must validate the HTTPS server certificate');
  const secureLogin = await requestTls(networkEnabled.json.port, '/api/auth/login', {
    method: 'POST',
    body: { username: 'owner', password: adminPassword },
    ca: certificate.text,
  });
  assert.equal(secureLogin.response.statusCode, 200, secureLogin.text);
  assert.match(secureLogin.response.headers['set-cookie'].join(';'), /; Secure/i, 'HTTPS sessions must use Secure cookies');

  const passwordChange = await request('/api/auth/password', {
    method: 'POST',
    cookie: adminCookie,
    body: { currentPassword: adminPassword, newPassword: 'Owner27!' },
  });
  assert.equal(passwordChange.response.status, 200, passwordChange.text);
  assert.equal((await request('/api/auth/password', {
    method: 'POST', cookie: cookieFrom(passwordChange.response),
    body: { currentPassword: 'Owner27!', newPassword: '12345' },
  })).response.status, 400, 'password changes enforce the six-character minimum');
  assert.equal((await request('/api/auth/password', {
    method: 'POST', cookie: cookieFrom(passwordChange.response),
    body: { currentPassword: 'Owner27!', newPassword: '12345678901234567' },
  })).response.status, 400, 'password changes enforce the 16-character maximum');
  const changedAdminCookie = cookieFrom(passwordChange.response);
  assert.equal((await request('/api/profile', { cookie: adminCookie })).response.status, 401, 'changing a password invalidates old sessions');
  assert.equal((await request('/api/profile', { cookie: changedAdminCookie })).response.status, 200);

  const disableStaff = await request(`/api/auth/users/${staffCreate.json.user.id}`, {
    method: 'PATCH',
    cookie: changedAdminCookie,
    body: { active: false },
  });
  assert.equal(disableStaff.response.status, 200);
  assert.equal((await request('/api/profile', { cookie: staffCookie })).response.status, 401, 'deactivation revokes existing sessions');
  assert.equal((await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'clerk', password: 'Staff26!' },
  })).response.status, 401);

  const networkDisabled = await request('/api/network', {
    method: 'POST',
    cookie: changedAdminCookie,
    body: { enabled: false },
  });
  assert.equal(networkDisabled.response.status, 200, networkDisabled.text);
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal((await request('/api/network', { cookie: changedAdminCookie })).json.enabled, false);
  assert.equal((await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'owner', password: 'Owner27!' },
  })).response.status, 200, 'a successful login resets the failed-attempt counter');
  const failedLogins = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'owner', password: 'incorrect-password' },
    });
    failedLogins.push(result.response.status);
  }
  assert.deepEqual(failedLogins, [401, 401, 401, 401, 429], 'repeated failed logins must trigger throttling');

  console.log('Auth integration tests passed: bootstrap, session protection, staff/admin roles, password changes, login throttling, LAN HTTPS, certificate download, origin checks, and single-device compatibility.');
} finally {
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    const timeout = setTimeout(resolve, 3500);
    child.once('exit', () => { clearTimeout(timeout); resolve(); });
  });
  fs.rmSync(dataDir, { recursive: true, force: true });
}
