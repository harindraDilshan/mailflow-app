import { countAudience } from "@/lib/campaigns";
import { countContactsInList, listOwnedLists } from "@/lib/contacts";
import { listOwnedDomains } from "@/lib/domains";

// What the campaign editor needs besides the campaign: lists with their sizes, and the sender domains.
export async function loadEditorData(accountId: string) {
  const [lists, domains, totalActive] = await Promise.all([
    listOwnedLists(accountId),
    listOwnedDomains(accountId),
    countAudience(accountId, []),
  ]);
  const active = await Promise.all(lists.map((l) => countContactsInList(accountId, l.$id, "active")));

  return {
    lists: lists.map((l, i) => ({ id: l.$id, name: l.name, active: active[i] })),
    domains: domains.map((d) => ({ domain: d.domain, status: d.status })),
    totalActive,
    requireVerified: process.env.REQUIRE_VERIFIED_DOMAIN === "true",
  };
}
