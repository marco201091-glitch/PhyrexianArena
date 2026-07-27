param(
    [string]$DeviceId = "emulator-5554"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$expoRoot = Join-Path $projectRoot "expo"
$expoEnvPath = Join-Path $expoRoot ".env"
$serverEnvPath = Join-Path $projectRoot ".env.local"
$runtimeDir = Join-Path $env:TEMP "phyrexian-arena-dev"

if (-not (Test-Path $expoEnvPath)) {
    throw "Missing expo/.env"
}

$expoEnv = @{}
Get-Content $expoEnvPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $separator = $line.IndexOf("=")
        if ($separator -gt 0) {
            $expoEnv[$line.Substring(0, $separator)] = $line.Substring($separator + 1)
        }
    }
}

$supabaseUrl = $expoEnv["EXPO_PUBLIC_SUPABASE_URL"]
$supabaseAnonKey = $expoEnv["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
if (-not $supabaseUrl -or -not $supabaseAnonKey) {
    throw "Missing Supabase Test variables in expo/.env"
}
if ($supabaseUrl -notmatch "supabase-staging") {
    throw "Refusing to start: expo/.env is not configured for Supabase Test"
}

$serverEnv = @{}
Get-Content $serverEnvPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $separator = $line.IndexOf("=")
        if ($separator -gt 0) {
            $serverEnv[$line.Substring(0, $separator)] = $line.Substring($separator + 1)
        }
    }
}
$serviceRoleKey = $serverEnv["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $serviceRoleKey) {
    throw "Missing Supabase Test service role key in .env.local"
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

foreach ($port in 3000, 8081) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

$npm = (Get-Command npm.cmd).Source

$env:NEXT_PUBLIC_SUPABASE_URL = $supabaseUrl
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $supabaseAnonKey
$env:SUPABASE_SERVICE_ROLE_KEY = $serviceRoleKey
$apiProcess = Start-Process `
    -FilePath $npm `
    -ArgumentList @("exec", "next", "--", "dev", "--webpack", "-p", "3000") `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput (Join-Path $runtimeDir "api.out.log") `
    -RedirectStandardError (Join-Path $runtimeDir "api.err.log") `
    -WindowStyle Hidden `
    -PassThru

$env:EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000"
$metroProcess = Start-Process `
    -FilePath $npm `
    -ArgumentList @("run", "start", "--", "--dev-client", "--host", "lan", "--port", "8081", "--clear") `
    -WorkingDirectory $expoRoot `
    -RedirectStandardOutput (Join-Path $runtimeDir "metro.out.log") `
    -RedirectStandardError (Join-Path $runtimeDir "metro.err.log") `
    -WindowStyle Hidden `
    -PassThru

$deadline = (Get-Date).AddSeconds(45)
do {
    Start-Sleep -Milliseconds 500
    $apiReady = [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
    $metroReady = [bool](Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)
} until (($apiReady -and $metroReady) -or (Get-Date) -ge $deadline)

if (-not $apiReady -or -not $metroReady) {
    throw "Dev services failed to start. Logs: $runtimeDir"
}

adb -s $DeviceId reverse tcp:3000 tcp:3000 | Out-Null
adb -s $DeviceId reverse tcp:8081 tcp:8081 | Out-Null
adb -s $DeviceId shell am force-stop com.phyrexianarena.app.dev | Out-Null
adb -s $DeviceId shell monkey -p com.phyrexianarena.app.dev 1 | Out-Null

[pscustomobject]@{
    ApiPid = $apiProcess.Id
    MetroPid = $metroProcess.Id
    ApiUrl = "http://127.0.0.1:3000"
    MetroUrl = "http://127.0.0.1:8081"
    Supabase = $supabaseUrl
    Logs = $runtimeDir
}
