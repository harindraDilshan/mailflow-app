import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { requireUser } from "@/lib/auth";
import { buildDnsRecords, checkRecord, getOwnedDomain } from "@/lib/domains";
import { verifyDomain, deleteDomain } from "../actions";

export default async function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const row = await getOwnedDomain(user.$id, id);
  if (!row) notFound();

  const tokens: string[] = JSON.parse(row.dkimTokens);
  const records = buildDnsRecords(row.domain, tokens, process.env.AWS_REGION!);
  const results = await Promise.all(records.map(async (r) => ({ ...r, found: await checkRecord(r) })));

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">{row.domain}</h1>
      <p className="mb-6 text-sm">
        Status: <b>{row.status}</b>
        {row.status !== "verified" && " — add the records below at your DNS provider, then press Verify."}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border text-left text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2">Purpose</th>
              <th className="p-2">Type</th>
              <th className="p-2">Name</th>
              <th className="p-2">Value</th>
              <th className="p-2">DNS</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2">
                  {r.purpose}
                  <div className="text-xs text-gray-500">{r.required ? "Required" : "Recommended"}</div>
                </td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">
                  <code className="break-all">{r.name}</code> <CopyButton text={r.name} />
                </td>
                <td className="p-2">
                  <code className="break-all">{r.value}</code> <CopyButton text={r.value} />
                </td>
                <td className="p-2">{r.found ? "✓ Found" : "✗ Not found yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        Some DNS providers add your domain to the end of the name by themselves. If so, remove the
        domain part when you paste it. Cloudflare users: set the CNAME records to "DNS only".
      </p>

      <div className="mt-6 flex gap-3">
        <form action={verifyDomain}>
          <input type="hidden" name="id" value={row.$id} />
          <button className="rounded bg-black px-4 py-2 text-white">Verify</button>
        </form>
        <form action={deleteDomain}>
          <input type="hidden" name="id" value={row.$id} />
          <button className="rounded border px-4 py-2">Delete</button>
        </form>
      </div>
    </div>
  );
}