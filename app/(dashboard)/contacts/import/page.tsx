import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { ImportWizard } from "@/app/(dashboard)/contacts/import/import-wizard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload } from "lucide-react";

export default async function ImportPage() {
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Import Contacts
        </h1>
        <p className="text-xs text-muted-foreground">
          Bulk import your existing subscribers and contacts from CSV files
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-4" />
            <span>Upload CSV File</span>
          </CardTitle>
          <CardDescription>
            Map your CSV columns (email, name, tags), select lists, and verify subscriber permission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportWizard lists={lists} />
        </CardContent>
      </Card>
    </div>
  );
}
