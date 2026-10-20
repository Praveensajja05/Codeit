// Sends email through any SMTP server (Gmail, Outlook, Brevo, ...), configured in .env.
// Without SMTP settings, "sending" prints the email in the server terminal instead,
// so reminders can be tried out locally before any email account is set up.
import nodemailer from "nodemailer";

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function createMailer() {
  if (!emailConfigured()) {
    return {
      configured: false,
      async send({ to, subject, text }) {
        console.log(`\n[email not configured, printing instead]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
      },
    };
  }
  const port = Number(process.env.SMTP_PORT) || 587;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,   // 465 uses TLS from the start; 587 upgrades with STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return {
    configured: true,
    send: ({ to, subject, text }) =>
      transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text }),
  };
}
