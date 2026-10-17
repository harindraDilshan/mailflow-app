import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { ImportWizard } from "@/app/(dashboard)/contacts/import/import-wizard";

export default async function ImportPage() {
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold">Import contacts</h1>
      <ImportWizard lists={lists} />
    </div>
  );
}