# MTG Tracker & Analytics

[![Live app](https://img.shields.io/badge/web-live-brightgreen?style=flat-square)](https://app.phyrexianarena.dpdns.org)
[![Version](https://img.shields.io/badge/version-8.0.0-7c3aed?style=flat-square)](https://github.com/marco201091-glitch/PhyrexianArena/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

Track Commander games, manage your playgroup, and turn match history into useful statistics — without spreadsheets.

**Open the app:** [app.phyrexianarena.dpdns.org](https://app.phyrexianarena.dpdns.org)

## Features

- Live Commander tracker for 2–6 players, including life, commander damage, infect, eliminations, undo, and offline recovery.
- Private playgroups with invitations, registered members, occasional guests, and shared match history.
- Deck management with manual creation and imports from Archidekt or Moxfield.
- Rankings, deck and commander performance, color trends, personal analytics, and playgroup awards.
- Public playgroup pages that can be enabled only when a group chooses to share its results.
- English and Italian interfaces across web and native apps.
- Email/password authentication, with optional Google sign-in in standard builds.

## Screenshots

| Desktop | Mobile |
|---|---|
| ![MTG Tracker & Analytics desktop](tests/e2e/snapshots/public-ui.spec.ts/desktop/landing.png) | ![MTG Tracker & Analytics mobile](tests/e2e/snapshots/public-ui.spec.ts/mobile/landing.png) |

## Get started

1. Create an account.
2. Create a playgroup or join one with an invite code.
3. Add your decks.
4. Start a live game or record a completed match.
5. Review rankings, history, awards, and deck performance.

## Availability

| Platform | Status |
|---|---|
| Web | Available now |
| Android APK / Obtainium | Prepared from `main` |
| F-Droid | Submitted for official review |
| iOS | Source and build configuration available; public distribution pending |

The F-Droid flavor uses email/password authentication and omits Google OAuth, push notifications, avatar upload, and Sentry dependencies. Standard Android builds retain these optional features.

## Development

This monorepo contains the Next.js web app and Expo/React Native mobile app.

```bash
npm ci
npm run dev
```

```bash
npm --prefix expo ci
npm --prefix expo start
```

Run the full quality gates before opening a pull request:

```bash
npm run quality
npm --prefix expo run quality
```

Branch workflow:

- `Dev`: active development and integration.
- `main`: stable standard release for web, APK, and Obtainium.
- `fdroid-prep`: F-Droid-specific dependency and build recipe.

## Technology

- Next.js, React, Tailwind CSS
- Expo and React Native
- Supabase Auth, PostgreSQL, Realtime, and Storage
- Scryfall, Archidekt, Moxfield, and EDHREC integrations
- Self-hosted deployment with Dokploy

## Contributing

Issues and pull requests are welcome. For larger changes, open an issue first so the implementation can be discussed.

## License and acknowledgements

The source code is released under the [MIT License](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party services and assets.

MTG Tracker & Analytics is unofficial fan content. It is not approved, endorsed, or sponsored by Wizards of the Coast. Portions of the materials used are property of Wizards of the Coast LLC.
