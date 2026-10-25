import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { DeleteContactButton } from "@/components/delete-contact-button";
import { requireUser } from "@/lib/auth";
import { getOwnedContact, listOwnedLists } from "@/lib/contacts";
import { updateContact, deleteContact, archiveContact, unarchiveContact } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading contact...
        </div>
      }
    >
      <ContactContent params={params} />
    </Suspense>
  );
}

async function ContactContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const contact = await getOwnedContact(user.$id, id);
  if (!contact) notFound();

  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{contact.email}</CardTitle>
            <Badge
              variant={
                contact.status === "active"
                  ? "default"
                  : contact.status === "archived"
                    ? "outline"
                    : "secondary"
              }
            >
              {contact.status}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {contact.source}
            {contact.consentAt && ` · ${new Date(contact.consentAt).toLocaleDateString()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              note: contact.note ?? "",
            }}
          />

          <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-border">
            {contact.status === "active" || contact.status === "pending" ? (
              <>
                <form action={archiveContact}>
                  <input type="hidden" name="id" value={contact.$id} />
                  <Button type="submit" variant="outline" size="sm">
                    Archive
                  </Button>
                </form>
                <DeleteContactButton action={deleteContact} contactId={contact.$id} />
              </>
            ) : contact.status === "archived" ? (
              <>
                <form action={unarchiveContact}>
                  <input type="hidden" name="id" value={contact.$id} />
                  <Button type="submit" variant="outline" size="sm">
                    Unarchive
                  </Button>
                </form>
                <DeleteContactButton action={deleteContact} contactId={contact.$id} />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                This contact cannot be deleted. It stays on your account to honor unsubscription.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
