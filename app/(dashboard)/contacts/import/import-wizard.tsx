"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { isValidEmail, normalizeEmail, MAX_IMPORT_ROWS, MAX_CHUNK } from "@/lib/contact-rules";
import { formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { importChunk } from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TagInput } from "@/components/tag-input";

type Row = Record<string, string>;
type Field = "email" | "name" | "tags";
type Result = {
  added: number;
  existing: number;
  overLimit: number;
  invalid: number;
  duplicatesInFile: number;
  stopped?: string;
};

const NONE = "__none";
const SAMPLE_CSV =
  "email,name,tags\r\njane@example.com,Jane Doe,\"vip, newsletter\"\r\njohn@example.com,John Smith,newsletter\r\n";
const SAMPLE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`;

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";

function ColumnSelect({
  title,
  value,
  headers,
  optional,
  onChange,
}: {
  title: string;
  value: string;
  headers: string[];
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  const items = [
    { value: NONE, label: optional ? "Do not import" : "Choose a column" },
    ...headers.map((h) => ({ value: h, label: h })),
  ];
  return (
    <div className="space-y-1.5">
      <span className={label}>
        {title} {!optional && <span className="text-destructive">*</span>}
      </span>
      <Select items={items} value={value || NONE} onValueChange={(v) => onChange(!v || v === NONE ? "" : String(v))}>
        <SelectTrigger className="w-full text-xs" aria-label={`${title} column`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value} className="text-xs">
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Stat({ title, value, tone }: { title: string; value: number; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className={hint}>{title}</div>
      <div
        className={cn(
          "mt-0.5 text-base font-semibold tabular-nums",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "bad" && value > 0 && "text-destructive"
        )}
      >
        {formatNumber(value)}
      </div>
    </div>
  );
}

export function ImportWizard({ lists }: { lists: { id: string; name: string }[] }) {
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Record<Field, string>>({ email: "", name: "", tags: "" });
  const [listIds, setListIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Leaving the page stops the import half way, so ask first.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function reset() {
    setFile(null);
    setRows([]);
    setHeaders([]);
    setMap({ email: "", name: "", tags: "" });
    setListIds([]);
    setTags([]);
    setConsent(false);
    setError("");
    setProgress(0);
    setResult(null);
    setFormKey((k) => k + 1);
  }

  function onFile(f: File | undefined) {
    if (!f) return;
    setError("");
    setResult(null);
    if (!/\.csv$/i.test(f.name)) {
      setError("Choose a .csv file. In Excel or Google Sheets, use File → Download → CSV.");
      return;
    }
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter(Boolean);
        if (hs.length === 0 || res.data.length === 0) {
          setError("This file has no contacts. The first row must hold the column names, like email,name,tags.");
          return;
        }
        if (res.data.length > MAX_IMPORT_ROWS) {
          setError(
            `This file has ${formatNumber(res.data.length)} rows. The limit is ${formatNumber(MAX_IMPORT_ROWS)} per file. Split it into smaller files.`
          );
          return;
        }
        const find = (word: string) => hs.find((h) => h.toLowerCase().includes(word)) ?? "";
        setFile(f.name);
        setHeaders(hs);
        setRows(res.data);
        setMap({ email: find("mail"), name: find("name"), tags: find("tag") });
      },
      error: () => setError("Could not read this file."),
    });
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files[0]);
  }

  const analysis = useMemo(() => {
    const valid: { email: string; name: string; tags: string }[] = [];
    const invalidRows: { line: number; value: string }[] = [];
    const seen = new Set<string>();
    let duplicates = 0;
    if (!map.email) return { valid, invalidRows, duplicates };

    rows.forEach((r, i) => {
      const email = normalizeEmail(r[map.email] ?? "");
      if (!isValidEmail(email)) {
        invalidRows.push({ line: i + 2, value: r[map.email] ?? "" }); // line 1 is the header
        return;
      }
      if (seen.has(email)) {
        duplicates++;
        return;
      }
      seen.add(email);
      valid.push({
        email,
        name: map.name ? r[map.name] ?? "" : "",
        tags: map.tags ? r[map.tags] ?? "" : "",
      });
    });
    return { valid, invalidRows, duplicates };
  }, [rows, map]);

  async function run() {
    setBusy(true);
    setError("");
    setProgress(0);
    const total = { added: 0, existing: 0, overLimit: 0, invalid: 0 };
    let stopped: string | undefined;

    for (let i = 0; i < analysis.valid.length; i += MAX_CHUNK) {
      try {
        const res = await importChunk({
          rows: analysis.valid.slice(i, i + MAX_CHUNK),
          listIds,
          tags: tags.join(","),
          consent,
        });
        if (res.error) {
          stopped = res.error;
          break;
        }
        total.added += res.added;
        total.existing += res.existing;
        total.overLimit += res.overLimit;
        total.invalid += res.invalid;
      } catch {
        stopped =
          "The connection failed, so the import stopped. Import the same file again: contacts that already exist are skipped.";
        break;
      }
      setProgress(Math.min(i + MAX_CHUNK, analysis.valid.length));
    }

    setResult({
      ...total,
      invalid: total.invalid + analysis.invalidRows.length,
      duplicatesInFile: analysis.duplicates,
      stopped,
    });
    setBusy(false);
    if (stopped) toast.error(stopped);
    else toast.success(`Import finished. ${plural(total.added, "contact")} added.`);
  }

  // ----- after the import -----
  if (result) {
    const viewHref = listIds.length === 1 ? `/contacts?list=${listIds[0]}` : "/contacts";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.stopped ? (
              <AlertTriangle className="size-4 text-destructive" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            )}
            {result.stopped ? "Import stopped" : "Import finished"}
          </CardTitle>
          <CardDescription>{file}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.stopped && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              {result.stopped}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat title="Added" value={result.added} tone="good" />
            <Stat title="Already in your contacts" value={result.existing} />
            <Stat title="Invalid emails" value={result.invalid} tone="bad" />
            <Stat title="Duplicates in the file" value={result.duplicatesInFile} />
          </div>
          {result.overLimit > 0 && (
            <p className="text-xs text-destructive">
              Not added: {plural(result.overLimit, "contact")}, because you reached your contact limit.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href={viewHref} />}>View contacts</Button>
            <Button variant="outline" onClick={reset}>
              <Upload />
              Import another file
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ready = analysis.valid.length;
  const percent = ready > 0 ? Math.round((progress / ready) * 100) : 0;

  return (
    <div key={formKey} className="space-y-6">
      {/* ----- step 1: file ----- */}
      <Card>
        <CardHeader>
          <CardTitle>1. Choose a CSV file</CardTitle>
          <CardDescription>
            The first row must hold the column names. Up to {formatNumber(MAX_IMPORT_ROWS)} contacts per file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file}</p>
                <p className={hint}>{plural(rows.length, "row")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                <X />
                Remove
              </Button>
            </div>
          ) : (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-center transition-colors hover:bg-muted/40 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                dragging && "border-primary bg-muted/60"
              )}
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">Drop your CSV file here, or click to choose it</span>
              <span className={hint}>Columns like email, name, and tags are found by themselves.</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </p>
          )}

          {!file && (
            <a href={SAMPLE_HREF} download="mailflow-contacts-sample.csv" className={buttonVariants({ variant: "link", size: "xs" })}>
              <Download />
              Download a sample CSV file
            </a>
          )}
        </CardContent>
      </Card>

      {file && (
        <>
          {/* ----- step 2: columns ----- */}
          <Card>
            <CardHeader>
              <CardTitle>2. Match the columns</CardTitle>
              <CardDescription>Tell Mailflow which column holds which information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ColumnSelect title="Email" value={map.email} headers={headers} onChange={(email) => setMap({ ...map, email })} />
                <ColumnSelect title="Name" value={map.name} headers={headers} optional onChange={(name) => setMap({ ...map, name })} />
                <ColumnSelect title="Tags" value={map.tags} headers={headers} optional onChange={(t) => setMap({ ...map, tags: t })} />
              </div>

              {map.email ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat title="Rows in the file" value={rows.length} />
                    <Stat title="Ready to import" value={ready} tone="good" />
                    <Stat title="Invalid emails" value={analysis.invalidRows.length} tone="bad" />
                    <Stat title="Duplicates in the file" value={analysis.duplicates} />
                  </div>

                  {analysis.invalidRows.length > 0 && (
                    <details className="rounded-lg border border-border p-3 text-xs">
                      <summary className="cursor-pointer font-medium">
                        Show the rows with an invalid email ({formatNumber(analysis.invalidRows.length)})
                      </summary>
                      <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                        {analysis.invalidRows.slice(0, 20).map((r) => (
                          <li key={r.line}>
                            Row {r.line}: {r.value ? `"${r.value}"` : "(empty)"}
                          </li>
                        ))}
                      </ul>
                      {analysis.invalidRows.length > 20 && (
                        <p className={`mt-1 ${hint}`}>And {formatNumber(analysis.invalidRows.length - 20)} more.</p>
                      )}
                      <p className={`mt-2 ${hint}`}>These rows are skipped. Fix them in your file and import it again.</p>
                    </details>
                  )}

                  {ready > 0 && (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Tags</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysis.valid.slice(0, 5).map((r) => (
                            <TableRow key={r.email}>
                              <TableCell className="text-xs font-medium">{r.email}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.name || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.tags || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                        Preview: the first {Math.min(5, ready)} of {plural(ready, "contact")}.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-destructive">Choose the column that holds the email addresses.</p>
              )}
            </CardContent>
          </Card>

          {/* ----- step 3: options and import ----- */}
          <Card>
            <CardHeader>
              <CardTitle>3. Lists, tags, and permission</CardTitle>
              <CardDescription>These apply to every contact in the file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <fieldset className="space-y-2">
                <legend className={label}>Add to lists</legend>
                {lists.length === 0 ? (
                  <p className={hint}>
                    You have no lists yet.{" "}
                    <Link href="/contacts/lists" className="underline underline-offset-2 hover:text-foreground">
                      Create a list
                    </Link>{" "}
                    first if you want to group these contacts.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lists.map((l) => (
                      <label key={l.id} className="flex cursor-pointer items-center gap-2 text-xs">
                        <Checkbox
                          checked={listIds.includes(l.id)}
                          onCheckedChange={(checked) =>
                            setListIds(checked ? [...listIds, l.id] : listIds.filter((x) => x !== l.id))
                          }
                        />
                        <span className="truncate">{l.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor="import-tags" className={label}>
                  Add tags to everyone
                </label>
                <TagInput id="import-tags" onChange={setTags} placeholder="newsletter, imported-2026" />
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-muted/30 p-3">
                <Checkbox checked={consent} onCheckedChange={(c) => setConsent(Boolean(c))} className="mt-0.5" />
                <span className="text-xs text-foreground">
                  All these people agreed to get emails from my organization. I did not buy or scrape these email addresses.
                </span>
              </label>

              {busy && (
                <div className="space-y-1.5">
                  <Progress value={percent} aria-label="Import progress" />
                  <p className={`${hint} tabular-nums`}>
                    {formatNumber(progress)} of {plural(ready, "contact")} imported. Keep this page open.
                  </p>
                </div>
              )}

              <Button onClick={run} disabled={!consent || ready === 0 || busy} className="w-full sm:w-auto">
                {busy ? <Loader2 className="animate-spin" /> : <Upload />}
                {busy ? "Importing..." : `Import ${plural(ready, "contact")}`}
              </Button>
              {!consent && ready > 0 && <p className={hint}>Confirm the permission above to start the import.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
