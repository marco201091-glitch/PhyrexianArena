# MTG Life Counter & Analytics: Commander

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://app.phyrexianarena.dpdns.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/badge/release-v8.0.0-7c3aed?style=flat-square)](https://app.phyrexianarena.dpdns.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

> Play Commander, track life and damage in real time, save every match, and discover how your playgroup evolves.

**Live app:** [app.phyrexianarena.dpdns.org](https://app.phyrexianarena.dpdns.org)

---

## What is MTG Tracker & Analytics?

MTG Tracker & Analytics is a web, Android, and iOS app for Commander playgroups. Create a private space for your pod, invite friends, import decks, play with the live tracker, and keep a complete history without spreadsheets.

A **Playgroup** works for a weekly table, a single evening with friends, or a short league over a few weeks. Everyone joins with their profile and decks; stats stay scoped to that group.

---

## What's new in v8.0.0

Version 8.0.0 prepares the app for public Android distribution through Obtainium and F-Droid while preserving the complete production feature set in standard builds:

- Deck mastery is derived from match history, so existing games immediately contribute to each commander's progression.
- Public Playgroup pages show rankings, commanders, color trends, and recent matches for arenas explicitly marked public.
- Arena catalog updates use private Supabase Realtime broadcasts, keeping Web and Expo pickers synchronized without manual reloads.
- Commander and deck art loading is faster through server-side Scryfall/Archidekt/Moxfield caching and Expo persistent image cache limits.
- Guest conversion, avatar storage policies, and arena-day summaries are reconciled for the self-hosted Supabase staging path.
- Standard builds retain Google OAuth, push notifications, avatar selection, and optional Sentry diagnostics; the F-Droid build omits those integrations.
- Web, Android, and iOS versions are synchronized at `8.0.0` with mobile build code `80000`.

---

## What you can do

### Live games

- Create a table with a guided setup for player count, starting life, layout, and seats
- Start a match from your Playgroup and arrange the table for 2 to 6 players
- Track life, commander damage, infect, eliminations, and the last player standing
- Adjust life with large adaptive controls or drag damage directly between player cards
- Resume an unfinished game if the app or browser is closed
- Automatically open the end-of-game summary when only one player remains
- Save the result and update the Playgroup history and statistics immediately

### Playgroups and match history

- Create and join Playgroups with an invite code, or invite an existing user directly
- Play live or record a completed match manually
- Edit or delete matches when something was recorded wrong
- Add **guest players** for occasional friends — even with multiple decks each
- Turn a temporary guest into a registered player while preserving decks and match history
- Receive lightweight notifications for Playgroup invitations, new members, and completed matches
- Browse matches grouped by day and export individual sessions
- Share a public Playgroup page with rankings, commanders, color trends, and recent games

### Decks & commanders

- Import decks from **Archidekt** (single link, bulk from a username, or optional automatic sync)
- Import decks from **Moxfield**
- Build decks manually with commander search and art picker
- Mark frequently used decks as favorites
- Support for partners, backgrounds, and other multi-commander setups
- Bracket and color identity where the source provides them
- **EDHREC** insights on commanders when available
- Choose which printing to show as commander art

### Stats & analytics

- Player rankings with games, wins, losses, and win rate
- Deck and commander performance per Playgroup
- Color trends showing what is being played and what is winning
- Playgroup awards for group records, comebacks, combo wins, alternate wins, and more
- Personal dashboard with your performance across all Playgroups
- Filters for exploring different periods and parts of the playgroup

### Profiles

- Register and sign in with email, username, or Google
- Keep your session active across visits
- Profile with display name, username, and avatar
- Use the interface in **Italian** or **English**
- Play in full screen on the web or in the Android/iOS app

---

## Getting started

1. Open [app.phyrexianarena.dpdns.org](https://app.phyrexianarena.dpdns.org)
2. Create an account
3. Create a Playgroup or join one with an invite code
4. Add your decks from Archidekt, Moxfield, or by searching for a commander; optionally enable Archidekt auto-import in Settings
5. Create the table with the guided wizard, then start a live game or record a completed one
6. Review the match history and updated statistics

---

## Built with

The app is available on the web, Android, and iOS. It is built with:

| Layer | Technology |
|---|---|
| Frontend | [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| Native app | [Expo](https://expo.dev/), [React Native](https://reactnative.dev/) |
| UI components | [Radix UI](https://www.radix-ui.com/) |
| Backend & database | [Supabase](https://supabase.com/) (Auth, PostgreSQL, file storage) |
| Card & deck data | [Scryfall](https://scryfall.com/), [Archidekt](https://archidekt.com/), [Moxfield](https://moxfield.com/), [EDHREC](https://edhrec.com/) |
| Hosting | Self-hosted with [Dokploy](https://dokploy.com/) |

---

## Contributing

Ideas, feedback, and pull requests are welcome. Open an issue on GitHub to discuss a change before larger contributions.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

- [Scryfall](https://scryfall.com/) — card data and images
- [Archidekt](https://archidekt.com/) & [Moxfield](https://moxfield.com/) — deck import
- [EDHREC](https://edhrec.com/) — commander insights
- [Supabase](https://supabase.com/) — backend platform

Published by **blackistoostrong**. See [third-party notices](THIRD_PARTY_NOTICES.md).

MTG Life Counter & Analytics: Commander is unofficial Fan Content permitted under the
Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials
used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

**Happy gaming!**
