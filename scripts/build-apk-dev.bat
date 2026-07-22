@echo off
setlocal

set "VERSION=%~1"
set "NO_PAUSE=0"
if /I "%~2"=="--no-pause" set "NO_PAUSE=1"
set "ROOT_DIR=%~dp0.."
for %%I in ("%ROOT_DIR%") do set "ROOT_DIR=%%~fI"
set "EXPO_DIR=%ROOT_DIR%\expo"
set "BUILD_DRIVE=Z:"
set "MOUNTED=0"

if not defined VERSION (
    echo Usage: %~nx0 ^<major.minor.patch^>
    exit /b 1
)

if not defined ANDROID_HOME set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not exist "%ANDROID_HOME%" (
    echo ERROR: Android SDK not found at "%ANDROID_HOME%".
    exit /b 1
)

if exist "%BUILD_DRIVE%\" (
    echo ERROR: %BUILD_DRIVE% already in use. Free it, then retry.
    exit /b 1
)

echo [1/6] Sync version %VERSION%
node "%~dp0update-mobile-version.mjs" "%VERSION%"
if errorlevel 1 goto :fail

echo [2/6] Mount short build path
subst %BUILD_DRIVE% "%EXPO_DIR%"
if errorlevel 1 goto :fail
set "MOUNTED=1"

set "APP_VARIANT=dev"

echo [3/6] Stop Gradle
if exist "%BUILD_DRIVE%\android\gradlew.bat" call "%BUILD_DRIVE%\android\gradlew.bat" --stop

echo [4/6] Clean native cache
if exist "%BUILD_DRIVE%\node_modules\react-native-reanimated\android\.cxx" (
    rmdir /s /q "%BUILD_DRIVE%\node_modules\react-native-reanimated\android\.cxx"
)

echo [5/6] Generate Android dev project
pushd "%BUILD_DRIVE%\"
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    popd
    goto :fail
)
popd

echo [6/6] Build release APK
pushd "%BUILD_DRIVE%\android"
call "%BUILD_DRIVE%\android\gradlew.bat" assembleRelease --console=plain
if errorlevel 1 (
    popd
    goto :fail
)
popd

set "ARTIFACT_DIR=%ROOT_DIR%\artifacts\apk"
if not exist "%ARTIFACT_DIR%" mkdir "%ARTIFACT_DIR%"
copy /Y "%BUILD_DRIVE%\android\app\build\outputs\apk\release\app-release.apk" "%ARTIFACT_DIR%\phyrexian-arena-dev-v%VERSION%.apk" >nul
if errorlevel 1 goto :fail

call :cleanup
echo BUILD OK: %ARTIFACT_DIR%\phyrexian-arena-dev-v%VERSION%.apk
if "%NO_PAUSE%"=="0" pause
exit /b 0

:fail
set "BUILD_EXIT=%ERRORLEVEL%"
if "%BUILD_EXIT%"=="0" set "BUILD_EXIT=1"
call :cleanup
echo BUILD FAILED. Version files remain updated to %VERSION%.
if "%NO_PAUSE%"=="0" pause
exit /b %BUILD_EXIT%

:cleanup
if "%MOUNTED%"=="1" subst %BUILD_DRIVE% /d >nul 2>&1
exit /b 0
