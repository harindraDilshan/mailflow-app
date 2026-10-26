import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { EmailMessage, EmailProvider, SendResult } from "./provider";

// A second try never fixes these errors.
const PERMANENT = new Set([
  "MessageRejected",
  "MailFromDomainNotVerifiedException",
  "BadRequestException",
  "NotFoundException",
]);

export class SesProvider implements EmailProvider {
  private client = new SESv2Client({ region: process.env.AWS_REGION });
  private transport = nodemailer.createTransport({
    SES: { sesClient: this.client, SendEmailCommand },
  });

  async send(msg: EmailMessage): Promise<SendResult> {
    try {
      const info = await this.transport.sendMail({
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        replyTo: msg.replyTo,
        headers: msg.headers,
        ses: {
          ...(process.env.SES_CONFIGURATION_SET
            ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }
            : {}),
          ...(msg.tags
            ? { EmailTags: Object.entries(msg.tags).map(([Name, Value]) => ({ Name, Value })) }
            : {}),
        },
      });
      return { ok: true, messageId: String(info.messageId).split("@")[0].replace(/[<>]/g, "") };
    } catch (e) {
      const err = e as { name?: string; message?: string };
      return {
        ok: false,
        error: `${err.name ?? "Error"}: ${err.message ?? ""}`.slice(0, 500),
        retryable: !PERMANENT.has(err.name ?? ""),
      };
    }
  }
}