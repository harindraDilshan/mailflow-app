import type { ContactRow } from "@/lib/contacts";

// Same column names as the import wizard looks for, so an export can be imported again.
export const CSV_COLUMNS = ["email", "name", "status", "tags", "lists", "source", "created_at", "consent_at", "note"];

// A cell that starts with = + - @ (or a tab / carriage return) can run as a formula
// in Excel or Google Sheets. Names come from public sign-up forms, so never trust them.
export function safeCell(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function quote(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

type CsvContact = Pick<
  ContactRow,
  "email" | "name" | "status" | "tags" | "listIds" | "source" | "$createdAt" | "consentAt" | "note"
>;

export function contactsToCsv(rows: CsvContact[], listName: (id: string) => string | undefined) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const c of rows) {
    const cells = [
      c.email,
      c.name ?? "",
      c.status,
      (c.tags ?? []).join(", "),
      (c.listIds ?? []).map(listName).filter(Boolean).join(", "),
      c.source,
      c.$createdAt,
      c.consentAt ?? "",
      c.note ?? "",
    ];
    lines.push(cells.map((v) => quote(safeCell(String(v)))).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
