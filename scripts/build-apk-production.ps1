$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$expo = Join-Path $root 'expo'
$artifactDir = Join-Path $root 'artifacts\apk\production'

function Step([string]$label) {
  Write-Host "`n[$label]" -ForegroundColor Cyan
}

try {
  Set-Location -LiteralPath $expo

  Step '1/5 CHECK EAS AUTH'
  npx eas-cli whoami
  if ($LASTEXITCODE -ne 0) { throw 'EAS auth missing. Run: npx eas-cli login' }

  Step '2/5 TYPECHECK'
  npm run typecheck

  Step '3/5 LINT'
  npm run lint

  Step '4/5 TESTS'
  npm test

  Step '5/5 EAS PRODUCTION APK'
  Write-Host 'Profile: production-apk | environment: production | artifact: APK' -ForegroundColor Yellow
  npx eas-cli build --platform android --profile production-apk --wait --build-logger-level info
  if ($LASTEXITCODE -ne 0) { throw 'EAS build failed' }

  New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
  Set-Location -LiteralPath $artifactDir
  Write-Host "`nDownloading latest APK artifact..." -ForegroundColor Cyan
  npx eas-cli build:download --platform android --non-interactive
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'Build completed, artifact download failed. Use EAS URL shown above.' -ForegroundColor Yellow
    exit 2
  }

  Write-Host "`nBUILD OK. APK directory: $artifactDir" -ForegroundColor Green
  Get-ChildItem -LiteralPath $artifactDir -Filter '*.apk' | Select-Object FullName, Length, LastWriteTime
  exit 0
}
catch {
  Write-Host "`nBUILD FAILED: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
finally {
  Write-Host "`nTerminale resta aperto. Premi INVIO per chiudere." -ForegroundColor DarkGray
  Read-Host
}
