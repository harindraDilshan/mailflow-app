import { Suspense } from "react";
import Link from "next/link";
import { docsContext } from "@/lib/docs/context";
import { subscribeSamples } from "@/lib/docs/api-examples";
import { CodeTabs } from "@/components/docs/code-tabs";
import { C, Callout, DocPageBody, DocTitle, H2, P, PrevNext } from "@/components/docs/doc-ui";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Add contacts from your server" };

export default function ServerGuide() {
  return (
    <DocPageBody>
      <DocTitle
        eyebrow="Guides"
        title="Add contacts from your server"
        lead="Add people from your shop, app, or CRM. For example: a customer ticks “Send me news” at checkout, and your server adds them to your newsletter."
      />

      <H2 id="request">The request</H2>
      <P>
        Use a <b>server key</b>. Send the email address and the IDs of 1 to 5 lists. The name and the tags are optional.
      </P>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Samples />
      </Suspense>

      <H2 id="tags">Tags</H2>
      <P>
        Tags group your contacts, for example <C>checkout</C> or <C>webinar-2026</C>. Mailflow saves them in lower case, at
        most 20 for each contact. A new tag can start an automation that uses it as its trigger. Only server keys can set
        tags: people cannot tag themselves through a web form.
      </P>

      <H2 id="repeat">Calling it again is safe</H2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <b>New address:</b> Mailflow saves a pending contact and sends the confirmation email. Answer:{" "}
          <C>pending_confirmation</C>.
        </li>
        <li>
          <b>Pending address:</b> Mailflow adds the new lists. It sends the confirmation email again at most once in 10
          minutes. Answer: <C>pending_confirmation</C>.
        </li>
        <li>
          <b>Active address:</b> nothing changes. Answer: <C>already_subscribed</C>.
        </li>
        <li>
          <b>Unsubscribed, bounced, or complained:</b> Mailflow does not add them again, and sends no email. Answer:{" "}
          <C>pending_confirmation</C>, so that their choice stays private.
        </li>
      </ul>

      <H2 id="errors">Errors and retries</H2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <b>4xx:</b> fix the request first. The answer has a <C>code</C> and a <C>message</C>. Do not retry without a change.
        </li>
        <li>
          <b>429:</b> too many requests. Wait the number of seconds in the <C>Retry-After</C> header, then retry.
        </li>
        <li>
          <b>5xx or no answer:</b> retry after a few seconds, with a longer wait each time. A retry never makes duplicate contacts.
        </li>
      </ul>
      <Callout tone="tip" title="Do not make your customers wait">
        Call Mailflow after the order is saved, or in a background job. A slow or failed sign-up must not stop a checkout.
      </Callout>
      <P>
        All codes are in <Link href="/docs/api/errors" className="underline underline-offset-2">Errors and rate limits</Link>.
      </P>

      <PrevNext href="/docs/api/guides/server" />
    </DocPageBody>
  );
}

async function Samples() {
  const ctx = await docsContext();
  return (
    <>
      <CodeTabs samples={subscribeSamples({ base: ctx.base, listId: ctx.listId })} />
      {ctx.listName && (
        <p className="text-[11px] text-muted-foreground">The examples use your list &ldquo;{ctx.listName}&rdquo;.</p>
      )}
    </>
  );
}
