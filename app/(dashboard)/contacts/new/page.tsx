import { ContactForm } from "@/components/contact-form";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { addContact } from "../actions";

export default async function NewContactPage() {
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Add contact</h1>
      <ContactForm action={addContact} lists={lists} submitLabel="Add contact" />
    </div>
  );
}