import { ERROR_RESPONSE } from "@/lib/docs/api-examples";
import { CodeBlock } from "@/components/docs/code-block";
import { C, Callout, DocPageBody, DocTitle, H2, P, PrevNext } from "@/components/docs/doc-ui";

export const metadata = { title: "Errors and rate limits" };

// Keep in sync with app/api/v1/*/route.ts.
const ERRORS: [string, number, string][] = [
  ["invalid_request", 400, "The body is not valid JSON or form data. Check the Content-Type header."],
  ["invalid_email", 400, "The email address is not valid. Show the message to the person."],
  ["list_not_found", 400, "A list ID is wrong, is not yours, or is missing (server keys need 1 to 5 IDs in listIds)."],
  ["list_not_configured", 400, "The list has no confirmation email sender. Set it on the sign-up form page of the list."],
  ["invalid_key", 401, "The key is missing, wrong, or revoked. GET /lists also needs a server key."],
  ["secret_key_in_browser", 403, "A server key was sent from a browser. Use a website form key in web pages."],
  ["origin_not_allowed", 403, "The website is not in the list of the website form key. Add it on the sign-up form page."],
  ["contact_limit_reached", 403, "Your account reached its contact limit. Archive or delete contacts, or upgrade."],
  ["rate_limited", 429, "Too many requests. Wait the seconds in the Retry-After header."],
  ["server_error", 500, "A problem on our side. Retry later. Give the requestId to support if it continues."],
];

const LIMITS: [string, string][] = [
  ["Requests from one IP address", "20 per minute (POST /subscribe), 60 per minute (GET /lists)"],
  ["Requests with one website form key", "60 per minute"],
  ["Requests with one server key", "300 per minute"],
  ["Confirmation emails to one address", "3 per hour, and at most 1 in 10 minutes for a pending contact"],
];

export default function ErrorsPage() {
  return (
    <DocPageBody>
      <DocTitle eyebrow="API reference" title="Errors and rate limits" lead="Every error has the same form, so one piece of code can handle all of them." />

      <H2 id="format">Error format</H2>
      <CodeBlock code={ERROR_RESPONSE} language="json" />
      <P>
        Use <C>code</C> in your code: it never changes. Show <C>message</C> to people: it can change. The{" "}
        <C>requestId</C> is also in the <C>X-Request-Id</C> header. Give it to support, and we can find your request.
      </P>

      <H2 id="codes">Error codes</H2>
      <div className="divide-y divide-border rounded-lg border border-border text-sm">
        {ERRORS.map(([code, status, text]) => (
          <div key={code} className="grid gap-1 p-3 sm:grid-cols-[13rem_3rem_1fr]">
            <C>{code}</C>
            <span className="font-mono text-xs text-muted-foreground">{status}</span>
            <span className="text-muted-foreground">{text}</span>
          </div>
        ))}
      </div>

      <H2 id="limits">Rate limits</H2>
      <div className="divide-y divide-border rounded-lg border border-border text-sm">
        {LIMITS.map(([what, limit]) => (
          <div key={what} className="grid gap-1 p-3 sm:grid-cols-[16rem_1fr]">
            <span>{what}</span>
            <span className="text-muted-foreground">{limit}</span>
          </div>
        ))}
      </div>
      <Callout title="Over the limit">
        Mailflow answers <C>429 rate_limited</C> with a <C>Retry-After</C> header: the number of seconds to wait. The limits
        protect your sender reputation and stop bots that send many fake sign-ups.
      </Callout>

      <PrevNext href="/docs/api/errors" />
    </DocPageBody>
  );
}
