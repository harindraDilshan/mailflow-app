"use server";

import { ID, Permission, Role } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite/admin";
import { DB_ID, TEMPLATES_TABLE } from "@/lib/appwrite/db";
import { normalizeName } from "@/lib/contact-rules";
import { blankDesign, parseDesignJson, renderDesign } from "@/lib/email-design";
import { getGalleryTemplate } from "@/lib/template-gallery";
import {
  MAX_TEMPLATES, SETUP_NEEDED, countTemplates, getOwnedTemplate, listOwnedTemplates, setupMissing,
} from "@/lib/templates";

export type ActionResult = { ok: boolean; message: string; id?: string };

const MAX_HTML = 60000;
const BLANK_HTML = "<p>Hi {{name}},</p>\n<p>Write your message here.</p>";
const notFound: ActionResult = { ok: false, message: "Template not found." };

type Content = { source: "design" | "html"; design: string | null; html: string };

function revalidateTemplates() {
  revalidatePath("/templates", "layout");
}

const cleanName = (v: FormDataEntryValue | null, fallback: string) => normalizeName(String(v ?? "")).slice(0, 150) || fallback;

// The content of a template from a form: a block design (the HTML is made here), or HTML.
function readContent(fd: FormData): Content | { error: string } {
  const json = String(fd.get("design") ?? "");
  if (json) {
    const design = parseDesignJson(json);
    if (!design) return { error: "The design could not be read. Reload the page and try again." };
    const html = renderDesign(design);
    if (html.length > MAX_HTML) return { error: "The email is too long. Remove some blocks or some text." };
    return { source: "design", design: JSON.stringify(design), html };
  }
  const html = String(fd.get("html") ?? "");
  if (!html.trim()) return { error: "The template is empty. Add some content first." };
  if (html.length > MAX_HTML) return { error: "The email is too long (limit 60,000 characters)." };
  return { source: "html", design: null, html };
}

// The database errors that people can fix themselves get a clear message.
async function guarded(run: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await run();
  } catch (e) {
    if (setupMissing(e)) return { ok: false, message: SETUP_NEEDED };
    console.error("Template action failed", e);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}

async function insertTemplate(accountId: string, name: string, content: Content, message: string): Promise<ActionResult> {
  if ((await countTemplates(accountId)) >= MAX_TEMPLATES) {
    return { ok: false, message: `You can save up to ${MAX_TEMPLATES} templates. Delete one that you do not use.` };
  }
  const { tablesDB } = createAdminClient();
  const row = await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: TEMPLATES_TABLE,
    rowId: ID.unique(),
    data: { accountId, name, ...content },
    permissions: [Permission.read(Role.user(accountId))],
  });
  revalidateTemplates();
  return { ok: true, message, id: row.$id };
}

/** A new template: empty blocks, empty HTML, or a copy of a gallery template. */
export async function createTemplate(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const kind = String(fd.get("kind") ?? "blank");
  return guarded(async () => {
    if (kind === "gallery") {
      const t = getGalleryTemplate(String(fd.get("galleryId") ?? ""));
      if (!t) return notFound;
      const content: Content = { source: "design", design: JSON.stringify(t.design), html: renderDesign(t.design) };
      return insertTemplate(user.$id, t.name, content, `"${t.name}" is now in My templates.`);
    }
    if (kind === "html") {
      return insertTemplate(user.$id, "Untitled HTML template", { source: "html", design: null, html: BLANK_HTML }, "Template created.");
    }
    const design = blankDesign();
    const content: Content = { source: "design", design: JSON.stringify(design), html: renderDesign(design) };
    return insertTemplate(user.$id, "Untitled template", content, "Template created.");
  });
}

/** Saves the name and the content. Sending HTML without a design changes a block template into an HTML template. */
export async function saveTemplate(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getOwnedTemplate(user.$id, String(fd.get("id") ?? ""));
  if (!t) return notFound;
  const content = readContent(fd);
  if ("error" in content) return { ok: false, message: content.error };

  return guarded(async () => {
    const { tablesDB } = createAdminClient();
    await tablesDB.updateRow({
      databaseId: DB_ID,
      tableId: TEMPLATES_TABLE,
      rowId: t.$id,
      data: { name: cleanName(fd.get("name"), t.name), ...content },
    });
    revalidateTemplates();
    return { ok: true, message: "Template saved." };
  });
}

/** Saves the content of a campaign (or of an automation email) as a new template. */
export async function saveAsTemplate(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const content = readContent(fd);
  if ("error" in content) return { ok: false, message: content.error };
  const name = cleanName(fd.get("name"), "");
  if (!name) return { ok: false, message: "Give the template a name." };
  return guarded(() => insertTemplate(user.$id, name, content, `"${name}" is saved in My templates.`));
}

export async function duplicateTemplate(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getOwnedTemplate(user.$id, String(fd.get("id") ?? ""));
  if (!t) return notFound;
  const content: Content = { source: t.source === "design" ? "design" : "html", design: t.design ?? null, html: t.html };
  return guarded(() => insertTemplate(user.$id, `${t.name} (copy)`.slice(0, 150), content, "Template duplicated."));
}

export async function deleteTemplate(fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getOwnedTemplate(user.$id, String(fd.get("id") ?? ""));
  if (!t) return notFound;
  // Campaigns keep their own copy of the content, so they do not change.
  return guarded(async () => {
    const { tablesDB } = createAdminClient();
    await tablesDB.deleteRow({ databaseId: DB_ID, tableId: TEMPLATES_TABLE, rowId: t.$id });
    revalidateTemplates();
    return { ok: true, message: `Template "${t.name}" deleted.` };
  });
}

/** The saved templates, for the template picker in the campaign editor and the automation builder. */
export async function listMyTemplates() {
  const user = await requireUser();
  const { templates, setupNeeded } = await listOwnedTemplates(user.$id);
  return { templates, setupNeeded };
}
