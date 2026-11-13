import { APP_NAME } from "@primarywms/shared";
import nodemailer from "nodemailer";

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  attachments?: MailAttachment[],
) {
  if (!process.env.SMTP_HOST) {
    console.log(`[email] to=${to} subject=${subject}\n${text}`);
    if (attachments?.length) {
      console.log(`[email] attachments=${attachments.map((a) => `${a.filename} (${a.content.length} bytes)`).join(", ")}`);
    }
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"${APP_NAME}" <noreply@localhost>`,
    to,
    subject,
    text,
    attachments: attachments?.map((row) => ({
      filename: row.filename,
      content: row.content,
      contentType: row.contentType,
    })),
  });
}

export async function sendInviteEmail(to: string, name: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${token}`;
  await sendMail(
    to,
    `You are invited to ${APP_NAME}`,
    `Hi ${name || to},\n\nYou have been invited to join ${APP_NAME}. Set your password:\n${url}\n\nThis link expires in 14 days.`,
  );
}

export async function sendResetEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;
  await sendMail(to, `Reset your ${APP_NAME} password`, `Reset your password:\n${url}\n\nThis link expires in 2 hours.`);
}

export async function sendAlertEmail(to: string, title: string, body: string) {
  await sendMail(to, `${APP_NAME}: ${title}`, body);
}
