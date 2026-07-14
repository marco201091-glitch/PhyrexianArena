# Phyrexian Arena — Expo (native)

React Native app with **feature parity target** vs the Next.js web app.

## v1 scope decisions

- Email/password + Google OAuth (no demo login)
- **Life tracker** (Play Game) — app only, not on web
- No admin panel in app
- Default language: **English**, switchable in Settings
- hCaptcha: same site key as web (`EXPO_PUBLIC_HCAPTCHA_SITE_KEY`)

## Setup

```bash
cd expo
npm install
```

### Sviluppo quotidiano (emulatore già con APK installato)

```bash
npm start
```

Poi premi **`a`** nel terminale per aprire l'app sull'emulatore.

**Non usare `npm run android` ogni volta** — ricompila Gradle (~10+ min) e su Windows può fallire se due build partono insieme.

Usa `npm run android` solo quando aggiungi dipendenze native nuove.

### Prima installazione / rebuild nativo

```bash
npm run android:stop-gradle
npm run android
```

Local env file: `expo/.env` (gitignored, already created from web `.env.local`).

## Token Expo (access token admin)

**Non metterlo in Git.** EAS legge la variabile `EXPO_TOKEN`.

### Opzione A — variabile Windows (consigliata)

PowerShell (sostituisci con il token reale):

```powershell
[Environment]::SetEnvironmentVariable("EXPO_TOKEN", "IL_TUO_TOKEN", "User")
```

Chiudi e riapri il terminale, poi verifica:

```powershell
echo $env:EXPO_TOKEN
```

### Opzione B — file locale

```bash
cd expo
cp .env.eas.example .env.eas
# incolla il token in .env.eas → EXPO_TOKEN=...
```

Prima di ogni comando `eas`, in PowerShell nella sessione corrente:

```powershell
$env:EXPO_TOKEN = (Get-Content .env.eas | Where-Object { $_ -match '^EXPO_TOKEN=' }) -replace '^EXPO_TOKEN=',''
```

`expo/.env` resta solo per `EXPO_PUBLIC_*` (config app). Il token **non** va lì.

## Collegare account Expo (EAS)

Con `EXPO_TOKEN` impostato puoi saltare `eas login` interattivo.

Una tantum:

```bash
cd expo
npm install
npx eas init
```

`eas init` collega il progetto al tuo account e aggiunge `extra.eas.projectId` in `app.json`.

Senza token, usa `npx eas login` al posto del passo sopra.

### Variabili su EAS (build cloud)

Il file `.env` locale **non** viene usato automaticamente su EAS. Per build in cloud:

```bash
npx eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..." --environment preview --visibility plaintext
npx eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --environment preview --visibility sensitive
npx eas env:create --name EXPO_PUBLIC_API_BASE_URL --value "https://phyrexian-arena.vercel.app" --environment preview --visibility plaintext
npx eas env:create --name EXPO_PUBLIC_SITE_URL --value "https://phyrexian-arena.vercel.app" --environment preview --visibility plaintext
npx eas env:create --name EXPO_PUBLIC_HCAPTCHA_SITE_KEY --value "..." --environment preview --visibility plaintext
```

Ripeti per `production` quando vai sullo store.

### Build APK per amici (cloud)

```bash
npm run eas:build:preview
```

Scarichi l’APK dal link Expo e lo condividi.

### Build Play Store (AAB)

```bash
npm run eas:build:production
```

Poi `eas submit` quando hai Google Play Console.

## Monorepo

| Path | Product |
|---|---|
| `/app`, `/lib`, `/components` | Web (Vercel) |
| `/expo` | Native app (EAS / local Gradle) |
| `/mobile` | Legacy Capacitor shell (to remove later) |

Web deploy and native build stay **separate pipelines**.

## Commands

| Command | Action |
|---|---|
| `npm run start` | Expo dev server |
| `npm run android` | Run on emulator/device |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Live game tracker

- Works offline through a durable local mutation journal and syncs when connectivity returns.
- Tracks life, commander damage, infect, lifegain, eliminations, revives and undo corrections.
- A completed tracked game stores its elapsed duration and ordered event log on the match.
- Starting player and clockwise/counterclockwise direction are randomized and remain visible on the table.
- Commander images use an on-device cache that invalidates broken files and falls back to a fresh Scryfall art lookup.
- Arena details, recent records, guests and deck metadata use a per-account stale-while-revalidate cache for immediate startup.

## Remaining work (parity)

Core screens are implemented. Highest-value gaps vs web:

1. Profile depth — avatar upload UI, EDHREC badges, deck collection insights, bulk refresh, external deck links, mana color filter
2. Table polish — EDHREC on deck stats
3. Public arena — full color meta charts (pairs, win-rate breakdowns)
4. Auth extras — remember me, Google OAuth (excluded from v1 by design)
5. Deep links — `/table/[id]` intent filter for opening an arena from a shared link
6. Admin / demo — intentionally web-only for v1
