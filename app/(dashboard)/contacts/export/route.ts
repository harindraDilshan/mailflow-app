import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchAllMatchingContacts, listOwnedLists } from "@/lib/contacts";
import { contactsToCsv } from "@/lib/contacts-csv";

// GET /contacts/export?q=&status=&list=&tag=&from=&to=
// The same filters as the contacts screen, so the file holds exactly the contacts in that view.
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;
  const field = (name: string) => sp.get(name)?.trim() || undefined;

  const [rows, lists] = await Promise.all([
    fetchAllMatchingContacts(user.$id, {
      q: field("q"),
      status: field("status"),
      listId: field("list"),
      tag: field("tag"),
      from: field("from"),
      to: field("to"),
    }),
    listOwnedLists(user.$id),
  ]);

  const names = new Map(lists.map((l) => [l.$id, l.name]));
  const csv = contactsToCsv(rows, (id) => names.get(id));
  const day = new Date().toISOString().slice(0, 10);

  // The BOM makes Excel read the file as UTF-8 (names with accents stay correct).
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
