import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, TEMPLATES_TABLE } from "@/lib/appwrite/db";
import { parseDesignJson, type EmailDesign } from "@/lib/email-design";

// A template that a customer saved. "design" templates are edited with blocks,
// "html" templates are their own HTML. The HTML of both is stored, ready to send.
export type TemplateRow = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  accountId: string;
  name: string;
  source: "design" | "html";
  design?: string | null; // JSON, see lib/email-design.ts
  html: string;
};

// What the screens get. The design is already parsed.
export type SavedTemplate = {
  id: string;
  name: string;
  source: "design" | "html";
  design: EmailDesign | null;
  html: string;
  updatedAt: string;
};

export const MAX_TEMPLATES = 200;
export const SETUP_NEEDED = 'The database has no templates table yet. Run "npm run db:setup", then try again.';

/** True when the error says that the table or a column is not in the database yet ("npm run db:setup" fixes it). */
export function setupMissing(e: unknown) {
  const err = e as { message?: string; type?: string } | null;
  const text = `${err?.type ?? ""} ${err?.message ?? ""}`;
  return /table_not_found|collection_not_found|Unknown attribute|(Table|Collection) with the requested ID could not be found/i.test(text);
}

export function toSavedTemplate(r: TemplateRow): SavedTemplate {
  const design = r.source === "design" ? parseDesignJson(r.design) : null;
  return { id: r.$id, name: r.name, source: design ? "design" : "html", design, html: r.html, updatedAt: r.$updatedAt };
}

/** The templates of an account, the last changed first. `setupNeeded` when the table is missing. */
export async function listOwnedTemplates(accountId: string) {
  const { tablesDB } = createAdminClient();
  try {
    const res = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: TEMPLATES_TABLE,
      queries: [Query.equal("accountId", accountId), Query.orderDesc("$updatedAt"), Query.limit(MAX_TEMPLATES)],
    });
    return { templates: (res.rows as unknown as TemplateRow[]).map(toSavedTemplate), total: res.total, setupNeeded: false };
  } catch (e) {
    if (setupMissing(e)) return { templates: [] as SavedTemplate[], total: 0, setupNeeded: true };
    throw e;
  }
}

export async function getOwnedTemplate(accountId: string, id: string) {
  if (!id) return null;
  const { tablesDB } = createAdminClient();
  try {
    const row = (await tablesDB.getRow({ databaseId: DB_ID, tableId: TEMPLATES_TABLE, rowId: id })) as unknown as TemplateRow;
    return row.accountId === accountId ? row : null;
  } catch {
    return null;
  }
}

export async function countTemplates(accountId: string) {
  const { tablesDB } = createAdminClient();
  const res = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: TEMPLATES_TABLE,
    queries: [Query.equal("accountId", accountId), Query.limit(1)],
  });
  return res.total;
}
