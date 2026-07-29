import type { AppLocale } from '@/lib/auth-validation';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function wrapEmailHtml(content: string) {
  return `
    <div style="font-family: Inter, Segoe UI, Arial, sans-serif; background:#050807; color:#f4f7f4; padding:32px 16px;">
      <div style="max-width:560px; margin:0 auto; background:#101713; border:1px solid #24592b; border-radius:16px; padding:28px;">
        <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.24em; text-transform:uppercase; color:#72d17b;">Tracker &amp; Analytics</p>
        ${content}
        <p style="margin:24px 0 0; font-size:12px; color:#8ca993;">MTG Life Counter &amp; Analytics: Commander · blackistoostrong</p>
      </div>
    </div>
  `.trim();
}

function buttonHtml(href: string, label: string) {
  return `
    <p style="margin:24px 0;">
      <a href="${href}" style="display:inline-block; background:linear-gradient(90deg,#286b31,#429f4a); border:1px solid #72d17b; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 20px; border-radius:10px;">
        ${label}
      </a>
    </p>
  `;
}

export function buildSignupConfirmationEmail(locale: AppLocale, actionLink: string): EmailTemplate {
  if (locale === 'en') {
    return {
      subject: 'Confirm your MTG: Commander account',
      html: wrapEmailHtml(`
        <h1 style="margin:0 0 12px; font-size:24px;">Confirm your email</h1>
        <p style="margin:0 0 12px; line-height:1.6; color:#d8e6da;">Thanks for joining Tracker &amp; Analytics. Confirm your email to activate your account and start logging Commander games.</p>
        ${buttonHtml(actionLink, 'Confirm email')}
        <p style="margin:0; font-size:13px; line-height:1.6; color:#8ca993;">If you did not create this account, you can ignore this message.</p>
      `),
      text: `Confirm your MTG: Commander account:\n${actionLink}`,
    };
  }

  return {
    subject: 'Conferma il tuo account MTG: Commander',
    html: wrapEmailHtml(`
      <h1 style="margin:0 0 12px; font-size:24px;">Conferma la tua email</h1>
      <p style="margin:0 0 12px; line-height:1.6; color:#d8e6da;">Grazie per esserti unito a Tracker &amp; Analytics. Conferma la tua email per attivare l'account e iniziare a registrare le partite Commander.</p>
      ${buttonHtml(actionLink, 'Conferma email')}
      <p style="margin:0; font-size:13px; line-height:1.6; color:#8ca993;">Se non hai creato questo account, puoi ignorare questo messaggio.</p>
    `),
    text: `Conferma il tuo account MTG: Commander:\n${actionLink}`,
  };
}

export function buildPasswordResetEmail(locale: AppLocale, actionLink: string): EmailTemplate {
  if (locale === 'en') {
    return {
      subject: 'Reset your MTG: Commander password',
      html: wrapEmailHtml(`
        <h1 style="margin:0 0 12px; font-size:24px;">Reset your password</h1>
        <p style="margin:0 0 12px; line-height:1.6; color:#d8e6da;">We received a request to reset your password. Use the button below to choose a new one.</p>
        ${buttonHtml(actionLink, 'Reset password')}
        <p style="margin:0; font-size:13px; line-height:1.6; color:#8ca993;">If you did not request this, you can ignore this message.</p>
      `),
      text: `Reset your MTG: Commander password:\n${actionLink}`,
    };
  }

  return {
    subject: 'Reimposta la password di MTG: Commander',
    html: wrapEmailHtml(`
      <h1 style="margin:0 0 12px; font-size:24px;">Reimposta la password</h1>
      <p style="margin:0 0 12px; line-height:1.6; color:#d8e6da;">Abbiamo ricevuto una richiesta di reimpostazione password. Usa il pulsante qui sotto per sceglierne una nuova.</p>
      ${buttonHtml(actionLink, 'Reimposta password')}
      <p style="margin:0; font-size:13px; line-height:1.6; color:#8ca993;">Se non hai richiesto questa operazione, puoi ignorare questo messaggio.</p>
    `),
    text: `Reimposta la password di MTG: Commander:\n${actionLink}`,
  };
}
