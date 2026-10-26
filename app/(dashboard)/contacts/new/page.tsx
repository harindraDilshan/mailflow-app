import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { addContact } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function NewContactPage() {
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/contacts" />}>
          <ArrowLeft />
          Contacts
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Add contact</h1>
          <p className="text-xs text-muted-foreground">
            Add one subscriber by hand. To add many at once,{" "}
            <Link href="/contacts/import" className="underline underline-offset-2 hover:text-foreground">
              import a CSV file
            </Link>
            .
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <span>Contact details</span>
          </CardTitle>
          <CardDescription>The contact is active at once and can get your campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm action={addContact} lists={lists} />
        </CardContent>
      </Card>
    </div>
  );
}
