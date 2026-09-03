# Project checklist

## In progress

## External follow-up

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
