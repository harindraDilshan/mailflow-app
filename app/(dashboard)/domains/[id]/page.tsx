import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { requireUser } from "@/lib/auth";
import { buildDnsRecords, checkRecord, getOwnedDomain } from "@/lib/domains";
import { verifyDomain, deleteDomain } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading domain DNS verification...
        </div>
      }
    >
      <DomainDetailContent params={params} />
    </Suspense>
  );
}

async function DomainDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const row = await getOwnedDomain(user.$id, id);
  if (!row) notFound();

  const tokens: string[] = JSON.parse(row.dkimTokens);
  const records = buildDnsRecords(row.domain, tokens, process.env.AWS_REGION!);
  const results = await Promise.all(records.map(async (r) => ({ ...r, found: await checkRecord(r) })));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{row.domain}</h1>
          <p className="text-xs text-muted-foreground">
            {row.status !== "verified"
              ? "Add the DNS records below at your registrar, then click Verify."
              : "Domain is fully authenticated for sending emails."}
          </p>
        </div>
        <Badge variant={row.status === "verified" ? "default" : "outline"}>
          {row.status}
        </Badge>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="p-3">Purpose</th>
              <th className="p-3">Type</th>
              <th className="p-3">Name</th>
              <th className="p-3">Value</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {results.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="p-3 font-medium text-foreground">{r.purpose}</td>
                <td className="p-3 text-muted-foreground font-mono">{r.type}</td>
                <td className="p-3 font-mono text-[11px] text-muted-foreground break-all">
                  {r.name} <CopyButton text={r.name} />
                </td>
                <td className="p-3 font-mono text-[11px] text-muted-foreground break-all">
                  {r.value} <CopyButton text={r.value} />
                </td>
                <td className="p-3">
                  <Badge variant={r.found ? "default" : "outline"} className="text-[10px]">
                    {r.found ? "Detected" : "Missing"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <form action={verifyDomain}>
          <input type="hidden" name="id" value={row.$id} />
          <Button type="submit" size="sm">Verify Records</Button>
        </form>
        <form action={deleteDomain}>
          <input type="hidden" name="id" value={row.$id} />
          <Button type="submit" variant="ghost" size="sm" className="text-destructive">
            Delete Domain
          </Button>
        </form>
      </div>
    </div>
  );
}
