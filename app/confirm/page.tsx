import { Suspense } from "react";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE } from "@/lib/appwrite/db";
import { verifyConfirm } from "@/lib/confirm-token";
import { confirmSubscription } from "./actions";

export const metadata = { title: "Confirm subscription", robots: "noindex" };

const mask = (email: string) => {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
};

export default function ConfirmPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  return (
    <main className="mx-auto mt-24 max-w-md p-6 text-center">
      <Suspense fallback={<p className="text-sm text-gray-500">Checking your link…</p>}>
        <ConfirmContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ConfirmContent({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const contactId = t ? verifyConfirm(t) : null;

  let contact: { email: string; status: string } | null = null;
  if (contactId) {
    try {
      const { tablesDB } = createAdminClient();
      contact = (await tablesDB.getRow({
        databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contactId,
      })) as unknown as { email: string; status: string };
    } catch {}
  }

  if (!contact) return <p>This confirmation link is not valid, or it has expired.</p>;

  if (contact.status === "active") return <p>Your subscription is already confirmed. Thank you!</p>;

  if (contact.status !== "pending") return <p>This address cannot be subscribed.</p>;

  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">Confirm your subscription</h1>
      <p className="mb-6 text-sm text-gray-600">
        Receive emails at <b>{mask(contact.email)}</b>?
      </p>
      <form action={confirmSubscription}>
        <input type="hidden" name="t" value={t} />
        <button className="rounded bg-black px-5 py-2 text-white">Yes, subscribe me</button>
      </form>
    </>
  );
}