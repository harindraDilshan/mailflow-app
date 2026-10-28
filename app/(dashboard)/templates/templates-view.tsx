"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Blocks, ChevronDown, Code, Copy, Eye, LayoutTemplate, Loader2, MoreHorizontal, Pencil, Plus, Send, Trash2, Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { useConfirm } from "@/components/confirm-dialog";
import { LocalTime } from "@/components/local-time";
import { runAction } from "@/components/run-action";
import { CategoryChips, SearchField, filterGallery } from "@/components/templates/template-picker";
import { TemplateThumb, templateHtml } from "@/components/templates/template-thumb";
import { categoryLabel, type GalleryTemplate } from "@/lib/template-gallery";
import type { SavedTemplate } from "@/lib/templates";
import { createTemplate, deleteTemplate, duplicateTemplate } from "./actions";

type Tab = "gallery" | "mine";

/** "New template": blocks or HTML. Creates the template and opens the editor. */
export function NewTemplateMenu({ variant = "default" }: { variant?: "default" | "outline" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const create = (kind: "blank" | "html") =>
    startTransition(async () => {
      const res = await runAction(createTemplate, { kind });
      if (res?.ok && res.id) router.push(`/templates/${res.id}`);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant={variant} disabled={pending} />}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        New template
        <ChevronDown className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onClick={() => create("blank")} className="items-start gap-2.5 py-2">
          <Blocks className="mt-0.5" />
          <span className="flex flex-col">
            <span className="text-xs font-medium">Design with blocks</span>
            <span className="text-[11px] text-muted-foreground">Add text, pictures, and buttons in the visual editor. No code.</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => create("html")} className="items-start gap-2.5 py-2">
          <Code className="mt-0.5" />
          <span className="flex flex-col">
            <span className="text-xs font-medium">Write HTML</span>
            <span className="text-[11px] text-muted-foreground">Paste or write your own HTML code.</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The template in the preview window. The buttons are made at render time, so they show the current state.
type PreviewItem = { kind: "gallery"; t: GalleryTemplate; html: string } | { kind: "saved"; t: SavedTemplate; html: string };

function TemplateCard({
  name, badge, meta, html, onPreview, children,
}: {
  name: string;
  badge: string;
  meta: ReactNode;
  html: string;
  onPreview: () => void;
  children: ReactNode;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${name}`}
        className="relative block outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <TemplateThumb html={html} className="aspect-[4/5]" />
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/5">
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Eye className="size-3.5" />
            Preview
          </span>
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-2 border-t border-border p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-medium" title={name}>{name}</h3>
          <Badge variant="outline" className="shrink-0 font-normal">{badge}</Badge>
        </div>
        <div className="flex-1 text-xs text-muted-foreground">{meta}</div>
        <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>
      </div>
    </div>
  );
}

export function TemplatesView({ initialTab, saved, setupNeeded }: { initialTab: Tab; saved: SavedTemplate[]; setupNeeded: boolean }) {
  const router = useRouter();
  const [confirmDialog, confirm] = useConfirm();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // the card that waits for an action
  const [, startTransition] = useTransition();

  function changeTab(next: Tab) {
    setTab(next);
    // Keep the tab in the address, so "back" from the editor comes to the same tab.
    const url = new URL(window.location.href);
    if (next === "mine") url.searchParams.set("tab", "mine");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  }

  const gallery = useMemo(() => filterGallery(category, q).map((t) => ({ t, html: templateHtml(t) })), [category, q]);
  const mine = useMemo(() => {
    const text = q.trim().toLowerCase();
    return saved.filter((t) => !text || t.name.toLowerCase().includes(text)).map((t) => ({ t, html: templateHtml(t) }));
  }, [saved, q]);

  function customize(t: GalleryTemplate) {
    setBusy(t.id);
    startTransition(async () => {
      const res = await runAction(createTemplate, { kind: "gallery", galleryId: t.id });
      if (res?.ok && res.id) router.push(`/templates/${res.id}`);
      else setBusy(null);
    });
  }

  function duplicate(t: SavedTemplate) {
    setBusy(t.id);
    startTransition(async () => {
      await runAction(duplicateTemplate, { id: t.id });
      setBusy(null);
      router.refresh();
    });
  }

  function remove(t: SavedTemplate) {
    confirm({
      title: `Delete "${t.name}"?`,
      description: "The template is deleted. Campaigns that use it do not change. You cannot undo this.",
      confirmLabel: "Delete template",
      destructive: true,
      onConfirm: async () => {
        const res = await runAction(deleteTemplate, { id: t.id });
        if (res?.ok) router.refresh();
      },
    });
  }

  // In a card the buttons share the width, and go on two lines when the card is narrow.
  const galleryActions = (t: GalleryTemplate, inCard = true) => (
    <>
      <Button size="sm" className={inCard ? "flex-1" : undefined} render={<Link href={`/campaigns/new?gallery=${t.id}`} />}>
        <Send />
        Use in campaign
      </Button>
      <Button size="sm" variant="outline" className={inCard ? "flex-1" : undefined} disabled={busy === t.id} onClick={() => customize(t)}>
        {busy === t.id ? <Loader2 className="animate-spin" /> : <Wand2 />}
        Customize
      </Button>
    </>
  );

  const savedActions = (t: SavedTemplate, inCard = true) => (
    <>
      <Button size="sm" className={inCard ? "flex-1" : undefined} render={<Link href={`/campaigns/new?template=${t.id}`} />}>
        <Send />
        Use in campaign
      </Button>
      <Button size="sm" variant="outline" render={<Link href={`/templates/${t.id}`} />}>
        <Pencil />
        Edit
      </Button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => changeTab(v === "mine" ? "mine" : "gallery")}>
          <TabsList>
            <TabsTrigger value="gallery" className="px-3 text-xs">
              <LayoutTemplate />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="mine" className="px-3 text-xs">
              My templates
              {saved.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">{saved.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchField value={q} onChange={setQ} />
      </div>

      {tab === "gallery" ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CategoryChips value={category} onChange={setCategory} />
            <p className="text-[11px] text-muted-foreground">
              &ldquo;Customize&rdquo; saves a copy in My templates, so you can use it many times.
            </p>
          </div>
          {gallery.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
              No template matches your search.
            </p>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
              {gallery.map(({ t, html }) => (
                <TemplateCard
                  key={t.id}
                  name={t.name}
                  badge={categoryLabel(t.category)}
                  meta={<p className="line-clamp-2">{t.description}</p>}
                  html={html}
                  onPreview={() => setPreview({ kind: "gallery", t, html })}
                >
                  {galleryActions(t)}
                </TemplateCard>
              ))}
            </div>
          )}
        </>
      ) : setupNeeded ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs">
          <p className="font-medium text-foreground">Saved templates need a database update</p>
          <p className="mt-1 text-muted-foreground">
            Run <code className="font-mono">npm run db:setup</code>, then reload this page. The gallery works without it.
          </p>
        </div>
      ) : saved.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted">
            <LayoutTemplate className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">No saved templates yet</h3>
            <p className="max-w-sm text-xs text-muted-foreground">
              Customize a design from the gallery, start a new template, or use &ldquo;Save as template&rdquo; in a campaign.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => changeTab("gallery")}>
              <LayoutTemplate />
              Browse the gallery
            </Button>
            <NewTemplateMenu />
          </div>
        </div>
      ) : mine.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
          No template matches your search.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
          {mine.map(({ t, html }) => (
            <TemplateCard
              key={t.id}
              name={t.name}
              badge={t.design ? "Visual" : "HTML"}
              meta={
                <span>
                  Changed <LocalTime iso={t.updatedAt} dateOnly />
                </span>
              }
              html={html}
              onPreview={() => setPreview({ kind: "saved", t, html })}
            >
              {savedActions(t)}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${t.name}`} disabled={busy === t.id} />}
                >
                  {busy === t.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => duplicate(t)}>
                    <Copy />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => remove(t)}>
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TemplateCard>
          ))}
        </div>
      )}

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-3xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.t.name}</DialogTitle>
                <DialogDescription>
                  {preview.kind === "gallery"
                    ? preview.t.description
                    : preview.t.design
                      ? "Made in the visual editor."
                      : "Made with HTML."}
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <EmailPreview
                  html={preview.html}
                  subject={preview.kind === "gallery" ? preview.t.subject : "The subject of your campaign"}
                  previewText={preview.kind === "gallery" ? preview.t.previewText : ""}
                  fromName="Your company"
                />
              </div>
              <DialogFooter className="sm:justify-end">
                {preview.kind === "gallery" ? galleryActions(preview.t, false) : savedActions(preview.t, false)}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
