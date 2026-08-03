# MTG Tracker & Analytics — native app

Expo/React Native client for Android and iOS. It shares the same accounts, playgroups, decks, matches, and analytics as the web app.

## Build variants

| Variant | Branch | Integrations |
|---|---|---|
| Standard | `Dev` / `main` | Email/password, optional Google OAuth, notifications, avatar picker, optional Sentry |
| F-Droid | `fdroid-prep` | Email/password only; proprietary and unnecessary native dependencies removed |

Both variants use the same application ID: `com.phyrexianarena.app`.

## Local development

```bash
cd expo
npm ci
npm start
```

Press `a` to open Android or `i` on macOS to open iOS. Use `npm run android` only for the first installation or after changing native dependencies, because it performs a full Gradle build.

Local public configuration belongs in `expo/.env`; secrets and signing material must never be committed.

## Quality checks

```bash
npm run quality
npx expo-doctor
npm run verify:logos
```

## Android builds

Run the standard app locally:

```bash
npm run android:stop-gradle
npm run android
```

The signed public APK workflow runs from `main`. Signing values are supplied through GitHub Actions secrets and are never stored in the repository.

The official F-Droid recipe is maintained in:

```text
fdroid/metadata/com.phyrexianarena.app.yml
```

It generates an unsigned release APK from source so F-Droid can sign the published artifact.

## iOS builds

Validate the generated configuration from any platform:

```bash
npm run ios:config
npm run typecheck
npm test
```

Build locally on macOS:

```bash
npm run ios:prebuild
npm run ios
```

EAS profiles are available for simulator, internal device, and App Store builds:

```bash
npm run eas:build:ios:simulator
npm run eas:build:ios:preview
npm run eas:build:ios:production
```

Device and App Store builds require an Apple Developer account, valid provisioning, and the corresponding EAS environment variables. Universal Links also require the production website association file to contain the final Apple Team ID.

## Useful commands

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run android` | Build and run Android |
| `npm run ios` | Build and run iOS on macOS |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |
| `npm run quality` | Run the complete native quality gate |

## Repository layout

| Path | Product |
|---|---|
| `/app`, `/components`, `/lib` | Next.js web app |
| `/expo` | Expo/React Native app |
| `/fdroid` | Official F-Droid build metadata draft |
| `/fastlane` | Store listing metadata |
