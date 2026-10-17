import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requireUser } from "@/lib/auth";
import { countContactsInList, listOwnedLists } from "@/lib/contacts";
import { createList, deleteList } from "../actions";

export default async function ListsPage() {
  const user = await requireUser();
  const lists = await listOwnedLists(user.$id);
  const counts = await Promise.all(lists.map((l) => countContactsInList(user.$id, l.$id)));

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold">Lists</h1>

      <ul className="mb-8 space-y-2">
        {lists.length === 0 && <li className="text-sm text-gray-500">No lists yet.</li>}
        {lists.map((l, i) => (
          <li key={l.$id} className="flex items-center justify-between rounded border p-3">
            <Link href={`/contacts?list=${l.$id}`} className="underline">
              {l.name} <span className="text-sm text-gray-500">({counts[i]})</span>
            </Link>
            <form action={deleteList}>
              <input type="hidden" name="id" value={l.$id} />
              <button className="text-sm underline">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-medium">Create a list</h2>
      <AuthForm action={createList} submitLabel="Create list" fields={[{ name: "name", label: "List name" }]} />
    </div>
  );
}