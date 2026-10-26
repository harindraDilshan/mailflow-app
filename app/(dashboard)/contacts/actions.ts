"use server";

import { ID, Permission, Role, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/server";
import { DB_ID, CONTACTS_TABLE, LISTS_TABLE } from "@/lib/appwrite/db";
import {
  normalizeEmail, isValidEmail, normalizeName, normalizeNote, normalizeTags,
  MAX_CONTACTS, MAX_CHUNK, MAX_LISTS, MAX_PAGE_SIZE,
} from "@/lib/contact-rules";
import { canArchive, canDelete, canUnarchive, canUnsubscribe } from "@/lib/contact-status";
import {
  insertContact, countContacts, filterOwnedListIds, getOwnedContact, getOwnedList, listOwnedLists,
  findContactByEmail, fetchAllMatchingContacts, type ContactRow,
} from "@/lib/contacts";
import { fireContactTriggers } from "@/lib/automation-trigger";
import { plural } from "@/lib/format";

type State = { error?: string; message?: string } | undefined;
export type ContactFormState = { error?: string; message?: string; existingId?: string; addAnother?: boolean } | undefined;
// Bulk and single actions return this, so the screen can show a toast and stay where it is.
export type ActionResult = { ok: boolean; message: string };

// The contacts screens, every contact page, and the lists pages.
function revalidateContacts() {
  revalidatePath("/contacts", "layout");
}

// ---------- US-3.1: add one contact ----------
export async function addContact(_: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const user = await requireUser();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (formData.get("consent") !== "on") {
    return { error: "Confirm that this person agreed to get emails from you." };
  }

  if ((await countContacts(user.$id)) >= MAX_CONTACTS) {
    return { error: `You reached the limit of ${MAX_CONTACTS} contacts.` };
  }

  const listIds = await filterOwnedListIds(user.$id, formData.getAll("listIds").map(String));
  const note = normalizeNote(String(formData.get("note") ?? ""));

  const result = await insertContact(user.$id, {
    email,
    name: String(formData.get("name") ?? ""),
    tags: normalizeTags(String(formData.get("tags") ?? "")),
    listIds,
    source: "manual",
    consent: true,
    note: note || undefined,
  });

  if (result === "exists") {
    const existing = await findContactByEmail(user.$id, email);
    return { error: "A contact with this email already exists.", existingId: existing?.$id };
  }
  if (result === "invalid") return { error: "Enter a valid email address." };

  revalidateContacts();
  return { message: `${email} was added.`, addAnother: formData.get("intent") === "another" };
}

// ---------- Edit a contact (name, tags, lists, note) ----------
export async function updateContact(_: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const user = await requireUser();
  const contact = await getOwnedContact(user.$id, String(formData.get("id") ?? ""));
  if (!contact) return { error: "Contact not found." };

  const listIds = await filterOwnedListIds(user.$id, formData.getAll("listIds").map(String));
  const newTags = normalizeTags(String(formData.get("tags") ?? ""));
  const note = normalizeNote(String(formData.get("note") ?? ""));
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
      note,
    },
  });

  if (contact.status === "active") {
    await fireContactTriggers(user.$id, contact.$id, addedLists, addedTags);
  }

  revalidateContacts();
  return { message: "Changes saved." };
}

// ---------- Helpers for actions on selected contacts ----------
// The "ids" fields of the form. Only rows of this account come back.
async function selectedContacts(accountId: string, formData: FormData) {
  const ids = [...new Set(formData.getAll("ids").map(String).filter(Boolean))].slice(0, MAX_PAGE_SIZE);
  if (ids.length === 0) return [];

  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: CONTACTS_TABLE,
    queries: [Query.equal("accountId", accountId), Query.equal("$id", ids), Query.limit(ids.length)],
  });
  return res.rows as unknown as ContactRow[];
}

// 25 at a time: faster than one by one, and gentle on the database.
async function inBatches<T>(items: T[], run: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += 25) {
    await Promise.all(items.slice(i, i + 25).map(run));
  }
}

async function updateEach(rows: ContactRow[], data: (c: ContactRow) => Record<string, unknown>) {
  const { tablesDB } = createAdminClient();
  await inBatches(rows, (c) =>
    tablesDB.updateRow({ databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: c.$id, data: data(c) })
  );
}

async function deleteEach(rows: ContactRow[]) {
  const { tablesDB } = createAdminClient();
  await inBatches(rows, (c) => tablesDB.deleteRow({ databaseId: DB_ID, tableId: CONTACTS_TABLE, rowId: c.$id }));
}

