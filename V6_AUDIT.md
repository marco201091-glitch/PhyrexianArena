# V6 audit — 2026-07-27

## Baseline

- Web: Next `16.2.12`, React `19.2.8`, Radix aggiornato, React Hook Form `7.83`, Zod `3.25`.
- Mobile: Expo SDK `57`, React Native `0.86`, React `19.2`, TypeScript `6.0`.
- Runtime/build: Node `24.18.0`, npm `11.16.0`.
- Root `npm audit --omit=dev`: 0 vulnerabilità.
- Expo production audit: 0 high/critical; 12 moderate transitive senza fix compatibile con SDK 57.
- Expo Doctor: 20/20.

## Architettura consolidata

- Un solo client Supabase mobile; client browser, SSR e service-role separati per responsabilità.
- Un solo layer API mobile con timeout, session refresh e risultati tipizzati.
- TanStack Query gestisce server state non critico; AsyncStorage gestisce solo preferenze, snapshot arena e journal/outbox del live tracker.
- `react-native-keyboard-controller` è l'unico sistema di keyboard avoidance.
- `@expo/ui` è l'unico date picker mobile.
- Radix Dialog gestisce focus trap, portali e scroll lock dei popup Web.
- React Hook Form + Zod gestiscono i form complessi; input semplici restano controllati.
- Sentry mantiene PII disabilitato ed è attivo solo via env.

## Sicurezza Supabase Test

- Tutte le tabelle `public` hanno RLS.
- 0 policy assegnate al ruolo `public`.
- 0 policy anon di scrittura.
- 0 espressioni RLS con `auth.uid()` non cache.
- 0 grant anon inattesi su funzioni `SECURITY DEFINER`.
- Tutte le funzioni `SECURITY DEFINER` hanno `search_path = public, pg_temp`.
- Le RPC distruttive, rate-limit, access-log e login resolver sono server-only.
- L'unica RPC anon privilegiata è `get_group_by_invite_code(text)`, necessaria per l'anteprima read-only degli inviti.
- I dati Test non sono mai stati copiati o sincronizzati verso Production.

## Qualità e manutenzione

- CI separata Web/Expo su push e PR `Dev`/`main`.
- Quality gate: lint, typecheck, unit/security test, Knip dipendenze, Next build, Expo Doctor.
- Boilerplate UI e feature disabilitate non raggiungibili rimossi.
- Sette moduli puri Web/Expo ora hanno una sola implementazione.
- Build Dev/Production hanno gate host/env e package identity distinti.
- Script cleanup Dokploy allineato ai soli target app `dev`/`main` e ai due stack Supabase; Supabase Test mantiene l'ultimo deploy.

## Verifica automatica

- Web: 54 file / 170 test.
- Expo: 53 file / 200 test.
- Next production build: verde.
- Playwright desktop/mobile: accessibilità, snapshot e smoke autenticato verdi.

## Rischi residui di release

- Nessun device Android era collegato durante il gate; Expo Doctor, prebuild e verifica asset nativi sono verdi.
- Il test device iOS resta sospeso con la issue #23.
- Codice Dev non ancora pubblicato dopo l'ultimo hardening.
- Migrazioni e pubblicazione Production restano il gate finale, intenzionalmente non eseguito.
- I file monolitici Web `app/table/[id]/page.tsx` e `app/profile/page.tsx` restano candidati a ulteriore decomposizione incrementale.

## Delta audit — 2026-07-28

- GitHub #19, #20, #21, #22, #24, #25, #26 e #27 chiuse; #23 iOS resta intenzionalmente aperta.
- #27 resa sempre visibile nel profilo Web come blocco `Archidekt sync`.
- Sync Archidekt atomica, manuale/automatica, con username salvato, data ultima sync e deduplica DB.
- Wizard tavolo Web/Expo in quattro passaggi: giocatori, PF, layout, posti/deck.
- Guest creati solo dal manager, link monouso di evoluzione e trasferimento atomico di mazzi, storico e statistiche.
- Inviti diretti a utenti registrati, inbox/toast in basso e push per invito, nuovo membro e partita conclusa.
- Preferiti mazzi Web/Expo.
- Quality gate Web verde: lint, typecheck, 170 test, sicurezza, dipendenze e build.
- Quality gate Expo verde: lint, typecheck, 200 test, coverage, asset Android ed Expo Doctor 20/20.
- Migrazioni applicate e verificate su Supabase Test; Production intatta.
- Playwright desktop/mobile verde, incluso smoke autenticato Archidekt.

### Gate finali

1. Smoke su device Android fisico/emulatore.
2. Risoluzione o decisione finale sulla issue iOS #23.
3. Deploy Dev e collaudo funzionale completo.
4. Solo dopo approvazione: migrazioni e pubblicazione Production.

### Audit grafico

- Linguaggio visivo Web reso più contemporaneo con superfici arrotondate, profondità, blur, controlli e focus coerenti.
- Dashboard mobile compattata: azioni e metriche Arena su griglia, contrasto dello sfondo migliorato.
- Analytics desktop riequilibrate evitando pannelli allungati e vuoti.
- Command room mobile compattata in una griglia azioni 2×2; navigazione e filtri uniformati.
- Primitive Expo allineate a raggi e composizione delle azioni Web.
- Verifica visuale desktop/mobile, accessibilità e snapshot Playwright completati.
