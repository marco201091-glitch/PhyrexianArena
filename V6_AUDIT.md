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

- Web: 54 file / 168 test.
- Expo: 53 file / 200 test.
- Next production build: verde.
- Nessuna APK o sessione device eseguita in questa fase, per decisione esplicita.

## Rischi residui di release

- Test device/E2E non ancora eseguiti.
- Codice Dev non ancora pubblicato dopo l'ultimo hardening.
- Migration hardening non applicata a Production per compatibilità V5 e stato infrastrutturale del DB Production.
- I file monolitici Web `app/table/[id]/page.tsx` e `app/profile/page.tsx` restano candidati a una futura decomposizione incrementale; non sono stati riscritti in blocco per evitare regressioni pre-beta.