// "Archived 3 contacts. 2 contacts skipped: only active contacts can be archived."
function report(done: number, skipped: number, doneText: string, reason: string): ActionResult {
  if (done === 0 && skipped === 0) {
    return { ok: false, message: "No contacts were found. Refresh the page and try again." };
  }
  if (done === 0) return { ok: false, message: `Nothing changed. ${reason}` };
  const extra = skipped > 0 ? ` ${plural(skipped, "contact")} skipped. ${reason}` : "";
  return { ok: true, message: `${doneText.replace("{n}", plural(done, "contact"))}.${extra}` };
}

// ---------- Archive, unarchive, unsubscribe, delete (1 to MAX_PAGE_SIZE contacts) ----------
export async function bulkArchiveContacts(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const rows = await selectedContacts(user.$id, formData);
  const targets = rows.filter((c) => canArchive(c.status));

  await updateEach(targets, () => ({ status: "archived" }));
  revalidateContacts();
  return report(targets.length, rows.length - targets.length, "Archived {n}", "Only active contacts can be archived.");
}

export async function bulkUnarchiveContacts(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const rows = await selectedContacts(user.$id, formData);
  const archived = rows.filter((c) => canUnarchive(c.status));

  // Unarchived contacts count toward the contact limit again.
  const room = Math.max(0, MAX_CONTACTS - (await countContacts(user.$id)));
  const targets = archived.slice(0, room);

  await updateEach(targets, () => ({ status: "active" }));
  revalidateContacts();

  if (archived.length > targets.length) {
    const left = archived.length - targets.length;
    return {
      ok: targets.length > 0,
      message: `Unarchived ${plural(targets.length, "contact")}. ${plural(left, "contact")} not unarchived: you reached the limit of ${MAX_CONTACTS} contacts.`,
    };
  }
  return report(targets.length, rows.length - targets.length, "Unarchived {n}", "Only archived contacts can be unarchived.");
}

export async function bulkUnsubscribeContacts(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const rows = await selectedContacts(user.$id, formData);
  const targets = rows.filter((c) => canUnsubscribe(c.status));

  await updateEach(targets, () => ({ status: "unsubscribed" }));
  revalidateContacts();
  return report(
    targets.length, rows.length - targets.length, "Unsubscribed {n}",
    "Unsubscribed, bounced, and complained contacts already get no email."
  );
}

const KEEP_REASON = "Unsubscribed, bounced, and complained contacts are kept so that they never get email again.";

export async function bulkDeleteContacts(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const rows = await selectedContacts(user.$id, formData);
  const targets = rows.filter((c) => canDelete(c.status));

  await deleteEach(targets);
  revalidateContacts();
  return report(targets.length, rows.length - targets.length, "Deleted {n}", KEEP_REASON);
}

// ---------- Delete all contacts matching the current filter set ----------
export async function deleteAllMatchingContacts(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const field = (name: string) => String(formData.get(name) ?? "") || undefined;
  const all = await fetchAllMatchingContacts(user.$id, {
    q: field("q"),
    status: field("status"),
    listId: field("list"),
    tag: field("tag"),
    from: field("from"),
    to: field("to"),
  });

  // Server-side guard: never delete protected contacts, whatever the filters are.
  const targets = all.filter((c) => canDelete(c.status));
  await deleteEach(targets);

  revalidateContacts();
  return report(targets.length, all.length - targets.length, "Deleted {n}", KEEP_REASON);
}

// ---------- Lists and tags on selected contacts ----------
export async function bulkAddToList(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const list = await getOwnedList(user.$id, String(formData.get("listId") ?? ""));
  if (!list) return { ok: false, message: "List not found." };

  const rows = await selectedContacts(user.$id, formData);
  const targets = rows.filter((c) => !(c.listIds ?? []).includes(list.$id));

  await updateEach(targets, (c) => ({ listIds: [...(c.listIds ?? []), list.$id] }));
  // Joining a list can start an automation, the same as when one contact is edited.
  await Promise.all(
    targets.filter((c) => c.status === "active").map((c) => fireContactTriggers(user.$id, c.$id, [list.$id], []))
  );

  revalidateContacts();
  return report(targets.length, rows.length - targets.length, `Added {n} to "${list.name}"`, "They were already in this list.");
}

export async function bulkRemoveFromList(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const list = await getOwnedList(user.$id, String(formData.get("listId") ?? ""));
  if (!list) return { ok: false, message: "List not found." };

  const rows = await selectedContacts(user.$id, formData);
  const targets = rows.filter((c) => (c.listIds ?? []).includes(list.$id));

  await updateEach(targets, (c) => ({ listIds: (c.listIds ?? []).filter((id) => id !== list.$id) }));
  revalidateContacts();
  return report(targets.length, rows.length - targets.length, `Removed {n} from "${list.name}"`, "They were not in this list.");
}

