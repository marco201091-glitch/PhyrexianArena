# Phyrexian Arena V6 — stato operativo

Aggiornato: 2026-07-27.

## Regole non negoziabili

- `Dev` e ogni build Dev usano solo Supabase Test.
- Supabase Test: endpoint storico `supabase-staging.phyrexianarena.dpdns.org`, container DB `supabase-dev-db`.
- Production: branch `main`, app Production, Supabase `supabase-production`.
- Mai copiare, ripristinare o sincronizzare dati Test verso Production. In Production entrano solo schema, funzioni, policy, indici e configurazione validati.
- Nessuna APK durante lo sviluppo: build e test device solo su richiesta al gate finale.

## Implementazione completata

- [x] Expo SDK 57 / React Native 0.86 / React 19 / TypeScript 6 allineati; Capacitor rimosso.
- [x] Tastiera unificata su `react-native-keyboard-controller`; nessun `KeyboardAvoidingView`, listener o scroll manuale concorrente.
- [x] Data partita unificata su `@expo/ui` DateTimePicker nativo; rimosso l'input data testuale mobile.
- [x] Networking Expo unificato: timeout, auth, refresh singolo su 401, errori omogenei e helper HTTP.
- [x] TanStack Query realmente usato per profilo, analytics, EDHREC e artwork; cache offline specializzata del live tracker resta separata.
- [x] React Hook Form + Zod attivi nelle registrazioni Web/Expo.
- [x] Popup Web unificati internamente su Radix Dialog; shell manuale di focus/scroll rimossa.
- [x] Login username/password spostato interamente su API server rate-limited: l'email risolta non viene più esposta al client.
- [x] Runtime server Supabase usa `SUPABASE_URL` / `SUPABASE_ANON_KEY`; le variabili `NEXT_PUBLIC_*` restano solo fallback.
- [x] Varianti Expo Dev/Production separate: package ID, associated domains, intent filter, env EAS e splash.
- [x] Gate build Dev/Production impediscono target Supabase errati; `.env.production.local` resta ignorato.
- [x] Migration `20260727183959_harden_privileged_rpcs_and_indexes.sql` applicata e verificata solo su Supabase Test:
  - 9 indici FK;
  - RLS con `auth.uid()` cache;
  - nessuna policy write anon;
  - RPC `SECURITY DEFINER` deny-by-default;
  - RPC distruttive/server-only negate ad anon/authenticated;
  - inviti anon mantenuti read-only;
  - constraint Archidekt validato.
- [x] CI GitHub Web/Expo, Node 24, quality gate, Expo Doctor e Knip dependency gate.
- [x] Next `middleware.ts` migrato a `proxy.ts`.
- [x] React Web 19.2, Radix, Supabase, Sharp 0.35 e dipendenze compatibili aggiornate.
- [x] Rimossi 39 file morti/boilerplate e relative dipendenze; moduli puri duplicati consolidati.
- [x] Cleanup Dokploy: rimosso il target app Test obsoleto; Supabase Test conserva un solo deploy completato.
- [x] GitHub #26/#27 implementate nel codice.
- [x] Regola partite 00:00–07:59 ripristinata e coperta da test.

## Gate finale intenzionalmente rimandato

- [ ] Pubblicare il codice su app Dev e verificare API/captcha/OAuth/import reali.
- [ ] Eseguire Maestro e test manuali Android/iOS: tastiera, data picker, rotazione, drag, offline/reconnect.
- [ ] Creare APK Dev solo quando richiesto.
- [ ] Prima del rilascio V6, verificare/ripristinare l'infrastruttura DB Production: al 2026-07-27 il container DB Production non risultava presente e PostgREST risultava unhealthy. Non avviare o ricreare nulla automaticamente.
- [ ] Applicare la migration hardening a Supabase Production soltanto insieme al rollout V6. Applicarla prima romperebbe il login username delle build V5, che chiamano ancora direttamente `resolve_login_email`.
- [ ] Dopo il rollout V6: smoke Production, audit RLS/RPC, chiusura issue #26/#27.
