import { Suspense } from "react";
import { Query } from "node-appwrite";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, CONTACTS_TABLE, CAMPAIGNS_TABLE, DOMAINS_TABLE } from "@/lib/appwrite/db";
import { MarketingDashboard } from "@/src/components/blocks/marketing-dashboard";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading dashboard metrics...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const { tablesDB } = createAdminClient();

  // Fetch real counts and recent data for the logged-in user
  const [contactsRes, campaignsRes, domainsRes] = await Promise.all([
    tablesDB.listRows({
      databaseId: DB_ID,
      tableId: CONTACTS_TABLE,
      queries: [Query.equal("accountId", user.$id), Query.limit(1)],
    }),
    tablesDB.listRows({
      databaseId: DB_ID,
      tableId: CAMPAIGNS_TABLE,
      queries: [Query.equal("accountId", user.$id), Query.orderDesc("$createdAt"), Query.limit(5)],
    }),
    tablesDB.listRows({
      databaseId: DB_ID,
      tableId: DOMAINS_TABLE,
      queries: [Query.equal("accountId", user.$id), Query.limit(5)],
    }),
  ]);

  const recentCampaigns = campaignsRes.rows.map((c) => ({
    $id: c.$id,
    name: String(c.name || "Untitled Campaign"),
    subject: String(c.subject || ""),
    status: String(c.status || "draft"),
    $createdAt: String(c.$createdAt),
  }));

  const recentDomains = domainsRes.rows.map((d) => ({
    $id: d.$id,
    domain: String(d.domain),
    status: String(d.status),
  }));

  return (
    <MarketingDashboard
      totalContacts={contactsRes.total}
      totalCampaigns={campaignsRes.total}
      totalDomains={domainsRes.total}
      recentCampaigns={recentCampaigns}
      recentDomains={recentDomains}
    />
  );
}
