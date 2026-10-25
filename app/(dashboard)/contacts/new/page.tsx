import { ContactForm } from "@/components/contact-form";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { addContact } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export default async function NewContactPage() {
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Add Contact
        </h1>
        <p className="text-xs text-muted-foreground">
          Manually add a new subscriber to your audience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <span>Contact Details</span>
          </CardTitle>
          <CardDescription>
            Specify contact email, name, tags, and private notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm action={addContact} lists={lists} submitLabel="Add Contact" />
        </CardContent>
      </Card>
    </div>
  );
}
