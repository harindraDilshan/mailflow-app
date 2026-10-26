import { it, expect } from "vitest";
import { contactsToCsv, safeCell } from "./contacts-csv";

const base = {
  email: "a@x.com",
  name: "Ann",
  status: "active",
  tags: ["vip", "news"],
  listIds: ["l1", "gone"],
  source: "manual",
  $createdAt: "2026-01-02T03:04:05.000Z",
  consentAt: null,
  note: null,
};

it("blocks spreadsheet formulas", () => {
  expect(safeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  expect(safeCell("+1")).toBe("'+1");
  expect(safeCell("@cmd")).toBe("'@cmd");
  expect(safeCell("Ann")).toBe("Ann");
});

it("writes a header, quotes commas, and skips deleted lists", () => {
  const csv = contactsToCsv([base], (id) => (id === "l1" ? "Newsletter" : undefined));
  const [header, row] = csv.trim().split("\r\n");
  expect(header).toBe("email,name,status,tags,lists,source,created_at,consent_at,note");
  expect(row).toBe('a@x.com,Ann,active,"vip, news",Newsletter,manual,2026-01-02T03:04:05.000Z,,');
});

it("escapes quotes and line breaks inside a cell", () => {
  const csv = contactsToCsv([{ ...base, tags: [], note: 'Said "hi"\nthen left' }], () => undefined);
  expect(csv).toContain('"Said ""hi""\nthen left"');
});
