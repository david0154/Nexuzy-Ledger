# Nexuzy Ledger - Windows updater.
#
# Pulls the latest release ZIP from GitHub, extracts _system/ over
# the existing one, re-runs npm install. Data folder is preserved.
#
# Design decisions:
#   * Data folder never touched - user's invoices survive updates
#   * We fetch the newest published GitHub release, including pre-releases,
#     and use its release-note ZIP link when no asset was uploaded.
#   * Pre-update, we snapshot data/ to a timestamped backup as a
#     safety net - even though we don't touch data, hardware faults
#     during rmdir could corrupt state
#   * v1.10.75 - -InstallTo <installed app folder>: run from a newly
#     extracted ZIP, this updates THAT install from the files in this ZIP,
#     with no download. It works offline and does not depend on the older
#     copy's own updater. The launcher uses it when it finds the app already
#     installed elsewhere, instead of installing a second copy.

param(
  [string]$InstallTo = '',
  [string]$BackupDirectory = '',
  [string]$ShortcutTestRoot = ''
)

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Nexuzy Ledger - Update'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SystemDir = $ScriptDir
$RootDir   = Split-Path -Parent $ScriptDir
$FromFolder = ''
if ($InstallTo) {
  $FromFolder = $RootDir
  $RootDir   = $InstallTo.TrimEnd('\')
  $SystemDir = Join-Path $RootDir '_system'
  if (($RootDir -eq $FromFolder.TrimEnd('\')) -or -not (Test-Path -LiteralPath (Join-Path $SystemDir 'server.js'))) {
    Write-Host "  ERROR: no installed copy of the app in $RootDir." -ForegroundColor Red
    Read-Host '  Press Enter to close'
    exit 1
  }
}

Write-Host ''
Write-Host '  ============================================================'
Write-Host '   Nexuzy Ledger - Update'
Write-Host '  ============================================================'
Write-Host ''

function Get-AppVersion([string]$directory) {
  try {
    return [string](Get-Content -LiteralPath (Join-Path $directory 'package.json') -Raw | ConvertFrom-Json).version
  } catch {
    return $null
  }
}

function ConvertTo-ComparableVersion([string]$value) {
  if ($value -match '^\s*v?(\d+(?:\.\d+){1,3})') {
    try { return [version]$Matches[1] } catch { return $null }
  }
  return $null
}

$tmp = $null
if ($FromFolder) {
  Write-Host "  Updating $RootDir"
  Write-Host "  from the files in $FromFolder (no download needed)..."
  $sourceRoot = $FromFolder
  $newSystem  = Join-Path $FromFolder '_system'
} else {
# --- Step 2: Find latest published release, including pre-releases ---
Write-Host '  Checking latest release from GitHub...'
try {
  $releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/david0154/Nexuzy-Ledger/releases?per_page=10' -Headers @{ 'User-Agent' = 'NexuzyLedger-Updater' }
  $api = @($releases | Where-Object { -not $_.draft } | Select-Object -First 1)[0]
  if (-not $api) { throw 'No published release was found.' }
  $tag = $api.tag_name
  $zipAsset = @($api.assets | Where-Object { $_.name -match '^Nexuzy-Ledger(?:-v[\d.]+)?\.zip$' } | Select-Object -First 1)[0]
  if ($zipAsset) {
    $zipUrl = $zipAsset.browser_download_url
  } else {
    $attachment = [regex]::Match([string]$api.body, 'https://github\.com/user-attachments/files/[^\s)<>]+\.zip(?=[)\s]|$)')
    if (-not $attachment.Success) { throw "Release $tag has no downloadable app ZIP." }
    $zipUrl = $attachment.Value
  }
  $installedVersion = ConvertTo-ComparableVersion (Get-AppVersion $SystemDir)
  $publishedVersion = ConvertTo-ComparableVersion $tag
  if ($installedVersion -and $publishedVersion -and $publishedVersion -le $installedVersion) {
    Write-Host "  Nexuzy Ledger v$installedVersion is already current. No files or data were changed." -ForegroundColor Green
    Read-Host '  Press Enter to close'
    exit 0
  }
  Write-Host "  Latest: $tag"
} catch {
  Write-Host "  ERROR: could not reach GitHub. Are you online?" -ForegroundColor Red
  Read-Host '  Press Enter to close'
  exit 1
}

# --- Step 3: Download + extract on the install drive ---
# Keeping staging beside the installation avoids a second cross-drive copy.
$tmp = Join-Path $RootDir ".nexuzy-update-$([Guid]::NewGuid().ToString('N').Substring(0,8))"
New-Item -ItemType Directory -Path $tmp | Out-Null
$zipPath = Join-Path $tmp 'update.zip'
Write-Host '  Downloading update...'
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host '  Extracting...'
# v1.10.83 - the ZIP now carries about 12,000 package files. Expand-Archive
# takes minutes over that many; .NET's own unzip takes seconds.
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $tmp)

# The extract contains the release structure (root has the launchers and
# _system/). GitHub source archives are never used as app updates.
$extracted = Get-ChildItem -Path $tmp -Directory | Where-Object {
  Test-Path -LiteralPath (Join-Path $_.FullName '_system\server.js')
} | Select-Object -First 1
if (-not $extracted) {
  throw 'The downloaded ZIP does not contain a Nexuzy Ledger release. Nothing was changed.'
}
$candidateSystem = Join-Path $extracted.FullName '_system'
if (Test-Path $candidateSystem) {
  $sourceRoot = $extracted.FullName
  $newSystem  = $candidateSystem
}
}

if (-not $tmp) {
  $tmp = Join-Path $RootDir ".nexuzy-update-$([Guid]::NewGuid().ToString('N').Substring(0,8))"
  New-Item -ItemType Directory -Path $tmp | Out-Null
}

# --- Step 4: Validate the package and back up data before changing files ---
if (-not (Test-Path -LiteralPath (Join-Path $newSystem 'server.js')) -or
    -not (Test-Path -LiteralPath (Join-Path $newSystem 'package.json')) -or
    -not (Test-Path -LiteralPath (Join-Path $newSystem 'dist\index.html'))) {
  throw 'The downloaded package is incomplete (server.js, package.json or dist/index.html is missing). Nothing was changed.'
}

$dataDir = Join-Path $SystemDir 'data'
if (Test-Path -LiteralPath $dataDir) {
  $dataFiles = @(Get-ChildItem -LiteralPath $dataDir -Recurse -File -Force -ErrorAction Stop)
  if ($dataFiles.Count -gt 0) {
    $backupsHome = if ($BackupDirectory) { $BackupDirectory } else {
      Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Nexuzy Ledger  Backups'
    }
    New-Item -ItemType Directory -Path $backupsHome -Force | Out-Null
    $stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss-fff'
    $preUpdateBackup = Join-Path $backupsHome "pre-update-$stamp.zip"
    Write-Host "  Backing up your data to $preUpdateBackup ..."
    Compress-Archive -Path (Join-Path $dataDir '*') -DestinationPath $preUpdateBackup -Force
  }
}

# --- Step 5: Apply the package without touching business data ---
Write-Host '  Applying update (your data folder is untouched)...'
$shipped = (Test-Path -LiteralPath (Join-Path $newSystem 'server-bundle.json')) -or
  (Test-Path -LiteralPath (Join-Path $newSystem 'node_modules\express\package.json'))
$excludedDirs = @('data', 'Saved Invoices', 'Trash', 'node')
if (-not $shipped) { $excludedDirs += 'node_modules' }
$excludedDirs += @($excludedDirs | ForEach-Object { Join-Path $SystemDir $_ })
$excludedFiles = @('node-dir.txt', (Join-Path $SystemDir 'node-dir.txt'))
$hiddenBackup = Join-Path $tmp 'hidden-system-items'
New-Item -ItemType Directory -Path $hiddenBackup -Force | Out-Null
$hiddenItems = @(Get-ChildItem -LiteralPath $SystemDir -Force | Where-Object { $_.Name.StartsWith('.') })
foreach ($item in $hiddenItems) {
  Move-Item -LiteralPath $item.FullName -Destination $hiddenBackup -Force -ErrorAction Stop
}
try {
  $robocopyArgs = @(
    $newSystem, $SystemDir, '/MIR', '/MT:16', '/R:2', '/W:1', '/IS', '/IT',
    '/COPY:DAT', '/DCOPY:DAT', '/XJ', '/NFL', '/NDL', '/NJH', '/NJS',
    '/XD'
  ) + $excludedDirs + @('/XF') + $excludedFiles
  & robocopy.exe @robocopyArgs
  $copyCode = $LASTEXITCODE
  if ($copyCode -ge 8) {
    throw "Robocopy could not apply the update (exit code $copyCode). Close Nexuzy Ledger and try again. Your data was not changed."
  }
} finally {
  foreach ($item in $hiddenItems) {
    $saved = Join-Path $hiddenBackup $item.Name
    if (-not (Test-Path -LiteralPath $saved)) { continue }
    $target = Join-Path $SystemDir $item.Name
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop }
    Move-Item -LiteralPath $saved -Destination $SystemDir -Force -ErrorAction Stop
  }
}

$launchers = @(Get-ChildItem -LiteralPath $sourceRoot -File -Force | Where-Object {
  $_.Extension -match '^\.(hta|command|sh)$' -or $_.Name -match '^Nexuzy Ledger' -or $_.Name -eq 'READ ME FIRST.txt'
})
foreach ($launcher in $launchers) {
  Copy-Item -LiteralPath $launcher.FullName -Destination (Join-Path $RootDir $launcher.Name) -Force -ErrorAction Stop
}
$rootNames = @($launchers | ForEach-Object { $_.Name })
Get-ChildItem -LiteralPath $RootDir -File -Force | Where-Object {
  ($_.Name -like 'Nexuzy Ledger - *' -or $_.Name -eq 'READ ME FIRST.txt') -and $rootNames -notcontains $_.Name
} | Remove-Item -Force -ErrorAction Stop

# --- Step 5: Reinstall dependencies (safest - new package.json may add packages) ---
if (-not $shipped) { Write-Host '  Re-installing dependencies...' }
Push-Location $SystemDir
# v1.10.69 - Node.js may live inside the app folder (see install-windows.ps1).
# v1.10.81 (#109) - and it must be new enough: an old Node.js on PATH (6.10)
# brought npm 3, which broke the install, and this still said "complete".
. (Join-Path $SystemDir 'ensure-node.ps1')
$npmOk = $false
if ($shipped) {
  # Only Node.js itself may still be needed (fetched once if this PC has none).
  $npmOk = [bool](Use-GoodNode)
} elseif ((Use-GoodNode) -and (Test-InstallReady)) {
  if ($script:NodeWasFetched -or (Test-PackagesBroken)) { Reset-Packages }
  npm install --omit=dev --no-audit --no-fund --loglevel=error
  $npmOk = ($LASTEXITCODE -eq 0)
  if (-not $npmOk) { Show-InstallHelp }
}
Pop-Location
if (-not $npmOk) {
  if ($tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }
  Write-Host ''
  Write-Host '  The new version is in place, but it is not ready to run yet (see above).' -ForegroundColor Red
  Write-Host '  Your data is safe (a backup was made above). Fix the problem shown,'
  Write-Host '  then open the app from its icon: it finishes the install by itself.'
  Read-Host '  Press Enter to close'
  exit 1
}

# A manual ZIP update can be the first successful install on a computer with
# a missing or stale shortcut. Create working shortcuts only after the new
# server files are ready.
$shortcutScript = Join-Path $SystemDir 'app-shortcut.ps1'
if (Test-Path -LiteralPath $shortcutScript) {
  . $shortcutScript
  $shortcutDirs = if ($ShortcutTestRoot) {
    @((Join-Path $ShortcutTestRoot 'Desktop'), (Join-Path $ShortcutTestRoot 'Programs'))
  } else {
    @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
  }
  foreach ($dir in $shortcutDirs) {
    try {
      if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force -ErrorAction Stop | Out-Null
      }
      New-AppShortcut (Join-Path $dir 'Nexuzy Ledger.lnk') $SystemDir
    } catch {
      Write-Host "  WARNING: could not create the Nexuzy Ledger shortcut in $dir ($($_.Exception.Message))."
    }
  }
}

# --- Cleanup ---
if ($tmp) { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }

Write-Host ''
Write-Host '  [OK] Update complete!' -ForegroundColor Green
Write-Host '  Restart the app (Stop Server -> Open App) to run the new version.'
Write-Host ''
Read-Host '  Press Enter to close'
