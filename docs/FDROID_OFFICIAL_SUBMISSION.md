# F-Droid official submission checklist

## Branch

Use `fdroid-prep` for official F-Droid work. Use `Dev` for development and
`main` for standard APK, Obtainium, and direct distribution.

## Local build intent

F-Droid flavor:

```bash
APP_VARIANT=fdroid
EXPO_PUBLIC_FDROID_BUILD=true
EXPO_PUBLIC_SENTRY_ENABLED=false
EXPO_PUBLIC_DISABLE_PUSH_NOTIFICATIONS=true
```

Expected differences from standard APK:

- Google sign-in hidden.
- Sentry removed from the mobile dependency graph and native Gradle project.
- Expo Push disabled and `expo-notifications` removed from the mobile dependency
  graph.
- Photo-library dependencies are absent from every build variant.
- Release build can be produced unsigned with Gradle property
  `-PfdroidBuild=true`, so F-Droid can sign the APK itself.

## Local verification

```bash
npm ci
npm --prefix expo ci
npm run verify:fdroid
npm run verify:security
npm run typecheck
npm --prefix expo run typecheck
npm --prefix expo run android:bundle:check
```

Gradle unsigned release check:

```bash
cd expo/android
APP_VARIANT=fdroid EXPO_PUBLIC_FDROID_BUILD=true EXPO_PUBLIC_SENTRY_ENABLED=false EXPO_PUBLIC_DISABLE_PUSH_NOTIFICATIONS=true ./gradlew :app:assembleRelease -PfdroidBuild=true -PreactNativeArchitectures=arm64-v8a --no-daemon --console=plain
```

On Windows PowerShell:

```powershell
cd expo/android
$env:APP_VARIANT='fdroid'
$env:EXPO_PUBLIC_FDROID_BUILD='true'
$env:EXPO_PUBLIC_SENTRY_ENABLED='false'
$env:EXPO_PUBLIC_DISABLE_PUSH_NOTIFICATIONS='true'
.\gradlew.bat :app:assembleRelease -PfdroidBuild=true -PreactNativeArchitectures=arm64-v8a --no-daemon --console=plain
```

## F-Droid metadata

Draft metadata lives in:

```text
fdroid/metadata/com.phyrexianarena.app.yml
```

Before submitting to `fdroiddata`, replace:

```text
REPLACE_WITH_FDROID_RELEASE_COMMIT_SHA
```

with the exact full commit SHA of the public release commit. F-Droid metadata
requires commit hashes rather than branch names.

## Official submission

Merge request:

<https://gitlab.com/fdroid/fdroiddata/-/merge_requests/44721>

The F-Droid pipeline has completed `fdroid readmeta`, metadata linting, source
build, scanner, signed-APK generation, and APK checks successfully. The merge
request follows the App Inclusion template and the React Native build template.
Version 8.2.0 keeps the validated source-build procedure and will be pinned to
the immutable `fdroid-v8.2.0` release commit. Only F-Droid maintainer review
remains external to this repository after the update pipeline passes.
