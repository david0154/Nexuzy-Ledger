#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync, statSync, utimesSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

if (process.platform !== 'win32') {
  console.log('  - Windows updater test skipped on this platform');
  process.exit(0);
}

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'nexuzy-update-windows-'));
const sourceRoot = join(work, 'New package');
const sourceSystem = join(sourceRoot, '_system');
const installedRoot = join(work, 'Installed app');
const installedSystem = join(installedRoot, '_system');
const backupDir = join(work, 'backups');
const shortcutRoot = join(work, 'shortcuts');
const updaterTemplate = join(root, 'release-templates', '_system-scripts', 'update-windows.ps1');
const ensureNode = join(root, 'release-templates', '_system-scripts', 'ensure-node.ps1');
const shortcutScript = join(root, 'release-templates', '_system-scripts', 'app-shortcut.ps1');
const installScript = join(root, 'install.ps1');
const updater = join(sourceSystem, 'update-windows.ps1');
const results = [];

const record = (pass, name, detail = '') => {
  results.push({ pass, name, detail });
  console.log(`  ${pass ? '✓' : 'x'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const put = (base, relative, contents) => {
  const file = join(base, relative);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, contents);
};

const hashTree = (dir) => {
  const files = [];
  const visit = (current, prefix = '') => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const rel = join(prefix, entry.name);
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) visit(absolute, rel);
      else files.push([rel, createHash('sha256').update(readFileSync(absolute)).digest('hex')]);
    }
  };
  visit(dir);
  return JSON.stringify(files.sort(([a], [b]) => a.localeCompare(b)));
};

const alignTimestamp = (source, destination) => {
  const stat = statSync(source);
  utimesSync(destination, stat.atime, stat.mtime);
};

try {
  for (const dir of [sourceSystem, installedSystem]) mkdirSync(dir, { recursive: true });
  copyFileSync(updaterTemplate, updater);
  copyFileSync(ensureNode, join(sourceSystem, 'ensure-node.ps1'));
  copyFileSync(shortcutScript, join(sourceSystem, 'app-shortcut.ps1'));
  put(sourceSystem, 'start-windows.ps1', 'param([switch]$AppWindow,[switch]$Hidden)\nexit 0\n');

  put(sourceSystem, 'package.json', JSON.stringify({ name: 'nexuzy-ledger', version: '1.10.88' }));
  put(sourceSystem, 'server.js', 'new server');
  put(sourceSystem, 'server-bundle.json', JSON.stringify({ format: 'esbuild', target: 'node18', version: '1.10.88' }));
  put(sourceSystem, 'dist/index.html', 'new app');
  put(sourceSystem, 'dist/new-file.js', 'new file');
  put(sourceSystem, 'data/package-must-not-copy.json', 'release data must never overwrite business data');
  put(sourceSystem, 'Saved Invoices/package-must-not-copy.pdf', 'release pdf');
  put(sourceSystem, '.user-note', 'release hidden file');
  put(sourceRoot, 'Nexuzy Ledger - WINDOWS.hta', 'new launcher');

  put(installedSystem, 'package.json', JSON.stringify({ name: 'nexuzy-ledger', version: '1.10.87' }));
  put(installedSystem, 'server.js', 'old server');
  put(installedSystem, 'dist/index.html', 'old app');
  put(installedSystem, 'dist/obsolete.js', 'stale app file');
  put(installedSystem, 'node_modules/express/package.json', JSON.stringify({ name: 'express', version: '1.0.0' }));
  put(installedSystem, 'node_modules/.package-lock.json', '{"old":"lock"}');
  put(installedSystem, 'data/accounts/business.json', '{"name":"Exact Business","address":"Keep this exactly"}');
  put(installedSystem, 'data/attachments/scan.bin', Buffer.from([0, 1, 2, 255, 13, 10]));
  put(installedSystem, 'Saved Invoices/INV-001.pdf', 'existing invoice');
  put(installedSystem, 'Trash/old-record.json', '{"keep":true}');
  put(installedSystem, 'node/custom-node.txt', 'user Node.js folder');
  put(installedSystem, 'node-dir.txt', 'custom-node-path');
  put(installedSystem, '.user-note', 'keep existing hidden file');
  put(installedSystem, 'obsolete-v1.txt', 'remove stale app file');
  alignTimestamp(join(sourceSystem, 'server.js'), join(installedSystem, 'server.js'));
  alignTimestamp(join(sourceSystem, 'dist/index.html'), join(installedSystem, 'dist/index.html'));

  const dataBefore = hashTree(join(installedSystem, 'data'));
  const invoiceBefore = readFileSync(join(installedSystem, 'Saved Invoices', 'INV-001.pdf'), 'utf8');
  const hiddenBefore = readFileSync(join(installedSystem, '.user-note'), 'utf8');
  const run = spawnSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', updater,
    '-InstallTo', installedRoot, '-BackupDirectory', backupDir,
    '-ShortcutTestRoot', shortcutRoot,
  ], { encoding: 'utf8', input: '\n', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });

  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`Updater exited ${run.status}.\n${run.stdout}\n${run.stderr}`);

  const output = `${run.stdout}\n${run.stderr}`;
  record(output.includes('Update complete'), 'Update completes from a local release package');
  record(JSON.parse(readFileSync(join(installedSystem, 'package.json'), 'utf8')).version === '1.10.88', 'Installed package version is overwritten');
  record(readFileSync(join(installedSystem, 'server.js'), 'utf8') === 'new server', 'Existing app files are replaced');
  record(readFileSync(join(installedSystem, 'dist/index.html'), 'utf8') === 'new app', 'Existing built UI is replaced');
  record(!existsSync(join(installedSystem, 'dist/obsolete.js')) && !existsSync(join(installedSystem, 'obsolete-v1.txt')), 'Stale app files are removed');
  record(existsSync(join(installedSystem, 'server-bundle.json')), 'Bundled server manifest is copied');
  record(!existsSync(join(installedSystem, 'node_modules')), 'Old node_modules are removed from the bundled update');
  record(hashTree(join(installedSystem, 'data')) === dataBefore, 'Business data files remain byte-for-byte unchanged');
  record(readFileSync(join(installedSystem, 'Saved Invoices', 'INV-001.pdf'), 'utf8') === invoiceBefore, 'Saved invoices remain unchanged');
  record(existsSync(join(installedSystem, 'Trash/old-record.json')), 'Trash is preserved');
  record(existsSync(join(installedSystem, 'node/custom-node.txt')) && readFileSync(join(installedSystem, 'node-dir.txt'), 'utf8') === 'custom-node-path', 'Portable Node.js settings are preserved');
  record(readFileSync(join(installedSystem, '.user-note'), 'utf8') === hiddenBefore, 'Existing hidden custom files are preserved');
  record(readFileSync(join(installedRoot, 'Nexuzy Ledger - WINDOWS.hta'), 'utf8') === 'new launcher', 'Launcher is refreshed');

  const backups = existsSync(backupDir) ? readdirSync(backupDir).filter((name) => name.startsWith('pre-update-') && name.endsWith('.zip')) : [];
  record(backups.length === 1, 'A pre-update business-data backup is created');
  const desktopShortcut = join(shortcutRoot, 'Desktop', 'Nexuzy Ledger.lnk');
  const startMenuShortcut = join(shortcutRoot, 'Programs', 'Nexuzy Ledger.lnk');
  record(existsSync(desktopShortcut) && existsSync(startMenuShortcut), 'Update creates Desktop and Start Menu shortcuts');
  const shortcutCheck = spawnSync('powershell.exe', [
    '-NoProfile', '-Command',
    '$w=New-Object -ComObject WScript.Shell; foreach($p in @($env:FGSB_DESKTOP_LINK,$env:FGSB_START_LINK)){if(-not (Test-Path -LiteralPath $p)){exit 1};$s=$w.CreateShortcut($p);if($s.Arguments -notmatch "start-windows\\.ps1"){exit 2}}',
  ], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, FGSB_DESKTOP_LINK: desktopShortcut, FGSB_START_LINK: startMenuShortcut },
  });
  record(shortcutCheck.status === 0, 'Created shortcuts point to the app server launcher');

  put(installedSystem, 'package.json', JSON.stringify({ name: 'nexuzy-ledger', version: '1.10.87' }));
  put(installedSystem, 'server.js', 'old server for repair');
  put(installedSystem, 'dist/index.html', 'old app for repair');
  put(installedSystem, 'dist/obsolete.js', 'stale app file');
  alignTimestamp(join(sourceSystem, 'server.js'), join(installedSystem, 'server.js'));
  alignTimestamp(join(sourceSystem, 'dist/index.html'), join(installedSystem, 'dist/index.html'));
  const archive = join(work, 'fixture.zip');
  const tarExe = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  const archiveRun = spawnSync(tarExe, ['-a', '-c', '-f', archive, '-C', work, 'New package'], {
    encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
  });
  if (archiveRun.error) throw archiveRun.error;
  if (archiveRun.status !== 0) throw new Error(`Could not create fixture ZIP.\n${archiveRun.stdout}\n${archiveRun.stderr}`);

  const installRun = spawnSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', installScript,
  ], {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      FREEGSTBILL_TEST: join(work, 'test-environment'),
      FREEGSTBILL_DIR: installedRoot,
      FREEGSTBILL_ZIP: archive,
    },
  });
  if (installRun.error) throw installRun.error;
  const installOutput = `${installRun.stdout}\n${installRun.stderr}`;
  if (installRun.status !== 0 || !installOutput.includes('Done! Opening Nexuzy Ledger')) {
    throw new Error(`One-line installer repair failed (exit ${installRun.status}).\n${installOutput}`);
  }
  record(true, 'One-line installer repairs the detected existing install');
  record(JSON.parse(readFileSync(join(installedSystem, 'package.json'), 'utf8')).version === '1.10.88', 'One-line installer overwrites existing files');
  record(readFileSync(join(installedSystem, 'server.js'), 'utf8') === 'new server', 'One-line installer replaces the server entry');
  record(readFileSync(join(installedSystem, 'dist/index.html'), 'utf8') === 'new app', 'One-line installer replaces the built UI');
  record(!existsSync(join(installedSystem, 'dist/obsolete.js')), 'One-line installer removes stale app files');
  record(hashTree(join(installedSystem, 'data')) === dataBefore, 'One-line installer preserves all business data byte-for-byte');
  record(readFileSync(join(installedSystem, '.user-note'), 'utf8') === hiddenBefore, 'One-line installer preserves custom hidden files');
  const testDesktop = join(work, 'test-environment', 'Desktop', 'Nexuzy Ledger.lnk');
  const testPrograms = join(work, 'test-environment', 'Programs', 'Nexuzy Ledger.lnk');
  record(existsSync(testDesktop) && existsSync(testPrograms), 'One-line installer creates Desktop and Start Menu shortcuts');
} catch (error) {
  record(false, 'Windows updater test setup and execution', error.message);
} finally {
  try { rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { }
}

const failed = results.filter((result) => !result.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} Windows updater checks passed\n`);
if (failed.length) process.exit(1);