export async function bulkAddTags(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const tags = normalizeTags(String(formData.get("tags") ?? ""));
  if (tags.length === 0) return { ok: false, message: "Enter at least one tag." };

  const rows = await selectedContacts(user.$id, formData);
  const next = new Map(rows.map((c) => [c.$id, normalizeTags([...(c.tags ?? []), ...tags])])); // keeps at most MAX_TAGS
  const added = (c: ContactRow) => next.get(c.$id)!.filter((t) => !(c.tags ?? []).includes(t));
  const targets = rows.filter((c) => added(c).length > 0);

  await updateEach(targets, (c) => ({ tags: next.get(c.$id) }));
  await Promise.all(
    targets.filter((c) => c.status === "active").map((c) => fireContactTriggers(user.$id, c.$id, [], added(c)))
  );

  revalidateContacts();
  return report(
    targets.length, rows.length - targets.length, "Tagged {n}",
    "They already had these tags, or already have the most tags allowed."
  );
}

export async function bulkRemoveTags(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const tags = normalizeTags(String(formData.get("tags") ?? ""));
  if (tags.length === 0) return { ok: false, message: "Enter at least one tag." };

  const rows = await selectedContacts(user.$id, formData);
  const targets = rows.filter((c) => (c.tags ?? []).some((t) => tags.includes(t)));

  await updateEach(targets, (c) => ({ tags: (c.tags ?? []).filter((t) => !tags.includes(t)) }));
  revalidateContacts();
  return report(targets.length, rows.length - targets.length, "Removed tags from {n}", "They did not have these tags.");
}

// ---------- US-3.2: import one chunk of a CSV ----------
export async function importChunk(input: {
  rows: { email: string; name?: string; tags?: string }[];
  listIds: string[];
  tags: string;
  consent: boolean;
}): Promise<{ added: number; existing: number; overLimit: number; invalid: number; error?: string }> {
  const user = await requireUser();
  const empty = { added: 0, existing: 0, overLimit: 0, invalid: 0 };

  if (input.consent !== true) {
    return { ...empty, error: "You must confirm that you have permission to email these people." };
  }
  if (!Array.isArray(input.rows) || input.rows.length > MAX_CHUNK) {
    return { ...empty, error: "Too many rows in one request." };
  }

  const listIds = await filterOwnedListIds(user.$id, input.listIds ?? []);
  const extraTags = normalizeTags(String(input.tags ?? ""));
  let remaining = MAX_CONTACTS - (await countContacts(user.$id));

  const out = { ...empty };

  // 10 at a time: faster than one by one, and gentle on the database
  for (let i = 0; i < input.rows.length; i += 10) {
    const group = input.rows.slice(i, i + 10);
    await Promise.all(
      group.map(async (r) => {
        if (remaining <= 0) {
          out.overLimit++;
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
        } else if (result === "exists") out.existing++;
        else out.invalid++;
      })
    );
  }

  revalidateContacts();
  return out;
}

// ---------- US-3.4: lists ----------
async function nameProblem(accountId: string, name: string, exceptId?: string) {
  if (!name) return "Enter a list name.";
  const existing = await listOwnedLists(accountId);
  if (!exceptId && existing.length >= MAX_LISTS) return `You can have up to ${MAX_LISTS} lists.`;
  if (existing.some((l) => l.$id !== exceptId && l.name.toLowerCase() === name.toLowerCase())) {
    return "A list with this name already exists.";
  }
  return null;
}

export async function createList(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 100);
  const problem = await nameProblem(user.$id, name);
  if (problem) return { error: problem };

  const { tablesDB } = createAdminClient();
  await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: LISTS_TABLE,
    rowId: ID.unique(),
    data: { accountId: user.$id, name },
    permissions: [Permission.read(Role.user(user.$id))],
  });

  revalidateContacts();
  return { message: `List "${name}" created.` };
}

export async function renameList(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const list = await getOwnedList(user.$id, String(formData.get("id") ?? ""));
  if (!list) return { error: "List not found." };

  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 100);
  const problem = await nameProblem(user.$id, name, list.$id);
  if (problem) return { error: problem };

  const { tablesDB } = createAdminClient();
  await tablesDB.updateRow({ databaseId: DB_ID, tableId: LISTS_TABLE, rowId: list.$id, data: { name } });

  revalidateContacts();
  return { message: `List renamed to "${name}".` };
}

export async function deleteList(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const list = await getOwnedList(user.$id, String(formData.get("id") ?? ""));
  if (!list) return { ok: false, message: "List not found." };

  // Contacts keep the old list ID, but the screens ignore IDs that no longer exist.
  const { tablesDB } = createAdminClient();
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: LISTS_TABLE, rowId: list.$id });

  revalidateContacts();
  return { ok: true, message: `List "${list.name}" deleted. Its contacts were not deleted.` };
}
