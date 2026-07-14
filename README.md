# Phyrexian Arena – EDH Playgroup Tracker

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://phyrexian-arena.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

> Track Commander games, decks, and playgroup stats — built for recurring pods, one-off nights, and mini-leagues.

**Live app:** [phyrexian-arena.vercel.app](https://phyrexian-arena.vercel.app)

---

## What is Phyrexian Arena?

Phyrexian Arena is a web app for Commander playgroups. Create a private space for your pod, invite friends, import decks, log games, and see who’s winning — without spreadsheets.

An **Arena** works for a weekly table, a single evening with friends, or a short league over a few weeks. Everyone joins with their profile and decks; stats stay scoped to that group.

---

## What you can do

### Arenas & matches

- Create and join Arenas with an invite code
- Log battles with players, decks, winner, and notes
- Edit or delete matches when something was recorded wrong
- Add **guest players** for occasional friends — even with multiple decks each
- Share a **public stats page** for your Arena (rankings, commanders, color meta, recent games)

### Decks & commanders

- Import decks from **Archidekt** (single link or bulk from a username)
- Import decks from **Moxfield**
- Build decks manually with commander search and art picker
- Support for partners, backgrounds, and other multi-commander setups
- Bracket and color identity where the source provides them
- **EDHREC** insights on commanders when available
- Choose which printing to show as commander art

### Stats & analytics

- Player rankings with wins, losses, and win rate
- Deck and commander performance per Arena
- Color meta charts — what’s being played and what’s winning
- Personal dashboard with your stats across Arenas

### Profiles

- Register and sign in with email or username
- Persistent login on the live site
- Profile with display name, username, and avatar
- Interface in **Italian** and **English**

---

## Getting started

1. Open [phyrexian-arena.vercel.app](https://phyrexian-arena.vercel.app)
2. Create an account
3. Create an Arena or join one with an invite code
4. Add your decks from Archidekt, Moxfield, or by searching a commander
5. Log your games — rankings and stats update on their own

---

## Tech stack

Phyrexian Arena is a modern full-stack web app:

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