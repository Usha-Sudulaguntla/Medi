import nodemailer from 'nodemailer';

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends an email if SMTP_* is configured in .env. If it isn't (e.g. local
 * dev, or you haven't set up an email provider yet), the message is printed
 * to the server console instead — so OTP codes and reset links are always
 * reachable, they just show up in your terminal rather than an inbox.
 */
export async function sendEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[DEV EMAIL — SMTP not configured, printing instead]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }
  await t.sendMail({ from: process.env.SMTP_FROM || 'MediKiosk <no-reply@medikiosk.in>', to, subject, text });
}
