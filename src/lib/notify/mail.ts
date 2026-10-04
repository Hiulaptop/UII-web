import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// The system mailbox. Use a Gmail app password (Google Account > Security > 2-Step Verification > App passwords).
export const mailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

let transport: Transporter | undefined;
const getTransport = () =>
  (transport ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  }));

export async function sendMail(to: string, m: { subject: string; text: string; html: string }) {
  const name = (process.env.MAIL_FROM_NAME || "UII").replace(/[\r\n"]/g, "");
  await getTransport().sendMail({ from: `"${name}" <${process.env.GMAIL_USER}>`, to, ...m });
}
