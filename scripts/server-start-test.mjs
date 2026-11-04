#!/usr/bin/env node
import { spawn } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import net from 'net';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'nexuzy-server-start-'));
const dataDir = join(work, 'data');
let blocker;
let child;

const listen = (server, port) => new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolveListen);
});

const close = (server) => new Promise((resolveClose, reject) => {
  server.close((error) => error ? reject(error) : resolveClose());
});

const findAdjacentPorts = async () => {
  for (let port = 20000; port < 45000; port += 1) {
    const first = net.createServer();
    const second = net.createServer();
    try {
      await listen(first, port);
      await listen(second, port + 1);
      await close(second);
      return { port, blocker: first };
    } catch (error) {
      if (first.listening) await close(first);
      if (second.listening) await close(second);
      if (error.code !== 'EADDRINUSE' && error.code !== 'EACCES') throw error;
    }
  }
  throw new Error('Could not reserve two adjacent local ports for the startup test.');
};

try {
  const reserved = await findAdjacentPorts();
  blocker = reserved.blocker;
  const port = reserved.port;
  child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, NEXUZY_DATA_DIR: dataDir, NEXUZY_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data) => { stdout += String(data); });
  child.stderr.on('data', (data) => { stderr += String(data); });

  const deadline = Date.now() + 15_000;
  let startedPort = null;
  while (Date.now() < deadline) {
    const match = stdout.match(/Nexuzy Ledger running at http:\/\/localhost:(\d+)/);
    if (match) {
      startedPort = Number(match[1]);
      break;
    }
    if (child.exitCode !== null) throw new Error(`Server exited ${child.exitCode}.\n${stdout}\n${stderr}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }

  if (!startedPort) throw new Error(`Server did not start after a port conflict.\n${stdout}\n${stderr}`);
  if (startedPort === port) throw new Error(`Server reported busy port ${port} as its active port.`);
  if (/Cannot read properties of null \(reading 'port'\)/i.test(`${stdout}\n${stderr}`)) {
    throw new Error(`The port-conflict callback dereferenced a null address.\n${stderr}`);
  }

  const health = await fetch(`http://127.0.0.1:${startedPort}/api/health`);
  const body = await health.json();
  if (!health.ok || body.ok !== true) throw new Error(`Health endpoint failed after recovery: ${health.status}`);
  console.log(`  ✓ busy port ${port} is skipped; server answers health checks on ${startedPort}`);
} catch (error) {
  console.error(`  x server port-conflict test failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    child.kill();
    await new Promise((resolveExit) => child.once('exit', resolveExit));
  }
  if (blocker && blocker.listening) await close(blocker);
  rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
