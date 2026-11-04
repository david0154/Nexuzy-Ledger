import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const stage = path.join(root, 'release-build', 'staff-desktop-stage');
const output = path.join(root, 'release-build', 'staff-desktop');
const iconSource = path.join(root, 'public', 'icons', 'icon-512.png');
const icons = path.join(stage, 'icons');
const sharp = require('sharp');
const target = process.argv[2] || (process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux');
const targetArgs = target === 'win' ? ['--win', 'nsis']
  : target === 'mac' ? ['--mac', 'dmg']
    : target === 'linux' ? ['--linux', 'deb', 'AppImage'] : null;
if (!targetArgs) throw new Error(`Unknown staff desktop target "${target}". Use win, mac, or linux.`);

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(icons, { recursive: true });
fs.mkdirSync(output, { recursive: true });
for (const legacyAsset of [
  'Nexuzy-Ledger-Staff-Client.zip',
  `Nexuzy-Ledger-Staff-Client-v${version}.zip`,
]) {
  fs.rmSync(path.join(root, 'release-build', legacyAsset), { force: true });
}

await build({
  entryPoints: [path.join(root, 'scripts', 'staff-electron-main.mjs')],
  outfile: path.join(stage, 'main.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  packages: 'bundle',
  external: ['electron'],
});
fs.copyFileSync(iconSource, path.join(stage, 'app-icon.png'));
fs.copyFileSync(iconSource, path.join(icons, 'app-icon.png'));
fs.copyFileSync(path.join(root, 'release-templates', '_system-scripts', 'app-icon.ico'), path.join(stage, 'app-icon.ico'));
fs.writeFileSync(path.join(stage, 'package.json'), `${JSON.stringify({
  name: 'nexuzy-ledger-staff',
  productName: 'Nexuzy Ledger Staff',
  version,
  description: 'Nexuzy Lab offline LAN client for Nexuzy Ledger staff accounts.',
  author: 'Nexuzy Lab <info@nexuzy.in>',
  homepage: 'https://nexuzy.in',
  license: 'MIT',
  type: 'commonjs',
  main: 'main.cjs',
}, null, 2)}\n`);

if (target === 'mac') {
  const iconset = path.join(icons, 'NexuzyLedger.iconset');
  fs.mkdirSync(iconset, { recursive: true });
  for (const [name, size] of [
    ['icon_16x16.png', 16], ['icon_16x16@2x.png', 32], ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64], ['icon_128x128.png', 128], ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256], ['icon_256x256@2x.png', 512], ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024],
  ]) {
    await sharp(iconSource).resize(size, size).png().toFile(path.join(iconset, name));
  }
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(icons, 'app-icon.icns')], { stdio: 'inherit' });
  fs.rmSync(iconset, { recursive: true, force: true });
}

const electronVersion = require('electron/package.json').version;
const config = {
  appId: 'in.nexuzy.ledger.staff',
  productName: 'Nexuzy Ledger Staff',
  electronVersion,
  directories: { output },
  files: ['main.cjs', 'package.json'],
  extraResources: [{ from: icons, to: '.' }, { from: path.join(stage, 'app-icon.ico'), to: 'app-icon.ico' }],
  artifactName: `Nexuzy-Ledger-Staff-${target === 'win' ? 'Windows-Setup' : target === 'mac' ? 'macOS' : 'Linux'}-${version}.\${ext}`,
  publish: null,
};
if (target === 'win') {
  config.win = { icon: path.join(stage, 'app-icon.ico'), target: ['nsis'] };
  config.nsis = {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    runAfterFinish: false,
  };
}
if (target === 'mac') {
  config.mac = { icon: path.join(icons, 'app-icon.icns'), target: ['dmg'], category: 'public.app-category.business' };
  config.dmg = { title: 'Nexuzy Ledger Staff' };
}
if (target === 'linux') {
  config.linux = {
    icon: path.join(icons, 'app-icon.png'),
    target: ['deb', 'AppImage'],
    category: 'Office',
  };
}
const configPath = path.join(stage, 'electron-builder.config.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
execFileSync(process.execPath, [
  require.resolve('electron-builder/cli.js'),
  '--projectDir', stage,
  '--config', configPath,
  ...targetArgs,
], { cwd: root, stdio: 'inherit' });
const stableNames = {
  win: {
    'Nexuzy-Ledger-Staff-Windows-Setup-': { '.exe': 'Nexuzy-Ledger-Staff-Windows-Setup.exe' },
  },
  mac: {
    'Nexuzy-Ledger-Staff-macOS-': { '.dmg': 'Nexuzy-Ledger-Staff-macOS.dmg' },
  },
  linux: {
    'Nexuzy-Ledger-Staff-Linux-': {
      '.deb': 'Nexuzy-Ledger-Staff-Linux.deb',
      '.AppImage': 'Nexuzy-Ledger-Staff-Linux.AppImage',
    },
  },
}[target];
for (const [prefix, extensions] of Object.entries(stableNames)) {
  for (const [extension, stableName] of Object.entries(extensions)) {
    const versionedName = `${prefix}${version}${extension}`;
    const versionedPath = path.join(output, versionedName);
    if (fs.existsSync(versionedPath)) {
      fs.copyFileSync(versionedPath, path.join(root, 'release-build', stableName));
    }
  }
}
for (const extensions of Object.values(stableNames)) {
  for (const filename of Object.values(extensions)) {
    if (!fs.existsSync(path.join(root, 'release-build', filename))) {
      throw new Error(`The ${target} installer was not created: ${filename}`);
    }
  }
}
console.log(`Staff client ${target} package built in ${output}`);
