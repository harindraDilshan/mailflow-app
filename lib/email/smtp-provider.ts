import nodemailer from "nodemailer";
import type { EmailMessage, EmailProvider, SendResult } from "./provider";

export class SmtpProvider implements EmailProvider {
  // pool: reuse connections instead of opening a new one for every email
  private transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    pool: true,
    maxConnections: 5,
  });

  async send(msg: EmailMessage): Promise<SendResult> {
    try {
      const info = await this.transport.sendMail(msg);
      return { ok: true, messageId: info.messageId };
    } catch (e) {
      // 5xx replies are permanent ("no such mailbox"). Everything else can be retried.
      const code = (e as { responseCode?: number }).responseCode;
      return {
        ok: false,
        error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
        retryable: !(code && code >= 500),
      };
    }
  }
}