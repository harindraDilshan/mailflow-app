import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requireUser } from "@/lib/auth";
import { listOwnedDomains } from "@/lib/domains";
import { addDomain } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, ShieldCheck } from "lucide-react";

export default async function DomainsPage() {
  const user = await requireUser();
  const domains = await listOwnedDomains(user.$id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Sending Domains
        </h1>
        <p className="text-xs text-muted-foreground">
          Authenticate your sender addresses with SPF, DKIM, and DMARC to guarantee inbox delivery
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            <span>Configured Domains</span>
          </CardTitle>
          <CardDescription>
            Domains registered for outgoing email delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {domains.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No sending domains added yet. Add your domain below to configure DNS verification.
              </p>
            )}
            {domains.map((d) => (
              <div key={d.$id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <Link
                    href={`/domains/${d.$id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {d.domain}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    Click to view required DNS records and verification status
                  </p>
                </div>
                <Badge
                  variant={d.status === "verified" ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {d.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <span>Add a Sending Domain</span>
          </CardTitle>
          <CardDescription>
            We recommend using a dedicated subdomain such as <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">mail.yourdomain.com</code> to protect your main email reputation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={addDomain}
            submitLabel="Add Domain"
            fields={[
              {
                name: "domain",
                label: "Domain name",
                placeholder: "mail.example.com",
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
