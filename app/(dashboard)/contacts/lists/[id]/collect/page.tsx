import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { CodeBlock } from "@/components/docs/code-block";
import { requireUser } from "@/lib/auth";
import { getOwnedList } from "@/lib/contacts";
import { findPublicKeyForList } from "@/lib/api-keys";
import { buildEmbedSnippet } from "@/lib/embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectSettingsForm } from "./settings-form";
import { saveSubscribeSettings } from "./actions";

export default function CollectPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl space-y-6" aria-busy aria-label="Loading">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-80 w-full rounded-xl" />
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
  const hostedOn = !!list.hostedEnabled && configured;
  const pk = configured ? await findPublicKeyForList(user.$id, list.$id) : null;
  const snippet = pk?.publicKey ? buildEmbedSnippet(app, pk.publicKey) : null;

  const curl = `curl -X POST ${app}/api/v1/subscribe \\
  -H "Authorization: Bearer YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"jane@example.com","name":"Jane","tags":["website"],"listIds":["${list.$id}"]}'`;

  const link = "underline underline-offset-2 hover:text-foreground";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/contacts/lists" />}>
          <ArrowLeft />
          Lists
        </Button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Collect subscribers</h1>
            <Badge variant="outline" className="font-normal">
              {list.name}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Everyone who signs up gets a confirmation email first. Only confirmed people get campaigns.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Settings</CardTitle>
          <CardDescription>Set the confirmation sender first. All sign-up methods below need it.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            2. Hosted sign-up page
            <Badge variant={hostedOn ? "secondary" : "outline"} className="font-normal">
              {hostedOn ? "On" : "Off"}
            </Badge>
          </CardTitle>
          <CardDescription>Share this link in your social profiles, emails, or QR codes. No code needed.</CardDescription>
        </CardHeader>
        <CardContent>
          {hostedOn ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input readOnly value={hostedUrl} aria-label="Sign-up page link" className="font-mono text-xs" />
              <div className="flex shrink-0 gap-2">
                <CopyButton text={hostedUrl} />
                <Button variant="outline" size="xs" render={<a href={hostedUrl} target="_blank" rel="noreferrer" />}>
                  <ExternalLink />
                  Open
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Turn on the hosted sign-up page and set a sender in the settings above to get your link.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Embed form</CardTitle>
          <CardDescription>Paste this HTML into your website. It works with and without JavaScript.</CardDescription>
        </CardHeader>
        <CardContent>
          {snippet ? (
            <>
              <CodeBlock code={snippet} language="html" />
              <p className="mt-2 text-xs text-muted-foreground">
                Websites that may use this form: {(pk?.allowedOrigins ?? []).join(", ") || "none"}.{" "}
                <Link href="/developers" className={link}>
                  Manage keys
                </Link>
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {configured ? (
                <>
                  Create a <b className="font-medium text-foreground">public key</b> for this list in{" "}
                  <Link href="/developers" className={link}>
                    Developers
                  </Link>
                  . Then the form code shows here.
                </>
              ) : (
                "Set a sender in the settings above first."
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. API</CardTitle>
          <CardDescription>Add subscribers from your own server with a secret key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <CodeBlock code={curl} language="bash" />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>List ID:</span>
            <code className="font-mono text-foreground">{list.$id}</code>
            <CopyButton text={list.$id} />
            <span aria-hidden>·</span>
            <Link href="/docs/api" className={link}>
              Read the API docs
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
