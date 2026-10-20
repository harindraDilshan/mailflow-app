import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { listApiKeys } from "@/lib/api-keys";
import { KeyForm } from "./key-form";
import { createKey, revokeKey } from "./actions";

export default async function DevelopersPage() {
  const user = await requireUser();
  const [keys, lists] = await Promise.all([listApiKeys(user.$id), listOwnedLists(user.$id)]);
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Developers</h1>
        <Link href="/developers/docs" className="text-sm underline">API docs</Link>
      </div>

      <table className="w-full border text-left text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Key</th>
            <th className="p-2">List / websites</th><th className="p-2">Last used</th><th className="p-2">Status</th><th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {keys.length === 0 && <tr><td colSpan={7} className="p-3 text-gray-500">No keys yet.</td></tr>}
          {keys.map((k) => (
            <tr key={k.$id} className="border-t align-top">
              <td className="p-2">{k.name}</td>
              <td className="p-2">{k.type}</td>
              <td className="p-2"><code>{k.prefix}…</code></td>
              <td className="p-2 text-xs">
                {k.type === "public"
                  ? <>{listName.get(k.listId ?? "") ?? "(deleted list)"}<br />{(k.allowedOrigins ?? []).join(", ")}</>
                  : "All lists (server only)"}
              </td>
              <td className="p-2">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never"}</td>
              <td className="p-2">{k.status}</td>
              <td className="p-2">
                {k.status === "active" && (
                  <form action={revokeKey}>
                    <input type="hidden" name="id" value={k.$id} />
                    <button className="underline">Revoke</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section>
        <h2 className="mb-2 font-medium">Create a key</h2>
        <KeyForm action={createKey} lists={lists.filter((l) => l.fromEmail).map((l) => ({ id: l.$id, name: l.name }))} />
      </section>
    </div>
  );
}