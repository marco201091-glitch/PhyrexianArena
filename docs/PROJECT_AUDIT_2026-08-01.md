# Project audit — 2026-08-01

## Verdict

`Dev` and `Release` point to the same commit (`5efd17b`). The original audit found a red release gate and Dev schema drift; recent Claude-assisted changes contained reproducible regressions in the Android icon and web accessibility.

Local remediation completed after the audit: the Android icon, WCAG contrast, Expo SDK dependency alignment, `Release` CI coverage, deterministic Expo lint install, E2E standalone server, stale V7 snapshots, and mana-symbol image handling are fixed in the `Dev` worktree. Web quality/build/E2E, Expo quality/Doctor, iOS readiness, and Android/iOS bundle exports are now green. The three pending migrations were reconciled and verified only on `supabase-dev-db`; Production remained untouched. `Release` still needs the normal clean-worktree gate and explicit promotion process.

The active workflow is `Dev` → `Release`; `Release` will replace `main` only when the store release is ready. Existing `main` must remain frozen because it serves the current production service. It was not changed by the recent V7/Claude work: local and remote both point to `7ed6b05`, and its dedicated worktree is clean.

No merges, pushes, releases, Production writes, or changes to `main` were performed. The only external write was the explicitly authorized schema reconciliation on `supabase-dev-db`; code remediation remains uncommitted in the `Dev` worktree.

## Claude-assisted quality review

Confirmed low-quality patterns in the recent work:

- Android icon generator created an opaque adaptive foreground while its own validator required transparency.
- Palette replacement was broad and lacked an accessibility validation pass, causing a reproducible WCAG AA regression.
- Expo CI installed ESLint ad hoc outside the lockfile instead of declaring it as a development dependency.
- V7 visual changes and version updates were committed without refreshing the E2E baselines.
- CI ignored the actual `Release` branch, and local E2E used a server command incompatible with standalone output.
- Scryfall mana symbols used a raw image element with redundant accessible content and a lint warning.

These issues are remediated in the local `Dev` worktree. Review of the remaining recent Claude-assisted logic found high complexity in the large profile/table pages, but no additional reproducible functional defect: 183 web tests, 221 Expo tests, security checks, type checks, and production builds/bundles pass. Splitting those pages is worthwhile future maintenance work, but not a safe release-blocker refactor.

## Release blockers

### Deferred — future `Release` cutover to `main`

- `git merge-base main Dev` returns no result.
- `main` contains 55 commits and two root commits; `Dev`/`Release` contain 112 commits and one different root.
- A direct tree comparison spans 287 files, 6,397 insertions and 5,954 deletions.
- This does not block the current `Dev` → `Release` workflow. It becomes relevant only at store-launch cutover: a normal merge/PR into the old `main` will not work, so use a deliberate branch-replacement/cutover procedure at that time.
- Git object integrity is otherwise sound: `git fsck --full --strict` found only recoverable dangling objects, not corrupt or missing objects.

### P0 — Dev database contract required reconciliation

The application `.env.local` targets self-hosted Dev/staging, but the Supabase CLI's `--linked` metadata still points to the retired Cloud archive. Therefore its migration list is not authoritative for the runtime. The three relevant repository migrations are:

1. `20260730150000_restore_guest_conversion.sql`
2. `20260730173000_fix_dev_avatar_storage_rls.sql`
3. `20260730190000_v7.1.1_arena_day_fix.sql`

Direct inspection of `supabase-dev-db` found guest conversion and arena-day objects already present from prior manual application, but the avatar policies were absent and the claim function still used the older search path. This was real schema drift even though the CLI history comparison was against the wrong target.

**Remediated on Dev:** the three migrations were reconciled atomically on `supabase-dev-db`. Guest conversion and arena-day objects were already partly present from prior manual application; the claim function was aligned to the hardened search path, all four avatar policies were created, and the arena-day RPC was reapplied. RLS, indexes, grants, authenticated RPC execution, and PostgREST visibility were verified. A pre-migration backup is retained on the VM.

### P0 — Automated release gates fail

