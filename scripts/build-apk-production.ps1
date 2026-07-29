param(
  [string]$Version = '7.0.0'
)

$ErrorActionPreference = 'Stop'
$batch = Join-Path $PSScriptRoot 'build-apk-production.bat'

& $batch $Version '--no-pause'
if ($LASTEXITCODE -ne 0) {
  throw "Android production build failed with exit code $LASTEXITCODE"
}
