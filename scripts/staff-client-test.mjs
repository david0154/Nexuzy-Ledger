import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStaffClient } from './staff-client.mjs';
import { advertiseLanService } from '../src/utils/lanDiscovery.js';

const browser = new EventEmitter();
browser.stop = () => { browser.stopped = true; };
class FakeBonjour {
  constructor(options, onError) {
    this.onError = onError;
  }
  find() { return browser; }
  destroy() { this.destroyed = true; }
}

const client = await createStaffClient({ BonjourClass: FakeBonjour });
try {
  assert.equal(client.server.address().address, '127.0.0.1', 'the helper must listen only on loopback');
  browser.emit('up', { host: 'office-pc.local.', addresses: ['fe80::1', '192.168.1.10'], port: 47372, name: 'Nexuzy Ledger (office-pc)' });
  browser.emit('up', { host: 'not-a-host/path', port: 47372, name: 'Invalid service' });
  const found = await fetch(new URL('/api/servers', client.localUrl)).then((response) => response.json());
  assert.equal(found.servers.length, 1, 'only valid discovered hosts are listed');
  assert.equal(found.servers[0].host, '192.168.1.10', 'discovery should prefer an IPv4 address to an unresolved .local name');
  assert.equal(found.servers[0].url, 'https://192.168.1.10:47372/');
  const page = await fetch(client.localUrl).then((response) => response.text());
  assert.match(page, /does not create a local business server or administrator/);
  assert.match(page, /Host name fallback/);
  browser.emit('down', { host: 'office-pc.local.', addresses: ['fe80::1', '192.168.1.10'], port: 47372 });
  const removed = await fetch(new URL('/api/servers', client.localUrl)).then((response) => response.json());
  assert.equal(removed.servers.length, 0, 'hosts are removed when they leave the network');
} finally {
  await client.close();
}
assert.equal(browser.stopped, true, 'the mDNS browser is stopped on exit');

const published = [];
let publisher;
class FakePublisher {
  constructor(options, onError) {
    publisher = this;
    this.onError = onError;
  }
  publish(options) { published.push(options); }
  unpublishAll(callback) { this.unpublished = true; callback(); }
  destroy() { this.destroyed = true; }
}
const advertisement = advertiseLanService({ hostname: 'office-pc.', port: 47372, BonjourClass: FakePublisher });
assert.deepEqual(published[0], {
  name: 'Nexuzy Ledger (office-pc)',
  type: 'nexuzy-ledger',
  protocol: 'tcp',
  host: 'office-pc.local',
  port: 47372,
  txt: { app: 'Nexuzy Ledger', tls: 'https' },
  disableIPv6: true,
});
await advertisement.close();
assert.equal(publisher.unpublished, true, 'the service is unpublished on shutdown');
assert.equal(publisher.destroyed, true, 'the mDNS socket is closed on shutdown');
console.log('PASS LAN service advertisement and teardown checks');
console.log('PASS staff client discovery and loopback checks');

const configPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nexuzy-staff-')), 'staff-host.json');
const configuredClient = await createStaffClient({ BonjourClass: FakeBonjour, configPath });
try {
  const saved = await fetch(new URL('/api/host', configuredClient.localUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://192.168.1.8:47372/' }),
  });
  assert.equal(saved.status, 200, 'the selected host is saved');
  const restartedClient = await createStaffClient({ BonjourClass: FakeBonjour, configPath });
  try {
    const redirected = await fetch(restartedClient.localUrl, { redirect: 'manual' });
    assert.equal(redirected.status, 302, 'the saved host opens automatically');
    assert.equal(redirected.headers.get('location'), 'https://192.168.1.8:47372/', 'the saved host URL is preserved');
    const setup = await fetch(`${restartedClient.localUrl}?setup=1`);
    assert.match(await setup.text(), /Host name fallback/, 'host setup can be reopened');
  } finally {
    await restartedClient.close();
  }
} finally {
  await configuredClient.close();
  fs.rmSync(path.dirname(configPath), { recursive: true, force: true });
}
