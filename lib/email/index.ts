import type { EmailProvider } from "./provider";
import { SmtpProvider } from "./smtp-provider";
import { SesProvider } from "./ses-provider";

let provider: EmailProvider | undefined;

export function getProvider(): EmailProvider {
  if (provider) return provider;
  switch (process.env.EMAIL_PROVIDER ?? "smtp") {
    case "smtp":
      provider = new SmtpProvider();
      return provider;
    case "ses":
      provider = new SesProvider();
      return provider;
    default:
      throw new Error("Unknown EMAIL_PROVIDER");
  }
}