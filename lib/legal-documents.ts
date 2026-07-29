import {
  FAN_CONTENT_NOTICE,
  getLegalContactLabel,
  LEGAL_BRAND_NAME,
  LEGAL_CONTROLLER_NAME,
  LEGAL_LAST_UPDATED,
  LEGAL_SITE_NAME,
} from '@/lib/legal-site';

type Language = 'it' | 'en';
type Copy = Record<Language, string>;

export interface LegalSection {
  id: string;
  title: Copy;
  paragraphs: Copy[];
}

export interface LegalDocument {
  slug: 'privacy' | 'terms' | 'cookies';
  title: Copy;
  description: Copy;
  sections: LegalSection[];
}

export const legalDocumentLinks = [
  {
    slug: 'privacy',
    href: '/legal/privacy',
    label: { it: 'Informativa sulla privacy', en: 'Privacy Policy' },
  },
  {
    slug: 'terms',
    href: '/legal/terms',
    label: { it: 'Termini d’uso', en: 'Terms of Use' },
  },
  {
    slug: 'cookies',
    href: '/legal/cookies',
    label: { it: 'Informativa sui cookie', en: 'Cookie Policy' },
  },
] as const satisfies ReadonlyArray<{ slug: LegalDocument['slug']; href: string; label: Copy }>;

function contactParagraph(language: Language) {
  const contact = getLegalContactLabel(language);
  return language === 'it'
    ? `Per domande su questo documento scrivi a ${contact}. Ultimo aggiornamento: ${LEGAL_LAST_UPDATED}.`
    : `For questions about this document, write to ${contact}. Last updated: ${LEGAL_LAST_UPDATED}.`;
}

