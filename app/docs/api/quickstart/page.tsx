import { Suspense } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { docsContext } from "@/lib/docs/context";
import { subscribeSamples, SUBSCRIBE_RESPONSE } from "@/lib/docs/api-examples";
import { CodeBlock } from "@/components/docs/code-block";
import { CodeTabs } from "@/components/docs/code-tabs";
import { CopyButton } from "@/components/copy-button";
import { C, Callout, DocPageBody, DocTitle, P, PrevNext, Step, Steps } from "@/components/docs/doc-ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Quickstart" };

export default function QuickstartPage() {
  return (
    <DocPageBody>
      <DocTitle
        eyebrow="Get started"
        title="Quickstart"
        lead="Add your first contact with the API in about 5 minutes. You need a Mailflow account and a list."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <QuickstartSteps />
      </Suspense>
      <PrevNext href="/docs/api/quickstart" />
    </DocPageBody>
  );
}

async function QuickstartSteps() {
  const ctx = await docsContext();

  return (
    <Steps>
      <Step title="Create a server key">
        <P>
          A server key starts with <C>sk_live_</C>. It lets your code add contacts to your lists. Mailflow shows it one
          time only, so copy it to a safe place.
        </P>
        <Button size="sm" render={<Link href={ctx.signedIn ? "/developers" : "/login?next=/developers"} />}>
          <KeyRound />
          {ctx.signedIn ? "Open API keys" : "Log in to create a key"}
        </Button>
      </Step>

      <Step title="Find the ID of your list">
        {ctx.lists.length > 0 ? (
          <>
            <P>These are your lists. The examples below use the first one.</P>
            <div className="divide-y divide-border rounded-lg border border-border">
              {ctx.lists.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                  <span className="truncate">{l.name}</span>
                  <span className="flex items-center gap-2">
                    <code className="font-mono text-xs text-muted-foreground">{l.id}</code>
                    <CopyButton text={l.id} />
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <P>
            {ctx.signedIn ? "You have no lists yet. " : ""}Open <b>Contacts → Lists</b> in the dashboard. Each list shows its ID
            on its sign-up form page, in the <b>API</b> tab. You can also get all IDs with{" "}
            <Link href="/docs/api/reference/lists" className="underline underline-offset-2">GET /lists</Link>.
          </P>
        )}
      </Step>

      <Step title="Send the request">
        <P>
          Replace <C>YOUR_SECRET_KEY</C> with your key{ctx.lists.length > 0 ? "" : ", and the list ID with yours"}. Use your
          own email address, so that you get the confirmation email.
        </P>
        <CodeTabs samples={subscribeSamples({ base: ctx.base, listId: ctx.listId })} />
      </Step>

      <Step title="Check the result">
        <P>Mailflow answers in less than a second:</P>
        <CodeBlock code={SUBSCRIBE_RESPONSE} language="json" />
        <P>
          The contact is in <b>Contacts</b> now, with the status <b>Pending</b>. Open the confirmation email and click the
          link: the status changes to <b>Active</b>.
        </P>
        <Callout tone="tip" title="It works. What next?">
          Read <Link href="/docs/api/guides/server" className="underline underline-offset-2">Add contacts from your server</Link>{" "}
          for tags, more lists, and error handling.
        </Callout>
      </Step>
    </Steps>
  );
}
