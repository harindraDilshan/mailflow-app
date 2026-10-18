import { verifyToken } from "@/lib/unsubscribe-token";
import { getContactForUnsubscribe } from "@/lib/unsubscribe";
import { confirmUnsubscribe } from "./actions";

export const metadata = { title: "Unsubscribe", robots: "noindex" };

// j***@shop.com : shows who this is without showing the full address
function mask(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const contactId = t ? verifyToken(t) : null;
  const contact = contactId ? await getContactForUnsubscribe(contactId) : null;

  return (
    <main className="mx-auto mt-24 max-w-md p-6 text-center">
      {!contact && <p>This unsubscribe link is not valid.</p>}

      {contact && contact.status !== "active" && (
        <>
          <h1 className="mb-2 text-xl font-semibold">You are unsubscribed</h1>
          <p className="text-sm text-gray-600">
            {mask(contact.email)} will not receive more emails from this sender.
          </p>
        </>
      )}

      {contact && contact.status === "active" && (
        <>
          <h1 className="mb-2 text-xl font-semibold">Unsubscribe</h1>
          <p className="mb-6 text-sm text-gray-600">
            Stop all emails to <b>{mask(contact.email)}</b>?
          </p>
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="t" value={t} />
            <button className="rounded bg-black px-5 py-2 text-white">Yes, unsubscribe me</button>
          </form>
        </>
      )}
    </main>
  );
}