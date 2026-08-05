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
- `expo-image-picker` removed from the mobile dependency graph; avatar upload is
  omitted in the F-Droid branch to avoid Android Photo Picker Play-services
  metadata.
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
APP_VARIANT=fdroid EXPO_PUBLIC_FDROID_BUILD=true EXPO_PUBLIC_SENTRY_ENABLED=false EXPO_PUBLIC_DISABLE_PUSH_NOTIFICATIONS=true ./gradlew :app:assembleRelease -PfdroidBuild=true --no-daemon --console=plain
```

On Windows PowerShell:

```powershell
cd expo/android
$env:APP_VARIANT='fdroid'
$env:EXPO_PUBLIC_FDROID_BUILD='true'
$env:EXPO_PUBLIC_SENTRY_ENABLED='false'
$env:EXPO_PUBLIC_DISABLE_PUSH_NOTIFICATIONS='true'
.\gradlew.bat :app:assembleRelease -PfdroidBuild=true --no-daemon --console=plain
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

The reference APK workflow (`fdroid-v*` tag) deliberately mirrors the F-Droid
recipe prerequisites: it validates the F-Droid source tree, applies the React
Native JDK 21 toolchain patch, builds two unsigned APKs and compares them byte
for byte before signing the reference artifact. This is a release gate, not a
substitute for the final `fdroid build` run in F-Droid's buildserver container.

To validate the exact metadata locally, use the current F-Droid buildserver
container and run `fdroid readmeta`, `fdroid lint`, and `fdroid build` as in
the official quick-start guide.

## Official submission

Merge request:

<https://gitlab.com/fdroid/fdroiddata/-/merge_requests/44721>

The F-Droid pipeline has completed `fdroid readmeta`, metadata linting, source
build, scanner, signed-APK generation, and APK checks successfully. The merge
request follows the App Inclusion template and the React Native build template.
Only F-Droid maintainer review remains external to this repository.
