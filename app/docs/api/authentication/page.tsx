import { CodeBlock } from "@/components/docs/code-block";
import { C, Callout, DocPageBody, DocTitle, H2, P, PrevNext } from "@/components/docs/doc-ui";

export const metadata = { title: "API keys and authentication" };

const KINDS = [
  {
    name: "Server key",
    prefix: "sk_live_",
    where: "Your server only (Node.js, PHP, Python, Zapier, …)",
    can: "Add contacts to any of your lists, with tags. Read your lists.",
    browser: "No. Mailflow refuses it in a browser.",
    create: "API keys page",
  },
  {
    name: "Website form key",
    prefix: "pk_live_",
    where: "Web pages: the embed code or your own form code",
    can: "Add contacts to one list only, without tags, from the websites that you allow.",
    browser: "Yes. Everybody can see it, and that is safe.",
    create: "The sign-up form page of the list (“Embed on website”)",
  },
];

export default function AuthenticationPage() {
  return (
    <DocPageBody>
      <DocTitle
        eyebrow="Get started"
        title="API keys and authentication"
        lead="Every request needs an API key. There are two kinds: a secret one for servers, and a public one for web pages."
      />

      <H2 id="kinds">Two kinds of keys</H2>
      <div className="grid gap-3 md:grid-cols-2">
        {KINDS.map((k) => (
          <div key={k.name} className="space-y-2 rounded-lg border border-border p-4 text-sm">
            <p className="flex items-center justify-between gap-2">
              <span className="font-semibold">{k.name}</span>
              <C>{k.prefix}…</C>
            </p>
            <dl className="space-y-1.5 text-xs">
              {[
                ["Use it in", k.where],
                ["It can", k.can],
                ["Safe in a browser?", k.browser],
                ["Create it on", k.create],
              ].map(([t, d]) => (
                <div key={t}>
                  <dt className="text-muted-foreground">{t}</dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <H2 id="send">Send the key</H2>
      <P>Put the key in the <C>Authorization</C> header. This is the recommended way:</P>
      <CodeBlock code={`Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} language="http" />
      <P>
        Mailflow also accepts the header <C>X-Api-Key</C>, or a field <C>key</C> in the request body. The body field is for
        HTML forms, which cannot set headers. The embed code uses it.
      </P>

      <H2 id="websites">Allowed websites (public keys)</H2>
      <P>
        A browser sends the address of the page with each request (the <C>Origin</C> header). Mailflow accepts a website
        form key only from the websites that you added to it, for example <C>https://www.example.com</C>. Each address must
        match exactly: <C>https://example.com</C> and <C>https://www.example.com</C> are two different websites, so add both
        if you use both.
      </P>
      <P>
        For a server key it is the opposite: a request with an <C>Origin</C> header comes from a browser, and Mailflow
        refuses it with the error <C>secret_key_in_browser</C>. This protects you when someone puts a server key in a web page
        by mistake.
      </P>

      <H2 id="safety">Keep your keys safe</H2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Keep server keys in environment variables or a secret manager, never in your code.</li>
        <li>Never put a server key in a website, a mobile app, or a Git repository.</li>
        <li>Use one key for each place (shop, app, CRM). Then you can revoke one without stopping the others.</li>
        <li>Mailflow saves only a fingerprint (hash) of each key. Nobody can read a key later, not even Mailflow.</li>
      </ul>
      <Callout tone="warning" title="A key leaked?">
        Open <b>API keys</b> in the dashboard and revoke it. Requests with it fail at once. Then create a new key and update
        your code.
      </Callout>

      <PrevNext href="/docs/api/authentication" />
    </DocPageBody>
  );
}
