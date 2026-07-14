# Phyrexian Arena — Android (Capacitor)

Wrapper Android che carica il sito production:

`https://phyrexian-arena.vercel.app`

La v1 usa **email + password**. Google OAuth resta solo sul web.

## Struttura Git (monorepo)

Web e app vivono nello stesso repository:

```
app/, lib/, components/   → web Next.js (deploy Vercel)
mobile/                   → progetto Capacitor Android
capacitor.config.ts       → configurazione app
```

### Branch consigliati

| Branch | Uso |
|---|---|
| `main` | Web production + `mobile/` stabile |
| `TestDev` | Preview web |
| `feature/mobile-android` | Sviluppo iniziale app |

### Cosa committare

- `mobile/android/` (progetto Gradle)
- `capacitor.config.ts`
- `mobile/www/`
- `lib/capacitor.ts`, bridge web

### Cosa non committare

Già in `.gitignore`:

- `*.keystore`, `*.jks`
- `mobile/android/app/build/`
- `mobile/android/local.properties`

## Prerequisiti

### Windows

- Node.js 20+
- Android Studio + SDK 34+
- `ANDROID_HOME` configurato
- `adb` nel PATH

Verifica:

```powershell
echo $env:ANDROID_HOME
adb version
java -version
```

### Ubuntu VM (sviluppo/build)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unzip openjdk-17-jdk

# Android SDK via Android Studio o command-line tools
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Aggiungi le variabili a `~/.bashrc` se usi la VM in modo permanente.

## Setup iniziale (una volta)

Dalla root del repo:

```bash
npm install
npm run mobile:sync
```

Apri il progetto Android:

```bash
npm run mobile:android
```

## Build debug (solo tuo telefono)

1. Attiva **Debug USB** sul telefono
2. Collega via USB
3. Verifica:

```bash
adb devices
```

4. Build e install:

```bash
npm run mobile:build:debug
npm run mobile:install:debug
```

Oppure da Android Studio: **Run** sul device collegato.

## Build release per amici

### 1. Genera keystore (una volta, conservalo)

```bash
keytool -genkey -v -keystore phyrexian-arena-release.keystore -alias phyrexian-arena -keyalg RSA -keysize 2048 -validity 10000
```

Non committare il keystore.

### 2. Configura firma

Crea `mobile/android/keystore.properties` (gitignored in locale):

```properties
storeFile=../../phyrexian-arena-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=phyrexian-arena
keyPassword=YOUR_KEY_PASSWORD
```

Poi configura `signingConfigs` in `mobile/android/app/build.gradle` (vedi documentazione Android).

### 3. App Links (join arena, reset password)

Aggiorna [`public/.well-known/assetlinks.json`](../public/.well-known/assetlinks.json) con le fingerprint SHA-256:

```bash
# Debug
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# Release
keytool -list -v -keystore phyrexian-arena-release.keystore -alias phyrexian-arena
```

Deploy su Vercel, poi verifica:

```bash
adb shell pm get-app-links com.phyrexianarena.app
```

## Comandi utili

| Comando | Azione |
|---|---|
| `npm run mobile:sync` | Sincronizza plugin e asset in Android |
| `npm run mobile:android` | Apre Android Studio |
| `npm run mobile:build:debug` | APK debug |
| `npm run mobile:build:release` | APK release |
| `npm run mobile:install:debug` | Installa APK debug via adb |

## Versioning app

In `mobile/android/app/build.gradle`:

- `versionCode` — incrementa ad ogni APK distribuito
- `versionName` — es. `1.0.0`

Opzionale: tag Git `android-v1.0.0` quando rilasci agli amici.

## Salto a Google Play (fase 2)

Stesso package name (`com.phyrexianarena.app`) e stesso keystore.

1. Account Google Play Console (~25 € una tantum)
2. Build **AAB** invece di APK (`bundleRelease`)
3. Store listing + screenshot + privacy policy URL
4. Internal Testing → Production

Stima: 1–2 giorni di lavoro + review Google.

## Note

- Il backend resta su Vercel + Supabase: l'app non duplica API o database.
- Dopo modifiche a `capacitor.config.ts` o plugin: `npm run mobile:sync`.
- Dopo modifiche web su login/register/native bridge: deploy Vercel, poi riapri l'app.