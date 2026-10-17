"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { isValidEmail, normalizeEmail, MAX_IMPORT_ROWS, MAX_CHUNK } from "@/lib/contact-rules";
import { importChunk } from "../actions";

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
      if (!isValidEmail(email)) { invalid++; continue; }
      if (seen.has(email)) { duplicates++; continue; }
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
      if (res.error) { setError(res.error); break; }
      total.added += res.added;
      total.skipped += res.skipped;
      total.invalid += res.invalid;
      setProgress(Math.min(i + MAX_CHUNK, analysis.valid.length));
    }

    setResult({ ...total, invalid: total.invalid + analysis.invalid, duplicatesInFile: analysis.duplicates });
    setBusy(false);
  }

  const Select = ({ label, field, optional }: { label: string; field: "email" | "name" | "tags"; optional?: boolean }) => (
    <label className="block text-sm">
      {label}
      <select
        value={map[field]}
        onChange={(e) => setMap({ ...map, [field]: e.target.value })}
        className="mt-1 w-full rounded border px-3 py-2"
      >
        <option value="">{optional ? "(none)" : "Choose a column"}</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <input
          type="file" accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <p className="mt-1 text-xs text-gray-500">
          CSV with a header row. Up to {MAX_IMPORT_ROWS} rows. Email is required, name and tags are optional.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Email column" field="email" />
            <Select label="Name column" field="name" optional />
            <Select label="Tags column" field="tags" optional />
          </div>

          <div className="rounded border p-3 text-sm">
            <p>Rows in file: <b>{rows.length}</b></p>
            <p>Ready to import: <b>{analysis.valid.length}</b></p>
            <p>Invalid emails: <b>{analysis.invalid}</b></p>
            <p>Repeated in the file: <b>{analysis.duplicates}</b></p>
            <p className="mt-1 text-xs text-gray-500">
              People who are already in your contacts are skipped when you import.
            </p>
          </div>

          <table className="w-full border text-left text-sm">
            <thead>
              <tr className="bg-gray-50"><th className="p-2">Email</th><th className="p-2">Name</th><th className="p-2">Tags</th></tr>
            </thead>
            <tbody>
              {analysis.valid.slice(0, 5).map((r) => (
                <tr key={r.email} className="border-t">
                  <td className="p-2">{r.email}</td><td className="p-2">{r.name}</td><td className="p-2">{r.tags}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {lists.length > 0 && (
            <fieldset>
              <legend className="mb-1 text-sm">Add everyone to these lists (optional)</legend>
              {lists.map((l) => (
                <label key={l.id} className="mr-4 inline-flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={listIds.includes(l.id)}
                    onChange={(e) =>
                      setListIds(e.target.checked ? [...listIds, l.id] : listIds.filter((x) => x !== l.id))
                    }
                  />
                  {l.name}
                </label>
              ))}
            </fieldset>
          )}

          <label className="block text-sm">
            Add these tags to everyone (optional)
            <input
              value={tags} onChange={(e) => setTags(e.target.value)} placeholder="imported, october"
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            I confirm that I have permission to email these people. I did not buy or scrape this list.
          </label>

          <button
            onClick={run}
            disabled={!consent || analysis.valid.length === 0 || busy}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? `Importing ${progress} of ${analysis.valid.length}...` : `Import ${analysis.valid.length} contacts`}
          </button>
        </>
      )}

      {result && (
        <div className="rounded border bg-green-50 p-4 text-sm">
          <p className="mb-1 font-medium">Import finished</p>
          <p>Added: <b>{result.added}</b></p>
          <p>Skipped (already in your contacts, or over your limit): <b>{result.skipped}</b></p>
          <p>Invalid: <b>{result.invalid}</b></p>
          <p>Repeated in the file: <b>{result.duplicatesInFile}</b></p>
        </div>
      )}
    </div>
  );
}