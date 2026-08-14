# Project state

Updated: 2026-08-14

This is the short operational handoff for maintainers and agents. Update it
when a release, deployment, F-Droid recipe, or infrastructure decision changes.

## Branches and release channels

- `main`: production web app and standard signed Android APK. Do not use for
  F-Droid-only changes.
- `Dev`: development environment and development Android release channel.
- `fdroid-prep`: F-Droid-specific source flavor and submission material. It is
  deliberately not a wholesale merge of `main` because proprietary/mobile-only
  dependencies are removed here.
- F-Droid Android release candidate is `8.0.5` (`fdroid-v8.0.5` commit
  `38caf62`): it
  includes the Turnstile/captcha recovery and Arena analytics deck-owner label.

## Infrastructure

- Production and development run on the same self-hosted VM through Dokploy.
- The VM hosts separate Supabase stacks: production containers are prefixed
  `supabase-`; development containers are prefixed `supabase-dev-`.
- Do not add Vercel or Supabase Cloud configuration: both have been retired.
- Avatar uploads use the public `avatars` Storage bucket and deterministic
  object path `<auth.uid()>/avatar`.
- Avatar RLS policies (INSERT, SELECT-for-upsert, UPDATE, DELETE) were applied
  directly to both self-hosted databases on 2026-08-05. Production upload
  failures before then were caused by missing policies on `storage.objects`.

## F-Droid submission

- Official MR: <https://gitlab.com/fdroid/fdroiddata/-/merge_requests/44721>
- Source branch: `marco201091-glitch/fdroiddata:add-mtg-tracker-analytics`.
- Current submitted build target: version `8.0.5`, versionCode `80005`, source
  commit `38caf624ac30ab601d53dd4cae91cd9dce20b555` (`fdroid-v8.0.5`).
- The build recipe uses Debian's Node/npm packages, the React Native JDK 21 toolchain patch,
  `arm64-v8a`, `-Xmx4g`, a 1 GB metaspace cap, and one Gradle worker. These
  settings are required for the F-Droid buildserver: universal ABI packaging
  caused D8 heap exhaustion.
- `AutoUpdateMode: Version` and tag-based update checking are enabled.
- Developer-signed reproducible builds are now the selected first-release
  strategy. The repository contains the reference-APK workflow, and F-Droid
  metadata points to the signed artifact through `Binaries` and
  `AllowedAPKSigningKeys`; activation completes when the tagged workflow
  publishes and F-Droid verifies that artifact.
- The MR checklist is complete. A status comment tagging `@linsui` was posted
  after the green pipeline.

## F-Droid flavor boundaries

The F-Droid flavor removes or disables:

- Google OAuth;
- Expo push notifications;
- Sentry;
- avatar upload/image-picker native dependencies.

Email/password authentication remains available. Run `npm run verify:fdroid`
after any F-Droid flavor or dependency change.

## Verification expectations

- For source changes, run the relevant typecheck and project-specific checks.
- For F-Droid metadata, run `npm run verify:fdroid`, `npm --prefix expo run
  typecheck`, and `git diff --check` before pushing.
- F-Droid metadata must be formatted using `fdroid rewritemeta`; long script
  commands may need the canonical wrapped form that CI reports.
- Do not monitor CI/builds unless explicitly asked; report the pushed commit
  and let the maintainer monitor when requested.

## Communication protocol

Keep operational replies in Italian and concise:

1. Start work with `ok`.
2. End only when complete with `fatto` and a compact changelist/report.
