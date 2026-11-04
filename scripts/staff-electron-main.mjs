import { app, BrowserWindow, dialog } from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createStaffClient } from './staff-client.mjs';

let client;
let closing = false;

app.setName('Nexuzy Ledger Staff');
app.setAppUserModelId('in.nexuzy.ledger.staff');
function writeStartupLog(message) {
  try {
    fs.appendFileSync(path.join(app.getPath('userData'), 'startup.log'), `[${new Date().toISOString()}] ${message}\n`);
  } catch (err) {
    console.error(`Could not write staff startup log: ${err.message}`);
  }
}
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
writeStartupLog(`Main process loaded; single-instance lock: ${hasInstanceLock}.`);

async function ensureDesktopLauncher() {
  const desktop = app.getPath('desktop');
  fs.mkdirSync(desktop, { recursive: true });
  const desktopPath = path.join(desktop, 'Nexuzy Ledger Staff.desktop');
  const executable = process.env.APPIMAGE || app.getPath('exe');
  if (process.platform === 'linux') {
    const icon = path.join(process.resourcesPath, 'app-icon.png');
    const quote = (value) => `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
    const contents = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Nexuzy Ledger Staff',
      'Comment=Connect to your Nexuzy Ledger business host',
      `Exec=${quote(executable)}`,
      `Icon=${icon}`,
      'Terminal=false',
      'Categories=Office;Finance;',
      '',
    ].join('\n');
    fs.writeFileSync(desktopPath, contents, { mode: 0o755 });
    fs.chmodSync(desktopPath, 0o755);
    const child = spawn('gio', ['set', desktopPath, 'metadata::trusted', 'true'], { stdio: 'ignore' });
    child.once('error', (err) => console.error(`Could not mark the desktop launcher as trusted: ${err.message}`));
    return;
  }
  if (process.platform === 'darwin') {
    const appBundle = path.resolve(path.dirname(executable), '..', '..');
    const aliasPath = path.join(desktop, 'Nexuzy Ledger Staff.app');
    if (fs.existsSync(aliasPath)) return;
    const appleScriptPath = appBundle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const child = spawn('osascript', ['-e',
      `tell application "Finder" to make alias file to POSIX file "${appleScriptPath}" at desktop with properties {name:"Nexuzy Ledger Staff.app"}`,
    ], { stdio: 'ignore' });
    child.once('error', (err) => console.error(`Could not create the desktop alias: ${err.message}`));
  }
}

async function openStaffWindow() {
  client = await createStaffClient({
    configPath: path.join(app.getPath('userData'), 'staff-host.json'),
  });
  const window = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 560,
    minHeight: 520,
    title: 'Nexuzy Ledger Staff',
    icon: path.join(process.resourcesPath, process.platform === 'win32' ? 'app-icon.ico' : 'app-icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let connectionErrorShown = false;
  const showConnectionError = (url, reason) => {
    if (connectionErrorShown || window.isDestroyed() || window.webContents.isDestroyed()) return;
    connectionErrorShown = true;
    const certificateError = /cert|authority|issuer/i.test(reason);
    const title = certificateError ? 'Secure connection needs setup' : 'Could not connect to the business host';
    const details = certificateError
      ? 'This computer does not trust the Nexuzy Lab Local Network CA yet. The connection was blocked to protect your sign-in.'
      : 'Check that the host computer is on, secure LAN access is enabled, and both computers are on the same local network.';
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
      <title>Nexuzy Ledger Staff</title><style>
      *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f3f6fb;color:#172033;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
      main{width:min(620px,100%);padding:32px;background:#fff;border:1px solid #dfe6f0;border-radius:18px;box-shadow:0 16px 48px #13233a14}
      h1{font-size:1.5rem;margin:0 0 12px}p{color:#586579}.host{overflow-wrap:anywhere;font-family:ui-monospace,monospace;font-size:.9rem}
      a{display:inline-block;margin-top:12px;padding:10px 14px;border-radius:9px;background:#2563eb;color:#fff;text-decoration:none;font-weight:650}
      </style><main><h1>${title}</h1><p>${details}</p>
      ${certificateError ? '<p>On the host computer, open <b>Settings → Users &amp; devices</b> and download the LAN certificate. Transfer it to this device and install it in the operating system’s trusted root certificate store, then reopen this staff app and try again.</p><p>On Windows, install the certificate for the current user under <b>Trusted Root Certification Authorities</b>. Do not bypass certificate warnings.</p>' : ''}
      <p class="host">Host: ${String(url).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</p>
      <p class="host">Details: ${String(reason).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</p>
      <a href="${client.localUrl}?setup=1">Change host</a></main></html>`;
    writeStartupLog(`Host navigation failed (${reason}) for ${url}.`);
    window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  };
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && validatedURL.startsWith('https://')) {
      showConnectionError(validatedURL, `${errorDescription} (${errorCode})`);
    }
  });
  const handleCertificateError = (event, webContents, url, error, _certificate, callback) => {
    if (webContents !== window.webContents) return;
    event.preventDefault();
    callback(false);
    showConnectionError(url, error);
  };
  app.on('certificate-error', handleCertificateError);
  window.webContents.on('console-message', (_event, details) => {
    if (details.level >= 2) {
      writeStartupLog(`Renderer console error: ${details.message} (${details.sourceId}:${details.lineNumber}).`);
    }
  });
  window.on('closed', () => {
    app.removeListener('certificate-error', handleCertificateError);
    app.quit();
  });
  await window.loadURL(client.localUrl);
}

app.on('second-instance', () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});

app.whenReady().then(async () => {
  writeStartupLog('Electron ready event received.');
  if (!hasInstanceLock) return;
  try {
    console.log('Nexuzy Ledger Staff is starting.');
    await ensureDesktopLauncher();
    writeStartupLog('Desktop integration checked.');
    await openStaffWindow();
    writeStartupLog('Staff application window opened.');
    console.log('Nexuzy Ledger Staff window is ready.');
  } catch (err) {
    const message = `Nexuzy Ledger Staff could not start:\n\n${err.message}`;
    writeStartupLog(message);
    console.error(message, err);
    dialog.showErrorBox('Nexuzy Ledger Staff', message);
    app.quit();
  }
});

app.on('before-quit', (event) => {
  if (closing || !client) return;
  event.preventDefault();
  closing = true;
  client.close().then(() => app.quit()).catch((err) => {
    console.error(`Could not cleanly stop LAN discovery: ${err.message}`);
    app.quit();
  });
});
