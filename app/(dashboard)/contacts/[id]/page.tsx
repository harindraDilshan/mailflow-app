import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { DeleteContactButton } from "@/components/delete-contact-button";
import { requireUser } from "@/lib/auth";
import { getOwnedContact, listOwnedLists } from "@/lib/contacts";
import { updateContact, deleteContact } from "../actions";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const contact = await getOwnedContact(user.$id, id);
  if (!contact) notFound();

  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">{contact.email}</h1>
      <p className="mb-6 text-sm text-gray-600">
        Status: <b>{contact.status}</b> · Source: {contact.source}
        {contact.consentAt && ` · Permission confirmed ${new Date(contact.consentAt).toLocaleDateString()}`}
        {contact.consentUrl && ` · Signed up from ${contact.consentUrl}`}
      </p>

      <ContactForm
        action={updateContact}
        lists={lists}
        submitLabel="Save"
        contact={{
          id: contact.$id,
          email: contact.email,
          name: contact.name ?? "",
          tags: contact.tags ?? [],
          listIds: contact.listIds ?? [],
        }}
      />

      {contact.status === "active" || contact.status === "pending" ? (
        <DeleteContactButton action={deleteContact} contactId={contact.$id} />
      ) : (
        <p className="mt-6 text-xs text-gray-500">
          This contact cannot be deleted. It stays on your account so we never email them again.
        </p>
      )}
    </div>
  );
}
