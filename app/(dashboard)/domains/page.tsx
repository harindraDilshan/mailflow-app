import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requireUser } from "@/lib/auth";
import { listOwnedDomains } from "@/lib/domains";
import { addDomain } from "./actions";

export default async function DomainsPage() {
  const user = await requireUser();
  const domains = await listOwnedDomains(user.$id);

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold">Sending domains</h1>

      <ul className="mb-8 space-y-2">
        {domains.length === 0 && <li className="text-sm text-gray-500">No domains yet.</li>}
        {domains.map((d) => (
          <li key={d.$id} className="flex items-center justify-between rounded border p-3">
            <Link href={`/domains/${d.$id}`} className="underline">{d.domain}</Link>
            <span className="text-sm">{d.status}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-medium">Add a domain</h2>
      <p className="mb-3 text-sm text-gray-600">
        Tip: use a subdomain like mail.yourshop.com. It protects your main email reputation.
      </p>
      <AuthForm
        action={addDomain}
        submitLabel="Add domain"
        fields={[{ name: "domain", label: "Domain" }]}
      />
    </div>
  );
}