import { getLegalContactLabel, LEGAL_LAST_UPDATED, LEGAL_SITE_NAME } from '@/lib/legal-site';

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
          it: `${LEGAL_SITE_NAME} e il gestore del servizio (di seguito "noi") trattano i dati personali degli utenti che creano un account o usano la piattaforma di tracciamento partite Commander/EDH.`,
          en: `${LEGAL_SITE_NAME} and the service operator ("we") process personal data for users who create an account or use the Commander/EDH game tracking platform.`,
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
          it: 'Dati di utilizzo: arene create o a cui partecipi, mazzi, risultati delle partite, statistiche, note collegate al gioco e log di accesso (username e timestamp, deduplicati ogni ora).',
          en: 'Usage data: arenas you create or join, decks, match results, statistics, game-related notes, and access logs (username and timestamp, deduplicated hourly).',
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
          it: 'Fornire il servizio (account, sincronizzazione dati, arene condivise, statistiche).',
          en: 'Provide the service (accounts, data sync, shared arenas, statistics).',
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
          it: 'Il servizio si appoggia a fornitori che trattano dati per nostro conto o come autonomi titolari, tra cui: Supabase (database e autenticazione), Vercel (hosting), Resend (email transazionali), Google (OAuth, se usato), hCaptcha (protezione anti-bot).',
          en: 'The service relies on providers that process data on our behalf or as independent controllers, including: Supabase (database and auth), Vercel (hosting), Resend (transactional email), Google (OAuth, if used), and hCaptcha (bot protection).',
        },
        {
          it: 'Import deck e metadati carte possono interrogare servizi esterni (es. Scryfall, Archidekt, Moxfield, EDHREC) senza trasferire dati personali identificativi oltre a quanto necessario alla richiesta.',
          en: 'Deck imports and card metadata may query external services (e.g. Scryfall, Archidekt, Moxfield, EDHREC) without sharing identifiable personal data beyond what the request requires.',
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
          it: `${LEGAL_SITE_NAME} e uno strumento online per tracciare partite Commander/EDH, gestire mazzi, arene e statistiche tra giocatori. Il servizio e fornito in evoluzione e puo includere funzioni beta o demo.`,
          en: `${LEGAL_SITE_NAME} is an online tool to track Commander/EDH games, manage decks, arenas, and player statistics. The service is evolving and may include beta or demo features.`,
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
          it: 'Magic: The Gathering, Commander e i relativi marchi appartengono a Wizards of the Coast. Scryfall, EDHREC, Archidekt, Moxfield e altri servizi citati sono indipendenti da noi.',
          en: 'Magic: The Gathering, Commander, and related marks belong to Wizards of the Coast. Scryfall, EDHREC, Archidekt, Moxfield, and other cited services are independent of us.',
        },
        {
          it: `${LEGAL_SITE_NAME} non e affiliato, approvato o sponsorizzato da Wizards of the Coast o da altri titolari di marchi menzionati.`,
          en: `${LEGAL_SITE_NAME} is not affiliated with, endorsed by, or sponsored by Wizards of the Coast or other mentioned trademark owners.`,
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
          it: 'Lingua (funzionali): preferenza IT/EN salvata nello storage locale del dispositivo (`phyrexian-arena-language`).',
          en: 'Language (functional): IT/EN preference stored in the device local storage (`phyrexian-arena-language`).',
        },
        {
          it: 'Cache dell’app (funzionale): arene, record recenti, mazzi, immagini dei comandanti e operazioni delle partite live possono essere conservati localmente sul dispositivo per avvio rapido, uso offline e ripristino dopo un crash. La cache è separata per account e viene aggiornata dal server.',
          en: 'App cache (functional): Arenas, recent records, decks, commander images, and live-game operations may be stored locally on the device for fast startup, offline use, and crash recovery. The cache is separated by account and refreshed from the server.',
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
          it: 'hCaptcha (sicurezza): nelle pagine di registrazione, recupero password e reinvio conferma può impostare cookie o tecnologie simili per verificare che la richiesta non sia automatizzata. Si attiva solo quando usi quelle funzioni.',
          en: 'hCaptcha (security): on registration, password recovery, and resend-confirmation pages it may set cookies or similar technologies to verify the request is not automated. It is activated only when you use those features.',
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
          it: 'Per le policy dei fornitori terzi: hCaptcha (hcaptcha.com), Google (policies.google.com), Supabase (supabase.com).',
          en: 'For third-party policies: hCaptcha (hcaptcha.com), Google (policies.google.com), Supabase (supabase.com).',
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
