"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { isValidEmail, normalizeEmail, MAX_IMPORT_ROWS, MAX_CHUNK } from "@/lib/contact-rules";
import { importChunk } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Row = Record<string, string>;
type Result = { added: number; skipped: number; invalid: number; duplicatesInFile: number };

export function ImportWizard({ lists }: { lists: { id: string; name: string }[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState({ email: "", name: "", tags: "" });
  const [listIds, setListIds] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  function onFile(file: File) {
    setError("");
    setResult(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.data.length > MAX_IMPORT_ROWS) {
          setError(`Too many rows. The limit is ${MAX_IMPORT_ROWS} per file.`);
          return;
        }
        const hs = res.meta.fields ?? [];
        const find = (word: string) => hs.find((h) => h.toLowerCase().includes(word)) ?? "";
        setHeaders(hs);
        setRows(res.data);
        setMap({ email: find("mail"), name: find("name"), tags: find("tag") });
      },
      error: () => setError("Could not read this file."),
    });
  }

  const analysis = useMemo(() => {
    const valid: { email: string; name: string; tags: string }[] = [];
    const seen = new Set<string>();
    let invalid = 0;
    let duplicates = 0;
    if (!map.email) return { valid, invalid, duplicates };

    for (const r of rows) {
      const email = normalizeEmail(r[map.email] ?? "");
      if (!isValidEmail(email)) {
        invalid++;
        continue;
      }
      if (seen.has(email)) {
        duplicates++;
        continue;
      }
      seen.add(email);
      valid.push({
        email,
        name: map.name ? r[map.name] ?? "" : "",
        tags: map.tags ? r[map.tags] ?? "" : "",
      });
    }
    return { valid, invalid, duplicates };
  }, [rows, map]);

  async function run() {
    setBusy(true);
    setError("");
    setProgress(0);
    const total = { added: 0, skipped: 0, invalid: 0 };

    for (let i = 0; i < analysis.valid.length; i += MAX_CHUNK) {
      const res = await importChunk({
        rows: analysis.valid.slice(i, i + MAX_CHUNK),
        listIds,
        tags,
        consent,
      });
      if (res.error) {
        setError(res.error);
        break;
      }
      total.added += res.added;
      total.skipped += res.skipped;
      total.invalid += res.invalid;
      setProgress(Math.min(i + MAX_CHUNK, analysis.valid.length));
    }

    setResult({
      ...total,
      invalid: total.invalid + analysis.invalid,
      duplicatesInFile: analysis.duplicates,
    });
    setBusy(false);
  }

  const Select = ({
    label,
    field,
    optional,
  }: {
    label: string;
    field: "email" | "name" | "tags";
    optional?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <select
        value={map[field]}
        onChange={(e) => setMap({ ...map, [field]: e.target.value })}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        <option value="">{optional ? "(none)" : "Choose a column"}</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-5 text-xs">
      <div className="space-y-1.5">
        <Input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="h-9 cursor-pointer file:cursor-pointer"
        />
        <p className="text-[11px] text-muted-foreground">
          Upload a CSV with a header row. Up to {MAX_IMPORT_ROWS} contacts per upload.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Email column (Required)" field="email" />
            <Select label="Name column" field="name" optional />
            <Select label="Tags column" field="tags" optional />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
            <p className="font-medium text-foreground">File Summary:</p>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                Total rows: <span className="font-mono font-semibold">{rows.length}</span>
              </div>
              <div>
                Valid contacts: <span className="font-mono font-semibold">{analysis.valid.length}</span>
              </div>
              <div>
                Invalid emails: <span className="font-mono font-semibold">{analysis.invalid}</span>
              </div>
              <div>
                Duplicates: <span className="font-mono font-semibold">{analysis.duplicates}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.valid.slice(0, 5).map((r) => (
                  <TableRow key={r.email}>
                    <TableCell className="font-medium text-xs">{r.email}</TableCell>
                    <TableCell className="text-muted-foreground">{r.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.tags || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {lists.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-foreground">
                Add contacts to these lists:
              </legend>
              <div className="flex flex-wrap gap-4">
                {lists.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={listIds.includes(l.id)}
                      onChange={(e) =>
                        setListIds(
                          e.target.checked
                            ? [...listIds, l.id]
                            : listIds.filter((x) => x !== l.id)
                        )
                      }
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <span>{l.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Add tags to everyone (comma separated):
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. newsletter, imported-2026"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border bg-muted/30 p-2.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-input text-primary focus:ring-ring"
            />
            <span className="text-xs text-foreground">
              I confirm that all contacts explicitly consented to receive emails from this organization. I did not purchase or scrape these email addresses.
            </span>
          </label>

          <Button
            onClick={run}
            disabled={!consent || analysis.valid.length === 0 || busy}
            className="w-full"
          >
            {busy
              ? `Importing ${progress} of ${analysis.valid.length}...`
              : `Import ${analysis.valid.length} Contacts`}
          </Button>
        </>
      )}

      {result && (
        <div className="rounded-lg border border-border bg-muted/60 p-4 space-y-1">
          <p className="font-semibold text-foreground">Import Finished</p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 pt-1">
            <div>
              Added: <span className="font-mono font-semibold">{result.added}</span>
            </div>
            <div>
              Skipped: <span className="font-mono font-semibold">{result.skipped}</span>
            </div>
            <div>
              Invalid: <span className="font-mono font-semibold">{result.invalid}</span>
            </div>
            <div>
              Duplicates:{" "}
              <span className="font-mono font-semibold">{result.duplicatesInFile}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
