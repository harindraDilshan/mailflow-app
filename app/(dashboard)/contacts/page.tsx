import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOwnedLists, searchContacts } from "@/lib/contacts";
import { PAGE_SIZE, STATUSES } from "@/lib/contact-rules";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ContactsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = await searchParams;
  const sp = {
    q: one(raw.q), status: one(raw.status), list: one(raw.list),
    tag: one(raw.tag), from: one(raw.from), to: one(raw.to),
  };
  const page = Math.max(1, parseInt(one(raw.page) ?? "1", 10) || 1);

  const user = await requireUser();
  const lists = await listOwnedLists(user.$id);
  const listName = new Map(lists.map((l) => [l.$id, l.name]));

  const { rows, total } = await searchContacts(user.$id, {
    q: sp.q, status: sp.status, listId: sp.list, tag: sp.tag, from: sp.from, to: sp.to, page,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
    params.set("page", String(p));
    return `/contacts?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts ({total})</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/contacts/new" className="underline">Add contact</Link>
          <Link href="/contacts/import" className="underline">Import CSV</Link>
          <Link href="/contacts/lists" className="underline">Lists</Link>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <input name="q" defaultValue={sp.q} placeholder="Search email or name" className="rounded border px-3 py-2" />
        <select name="status" defaultValue={sp.status ?? ""} className="rounded border px-3 py-2">
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="list" defaultValue={sp.list ?? ""} className="rounded border px-3 py-2">
          <option value="">Any list</option>
          {lists.map((l) => <option key={l.$id} value={l.$id}>{l.name}</option>)}
        </select>
        <input name="tag" defaultValue={sp.tag} placeholder="Tag" className="rounded border px-3 py-2" />
        <label>From <input name="from" type="date" defaultValue={sp.from} className="rounded border px-2 py-2" /></label>
        <label>To <input name="to" type="date" defaultValue={sp.to} className="rounded border px-2 py-2" /></label>
        <button className="rounded bg-black px-4 py-2 text-white">Filter</button>
        <Link href="/contacts" className="underline">Clear</Link>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border text-left text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2">Email</th><th className="p-2">Name</th><th className="p-2">Status</th>
              <th className="p-2">Tags</th><th className="p-2">Lists</th><th className="p-2">Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-gray-500">No contacts found.</td></tr>
            )}
            {rows.map((c) => (
              <tr key={c.$id} className="border-t">
                <td className="p-2"><Link href={`/contacts/${c.$id}`} className="underline">{c.email}</Link></td>
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.status}</td>
                <td className="p-2">{(c.tags ?? []).join(", ")}</td>
                <td className="p-2">
                  {(c.listIds ?? []).map((id) => listName.get(id)).filter(Boolean).join(", ")}
                </td>
                <td className="p-2">{new Date(c.$createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        {page > 1 && <Link href={href(page - 1)} className="underline">← Previous</Link>}
        <span>Page {page} of {pages}</span>
        {page < pages && <Link href={href(page + 1)} className="underline">Next →</Link>}
      </div>
    </div>
  );
}