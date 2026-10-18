import type { EmailProvider } from "./provider";
import { SmtpProvider } from "./smtp-provider";

let provider: EmailProvider | undefined;

export function getProvider(): EmailProvider {
  if (provider) return provider;
  switch (process.env.EMAIL_PROVIDER ?? "smtp") {
    case "smtp":
      provider = new SmtpProvider();
      return provider;
    case "ses":
      throw new Error("The SES provider is the next thing we build.");
    default:
      throw new Error("Unknown EMAIL_PROVIDER");
  }
}