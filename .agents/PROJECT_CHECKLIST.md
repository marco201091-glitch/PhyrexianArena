# Project checklist

Preferenza permanente PM: comunicare SEMPRE nella modalità OK / Fatto + checklist.

## In progress

- [x] UI v9: palette awards player attenuata per tema scuro, medaglie podio oro/argento/bronzo sagomate; typecheck web/Expo OK. Storico completo e spaziatura Archidekt corretta.

- [x] UI Android: stile, profilo, azioni mazzi, report, storico, moduli, leggibilita, notifiche, filtri e accesso/impostazioni aggiornati. Typecheck, lint e 25 test OK; app avviata su Pixel_9 con Metro/Fast Refresh. Validazione visiva completa PM da effettuare; nessun push.

- [x] Wizard Android uniforme: preview partecipanti, vita iniziale, assegnazione posti; 2 giocatori solo layout classico. Toolbar live ampliata e icona dado distinta. Typecheck/lint OK.

- [x] Scelta layout Android ridisegnata: tavoli separati, giocatori esterni, carte orientate secondo il runtime; typecheck OK. Validazione visiva PM in corso.

- [x] Roadmap 9: rifinitura awards giocatori, report Details, filtri mazzo multipli e wizard tavolo.

- [x] Roadmap 9: notifiche intelligenti (partita, inviti, fine stagione) e scheda personale profilo su Dev/Staging.
- [ ] Roadmap 9: validazione fisica E2E Android su APK Dev. F-Droid dopo una 9 stabile.

- [x] Backup off-site: rclone crypt/Google Drive, retention e alert implementati; configurazione VM documentata.
- [x] Runtime 9 e diagnostica migrazioni: migrazione applicata e verificata su Supabase staging; verifica CI implementata.
- [x] Sicurezza Expo: vulnerabilità URI risolta con override compatibile `decode-uri-component` 0.5.0; audit produzione verde.
- [x] Retrocompatibilità: client dalla 8.1 restano supportati; modifiche e migrazioni v9 additive.
- [x] Dashboard salute e analytics: diagnostica admin presente; staging conferma gli indici analytics necessari. Alert backup off-site corretto.
- [x] E2E Android: comando Maestro con controllo dispositivo implementato.
- [x] UI v9: Details mazzo con impronta visiva W/P/S; Details partita con pressione relativa dei giocatori, web e Android.
- [x] Player Awards web: 10 premi concordati, podio Top 3, calcolo su partite disponibili e schede Giocatori/Mazzi.

- [x] Preparata 9.0.0 su Dev: dipendenze compatibili e major web aggiornate; qualità, build, bundle Android e smoke staging verificati; nessun deploy o mutazione produzione.
- [x] Ripristolta risoluzione DNS locale disattivando WARP: Expo Doctor 21/21 verde.

- [x] Audit Dev/main e release 8.5 completato: docs/AUDIT_2026-09-22.md; CI verde, 501 test locali superati, follow-up nel report.

- [x] Compilare e verificare APK Dev locale 8.3.0 per test Android (prebuild e Gradle eseguiti su junction C:\\pa83 per riprodurre il percorso breve storico; CMake 3.31.6; packaging riuscito; package/version verificati; APK Dev firmata con certificato debug come previsto e salvata in `artifacts/apk/phyrexian-arena-dev-v8.3.0.apk`; mapping P: e junction rimossi).

## External follow-up

- [ ] Alla pubblicazione 9 in produzione: configurare e verificare backup off-site rclone crypt/Google Drive.
- [ ] Monitor the official F-Droid merge request until approval.
- [ ] PM verification of the Dokploy production build.

## Completed

- [x] Spostare lo storico season sotto le partite recenti con Top 10 giocatori/mazzi per win rate e minimo 5 partite.

- [x] Mostrare negli archivi delle season la top 10 giocatori completa con record W/L su web ed Expo.

- [x] Validare integralmente la release 8.2.0, promuovere `Dev` su `main` e pubblicare web/APK Obtainium.

- [x] Integrare la 8.2.0 completa su `Dev`, verificare test web/app e compilare una APK development locale 8.2.0 firmata.

- [x] Completare hardening Live 8.2: recap PNG senza eventi di correzione, validazione finale, centro recupero, E2E, ordinamento win rate, statistiche win condition, verifica conversione guest, aptica, preload selettivo e dashboard sync.
- [x] Live 8.2: reset wizard senza cambio step; mostrare solo contatori modificati e non nulli; errori sync persistenti solo con dati pendenti; recap avanzato, onboarding contestuale, condivisione recap e correzioni distinguibili.
- [x] Compattare l'indicatore di giocatore iniziale/direzione e auto-nascondere gli stati live `Synced`/`Offline` dopo 15 secondi fino al prossimo cambio stato.
- [x] Consolidare la 8.2.0 su un feature branch riallineato a `main`, mantenendo compatibilità con i client 8.1.
- [x] Rimuovere completamente la funzionalità avatar da web/Expo/API, conservando soltanto la cancellazione dei dati legacy per privacy e compatibilità.
- [x] Risolvere Expo doctor/audit e stabilizzare automazioni dipendenze, E2E, supply chain e release governance.
- [x] Preparare hardening Supabase/Postgres, audit read-only, monitoraggio, backup cifrato e documentazione operativa senza mutare la VM Dokploy.
- [x] Ridurre duplicazioni del dominio live, ampliare test e introdurre budget prestazionali per bundle web/mobile.
- [x] Implementare dashboard operativa, compatibilità client 8.1+, feature flag, osservabilità notifiche, export account e changelog 8.2.
- [x] Proteggere `main`, verificare read-only lo stato F-Droid/GitLab e preparare la PR 8.2.0 su `Dev`.
- [x] Super audit read-only dello stato completo di `Dev`/`main` e proposta numerata delle migliorie.
- [x] Preparare su `Dev` la release 8.2.0 con ricerca mazzi nel wizard live, versione app nei log admin e Last Standing con danni letali automatici.
- [x] Predisporre il backup automatico cifrato della chiave Android, senza build o carico sulla VM.
- [x] Aggiungere la pulizia notturna delle cache Gradle inattive, installarla sul server e rimuovere l'Android SDK server-side inutilizzato.
- [x] Audit read-only dello spazio server e identificazione di elementi Docker/log/cache eliminabili in sicurezza.
- [x] Publish MTG Tracker & Analytics 8.0.0 through Obtainium.
- [x] Prepare and submit the F-Droid-compatible build.
- [x] Replace the main README with the public installation and web-app guide.
- [x] Correct the responsive login-logo rendering.
- [x] Remove confirmed obsolete code, assets, documentation, and dependencies.
- [x] Validate web, mobile, release, and dependency quality gates.
- [x] Start the `main` web application deployment on Dokploy production.