export const privacyPolicyDocument: LegalDocument = {
  slug: 'privacy',
  title: {
    it: 'Informativa sulla privacy',
    en: 'Privacy Policy',
  },
  description: {
    it: `Come ${LEGAL_SITE_NAME} raccoglie, usa e protegge i tuoi dati personali.`,
    en: `How ${LEGAL_SITE_NAME} collects, uses, and protects your personal data.`,
  },
  sections: [
    {
      id: 'controller',
      title: { it: 'Titolare del trattamento', en: 'Data controller' },
      paragraphs: [
        {
          it: `Il titolare del trattamento è ${LEGAL_CONTROLLER_NAME}, contattabile all’indirizzo indicato in questo documento. ${LEGAL_SITE_NAME} è il nome del servizio.`,
          en: `The data controller is ${LEGAL_CONTROLLER_NAME}, reachable at the contact address shown in this document. ${LEGAL_SITE_NAME} is the service name.`,
        },
      ],
    },
    {
      id: 'data-collected',
      title: { it: 'Dati che raccogliamo', en: 'Data we collect' },
      paragraphs: [
        {
          it: 'Dati di account: email, username, password (hash), eventuale nome visualizzato, avatar caricato, data di registrazione e metadati di autenticazione (es. accesso con Google).',
          en: 'Account data: email, username, password (hash), optional display name, uploaded avatar, registration date, and authentication metadata (e.g. Google sign-in).',
        },
        {
          it: 'Dati di utilizzo: playgroup creati o a cui partecipi, mazzi, risultati delle partite, statistiche, note collegate al gioco e log di accesso (username e timestamp, deduplicati ogni ora).',
          en: 'Usage data: playgroups you create or join, decks, match results, statistics, game-related notes, and access logs (username and timestamp, deduplicated hourly).',
        },
        {
          it: 'Dati tecnici: indirizzo IP e informazioni del browser/device per sicurezza, rate limiting e verifica captcha nelle operazioni sensibili.',
          en: 'Technical data: IP address and browser/device information for security, rate limiting, and captcha verification on sensitive operations.',
        },
        {
          it: 'Metriche diagnostiche aggregate della sincronizzazione partite: piattaforma, conteggi di sincronizzazioni, conflitti ed errori, profondita massima della coda, durata massima e ultimo messaggio di errore abbreviato. Non includono eventi o contenuti della partita.',
          en: 'Aggregated match-sync diagnostics: platform, sync, conflict and error counts, maximum queue depth and duration, and the latest shortened error message. They do not include match events or content.',
        },
        {
          it: 'Dati dell’app mobile: versione dell’app e del sistema operativo, modello o categoria del dispositivo, log di arresto anomalo e prestazioni quando la diagnostica Sentry è attiva, token Expo Push e piattaforma quando autorizzi le notifiche. Sentry è configurato per non inviare dati personali predefiniti.',
          en: 'Mobile-app data: app and operating-system version, device model or category, crash and performance diagnostics when Sentry diagnostics are enabled, and Expo Push token and platform when you allow notifications. Sentry is configured not to send default personal information.',
        },
        {
          it: 'Fotocamera e immagini: la fotocamera viene usata solo su tua iniziativa per funzioni come QR; l’accesso alle foto viene richiesto solo per scegliere un avatar. Le immagini non selezionate non vengono caricate.',
          en: 'Camera and images: the camera is used only at your request for features such as QR; photo access is requested only to choose an avatar. Images you do not select are not uploaded.',
        },
        {
          it: 'Preferenze locali: lingua dell’interfaccia e, se attivata, l’opzione "Ricordami" tramite cookie/storage del browser. Per il dettaglio consulta l’Informativa sui cookie.',
          en: 'Local preferences: interface language and, if enabled, the "Remember me" option via browser cookies/storage. See our Cookie Policy for details.',
        },
      ],
    },
    {
      id: 'purposes',
      title: { it: 'Finalita del trattamento', en: 'Purposes of processing' },
      paragraphs: [
        {
          it: 'Fornire il servizio (account, sincronizzazione dati, playgroup condivisi, statistiche).',
          en: 'Provide the service (accounts, data sync, shared playgroups, statistics).',
        },
        {
          it: 'Garantire sicurezza, prevenire abusi e gestire accessi amministrativi.',
          en: 'Ensure security, prevent abuse, and manage administrative access.',
        },
        {
          it: 'Inviare email transazionali (es. reset password) tramite il provider email configurato quando necessario.',
          en: 'Send transactional emails (e.g. password reset) through the configured email provider when needed.',
        },
        {
          it: 'Consegnare notifiche operative richieste dall’utente, come inviti ai playgroup e aggiornamenti delle partite.',
          en: 'Deliver operational notifications requested by the user, such as playgroup invitations and match updates.',
        },
        {
          it: 'Migliorare affidabilita e diagnostica del servizio (log tecnici e di accesso con retention limitata).',
          en: 'Improve service reliability and diagnostics (technical and access logs with limited retention).',
        },
      ],
    },
    {
      id: 'legal-basis',
      title: { it: 'Base giuridica', en: 'Legal basis' },
      paragraphs: [
        {
          it: 'Esecuzione del contratto/del servizio richiesto dall’utente (art. 6.1.b GDPR).',
          en: 'Performance of the contract/service requested by the user (GDPR Art. 6(1)(b)).',
        },
        {
          it: 'Legittimo interesse per sicurezza, prevenzione abusi e funzionamento della piattaforma (art. 6.1.f GDPR), nel rispetto dei diritti dell’utente.',
          en: 'Legitimate interest for security, abuse prevention, and platform operation (GDPR Art. 6(1)(f)), balanced against user rights.',
        },
        {
          it: 'Consenso ove richiesto da norme applicabili. Al momento non utilizziamo cookie di profilazione o marketing; eventuali cookie non strettamente necessari saranno gestiti solo previo consenso.',
          en: 'Consent where required by applicable law. We currently do not use profiling or marketing cookies; any non-essential cookies would be used only with prior consent.',
        },
      ],
    },
    {
      id: 'processors',
      title: { it: 'Fornitori e responsabili del trattamento', en: 'Processors and third parties' },
      paragraphs: [
        {
          it: 'Il servizio usa infrastruttura Supabase self-hosted (database, autenticazione e storage) distribuita tramite Dokploy, Resend (email transazionali), Google (OAuth opzionale), Cloudflare Turnstile (protezione anti-bot), Expo Push (notifiche mobili) e Sentry (diagnostica, solo se abilitata). Tali soggetti possono operare come responsabili o autonomi titolari secondo il servizio fornito.',
          en: 'The service uses self-hosted Supabase infrastructure (database, authentication, and storage) deployed through Dokploy, Resend (transactional email), Google (optional OAuth), Cloudflare Turnstile (bot protection), Expo Push (mobile notifications), and Sentry (diagnostics, only when enabled). They may act as processors or independent controllers depending on the service provided.',
        },
        {
          it: 'Import deck e metadati carte possono interrogare servizi esterni (es. Scryfall, Archidekt, Moxfield, EDHREC) senza trasferire dati personali identificativi oltre a quanto necessario alla richiesta.',
          en: 'Deck imports and card metadata may query external services (e.g. Scryfall, Archidekt, Moxfield, EDHREC) without sharing identifiable personal data beyond what the request requires.',
        },
      ],
    },
    {
      id: 'transfers',
      title: { it: 'Trasferimenti internazionali', en: 'International transfers' },
      paragraphs: [
        {
          it: 'Alcuni fornitori possono trattare dati fuori dallo Spazio Economico Europeo. In tali casi il trasferimento avviene sulla base di una decisione di adeguatezza, clausole contrattuali standard o altra garanzia prevista dal GDPR, secondo le condizioni del fornitore applicabile.',
          en: 'Some providers may process data outside the European Economic Area. In those cases, transfers rely on an adequacy decision, Standard Contractual Clauses, or another GDPR-recognized safeguard, according to the applicable provider terms.',
        },
      ],
    },
    {
      id: 'retention',
      title: { it: 'Conservazione', en: 'Retention' },
      paragraphs: [
        {
          it: 'I dati dell’account restano finche l’account e attivo o finche non ne richiedi la cancellazione.',
          en: 'Account data is kept while the account is active or until you request deletion.',
        },
        {
          it: 'I log di accesso vengono conservati per un periodo limitato (attualmente 30 giorni) e poi eliminati automaticamente.',
          en: 'Access logs are kept for a limited period (currently 30 days) and then deleted automatically.',
        },
        {
          it: 'Le metriche diagnostiche aggregate della sincronizzazione vengono conservate per 30 giorni dall’ultimo aggiornamento e poi eliminate automaticamente.',
          en: 'Aggregated sync diagnostics are kept for 30 days after their latest update and then deleted automatically.',
        },
        {
          it: 'I token delle notifiche restano associati all’account finché sono validi o finché l’account viene eliminato. Gli eventi diagnostici, se abilitati, seguono la retention configurata presso Sentry e vengono mantenuti solo per il tempo necessario a identificare e correggere problemi.',
          en: 'Notification tokens remain associated with the account while valid or until the account is deleted. Diagnostic events, when enabled, follow the retention configured with Sentry and are kept only as long as needed to identify and fix issues.',
        },
        {
          it: 'Backup e log tecnici dei fornitori possono avere tempi di conservazione propri, compatibili con le finalita indicate.',
          en: 'Vendor backups and technical logs may have their own retention periods, consistent with the purposes above.',
        },
      ],
    },
    {
      id: 'rights',
      title: { it: 'Diritti dell’interessato', en: 'Your rights' },
      paragraphs: [
        {
          it: 'Puoi richiedere accesso, rettifica, cancellazione, limitazione, portabilita dei dati e opporti a trattamenti basati su legittimo interesse, nei limiti previsti dal GDPR.',
          en: 'You may request access, rectification, erasure, restriction, portability, and object to processing based on legitimate interest, within GDPR limits.',
        },
        {
          it: 'Puoi revocare il consenso quando il trattamento si basa su di esso, senza pregiudicare trattamenti gia effettuati.',
          en: 'You may withdraw consent where processing is consent-based, without affecting prior lawful processing.',
        },
        {
          it: 'Hai diritto di proporre reclamo all’Autorita Garante per la Protezione dei Dati Personali (Italia) o all’autorita competente nel tuo Paese.',
          en: 'You may lodge a complaint with the Italian Data Protection Authority or the competent authority in your country.',
        },
      ],
    },
    {
      id: 'security',
      title: { it: 'Sicurezza', en: 'Security' },
      paragraphs: [
        {
          it: 'Applichiamo misure tecniche e organizzative ragionevoli: autenticazione sicura, Row Level Security sul database, limiti di frequenza sulle API, ruoli amministrativi ristretti e accesso ai log solo per admin autorizzati.',
          en: 'We apply reasonable technical and organizational measures: secure authentication, database Row Level Security, API rate limits, restricted admin roles, and access-log visibility limited to authorized admins.',
        },
      ],
    },
    {
      id: 'minors',
      title: { it: 'Minori', en: 'Minors' },
      paragraphs: [
        {
          it: 'Il servizio non e destinato a minori di 16 anni. Se ritieni che un minore ci abbia fornito dati personali, contattaci per la rimozione.',
          en: 'The service is not intended for users under 16. If you believe a minor provided personal data, contact us for removal.',
        },
      ],
    },
    {
      id: 'changes',
      title: { it: 'Modifiche', en: 'Changes' },
      paragraphs: [
        {
          it: 'Possiamo aggiornare questa informativa. La data di ultimo aggiornamento e indicata in fondo al documento. Per modifiche rilevanti potremo informarti tramite il servizio o email.',
          en: 'We may update this policy. The last updated date is shown at the bottom of the document. Material changes may be communicated via the service or email.',
        },
        {
          it: contactParagraph('it'),
          en: contactParagraph('en'),
        },
      ],
    },
  ],
};

