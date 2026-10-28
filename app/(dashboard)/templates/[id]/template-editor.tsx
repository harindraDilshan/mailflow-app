"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Code, Copy, Loader2, MoreHorizontal, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { useConfirm } from "@/components/confirm-dialog";
import { runAction } from "@/components/run-action";
import { BlockEditor } from "@/components/templates/block-editor";
import { useDesignHistory } from "@/components/templates/use-design-history";
import { renderDesign } from "@/lib/email-design";
import { formatNumber } from "@/lib/format";
import type { SavedTemplate } from "@/lib/templates";
import { deleteTemplate, duplicateTemplate, saveTemplate } from "../actions";

const hint = "text-[11px] text-muted-foreground";

export function TemplateEditor({ template }: { template: SavedTemplate }) {
  const router = useRouter();
  const [confirmDialog, confirm] = useConfirm();
  const [pending, startTransition] = useTransition();
  const history = useDesignHistory(template.design);
  const design = history.design;
  const [name, setName] = useState(template.name);
  const [html, setHtml] = useState(template.html);
  const [selected, setSelected] = useState<string | null>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  // Unsaved changes = the content is not the same as the last saved content (undo can make it the same again).
  const snapshot = JSON.stringify({ name: name.trim(), design, html: design ? "" : html });
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;

  const previewHtml = useMemo(() => (design ? renderDesign(design, { preview: true, selectable: true }) : html), [design, html]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!name.trim()) {
      toast.error("Give the template a name.");
      return false;
    }
    const sent = snapshot;
    const res = await runAction(saveTemplate, {
      id: template.id,
      name,
      design: design ? JSON.stringify(design) : "",
      html: design ? "" : html,
    });
    if (res?.ok) setSaved(sent);
    return Boolean(res?.ok);
  }

  // Ctrl+S (or Cmd+S) saves.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        startTransition(async () => {
          await saveRef.current();
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openInCampaign() {
    startTransition(async () => {
      if (dirty && !(await save())) return;
      router.push(`/campaigns/new?template=${template.id}`);
    });
  }

  function insertTag(tag: string) {
    const el = htmlRef.current;
    const start = el?.selectionStart ?? html.length;
    const end = el?.selectionEnd ?? start;
    setHtml(html.slice(0, start) + tag + html.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  function toHtml() {
    if (!design) return;
    confirm({
      title: "Change this template to HTML?",
      description:
        "You can then edit the HTML code by hand, but you cannot open this template in the visual editor again. To keep a visual copy, duplicate the template first.",
      confirmLabel: "Change to HTML",
      onConfirm: () => {
        setHtml(renderDesign(design));
        history.reset(null);
        setSelected(null);
      },
    });
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/templates?tab=mine" />}>
        <ArrowLeft />
        Templates
      </Button>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            aria-label="Template name"
            placeholder="Template name"
            className="h-9 max-w-md border-transparent bg-transparent px-2 text-lg font-semibold shadow-none hover:border-input focus-visible:border-ring dark:bg-transparent"
          />
          <Badge variant="secondary" className="shrink-0 font-normal">
            {design ? "Visual editor" : "HTML"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-xs text-muted-foreground sm:w-auto" aria-live="polite">
            {dirty ? "Unsaved changes" : "All changes are saved"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={async () => {
                  const res = await runAction(duplicateTemplate, { id: template.id });
                  if (res?.ok && res.id) router.push(`/templates/${res.id}`);
                }}
              >
                <Copy />
                Duplicate
              </DropdownMenuItem>
              {design && (
                <DropdownMenuItem onClick={toHtml}>
                  <Code />
                  Change to HTML
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  confirm({
                    title: `Delete "${template.name}"?`,
                    description: "The template is deleted. Campaigns that use it do not change. You cannot undo this.",
                    confirmLabel: "Delete template",
                    destructive: true,
                    onConfirm: async () => {
                      const res = await runAction(deleteTemplate, { id: template.id });
                      if (res?.ok) {
                        setSaved(snapshot); // no "unsaved changes" warning on the way out
                        router.push("/templates?tab=mine");
                      }
                    },
                  })
                }
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={openInCampaign} disabled={pending}>
            <Send />
            Use in campaign
          </Button>
          <Button size="sm" onClick={() => startTransition(async () => void (await save()))} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardContent className="space-y-3">
            {design ? (
              <BlockEditor design={design} onChange={history.change} selected={selected} onSelect={setSelected} history={history} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium">HTML</span>
                  <span className={`ml-auto ${hint}`}>Insert:</span>
                  <Button type="button" variant="outline" size="xs" onClick={() => insertTag("{{name}}")}>Name</Button>
                  <Button type="button" variant="outline" size="xs" onClick={() => insertTag("{{email}}")}>Email</Button>
                </div>
                <Textarea
                  ref={htmlRef}
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={24}
                  maxLength={60000}
                  spellCheck={false}
                  className="font-mono text-xs leading-relaxed"
                  aria-label="Template HTML"
                />
                <p className={hint}>
                  {formatNumber(html.length)} of 60,000 characters. Use tables and inline styles: many email apps ignore
                  modern CSS. {"{{name}}"} becomes the name of the contact.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <EmailPreview
            html={previewHtml}
            subject="The subject of your campaign"
            selectedBlock={design ? selected : undefined}
            onSelectBlock={design ? setSelected : undefined}
          />
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
