$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$expo = Join-Path $root 'expo'
$artifactDir = Join-Path $root 'artifacts\apk\production'

function Step([string]$label) {
  Write-Host "`n[$label]" -ForegroundColor Cyan
}

try {
  Set-Location -LiteralPath $expo

  Step '1/5 CHECK LOCAL ANDROID TOOLCHAIN'
  if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Java non trovato nel PATH' }
  Write-Host "Java: $(java -version 2>&1 | Select-Object -First 1)"

  Step '2/5 TYPECHECK'
  npm run typecheck

  Step '3/5 LINT'
  npm run lint

  Step '4/5 TESTS'
  npm test

  Step '5/5 LOCAL GRADLE RELEASE APK'
  Write-Host 'Build locale: android/app/build/outputs/apk/release/app-release.apk' -ForegroundColor Yellow
  Push-Location (Join-Path $expo 'android')
  try {
    .\gradlew.bat :app:assembleRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed' }
  }
  finally {
    Pop-Location
  }

  New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
  $apk = Join-Path $expo 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path -LiteralPath $apk)) { throw "APK non trovato: $apk" }
  $target = Join-Path $artifactDir 'phyrexian-arena-production.apk'
  Copy-Item -LiteralPath $apk -Destination $target -Force

  Write-Host "`nBUILD OK. APK directory: $artifactDir" -ForegroundColor Green
  Get-Item -LiteralPath $target | Select-Object FullName, Length, LastWriteTime
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