export const termsOfUseDocument: LegalDocument = {
  slug: 'terms',
  title: {
    it: 'Termini d’uso',
    en: 'Terms of Use',
  },
  description: {
    it: `Regole per l’uso di ${LEGAL_SITE_NAME}.`,
    en: `Rules for using ${LEGAL_SITE_NAME}.`,
  },
  sections: [
    {
      id: 'acceptance',
      title: { it: 'Accettazione', en: 'Acceptance' },
      paragraphs: [
        {
          it: `Usando ${LEGAL_SITE_NAME} accetti questi Termini, la nostra Informativa sulla privacy e l’Informativa sui cookie. Se non accetti, non usare il servizio.`,
          en: `By using ${LEGAL_SITE_NAME}, you accept these Terms, our Privacy Policy, and Cookie Policy. If you do not agree, do not use the service.`,
        },
      ],
    },
    {
      id: 'service',
      title: { it: 'Descrizione del servizio', en: 'Service description' },
      paragraphs: [
        {
          it: `${LEGAL_SITE_NAME}, pubblicato da ${LEGAL_BRAND_NAME}, è uno strumento online gratuito per tracciare partite Commander/EDH, gestire mazzi, playgroup e statistiche tra giocatori. Il servizio è in evoluzione e può includere funzioni beta o demo.`,
          en: `${LEGAL_SITE_NAME}, published by ${LEGAL_BRAND_NAME}, is a free online tool to track Commander/EDH games, manage decks, playgroups, and player statistics. The service is evolving and may include beta or demo features.`,
        },
      ],
    },
    {
      id: 'account',
      title: { it: 'Account', en: 'Account' },
      paragraphs: [
        {
          it: 'Devi fornire informazioni accurate e mantenere la riservatezza delle credenziali. Sei responsabile dell’attivita sul tuo account.',
          en: 'You must provide accurate information and keep your credentials confidential. You are responsible for activity on your account.',
        },
        {
          it: 'Username riservati o di sistema (es. administrator, demo) non possono essere registrati da utenti ordinari.',
          en: 'Reserved or system usernames (e.g. administrator, demo) cannot be registered by regular users.',
        },
      ],
    },
    {
      id: 'acceptable-use',
      title: { it: 'Uso consentito', en: 'Acceptable use' },
      paragraphs: [
        {
          it: 'Non usare il servizio per attivita illegali, molestie, spam, tentativi di accesso non autorizzato, scraping aggressivo o interferenza con l’infrastruttura.',
          en: 'Do not use the service for illegal activity, harassment, spam, unauthorized access attempts, aggressive scraping, or infrastructure interference.',
        },
        {
          it: 'Non caricare contenuti illeciti, offensivi o che violino diritti di terzi (inclusi avatar o nickname).',
          en: 'Do not upload unlawful, offensive, or third-party-rights-infringing content (including avatars or nicknames).',
        },
      ],
    },
    {
      id: 'user-content',
      title: { it: 'Contenuti utente', en: 'User content' },
      paragraphs: [
        {
          it: 'Mantieni la proprieta dei contenuti che inserisci (mazzi, note, statistiche). Ci concedi una licenza limitata per ospitarli, mostrarli e sincronizzarli nell’ambito del servizio.',
          en: 'You retain ownership of content you submit (decks, notes, statistics). You grant us a limited license to host, display, and sync it within the service.',
        },
      ],
    },
    {
      id: 'demo',
      title: { it: 'Modalita demo', en: 'Demo mode' },
      paragraphs: [
        {
          it: 'Se disponibile, la demo offre un account precaricato a scopo dimostrativo. I dati demo possono essere resettati periodicamente senza preavviso.',
          en: 'When available, demo mode provides a pre-filled account for demonstration. Demo data may be reset periodically without notice.',
        },
      ],
    },
    {
      id: 'third-party',
      title: { it: 'Servizi e marchi di terzi', en: 'Third-party services and marks' },
      paragraphs: [
        {
          it: FAN_CONTENT_NOTICE,
          en: FAN_CONTENT_NOTICE,
        },
        {
          it: 'Magic: The Gathering, Commander e i relativi marchi appartengono a Wizards of the Coast. Scryfall, EDHREC, Archidekt, Moxfield e altri servizi citati sono indipendenti da noi.',
          en: 'Magic: The Gathering, Commander, and related marks belong to Wizards of the Coast. Scryfall, EDHREC, Archidekt, Moxfield, and other cited services are independent of us.',
        },
        {
          it: `${LEGAL_SITE_NAME} non e affiliato, approvato o sponsorizzato da Wizards of the Coast o da altri titolari di marchi menzionati.`,
          en: `${LEGAL_SITE_NAME} is not affiliated with, endorsed by, or sponsored by Wizards of the Coast or other mentioned trademark owners.`,
        },
        {
          it: 'Quando chiedi di importare un mazzo o aprire un servizio esterno, autorizzi la richiesta necessaria. Restano applicabili i termini e le informative del servizio terzo.',
          en: 'When you request a deck import or open an external service, you authorize the required request. The third party’s terms and privacy policy continue to apply.',
        },
      ],
    },
    {
      id: 'intellectual-property',
      title: { it: 'Proprietà intellettuale e licenze', en: 'Intellectual property and licenses' },
      paragraphs: [
        {
          it: `Il codice originale del progetto è distribuito da ${LEGAL_BRAND_NAME} secondo la licenza indicata nel repository. Contenuti, marchi e componenti di terzi restano soggetti alle rispettive licenze e non diventano parte della licenza del progetto.`,
          en: `Original project code is distributed by ${LEGAL_BRAND_NAME} under the license identified in the repository. Third-party content, marks, and components remain subject to their respective licenses and do not become part of the project license.`,
        },
        {
          it: 'Non puoi usare il servizio per creare proxy, contraffazioni o copie destinate a sostituire prodotti ufficiali.',
          en: 'You may not use the service to create proxies, counterfeits, or copies intended to replace official products.',
        },
      ],
    },
    {
      id: 'reporting',
      title: { it: 'Segnalazioni e rimozione contenuti', en: 'Reporting and content removal' },
      paragraphs: [
        {
          it: 'Puoi segnalare contenuti illeciti, offensivi o che violano proprietà intellettuale scrivendo al contatto indicato in questo documento e specificando contenuto, posizione, motivo e tuoi recapiti. Le segnalazioni vengono valutate e, quando fondate, il contenuto può essere rimosso e l’account limitato o chiuso.',
          en: 'You may report unlawful, offensive, or intellectual-property-infringing content through the contact shown in this document, identifying the content, its location, the reason, and your contact details. Reports are reviewed and, when substantiated, content may be removed and the account restricted or terminated.',
        },
        {
          it: 'Gli account che pubblicano ripetutamente contenuti illeciti o lesivi di diritti di terzi possono essere sospesi o chiusi.',
          en: 'Accounts that repeatedly publish unlawful or third-party-rights-infringing content may be suspended or terminated.',
        },
      ],
    },
    {
      id: 'availability',
      title: { it: 'Disponibilita', en: 'Availability' },
      paragraphs: [
        {
          it: 'Il servizio e fornito "cosi com’e", senza garanzia di uptime continuo. Possono verificarsi manutenzioni, interruzioni o modifiche alle funzionalita.',
          en: 'The service is provided "as is" without guaranteed continuous uptime. Maintenance, outages, or feature changes may occur.',
        },
      ],
    },
    {
      id: 'termination',
      title: { it: 'Sospensione e chiusura', en: 'Suspension and termination' },
      paragraphs: [
        {
          it: 'Possiamo sospendere o chiudere account che violano questi Termini o che comportano rischi per la piattaforma o altri utenti.',
          en: 'We may suspend or close accounts that violate these Terms or pose risks to the platform or other users.',
        },
        {
          it: 'Puoi smettere di usare il servizio in qualsiasi momento ed eliminare definitivamente il tuo account dalle Impostazioni dell’app.',
          en: 'You may stop using the service at any time and permanently delete your account from the app Settings.',
        },
      ],
    },
    {
      id: 'liability',
      title: { it: 'Limitazione di responsabilita', en: 'Limitation of liability' },
      paragraphs: [
        {
          it: 'Nei limiti consentiti dalla legge, non siamo responsabili per danni indiretti, perdita di dati dovuta a cause esterne o uso improprio del servizio. La responsabilita complessiva resta limitata al massimo consentito.',
          en: 'To the extent permitted by law, we are not liable for indirect damages, data loss from external causes, or misuse of the service. Overall liability remains limited to the maximum extent allowed.',
        },
      ],
    },
    {
      id: 'law',
      title: { it: 'Legge applicabile', en: 'Governing law' },
      paragraphs: [
        {
          it: 'Questi Termini sono regolati dalla legge italiana, salvo diritti inderogabili del consumatore previsti dalla legge del Paese di residenza.',
          en: 'These Terms are governed by Italian law, subject to mandatory consumer rights in your country of residence.',
        },
        {
          it: contactParagraph('it'),
          en: contactParagraph('en'),
        },
      ],
    },
  ],
};

