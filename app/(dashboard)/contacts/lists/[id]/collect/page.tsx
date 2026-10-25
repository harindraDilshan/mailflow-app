import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { requireUser } from "@/lib/auth";
import { getOwnedList } from "@/lib/contacts";
import { findPublicKeyForList } from "@/lib/api-keys";
import { buildEmbedSnippet } from "@/lib/embed";
import { CollectSettingsForm } from "./settings-form";
import { saveSubscribeSettings } from "./actions";

export default function CollectPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading subscribe collection settings...
        </div>
      }
    >
      <CollectContent params={params} />
    </Suspense>
  );
}

async function CollectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const list = await getOwnedList(user.$id, id);
  if (!list) notFound();

  const app = process.env.NEXT_PUBLIC_APP_URL!;
  const hostedUrl = `${app}/s/${list.$id}`;
  const configured = !!list.fromEmail;
  const pk = configured ? await findPublicKeyForList(user.$id, list.$id) : null;
  const snippet = pk?.publicKey ? buildEmbedSnippet(app, pk.publicKey) : null;

  const curl = `curl -X POST ${app}/api/v1/subscribe \\
  -H "Authorization: Bearer YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"jane@example.com","name":"Jane","tags":["website"],"listIds":["${list.$id}"]}'`;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/contacts/lists" className="text-sm underline">← Lists</Link>
        <h1 className="mt-2 text-2xl font-semibold">Collect subscribers: {list.name}</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who signs up gets a confirmation email first. Only confirmed people receive campaigns.
        </p>
      </div>

      <section>
        <h2 className="mb-2 font-medium">1. Settings</h2>
        <CollectSettingsForm
          action={saveSubscribeSettings}
          list={{
            id: list.$id,
            hostedEnabled: !!list.hostedEnabled,
            pageTitle: list.pageTitle ?? "",
            pageText: list.pageText ?? "",
            fromName: list.fromName ?? "",
            fromEmail: list.fromEmail ?? "",
          }}
        />
      </section>

      <section>
        <h2 className="mb-2 font-medium">2. Hosted link (no code)</h2>
        {list.hostedEnabled && configured ? (
          <p className="text-sm">
            <code className="break-all">{hostedUrl}</code> <CopyButton text={hostedUrl} />
            <br />
            <Link href={hostedUrl} target="_blank" className="underline">Open the page</Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Turn on the page and set a sender above to get your link.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">3. Embed form (paste into your website)</h2>
        {snippet ? (
          <>
            <textarea readOnly rows={14} value={snippet} className="w-full rounded border p-2 font-mono text-xs" />
            <CopyButton text={snippet} />
            <p className="mt-2 text-xs text-muted-foreground">
              Allowed websites for this key: {(pk?.allowedOrigins ?? []).join(", ") || "none"}.{" "}
              <Link href="/developers" className="underline">Manage keys</Link>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {configured ? (
              <>Create a <b>public key</b> for this list in <Link href="/developers" className="underline">Developers</Link>, then the snippet appears here.</>
            ) : (
              "Set a sender above first."
            )}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">4. API (for developers)</h2>
        <pre className="overflow-x-auto rounded bg-muted/50 p-3 text-xs">{curl}</pre>
        <p className="mt-2 text-sm">
          List ID: <code>{list.$id}</code> <CopyButton text={list.$id} /> ·{" "}
          <Link href="/docs/api" className="underline">Read the docs</Link>
        </p>
      </section>
    </div>
  );
}
