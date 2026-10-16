import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
} from "@aws-sdk/client-sesv2";

const ses = new SESv2Client({ region: process.env.AWS_REGION });

export async function createDomainIdentity(domain: string) {
  const res = await ses.send(new CreateEmailIdentityCommand({ EmailIdentity: domain }));
  const tokens = res.DkimAttributes?.Tokens ?? [];

  // Custom MAIL FROM (bounce.<domain>). Not required, so ignore failures.
  const mailFromDomain = `bounce.${domain}`;
  try {
    await ses.send(
      new PutEmailIdentityMailFromAttributesCommand({
        EmailIdentity: domain,
        MailFromDomain: mailFromDomain,
        BehaviorOnMxFailure: "USE_DEFAULT_VALUE",
      })
    );
  } catch {}

  return { tokens, mailFromDomain };
}

export async function getDomainIdentity(domain: string) {
  const res = await ses.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
  return {
    verifiedForSending: res.VerifiedForSendingStatus ?? false,
    dkimStatus: res.DkimAttributes?.Status ?? "NOT_STARTED", // PENDING, SUCCESS, FAILED...
    tokens: res.DkimAttributes?.Tokens ?? [],
  };
}

export async function deleteDomainIdentity(domain: string) {
  try {
    await ses.send(new DeleteEmailIdentityCommand({ EmailIdentity: domain }));
  } catch {} // already gone is fine
}