import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { ImportWizard } from "@/app/(dashboard)/contacts/import/import-wizard";
import { Button } from "@/components/ui/button";

export default async function ImportPage() {
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/contacts" />}>
          <ArrowLeft />
          Contacts
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Import contacts</h1>
          <p className="text-xs text-muted-foreground">
            Add many subscribers at once from a CSV file. Contacts that already exist are skipped, not changed.
          </p>
        </div>
      </div>

      <ImportWizard lists={lists} />
    </div>
  );
}
