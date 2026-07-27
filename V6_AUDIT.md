# V6 audit — 2026-07-27

## Stato corretto

- Web: Next `16.2.12`; React `18.2`; Radix, Vaul `1.1.2`, React Hook Form `7.83.0`, Zod `3.25.76`.
- Mobile: Expo SDK `57` / React Native `0.86` / React `19.2` / TypeScript `6.0`; solo Expo. Capacitor e il progetto legacy tracciato sono rimossi.
- Database: la regola delle sessioni notturne è stata applicata e verificata su `supabase-production`.

## Audit statico

- Gate eseguito 2026-07-27: Web `52 file / 163 test`, Expo `53 file / 199 test`, sicurezza, lint, typecheck e build Next tutti verdi.
- APK Dev v6.0.0 verificata: package `com.phyrexianarena.app.dev`, code `60000`, Android `minSdk 24` / `targetSdk 36`, ABI `arm64-v8a`, SHA-256 `CE3B3AF728A4599CDE4B183406FFBD22AF69E1398CD9767EE2D7BF649978855E`.
- Foundation dati V6: TanStack Query v5 installato su Web/Expo; provider con cache, retry, stale-time, NetInfo e AppState focus management su Expo.
- Foundation form V6: React Hook Form + Zod + resolver ora condivisi anche da Expo; registrazione mobile validata in modo dichiarativo.
- Turnstile: endpoint runtime `/api/auth/turnstile/config` e widget Web/WebView senza dipendenza da site key incorporata in build obsolete.
- Error isolation: `react-error-boundary` integrato su Web ed Expo con fallback utente e reset controllato.
- Gate finale 2026-07-27: Web `53 file / 165 test`, Expo `53 file / 199 test`, security, lint, typecheck, build Next e APK Dev verdi.
- La migration #27 e stata applicata e verificata solo su `supabase-dev-db` / `supabase-staging`: colonne, constraint, RLS e policy `profiles_update` ownership/admin corretti.
- Root `npm audit --omit=dev`: 3 high, 0 critical. Restano `sharp`/`Next` e `brace-expansion`; l'update sicuro di Next e PostCSS ha ridotto i high da 10 a 3.
- Expo SDK è allineato a `57.0.8` e tutti i moduli Expo/RN sono alle versioni attese. Gli advisory residui transitivi dell'ecosistema Expo/Sentry non hanno una correzione semver sicura: non viene forzato downgrade/override incompatibile.
- Nessun riferimento applicativo rimasto a Capacitor o `mobile/android`.
- Sentry `@sentry/nextjs 10.68.0` e `@sentry/react-native 8.20.0`: errori non gestiti, crash nativi e tracing leggero; PII disabilitato, DSN/enable solo via env.
- FlashList 2 virtualizza collezione deck; NetInfo guida il retry del journal/outbox del live tracker.
- GitHub #26: collegamento non distruttivo di deck manuali a Archidekt/Moxfield, Web ed Expo. GitHub #27: profilo Web Archidekt con import automatico di sole liste nuove.
- Nessun test o sessione device eseguita in questa fase, per decisione esplicita.

## Decisioni architetturali

- Input normali: browser native controls / React Native `TextInput`; non introdurre editor monolitici.
- Popup Web: `AppModal` (Radix) per ogni nuovo flusso; shell legacy con focus trap, scroll lock e ciclo Tab.
- Form Web complesse: Zod + React Hook Form + primitive `components/ui/form.tsx`.
- Mobile E2E: Maestro con testID stabili; smoke quick-game già pronto, da eseguire solo alla validazione finale.

## Prossime implementazioni consigliate

1. **Isolamento env locale/Expo** — completato: Web ed Expo locali usano esclusivamente `supabase-staging`; l'APK Dev usa API e sito `dev.phyrexianarena.dpdns.org`.
2. **Dev API/captcha rollout** — P0: il deploy attuale è precedente agli ultimi fix; dopo il prossimo deploy Dev verificare `/api/public-arena/INVALID` (`404`) e `/api/auth/turnstile/config` (`200` con site key runtime).
3. **Rigenerazione nativa + gate device** — P0: Expo 57 e Sentry aggiungono moduli nativi; creare nuova build Dev Android/iOS, poi eseguire Maestro e test touch/keyboard/rotazione.
4. **Issue #26/#27 end-to-end** — P0: con env Dev isolati, validare import reale Archidekt/Moxfield, link manuale e auto-import; poi chiudere issue GitHub.
5. **EAS workflow** — P1: Maestro smoke dopo build Dev e gate manuale prima di release. Le E2E non sostituiscono drag, keyboard e rotazione umani.
6. **Next 16 cleanup** — P1: migrare `middleware.ts` alla convenzione `proxy.ts`; il build e verde ma segnala deprecazione. Valutare anche warning Edge di Supabase SSR.
7. **Sharp / Next advisory** — P2: verificare una release Next che adotti Sharp >=0.35; non forzare override incompatibili.

## Cleanup manuale locale

La directory `mobile/` può contenere solo cache/artefatti non tracciati rimasti dopo la rimozione del vecchio stack. Non contiene più codice versionato. Rimuoverla localmente quando nessun build locale la usa.
