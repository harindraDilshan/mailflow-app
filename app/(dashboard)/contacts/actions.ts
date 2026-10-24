"use server";

import { ID, Permission, Role, Query } from "node-appwrite";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/server";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE } from "@/lib/appwrite/db";
import {
  normalizeEmail, isValidEmail, normalizeName, normalizeTags,
  MAX_CONTACTS, MAX_CHUNK, MAX_LISTS, PAGE_SIZE,
} from "@/lib/contact-rules";
import {
  insertContact, countContacts, filterOwnedListIds, getOwnedContact,
  getOwnedList, listOwnedLists, ContactRow, fetchAllMatchingContacts,
} from "@/lib/contacts";
import { fireContactTriggers } from "@/lib/automation-trigger";

type State = { error?: string; message?: string } | undefined;

// ---------- US-3.1: add one contact ----------
export async function addContact(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };

  if ((await countContacts(user.$id)) >= MAX_CONTACTS) {
    return { error: `You reached the limit of ${MAX_CONTACTS} contacts.` };
  }

  const listIds = await filterOwnedListIds(user.$id, formData.getAll("listIds").map(String));

  const result = await insertContact(user.$id, {
    email,
    name: String(formData.get("name") ?? ""),
    tags: normalizeTags(String(formData.get("tags") ?? "")),
    listIds,
    source: "manual",
  });

  if (result === "exists") return { error: "This contact already exists." };
  if (result === "invalid") return { error: "Enter a valid email address." };

  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Edit a contact (name, tags, lists only) ----------
export async function updateContact(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const contact = await getOwnedContact(user.$id, String(formData.get("id") ?? ""));
  if (!contact) return { error: "Contact not found." };

  const listIds = await filterOwnedListIds(user.$id, formData.getAll("listIds").map(String));
  const newTags = normalizeTags(String(formData.get("tags") ?? ""));
  const addedLists = listIds.filter((id) => !(contact.listIds ?? []).includes(id));
  const addedTags = newTags.filter((t) => !(contact.tags ?? []).includes(t));

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    rowId: contact.$id,
    data: {
      name: normalizeName(String(formData.get("name") ?? "")),
      tags: newTags,
      listIds,
    },
  });

  if (contact.status === "active") {
    await fireContactTriggers(user.$id, contact.$id, addedLists, addedTags);
  }

  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Delete one contact (only active or pending) ----------
export async function deleteContact(formData: FormData): Promise<void> {
  const user = await requireUser();
  const contact = await getOwnedContact(user.$id, String(formData.get("id") ?? ""));
  if (!contact) return;

  // Unsubscribed, bounced, and complained contacts stay as a "do not email" memory.
  if (contact.status !== "active" && contact.status !== "pending") return;

  const { tablesDB } = createAdminClient();
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: contact.$id });

  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Bulk delete contacts by ID (current page selection) ----------
export async function bulkDeleteContacts(formData: FormData): Promise<void> {
  const user = await requireUser();

  // Deduplicate and cap at PAGE_SIZE to match what the UI can ever show at once.
  const ids = [...new Set(formData.getAll("ids").map(String).filter(Boolean))].slice(0, PAGE_SIZE);
  if (ids.length === 0) return;

  const { tablesDB } = createAdminClient();

  // One query to fetch all requested rows that belong to this account.
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [
      Query.equal("accountId", user.$id),
      Query.equal("$id", ids),
      Query.limit(ids.length),
    ],
  });

  const toDelete = (res.rows as unknown as ContactRow[]).filter(
    (c) => c.status === "active" || c.status === "pending"
  );

  await Promise.all(
    toDelete.map((c) =>
      tablesDB.deleteRow({ databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: c.$id })
    )
  );

  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Delete all contacts matching the current filter set ----------
export async function deleteAllMatchingContacts(formData: FormData): Promise<void> {
  const user = await requireUser();

  const filters = {
    q:      (formData.get("q")      as string) || undefined,
    status: (formData.get("status") as string) || undefined,
    listId: (formData.get("listId") as string) || undefined,
    tag:    (formData.get("tag")    as string) || undefined,
    from:   (formData.get("from")   as string) || undefined,
    to:     (formData.get("to")     as string) || undefined,
  };

  // Fetch every contact that matches the filters (bounded by MAX_CONTACTS).
  const all = await fetchAllMatchingContacts(user.$id, filters);

  // Server-side guard: never delete protected contacts regardless of filters.
  const toDelete = all.filter(
    (c) => c.status === "active" || c.status === "pending"
  );

  const { tablesDB } = createAdminClient();

  // Delete in batches of 25 to stay gentle on the database.
  for (let i = 0; i < toDelete.length; i += 25) {
    await Promise.all(
      toDelete.slice(i, i + 25).map((c) =>
        tablesDB.deleteRow({ databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: c.$id })
      )
    );
  }

  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- US-3.2: import one chunk of a CSV ----------
export async function importChunk(input: {
  rows: { email: string; name?: string; tags?: string }[];
  listIds: string[];
  tags: string;
  consent: boolean;
}): Promise<{ added: number; skipped: number; invalid: number; error?: string }> {
  const user = await requireUser();
  const empty = { added: 0, skipped: 0, invalid: 0 };

  if (input.consent !== true) {
    return { ...empty, error: "You must confirm that you have permission to email these people." };
  }
  if (!Array.isArray(input.rows) || input.rows.length > MAX_CHUNK) {
    return { ...empty, error: "Too many rows in one request." };
  }

  const listIds = await filterOwnedListIds(user.$id, input.listIds ?? []);
  const extraTags = normalizeTags(String(input.tags ?? ""));
  let remaining = MAX_CONTACTS - (await countContacts(user.$id));

  const out = { added: 0, skipped: 0, invalid: 0 };

  // 10 at a time: faster than one by one, and gentle on the database
  for (let i = 0; i < input.rows.length; i += 10) {
    const group = input.rows.slice(i, i + 10);
    await Promise.all(
      group.map(async (r) => {
        if (remaining <= 0) {
          out.skipped++; // over the contact limit
          return;
        }
        const result = await insertContact(user.$id, {
          email: String(r.email ?? ""),
          name: String(r.name ?? ""),
          tags: normalizeTags([...normalizeTags(String(r.tags ?? "")), ...extraTags]),
          listIds,
          source: "import",
          consent: true,
        });
        if (result === "added") {
          out.added++;
          remaining--;
        } else if (result === "exists") out.skipped++;
        else out.invalid++;
      })
    );
  }

  revalidatePath("/contacts");
  return out;
}

// ---------- US-3.4: lists ----------
export async function createList(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 100);
  if (!name) return { error: "Enter a list name." };

  const existing = await listOwnedLists(user.$id);
  if (existing.length >= MAX_LISTS) return { error: `You can have up to ${MAX_LISTS} lists.` };
  if (existing.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
    return { error: "A list with this name already exists." };
  }

  const { tablesDB } = createAdminClient();
  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: LISTS_TABLE,
    rowId: ID.unique(),
    data: { accountId: user.$id, name },
    permissions: [Permission.read(Role.user(user.$id))],
  });

  revalidatePath("/contacts/lists");
  return { message: "List created." };
}

export async function deleteList(formData: FormData): Promise<void> {
  const user = await requireUser();
  const list = await getOwnedList(user.$id, String(formData.get("id") ?? ""));
  if (!list) return;

  // Contacts keep the old list ID, but the screens ignore IDs that no longer exist.
  const { tablesDB } = createAdminClient();
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: LISTS_TABLE, rowId: list.$id });

  revalidatePath("/contacts/lists");
  revalidatePath("/contacts");
}
