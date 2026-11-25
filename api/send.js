/**
 * RODEO EVENT — Resend Email Dispatcher
 *
 * Can run as a Vercel Serverless Function or be imported by server.js / custom backends.
 */

export async function sendBookingEmail(data, env = process.env) {
  const apiKey = env.RESEND_API_KEY;
  const toEmail = env.TO_EMAIL || 'rodeorent1@gmail.com';
  const fromEmail = env.FROM_EMAIL || 'RODEO EVENT <onboarding@resend.dev>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured on the server. Please add RESEND_API_KEY to your environment variables or .env file.');
  }

  const {
    name = '',
    contact = '',
    date = '',
    location = '',
    eventTypeLabel = '',
    hours = '',
    estimate = '',
    notes = '',
    language = 'ru',
  } = data || {};

  if (!name.trim() || !contact.trim()) {
    throw new Error('Имя и контактные данные обязательны для заполнения.');
  }

  // Detect email in contact field for reply-to header
  const emailMatch = contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const replyTo = emailMatch ? emailMatch[0] : undefined;

  const isRu = language === 'ru';
  const cleanName = name.trim();
  const dateStr = date ? ` (${date})` : '';
  const subject = `Новая заявка: ${cleanName}${dateStr} — RODEO EVENT`;

  const escapeHtml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const rows = [
    { label: isRu ? 'Имя клиента' : 'Kliendi nimi', value: cleanName },
    { label: isRu ? 'Телефон / Email' : 'Telefon / E-post', value: contact },
    { label: isRu ? 'Дата мероприятия' : 'Ürituse kuupäev', value: date || (isRu ? 'Не указана' : 'Määramata') },
    { label: isRu ? 'Место проведения' : 'Toimumiskoht', value: location || (isRu ? 'Не указано' : 'Määramata') },
    { label: isRu ? 'Тип мероприятия' : 'Ürituse tüüp', value: eventTypeLabel || (isRu ? 'Не указан' : 'Määramata') },
    { label: isRu ? 'Продолжительность' : 'Rendi kestus', value: hours ? `${hours} ${isRu ? 'ч.' : 'tundi'}` : '—' },
    { label: isRu ? 'Предварительная стоимость' : 'Esialgne hind', value: estimate || '—', highlight: true },
    { label: isRu ? 'Пожелания и детали' : 'Lisamärkused', value: notes || (isRu ? 'Нет комментариев' : 'Märkusi pole') },
    { label: isRu ? 'Язык заявки' : 'Päringu keel', value: language.toUpperCase() },
  ];

  const htmlRows = rows
    .map(
      (r) => `
      <tr>
        <td style="padding: 11px 16px; border-bottom: 1px solid #ebe5df; color: #665f59; font-size: 13px; font-weight: 700; width: 38%; vertical-align: top;">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding: 11px 16px; border-bottom: 1px solid #ebe5df; color: ${r.highlight ? '#9e292b' : '#1d1b1b'}; font-size: ${r.highlight ? '17px' : '14px'}; font-weight: ${r.highlight ? '800' : '400'}; vertical-align: top;">
          ${escapeHtml(r.value).replace(/\n/g, '<br>')}
        </td>
      </tr>`
    )
    .join('');

  const timestamp = new Date().toLocaleString('et-EE', { timeZone: 'Europe/Tallinn' });

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f5f1ec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1d1b1b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #dfd7cf; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background-color: #1b1919; padding: 26px 30px; border-bottom: 4px solid #9e292b;">
        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase;">
          RODEO <span style="color: #9e292b;">EVENT.</span>
        </h1>
        <p style="margin: 6px 0 0; color: #b0a8a0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">
          ${isRu ? 'Новая заявка с сайта' : 'Uus päring veebilehelt'} • ${timestamp}
        </p>
      </td>
    </tr>
    <!-- Content Table -->
    <tr>
      <td style="padding: 24px 30px 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${htmlRows}
        </table>
      </td>
    </tr>
    <!-- Quick reply hint -->
    ${replyTo ? `
    <tr>
      <td style="padding: 10px 30px 20px;">
        <div style="background: #faf7f4; border: 1px solid #ebd9da; border-left: 3px solid #9e292b; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #554e48;">
          💡 <strong>Быстрый ответ:</strong> Нажмите «Ответить» в вашей почте, чтобы написать клиенту напрямую на <strong>${escapeHtml(replyTo)}</strong>.
        </div>
      </td>
    </tr>` : ''}
    <!-- Footer -->
    <tr>
      <td style="background-color: #f7f4f0; padding: 18px 30px; border-top: 1px solid #ebe5df; font-size: 11px; color: #857d76; text-align: center;">
        RODEO EVENT • Аренда механического быка в Эстонии<br>
        Email: <a href="mailto:rodeorent1@gmail.com" style="color: #857d76; text-decoration: underline;">rodeorent1@gmail.com</a> • Тел: +372 55677080 / +372 53010451
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textRows = rows.map((r) => `${r.label}: ${r.value}`).join('\n');
  const text = `RODEO EVENT — ${isRu ? 'Новая заявка с сайта' : 'Uus päring veebilehelt'} (${timestamp})\n\n${textRows}\n\n---\nRODEO EVENT: rodeorent1@gmail.com | +372 55677080`;

  const payload = {
    from: fromEmail,
    to: [toEmail],
    subject,
    html,
    text,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorDetails = responseData?.message || responseData?.error || `HTTP ${response.status}`;
    throw new Error(`Resend Error: ${errorDetails}`);
  }

  return responseData;
}

/**
 * Standard Vercel Serverless Function handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await sendBookingEmail(body, process.env);
    return res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    console.error('[RODEO Send API Error]:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