- The latest GitHub Actions run for `Dev`/`5efd17b` is a failure in both `web` and `expo`: [Quality run #40](https://github.com/marco201091-glitch/PhyrexianArena/actions/runs/30621853871).
- Local `npm --prefix expo run quality` fails because `expo/assets/adaptive-icon.png` is fully opaque (transparent ratio `0.000000`) while the repository's validator requires more than 20% transparent safe area. This regression was introduced by the two icon-framing commits `8afa237` and `d734f57`.
- Local Playwright on `Dev` fails desktop and mobile WCAG AA checks: footer text contrast is `4.25:1`, below the required `4.5:1`. The affected class is `text-[10px] text-muted-foreground/70`; the color regression follows the Claude-assisted palette changes in `46a2b0b`/`1ea8e2c`.
- `Release` is not included in the `quality.yml` push or pull-request triggers, so future divergence can bypass all quality CI.

**Remediated locally:** all four defects above are corrected. Public WCAG/visual checks and authenticated Archidekt/profile flows pass on desktop and mobile (4/4 E2E).

## High-priority findings

### P1 — Active and frozen branches are unprotected

GitHub reports `protected=false` for `main`, `Dev`, and `Release`. Protect `Dev` and `Release` to enforce the active workflow. Protect frozen `main` against pushes, force-pushes and deletion so the current production service cannot be changed accidentally.

### P1 — Mobile dependencies do not match Expo SDK 57

`expo-doctor` passes 19/20 checks and fails the SDK compatibility check. Eleven packages are behind the required patch versions, including Expo (`57.0.8` vs `~57.0.9`), React Native (`0.86.0` vs `0.86.2`), Expo Router, Notifications, Reanimated, and Worklets. Native bundles still export successfully, but the supported dependency contract is not satisfied.

**Remediated locally:** all eleven packages now match Expo SDK 57; Expo Doctor passes 20/20 and both native bundle exports pass.

### P1 — `main` E2E gate is also red

After a CI-equivalent rebuild, desktop and mobile Playwright tests on `main` fail visual snapshot comparison (about 7% pixel difference and changed page height). Accessibility itself passes. This appears to be stale or environment-sensitive baseline data, not recent V7 contamination, but it means `main` is not a fully green baseline.

### P1 — Supabase security advisor has unresolved warnings

The linked Dev database reports 19 security warnings:

- 17 authenticated-callable `SECURITY DEFINER` functions;
- 1 anonymous-callable `SECURITY DEFINER` function (`get_group_by_invite_code`);
- leaked-password protection disabled.

Many RPCs contain explicit membership/ownership checks and are intentionally client-callable, so these are not all confirmed vulnerabilities. They require an explicit threat-model review. Supabase recommends keeping security-definer helpers out of exposed schemas where possible, locking `search_path`, and revoking default execution privileges: [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [function security](https://supabase.com/docs/guides/database/functions?example-view=sql&language=sql&queryGroups=example-view&queryGroups=language).

## Medium and low-priority findings

- Root `npm audit` reports one high-severity `brace-expansion` DoS advisory in ESLint/config tooling only. Production dependency audit is clean; both full and production Expo audits are clean.
- Expo CI runs `npm i --no-save eslint` after `npm ci`. This is unpinned, changes the resolved toolchain at run time, and bypasses the committed lockfile. Add the required lint package to `expo/package.json` instead.
- `playwright.config.ts` starts the app with `npm start` even though Next is configured with `output: 'standalone'`; every E2E run emits the unsupported-start warning. Use the standalone server entry or a dedicated test server command.
- Root lint passes with one `<img>` performance warning in `components/ui/mana-color-pills.tsx`.
- Web statement/line coverage is about 41.7%; several server/auth/query modules remain effectively untested. Expo has broader unit coverage but still leaves important I/O modules uncovered.
- Two agent worktrees are registered as prunable because their directories no longer exist. This is repository metadata clutter, not source corruption.
- The obsolete `aptoide` remote returns “Repository not found”; `origin` fetch succeeds.
- Supabase CLI `--linked` still points to the retired Cloud archive, not the self-hosted runtime. Do not use `--linked` for application or migration operations; target `supabase-dev-db` explicitly through the approved VM procedure.
- One committed migration has a trailing blank line flagged by `git diff --check`: `20260730150000_restore_guest_conversion.sql`.
- No real `.env`, private-key, keystore, PEM, P12, or signing-properties file is present in reachable Git history; only example env files are tracked.
- The largest reachable blobs are expected brand images (2.15 MB maximum); no obvious accidental archive or build artifact is committed.
- Supabase's current changelog announces a self-hosted gateway change from Kong to Envoy during the week of 2026-08-09. If production depends on Kong-specific configuration, schedule a separate infrastructure check before updating the self-hosted stack: [Supabase changelog](https://supabase.com/changelog).

## Checks performed

| Scope | Check | Result |
|---|---|---|
| Git | Fetch `origin`, ref parity, worktrees, reflogs, merge base, tree diff, `fsck`, tracked-secret paths | Completed |
| `Dev` / `Release` | `npm ci --prefer-offline`, lint, typecheck, 183 web tests, security verifier, Knip | Pass; one lint warning |
| `Dev` / `Release` | Clean-install production web build | Pass |
| `Dev` / `Release` | 221 Expo tests, lint, typecheck | Pass before logo gate |
| `Dev` / `Release` | Expo logo gate | Fail: adaptive icon safe area |
| `Dev` / `Release` | `expo-doctor` | Fail: 11 version mismatches |
| `Dev` / `Release` | iOS readiness, iOS bundle export, Android bundle export | Pass |
| `Dev` / `Release` | Obtainium readiness | Pass, but does not cover the failing logo/doctor/E2E gates |
| `Dev` / `Release` | Playwright public UI | Fail: serious contrast violation on desktop and mobile |
| Remediated `Dev` worktree | Playwright public + authenticated UI | Pass: 4/4 desktop/mobile |
| Dev database | Direct self-hosted schema inspection and reconciliation | 3 migrations reconciled; RLS/indexes/grants/RPC/PostgREST verified |
| Dependencies | Root and Expo `npm audit`, full and production-only | 1 high dev-tool issue; production clean |
| `main` | Clean worktree/ref parity, quality suite (173 tests), production build | Pass |
| `main` | CI-equivalent Playwright public UI | Fail: stale visual snapshots |

No production database preflight/postflight SQL, destructive QA SQL, signed APK build, device install/upgrade test, or production smoke test was run because those require explicit release authority and/or production credentials.

## Recommended order of work

1. Keep `main` frozen; do not merge or deploy V7 there.
2. Commit the verified local remediation on `Dev`, then promote it to `Release` through the normal workflow.
3. Protect `Dev` and `Release`; lock frozen `main` against pushes, force-pushes and deletion.
4. Re-run the complete store-release gate from a clean `Release` worktree.
5. Plan the deliberate `Release` → `main` replacement only for the future store-launch cutover.

## Delta audit — 2026-08-03

F-Droid-style publication adds a distinct release-readiness track beyond Obtainium/private APK distribution:

- F-Droid requires FLOSS source, redistributable assets, reproducible build metadata, no proprietary tracking libraries, and no trademark/copyright infringement.
- The app already uses an MIT license and has a working Android export path, but the Expo/F-Droid recipe still needs final scanner validation from generated native sources.
- A dedicated F-Droid build mode was added with `APP_VARIANT=fdroid`, `EXPO_PUBLIC_FDROID_BUILD=true`, and `EXPO_PUBLIC_SENTRY_ENABLED=false`; this removes the Sentry Expo plugin from the native config and hides Google sign-in in the Android login UI.
- Auth-sensitive API rate limits now fail closed if the rate-limit backend is unavailable, and the public arena endpoint is IP-rate-limited.
- Direct `supabase db query --linked` package scripts are blocked because the linked CLI target still points to the retired Cloud archive; destructive/QA SQL must use the approved self-hosted VM procedure.
- Initial Fastlane metadata was added for Android listing preparation.
- The `dpdns.org` provider is not the critical issue. The `phyrexianarena` label and original mana symbols remain the public-release review risk, but the maintainer decision on 2026-08-03 is to keep them for the first submission attempt and prepare a neutral fallback only if review rejects the app.

## Audit-created files

- `.agents/skills/efficient-project-audit/SKILL.md`: requires maximal token minimization, cache reuse, batched inspection, preservation of user changes, and the requested strict `OK`/`fatto` completion protocol.
- `.agents/skills/efficient-project-audit/agents/openai.yaml`: discovery metadata for the skill.

The pre-existing uncommitted `.gitignore` change was preserved untouched.
