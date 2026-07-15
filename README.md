# Phyrexian Arena – EDH Playgroup Tracker

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://phyrexian-arena.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

> Play Commander, track life and damage in real time, save every match, and discover how your playgroup evolves.

**Live app:** [phyrexian-arena.vercel.app](https://phyrexian-arena.vercel.app)

---

## What is Phyrexian Arena?

Phyrexian Arena is a web and Android app for Commander playgroups. Create a private space for your pod, invite friends, import decks, play with the live tracker, and keep a complete history without spreadsheets.

An **Arena** works for a weekly table, a single evening with friends, or a short league over a few weeks. Everyone joins with their profile and decks; stats stay scoped to that group.

---

## What you can do

### Live games

- Start a match from your Arena and arrange the table for 2 to 6 players
- Track life, commander damage, infect, eliminations, and the last player standing
- Adjust life with large adaptive controls or drag damage directly between player cards on the web
- Resume an unfinished game if the app or browser is closed
- Automatically open the end-of-game summary when only one player remains
- Save the result and update the Arena history and statistics immediately

### Arenas and match history

- Create and join Arenas with an invite code
- Play live or record a completed match manually
- Edit or delete matches when something was recorded wrong
- Add **guest players** for occasional friends — even with multiple decks each
- Browse matches grouped by day and export individual sessions
- Share a public Arena page with rankings, commanders, color trends, and recent games

### Decks & commanders

- Import decks from **Archidekt** (single link or bulk from a username)
- Import decks from **Moxfield**
- Build decks manually with commander search and art picker
- Support for partners, backgrounds, and other multi-commander setups
- Bracket and color identity where the source provides them
- **EDHREC** insights on commanders when available
- Choose which printing to show as commander art

### Stats & analytics

- Player rankings with games, wins, losses, and win rate
- Deck and commander performance per Arena
- Color trends showing what is being played and what is winning
- Personal dashboard with your performance across all Arenas
- Filters for exploring different periods and parts of the playgroup

### Profiles

- Register and sign in with email, username, or Google
- Keep your session active across visits
- Profile with display name, username, and avatar
- Use the interface in **Italian** or **English**
- Play in full screen on the web or in the Android app

---

## Getting started

1. Open [phyrexian-arena.vercel.app](https://phyrexian-arena.vercel.app)
2. Create an account
3. Create an Arena or join one with an invite code
4. Add your decks from Archidekt, Moxfield, or by searching for a commander
5. Start a live game or record a completed one
6. Review the match history and updated statistics

---

## Built with

The app is available on the web and Android. It is built with:

| Layer | Technology |
|---|---|
| Frontend | [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| UI components | [Radix UI](https://www.radix-ui.com/) |
| Backend & database | [Supabase](https://supabase.com/) (Auth, PostgreSQL, file storage) |
| Card & deck data | [Scryfall](https://scryfall.com/), [Archidekt](https://archidekt.com/), [Moxfield](https://moxfield.com/), [EDHREC](https://edhrec.com/) |
| Hosting | [Vercel](https://vercel.com/) |

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

**Happy gaming!**
