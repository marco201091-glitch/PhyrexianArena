$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$expo = Join-Path $root 'expo'
$artifactDir = Join-Path $root 'artifacts\apk\production'
$productionEnvFile = Join-Path $expo '.env.production.local'
$buildDrive = 'P:'
$buildDriveMounted = $false

function Step([string]$label) {
  Write-Host "`n[$label]" -ForegroundColor Cyan
}

try {
  Set-Location -LiteralPath $expo

  if (-not (Test-Path -LiteralPath $productionEnvFile)) {
    throw 'Missing expo/.env.production.local. Copy .env.production.example and insert Production keys.'
  }
  Get-Content -LiteralPath $productionEnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
      $separator = $line.IndexOf('=')
      if ($separator -gt 0) {
        [Environment]::SetEnvironmentVariable(
          $line.Substring(0, $separator),
          $line.Substring($separator + 1),
          'Process'
        )
      }
    }
  }

  $env:APP_VARIANT = 'production'
  $env:EXPO_PUBLIC_API_BASE_URL = 'https://app.phyrexianarena.dpdns.org'
  $env:EXPO_PUBLIC_SITE_URL = 'https://app.phyrexianarena.dpdns.org'
  $env:EXPO_PUBLIC_SUPABASE_URL = 'https://phyrexianarena.dpdns.org'
  node (Join-Path $PSScriptRoot 'verify-expo-build-env.mjs') production
  if ($LASTEXITCODE -ne 0) { throw 'Production environment gate failed' }

  Step '1/5 CHECK LOCAL ANDROID TOOLCHAIN'
  if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Java non trovato nel PATH' }
  Write-Host "Java: $(java --version | Select-Object -First 1)"

  Step '2/5 TYPECHECK'
  npm run typecheck

  Step '3/5 LINT'
  npm run lint

  Step '4/5 TESTS'
  npm test

  Step '5/5 LOCAL GRADLE RELEASE APK'
  Write-Host 'Build locale: android/app/build/outputs/apk/release/app-release.apk' -ForegroundColor Yellow
  if (Test-Path -LiteralPath "$buildDrive\") { throw "$buildDrive già in uso. Scegli un altro drive libero." }
  subst $buildDrive $expo
  if ($LASTEXITCODE -ne 0) { throw "Impossibile montare $buildDrive" }
  $buildDriveMounted = $true
  Push-Location (Join-Path $buildDrive 'android')
  try {
    .\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed' }
  }
  finally {
    Pop-Location
    subst $buildDrive /d | Out-Null
    $buildDriveMounted = $false
  }

  New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
  $apk = Join-Path $expo 'android\app\build\outputs\apk\release\app-release.apk'
  if (-not (Test-Path -LiteralPath $apk)) { throw "APK non trovato: $apk" }
  $target = Join-Path $artifactDir 'mtg-commander-production.apk'
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
  if ($buildDriveMounted) { subst $buildDrive /d | Out-Null }
  Write-Host "`nTerminale resta aperto. Premi INVIO per chiudere." -ForegroundColor DarkGray
  Read-Host
}
