# Project state

Updated: 2026-08-05

This is the short operational handoff for maintainers and agents. Update it
when a release, deployment, F-Droid recipe, or infrastructure decision changes.

## Branches and release channels

- `main`: production web app and standard signed Android APK. Do not use for
  F-Droid-only changes.
- `Dev`: development environment and development Android release channel.
- `fdroid-prep`: F-Droid-specific source flavor and submission material. It is
  deliberately not a wholesale merge of `main` because proprietary/mobile-only
  dependencies are removed here.
- Standard Android release line is `8.0.3` (`main` commit `33c826f`): it
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
- Latest green metadata commit: `207bd1f23`.
- Current submitted build: version `8.0.3`, versionCode `80003`, source commit
  `665bb5dc0bcfe936fc19212d62cbd3db8acdc43e` (`fdroid-v8.0.3`).
- The build recipe uses Node 24, the React Native JDK 21 toolchain patch,
  `arm64-v8a`, `-Xmx4g`, a 1 GB metaspace cap, and one Gradle worker. These
  settings are required for the F-Droid buildserver: universal ABI packaging
  caused D8 heap exhaustion.
- `AutoUpdateMode: Version` and tag-based update checking are enabled.
- The first release intentionally accepts F-Droid signing. Do not claim that
  developer-signed reproducible builds are enabled until a matching reference
  APK has been verified with `Binaries` and `AllowedAPKSigningKeys`.
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

