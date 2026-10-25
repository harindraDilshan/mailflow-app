import { Suspense } from "react";
import { verifyToken } from "@/lib/unsubscribe-token";
import { getContactForUnsubscribe } from "@/lib/unsubscribe";
import { confirmUnsubscribe } from "./actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Unsubscribe", robots: "noindex" };

function mask(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto mt-24 max-w-md p-6 text-center text-xs text-muted-foreground">
          Loading unsubscribe details...
        </main>
      }
    >
      <UnsubscribeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UnsubscribeContent({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const contactId = t ? verifyToken(t) : null;
  const contact = contactId ? await getContactForUnsubscribe(contactId) : null;

  return (
    <main className="mx-auto mt-24 max-w-md p-6 text-center">
      {!contact && <p className="text-xs text-muted-foreground">This unsubscribe link is not valid.</p>}

      {contact && contact.status !== "active" && (
        <>
          <h1 className="mb-2 text-xl font-semibold">You are unsubscribed</h1>
          <p className="text-sm text-muted-foreground">
            {mask(contact.email)} will not receive more emails from this sender.
          </p>
        </>
      )}

      {contact && contact.status === "active" && (
        <>
          <h1 className="mb-2 text-xl font-semibold">Unsubscribe</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Stop all emails to <b>{mask(contact.email)}</b>?
          </p>
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="t" value={t} />
            <Button type="submit" variant="default" size="default">
              Yes, unsubscribe me
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
