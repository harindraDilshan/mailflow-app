import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { listAutomations } from "@/lib/automations";

export default async function AutomationsPage() {
  const user = await requireUser();
  const [automations, lists] = await Promise.all([listAutomations(user.$id), listOwnedLists(user.$id)]);
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Automations</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/automations/new" className="underline">New automation</Link>
          <Link href="/automations/new?template=welcome" className="underline">New from welcome template</Link>
        </div>
      </div>

      <ul className="space-y-2">
        {automations.length === 0 && <li className="text-sm text-gray-500">No automations yet.</li>}
        {automations.map((a) => (
          <li key={a.$id} className="flex items-center justify-between rounded border p-3">
            <div>
              <Link href={`/automations/${a.$id}`} className="underline">{a.name}</Link>
              <div className="text-xs text-gray-500">
                {a.triggerType === "list_joined"
                  ? `When someone joins "${listName.get(a.triggerValue) ?? "(deleted list)"}"`
                  : `When the tag "${a.triggerValue}" is added`}
              </div>
            </div>
            <span className="text-sm">{a.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}