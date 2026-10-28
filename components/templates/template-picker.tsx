"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateThumb, templateHtml } from "@/components/templates/template-thumb";
import { listMyTemplates } from "@/app/(dashboard)/templates/actions";
import type { EmailDesign } from "@/lib/email-design";
import { GALLERY_TEMPLATES, TEMPLATE_CATEGORIES, categoryLabel, type GalleryTemplate } from "@/lib/template-gallery";
import type { SavedTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

/** What the editors get when someone picks a template. The design is a copy: changes do not touch the template. */
export type PickedTemplate = { name: string; subject: string; previewText: string; design: EmailDesign | null; html: string };

export const pickGallery = (t: GalleryTemplate): PickedTemplate => ({
  name: t.name,
  subject: t.subject,
  previewText: t.previewText,
  design: structuredClone(t.design),
  html: "",
});

export const pickSaved = (t: SavedTemplate): PickedTemplate => ({
  name: t.name,
  subject: "",
  previewText: "",
  design: t.design ? structuredClone(t.design) : null,
  html: t.html,
});

/** Gallery templates that match a category ("all" for every one) and a search text. */
export function filterGallery(category: string, q: string) {
  const text = q.trim().toLowerCase();
  return GALLERY_TEMPLATES.filter(
    (t) =>
      (category === "all" || t.category === category) &&
      (!text || `${t.name} ${t.description} ${categoryLabel(t.category)}`.toLowerCase().includes(text))
  );
}

export function CategoryChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = [{ id: "all", label: "All" }, ...TEMPLATE_CATEGORIES];
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
      {items.map((c) => (
        <Button
          key={c.id}
          type="button"
          size="xs"
          variant={value === c.id ? "secondary" : "ghost"}
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
          className={cn(value !== c.id && "text-muted-foreground")}
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}

export function SearchField({ value, onChange, label = "Search templates" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="relative w-full sm:w-56">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="h-8 pl-8 text-xs"
      />
    </div>
  );
}

function PickCard({ name, meta, html, onPick }: { name: string; meta: string; html: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Use the template ${name}`}
      className="group overflow-hidden rounded-lg border border-border bg-card text-left outline-none transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <TemplateThumb html={html} className="aspect-[4/5] border-b border-border" />
      <span className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium">{name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{meta}</span>
        </span>
        <span className="shrink-0 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Use
        </span>
      </span>
    </button>
  );
}

/**
 * A dialog to choose a template from the gallery or from the saved templates.
 * The saved templates load each time the dialog opens, so new ones show at once.
 */
export function TemplatePicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (t: PickedTemplate) => void;
}) {
  const [tab, setTab] = useState<"gallery" | "mine">("gallery");
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [saved, setSaved] = useState<{ templates: SavedTemplate[]; setupNeeded: boolean } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    listMyTemplates()
      .then((r) => {
        if (!live) return;
        setSaved(r);
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [open]);

  const gallery = useMemo(() => filterGallery(category, q).map((t) => ({ t, html: templateHtml(t) })), [category, q]);
  const mine = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (saved?.templates ?? [])
      .filter((t) => !text || t.name.toLowerCase().includes(text))
      .map((t) => ({ t, html: templateHtml(t) }));
  }, [saved, q]);

  function pick(t: PickedTemplate) {
    onPick(t);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The picker can be inside a form: its search field must not count as a change of that form. */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-3 sm:max-w-4xl" onChange={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Choose a template</DialogTitle>
          <DialogDescription>Start from a design. You can change the text, the pictures, and the colors after.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v === "mine" ? "mine" : "gallery")}>
            <TabsList className="h-8">
              <TabsTrigger value="gallery" className="px-3 text-xs">Gallery</TabsTrigger>
              <TabsTrigger value="mine" className="px-3 text-xs">
                My templates
                {saved && saved.templates.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">{saved.templates.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <SearchField value={q} onChange={setQ} />
        </div>
        {tab === "gallery" && <CategoryChips value={category} onChange={setCategory} />}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {tab === "gallery" ? (
            gallery.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">No template matches your search.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map(({ t, html }) => (
                  <PickCard key={t.id} name={t.name} meta={categoryLabel(t.category)} html={html} onPick={() => pick(pickGallery(t))} />
                ))}
              </div>
            )
          ) : failed ? (
            <p className="flex items-center justify-center gap-1.5 py-10 text-xs text-destructive">
              <AlertTriangle className="size-3.5" />
              Your templates could not be loaded. Close this window and try again.
            </p>
          ) : !saved ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy aria-label="Loading your templates">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
              ))}
            </div>
          ) : saved.setupNeeded ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              Saved templates need a database update. Run <code className="font-mono">npm run db:setup</code>, then try again.
            </p>
          ) : mine.length === 0 ? (
            <div className="space-y-2 py-10 text-center">
              <p className="text-xs font-medium">{saved.templates.length === 0 ? "You have no saved templates yet" : "No template matches your search"}</p>
              {saved.templates.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Use &ldquo;Save as template&rdquo; in a campaign, or customize a design in{" "}
                  <Link href="/templates" className="underline underline-offset-2">Templates</Link>.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {mine.map(({ t, html }) => (
                <PickCard
                  key={t.id}
                  name={t.name}
                  meta={t.design ? "Visual editor" : "HTML"}
                  html={html}
                  onPick={() => pick(pickSaved(t))}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
