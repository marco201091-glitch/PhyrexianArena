# Project checklist

## In progress

- [ ] Consolidare la 8.2.0 su un feature branch riallineato a `main`, mantenendo compatibilità con i client 8.1.
- [ ] Rimuovere completamente la funzionalità avatar da web/Expo/API senza eliminare dati legacy richiesti dalla 8.1.
- [ ] Risolvere Expo doctor/audit e stabilizzare automazioni dipendenze, E2E, supply chain e release governance.
- [ ] Implementare hardening Supabase/Postgres, test integrazione, monitoraggio, backup e documentazione operativa senza mutare la VM non verificata.
- [ ] Ridurre hotspot architetturali, aumentare test/accessibilità/performance e condividere meglio il dominio web/mobile.
- [ ] Implementare dashboard operativa, compatibilità client, feature flag, osservabilità notifiche, analytics, export account e changelog.
- [ ] Proteggere `main`, verificare read-only lo stato F-Droid/GitLab e preparare PR 8.2.0 su `Dev`.

## External follow-up

- [ ] Monitor the official F-Droid merge request until approval.
- [ ] PM verification of the Dokploy production build.

## Completed

- [x] Super audit read-only dello stato completo di `Dev`/`main` e proposta numerata delle migliorie.
- [x] Preparare su `Dev` la release 8.2.0 con ricerca mazzi nel wizard live, versione app nei log admin e Last Standing con danni letali automatici.
- [x] Aggiungere la pulizia notturna delle cache Gradle inattive, installarla sul server e rimuovere l'Android SDK server-side inutilizzato.
- [x] Audit read-only dello spazio server e identificazione di elementi Docker/log/cache eliminabili in sicurezza.
- [x] Publish MTG Tracker & Analytics 8.0.0 through Obtainium.
- [x] Prepare and submit the F-Droid-compatible build.
- [x] Replace the main README with the public installation and web-app guide.
- [x] Correct the responsive login-logo rendering.
- [x] Remove confirmed obsolete code, assets, documentation, and dependencies.
- [x] Validate web, mobile, release, and dependency quality gates.
- [x] Start the `main` web application deployment on Dokploy production.
