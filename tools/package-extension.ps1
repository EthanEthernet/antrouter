# Builds dist/antrouter-extension.zip (and an unzipped copy) with only the files the Chrome extension needs.
# Usage, from the repo root:  powershell -ExecutionPolicy Bypass -File tools/package-extension.ps1
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'antrouter-extension'
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force $stage | Out-Null
foreach ($p in 'manifest.json', 'index.html', 'css', 'src', 'icons') { Copy-Item -Recurse (Join-Path $root $p) $stage }
$zip = Join-Path $dist 'antrouter-extension.zip'
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Write-Output "Built $zip"
