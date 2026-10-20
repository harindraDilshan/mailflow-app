"use server";

import { ID, Permission, Role } from "node-appwrite";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/server";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE } from "@/lib/appwrite/db";
import {
  normalizeEmail, isValidEmail, normalizeName, normalizeTags,
  MAX_CONTACTS, MAX_CHUNK, MAX_LISTS,
} from "@/lib/contact-rules";
import {
  insertContact, countContacts, filterOwnedListIds, getOwnedContact,
  getOwnedList, listOwnedLists,
} from "@/lib/contacts";

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

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    rowId: contact.$id,
    data: {
      name: normalizeName(String(formData.get("name") ?? "")),
      tags: normalizeTags(String(formData.get("tags") ?? "")),
      listIds,
    },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Delete (only active contacts) ----------
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