export type EmailMessage = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  tags?: Record<string, string>;
};

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; retryable: boolean };

export interface EmailProvider {
  send(msg: EmailMessage): Promise<SendResult>;
}