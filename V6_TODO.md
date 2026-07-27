# Phyrexian Arena V6 — sviluppo

Regola assoluta: sviluppo solo su `Dev` e Supabase `supabase-test`. Mai toccare `main`, Dokploy Production o `supabase-staging`.

## UX input e popup

- [x] Valutazione stack: native `<input>` / `<textarea>` e React Native `TextInput` restano la scelta stabile per cursore, IME, selezione, autofill e accessibilità.
- [x] Creato `AppModal`: Radix Dialog, focus trap, Escape, scroll lock, overlay e semantica screen reader; grafica esistente preservata.
- [x] Migrati i popup dashboard “Entra” e “Crea arena” a `AppModal`.
- [x] Corretto campo codice invito: nessuna trasformazione durante digitazione; mai più salto cursore.
- [x] Aggiornato Vaul a `1.1.2` per drawer/sheet mobile compatibile anche con React 19.
- [x] Rafforzati tutti i popup legacy `ModalOverlay` / `ModalCard`: focus trap, ciclo Tab, scroll lock e ripristino focus. `AppModal` Radix è lo standard per nuovi flussi.
- [ ] Valutare Lexical solo se le note diventano un vero editor WYSIWYG. Non introdurlo per i normali campi: aumenterebbe bundle, migrazioni dati e manutenzione.

## GitHub issue

- [x] #26: un deck creato manualmente puo collegarsi a una lista Archidekt/Moxfield; nome e comandante restano invariati, refresh/metadati vengono dalla sorgente. Disponibile Web e Expo.
- [x] #27: impostazioni profilo Web per username Archidekt e import automatico in background di nuove liste pubbliche; mai sovrascritti mazzi esistenti.
- [x] Applicata `20260727150000_profile_archidekt_sync_preferences.sql` solo a `supabase-dev-db` / `supabase-staging`; schema e RLS verificati.
- [ ] Validare end-to-end i due flussi su Dev isolato prima di chiudere issue #26/#27.

## Regola serate arena

- [x] Ripristinata: le partite 00:00–07:59 UTC confluiscono nel giorno precedente solo se quel giorno contiene almeno una partita registrata.
- [x] Allineati Web, Expo e RPC `get_arena_match_day_summaries`; migration applicata anche su `supabase-production` con verifica grant.
- [x] Coperti entrambi i casi: partita notturna isolata e serata che prosegue oltre mezzanotte.

## Stack mobile

- [x] Allineata versione V6: package `6.0.0`, Android `versionCode 60000`, iOS `buildNumber 60000`.
- [x] Rimosso interamente Capacitor e il vecchio progetto `mobile/android`: Expo è l'unico stack mobile supportato.
- [x] Aggiornato Expo SDK `53 → 57`, React Native `0.79 → 0.86`, React `19.2`, TypeScript `6.0` e moduli Expo compatibili.
- [x] Integrati Sentry Web/Expo, NetInfo e FlashList 2 per lista virtualizzata dei deck.
- [x] Live tracker: retry ora è guidato da stato rete reale; offline blocca sync inutili, ritorno online svuota journal/outbox durabile.
- [x] Audit statico V6 completato: dettagli e backlog in `V6_AUDIT.md`.

## Verifica ultima esecuzione

- [x] `npm run typecheck`
- [x] `npm run test:all` — 53 file, 166 test
- [x] `npm run build`

## Da valutare, non installare a caso

- [x] Base form trasversale: React Hook Form + Zod aggiornati e primitive accessibili in `components/ui/form.tsx`.
- [x] Predisposto smoke E2E Maestro `expo/e2e/smoke-quick-game.yaml` con testID stabili.
- [ ] Eseguire test E2E touch/device una sola volta, alla chiusura della V6.
- [ ] Rigenerare build native Dev dopo upgrade Expo/Sentry e validare Android/iOS al gate finale.
- [ ] P0 audit: isolare `.env.local` e `expo/.env` esclusivamente su `supabase-staging`; ora contengono ancora endpoint Supabase Production.
- [ ] P0 audit: correggere service role del runtime Dev (`/api/public-arena/INVALID` risponde `500`, deve rispondere `404`).