export const cookiePolicyDocument: LegalDocument = {
  slug: 'cookies',
  title: {
    it: 'Informativa sui cookie',
    en: 'Cookie Policy',
  },
  description: {
    it: `Come ${LEGAL_SITE_NAME} usa cookie e tecnologie simili sul browser.`,
    en: `How ${LEGAL_SITE_NAME} uses cookies and similar browser technologies.`,
  },
  sections: [
    {
      id: 'overview',
      title: { it: 'Cosa sono', en: 'What they are' },
      paragraphs: [
        {
          it: 'Cookie e storage locali (localStorage/sessionStorage) sono piccoli dati salvati sul tuo dispositivo per far funzionare il sito, mantenere l’accesso e ricordare alcune preferenze.',
          en: 'Cookies and local storage (localStorage/sessionStorage) are small pieces of data stored on your device to run the site, keep you signed in, and remember certain preferences.',
        },
        {
          it: 'Questa informativa descrive le tecnologie attualmente in uso. Per il trattamento dei dati personali in generale consulta anche l’Informativa sulla privacy.',
          en: 'This notice describes the technologies currently in use. For personal data processing in general, also see our Privacy Policy.',
        },
      ],
    },
    {
      id: 'first-party',
      title: { it: 'Cookie e storage di prima parte', en: 'First-party cookies and storage' },
      paragraphs: [
        {
          it: 'Autenticazione (necessari): cookie di sessione Supabase per mantenere l’accesso, rinnovare il token e proteggere il flusso OAuth/PKCE. Senza questi cookie non puoi restare connesso.',
          en: 'Authentication (essential): Supabase session cookies to keep you signed in, refresh tokens, and protect the OAuth/PKCE flow. Without these cookies you cannot stay logged in.',
        },
        {
          it: 'Ricordami (funzionali): preferenza salvata in localStorage e, se attiva, durata estesa dei cookie di autenticazione (fino a circa 400 giorni). Se disattivi "Ricordami", la sessione termina alla chiusura del browser.',
          en: 'Remember me (functional): preference stored in localStorage and, when enabled, extended authentication cookie lifetime (up to about 400 days). If you disable "Remember me", the session ends when you close the browser.',
        },
        {
          it: 'Lingua (funzionali): preferenza IT/EN salvata in localStorage (`phyrexian-arena-language`).',
          en: 'Language (functional): IT/EN preference stored in localStorage (`phyrexian-arena-language`).',
        },
        {
          it: 'Cache dell’app (funzionale): playgroup, record recenti, mazzi, immagini dei comandanti e operazioni delle partite live possono essere conservati localmente sul dispositivo per avvio rapido, uso offline e ripristino dopo un crash. La cache è separata per account e viene aggiornata dal server.',
          en: 'App cache (functional): playgroups, recent records, decks, commander images, and live-game operations may be stored locally on the device for fast startup, offline use, and crash recovery. The cache is separated by account and refreshed from the server.',
        },
        {
          it: 'Sicurezza e funzionamento (necessari/tecnici): sessionStorage temporaneo per il ritorno OAuth, deduplicazione log di accesso, cache demo e cache locale EDHREC per ridurre richieste ripetute.',
          en: 'Security and operation (essential/technical): temporary sessionStorage for OAuth return handling, access-log deduplication, demo-mode cache, and local EDHREC cache to reduce repeat requests.',
        },
      ],
    },
    {
      id: 'third-party',
      title: { it: 'Servizi di terze parti', en: 'Third-party services' },
      paragraphs: [
        {
          it: 'Cloudflare Turnstile (sicurezza): nelle pagine di registrazione, recupero password e reinvio conferma può usare tecnologie simili per verificare che la richiesta non sia automatizzata. Si attiva solo quando usi quelle funzioni.',
          en: 'Cloudflare Turnstile (security): on registration, password recovery, and resend-confirmation pages it may use similar technologies to verify the request is not automated. It is activated only when you use those features.',
        },
        {
          it: 'Google OAuth (autenticazione): se scegli "Accedi con Google", vieni reindirizzato a Google che può usare cookie secondo la propria policy. L’uso è opzionale e avviene solo su tua iniziativa.',
          en: 'Google OAuth (authentication): if you choose "Sign in with Google", you are redirected to Google, which may use cookies under its own policy. Use is optional and only on your initiative.',
        },
        {
          it: 'Non utilizziamo cookie di analytics, advertising o profilazione commerciale di terze parti (es. Google Analytics, Meta Pixel).',
          en: 'We do not use third-party analytics, advertising, or commercial profiling cookies (e.g. Google Analytics, Meta Pixel).',
        },
      ],
    },
    {
      id: 'consent',
      title: { it: 'Consenso e banner', en: 'Consent and banners' },
      paragraphs: [
        {
          it: 'Allo stato attuale il sito usa solo cookie e storage strettamente necessari o funzionali al servizio richiesto. Per questo non mostriamo un banner di consenso cookie.',
          en: 'At present the site uses only cookies and storage that are strictly necessary or functional to the service you request. For this reason we do not show a cookie consent banner.',
        },
        {
          it: 'Se in futuro introdurremo cookie non necessari (es. analytics di marketing), aggiorneremo questa informativa e chiederemo il consenso prima del loro utilizzo.',
          en: 'If we later introduce non-essential cookies (e.g. marketing analytics), we will update this notice and ask for consent before using them.',
        },
      ],
    },
    {
      id: 'manage',
      title: { it: 'Come gestirli', en: 'How to manage them' },
      paragraphs: [
        {
          it: 'Puoi disattivare "Ricordami" al login, cambiare lingua dall’interfaccia, uscire dall’account o cancellare cookie/storage dal browser. La disabilitazione dei cookie necessari impedisce l’accesso.',
          en: 'You can disable "Remember me" at login, change language in the UI, sign out, or clear cookies/storage from your browser. Disabling essential cookies will prevent sign-in.',
        },
        {
          it: 'Per le policy dei fornitori terzi: Cloudflare (cloudflare.com), Google (policies.google.com), Supabase (supabase.com).',
          en: 'For third-party policies: Cloudflare (cloudflare.com), Google (policies.google.com), Supabase (supabase.com).',
        },
      ],
    },
    {
      id: 'changes',
      title: { it: 'Modifiche', en: 'Changes' },
      paragraphs: [
        {
          it: 'Possiamo aggiornare questa informativa quando cambiano le tecnologie usate. La data di ultimo aggiornamento è indicata in alto.',
          en: 'We may update this notice when the technologies in use change. The last updated date is shown at the top.',
        },
        {
          it: contactParagraph('it'),
          en: contactParagraph('en'),
        },
      ],
    },
  ],
};

export const legalDocuments = {
  privacy: privacyPolicyDocument,
  terms: termsOfUseDocument,
  cookies: cookiePolicyDocument,
} as const;
