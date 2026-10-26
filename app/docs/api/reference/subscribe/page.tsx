import { Suspense } from "react";
import Link from "next/link";
import { docsContext } from "@/lib/docs/context";
import { ERROR_RESPONSE, subscribeSamples, SUBSCRIBE_RESPONSE } from "@/lib/docs/api-examples";
import { CodeBlock } from "@/components/docs/code-block";
import { CodeTabs } from "@/components/docs/code-tabs";
import { C, Callout, DocPageBody, DocTitle, Endpoint, H2, P, ParamTable, PrevNext } from "@/components/docs/doc-ui";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Add a contact" };

export default function SubscribeReference() {
  return (
    <DocPageBody>
      <DocTitle eyebrow="API reference" title="Add a contact" lead="Adds a person to one or more lists, and sends them the confirmation email." />
      <Endpoint method="POST" path="/api/v1/subscribe" />

      <H2 id="auth">Authentication</H2>
      <P>
        A <b>server key</b> (from your server) or a <b>website form key</b> (from an allowed website). See{" "}
        <Link href="/docs/api/authentication" className="underline underline-offset-2">API keys and authentication</Link>.
      </P>

      <H2 id="body">Request body</H2>
      <P>
        Send JSON (<C>Content-Type: application/json</C>). A normal HTML form post works too: then Mailflow answers with a
        redirect to its thank-you page instead of JSON.
      </P>
      <ParamTable
        params={[
          { name: "email", type: "string", required: true, children: "The email address. Mailflow saves it in lower case." },
          { name: "name", type: "string", children: "The name, at most 200 characters. Campaigns can use it as {{name}}." },
          {
            name: "listIds",
            type: "string[]",
            required: "server key",
            children: (
              <>
                The IDs of 1 to 5 of your lists. With a website form key, leave it out: the key belongs to one list.
              </>
            ),
          },
          {
            name: "tags",
            type: "string[]",
            children: "Server key only. At most 20 tags, saved in lower case. A website form key ignores them.",
          },
          { name: "key", type: "string", children: "The API key, for HTML forms that cannot send headers. Otherwise use the Authorization header." },
          { name: "hp_field", type: "string", children: "A trap for spam bots. Keep it empty and hidden. When it has a value, Mailflow answers “pending” and saves nothing." },
        ]}
      />

      <H2 id="example">Example</H2>
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <Example />
      </Suspense>

      <H2 id="response">Response</H2>
      <CodeBlock code={SUBSCRIBE_RESPONSE} language="json" />
      <div className="divide-y divide-border rounded-lg border border-border text-sm">
        <div className="grid gap-1 p-3 sm:grid-cols-[13rem_1fr]">
          <C>pending_confirmation</C>
          <span className="text-muted-foreground">The person must click the link in the confirmation email. Most answers have this status.</span>
        </div>
        <div className="grid gap-1 p-3 sm:grid-cols-[13rem_1fr]">
          <C>already_subscribed</C>
          <span className="text-muted-foreground">Server keys only: the person is already active. Nothing changed.</span>
        </div>
      </div>
      <Callout>
        Mailflow answers before the confirmation email goes out, so the request is fast. The email follows a few seconds later.
      </Callout>

      <H2 id="errors">Errors</H2>
      <CodeBlock code={ERROR_RESPONSE} language="json" />
      <P>
        Every error has a <C>code</C> for your code, a <C>message</C> for people, and a <C>requestId</C> for support. See{" "}
        <Link href="/docs/api/errors" className="underline underline-offset-2">all error codes</Link>.
      </P>

      <PrevNext href="/docs/api/reference/subscribe" />
    </DocPageBody>
  );
}

async function Example() {
  const ctx = await docsContext();
  return <CodeTabs samples={subscribeSamples({ base: ctx.base, listId: ctx.listId })} />;
}
