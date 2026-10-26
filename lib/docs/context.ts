import { cache } from "react";
import { getLoggedInUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";

// What the docs know about the reader. Logged in: the examples use their own list ID.
export const docsContext = cache(async () => {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const user = await getLoggedInUser();
  const lists = user ? (await listOwnedLists(user.$id).catch(() => [])).map((l) => ({ id: l.$id, name: l.name })) : [];
  return {
    base,
    signedIn: Boolean(user),
    lists,
    listId: lists[0]?.id ?? "YOUR_LIST_ID",
    listName: lists[0]?.name ?? null,
  };
});
