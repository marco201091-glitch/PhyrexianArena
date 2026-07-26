@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%SCRIPT_DIR%build-apk-production.ps1"
