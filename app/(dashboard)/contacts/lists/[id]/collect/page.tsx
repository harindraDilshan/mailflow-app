import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, KeyRound } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { CodeBlock } from "@/components/docs/code-block";
import { LocalTime } from "@/components/local-time";
import { StatusBadge } from "@/components/contacts/status-badge";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { getOwnedList, signupStats } from "@/lib/contacts";
import { findPublicKeyForList } from "@/lib/api-keys";
import { designOf } from "@/lib/forms";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DesignPanel, EmbedPanel, FormTabs, SenderPanel, SharePanel, type FormTab } from "./form-panels";

type SP = Promise<{ tab?: string }>;

export default function CollectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl space-y-6" aria-busy aria-label="Loading">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-[520px] w-full rounded-xl" />
        </div>
      }
    >
      <CollectContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Circle className="mt-px size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className={done ? "text-muted-foreground" : ""}>{children}</span>
    </li>
  );
}

async function CollectContent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await requireUser();
  const list = await getOwnedList(user.$id, id);
  if (!list) notFound();

  const app = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const hostedUrl = `${app}/s/${list.$id}`;
  const ready = Boolean(list.fromEmail);
  const live = Boolean(list.hostedEnabled) && ready;

  const [key, stats, qr] = await Promise.all([
    findPublicKeyForList(user.$id, list.$id),
    signupStats(user.$id, list.$id).catch(() => null),
    live
      ? createAdminClient()
          .avatars.getQR({ text: hostedUrl, size: 600, margin: 1 })
          .then((png) => `data:image/png;base64,${Buffer.from(png).toString("base64")}`)
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const formKey = key?.publicKey ? { publicKey: key.publicKey, origins: key.allowedOrigins ?? [] } : null;
  const design = designOf(list);

  const tabs: FormTab[] = ["design", "share", "embed", "api", "email"];
  const initial: FormTab = tabs.includes(tab as FormTab) ? (tab as FormTab) : ready ? "design" : "email";

  const curl = `curl -X POST ${app}/api/v1/subscribe \\
  -H "Authorization: Bearer YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"jane@example.com","name":"Jane","tags":["website"],"listIds":["${list.$id}"]}'`;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/contacts/forms" />}>
          <ArrowLeft />
          Sign-up forms
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign-up form</h1>
          <Badge variant="outline" className="font-normal">{list.name}</Badge>
          <Badge variant={live ? "secondary" : "outline"} className="font-normal">Link: {live ? "live" : "off"}</Badge>
          <Badge variant={formKey ? "secondary" : "outline"} className="font-normal">Website form: {formKey ? "ready" : "not set up"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          People who sign up here join <span className="font-medium text-foreground">{list.name}</span>. They confirm by email first.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="min-w-0">
          <CardContent>
            <FormTabs
              initial={initial}
              panels={{
                design: (
                  <DesignPanel
                    list={{
                      id: list.$id,
                      name: list.name,
                      pageTitle: list.pageTitle ?? "",
                      pageText: list.pageText ?? "",
                      formButton: list.formButton ?? "",
                      formNameField: list.formNameField ?? "",
                      formSuccess: list.formSuccess ?? "",
                      formColor: list.formColor ?? "",
                    }}
                  />
                ),
                share: <SharePanel listId={list.$id} url={hostedUrl} live={live} ready={ready} qr={qr} />,
                embed: <EmbedPanel listId={list.$id} appUrl={app} ready={ready} formKey={formKey} design={design} />,
                api: (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      For developers: add people to this list from your own server, for example when a customer
                      ticks &ldquo;Send me news&rdquo; at checkout. Use a <b className="font-medium text-foreground">secret key</b>.
                      Never put it in a website or an app.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">List ID:</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{list.$id}</code>
                      <CopyButton text={list.$id} />
                    </div>
                    <CodeBlock code={curl} language="bash" />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" render={<Link href="/developers" />}>
                        <KeyRound />
                        Create a secret key
                      </Button>
                      <Button size="sm" variant="outline" render={<Link href="/docs/api/guides/server" />}>
                        <BookOpen />
                        Read the guide
                      </Button>
                    </div>
                  </div>
                ),
                email: <SenderPanel listId={list.$id} fromName={list.fromName ?? ""} fromEmail={list.fromEmail ?? ""} />,
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                <Step done={ready}>Set the confirmation email sender</Step>
                <Step done={Boolean(list.pageTitle || list.formButton || list.formColor)}>Design the form (optional)</Step>
                <Step done={live || Boolean(formKey)}>Share the link, or embed the form on your website</Step>
                <Step done={(stats?.last30 ?? 0) > 0}>Get your first sign-up</Step>
              </ol>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Recent sign-ups</CardTitle>
              <CardDescription>
                {stats
                  ? `${formatNumber(stats.last30)} in 30 days · ${formatNumber(stats.confirmed30)} confirmed`
                  : "Could not load the sign-ups."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.recent.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sign-ups yet. Test your form with your own email address.</p>
              ) : (
                <ul className="space-y-2">
                  {stats?.recent.map((c) => (
                    <li key={c.$id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0">
                        <Link href={`/contacts/${c.$id}`} className="block truncate font-medium hover:underline">{c.email}</Link>
                        <span className="text-[11px] text-muted-foreground"><LocalTime iso={c.$createdAt} /></span>
                      </span>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                &ldquo;Pending&rdquo; means the person did not click the confirmation link yet.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
