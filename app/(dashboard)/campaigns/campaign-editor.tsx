"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, BookmarkPlus, Blocks, CheckCircle2, Code, FileCode2, Info, LayoutTemplate, Loader2, MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { useConfirm } from "@/components/confirm-dialog";
import { BlockEditor, type DesignChange } from "@/components/templates/block-editor";
import { SaveTemplateDialog } from "@/components/templates/save-template-dialog";
import { TemplatePicker, type PickedTemplate } from "@/components/templates/template-picker";
import { useDesignHistory } from "@/components/templates/use-design-history";
import { useActionForm } from "@/hooks/use-action-form";
import { blankDesign, renderDesign, type EmailDesign } from "@/lib/email-design";
import { formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveCampaign, type CampaignFormState } from "./actions";

export type EditorCampaign = {
  id: string; // empty for a new campaign
  name: string;
  subject: string;
  previewText: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  html: string;
  design: EmailDesign | null; // set: the content is made in the visual editor
  listIds: string[];
};

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";
const BLANK_HTML = "<p>Hi {{name}},</p>\n<p></p>";

function StartOption({ icon: Icon, title, text, onClick, primary }: {
  icon: typeof Blocks;
  title: string;
  text: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border p-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        primary ? "border-primary/50 hover:border-primary" : "border-border hover:border-foreground/30"
      )}
    >
      <span className={cn("flex size-8 items-center justify-center rounded-md", primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
        <Icon className="size-4" />
      </span>
      <span className="text-xs font-medium">{title}</span>
      <span className={hint}>{text}</span>
    </button>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Note({ tone, children }: { tone: "ok" | "warn" | "bad" | "info"; children: ReactNode }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "info" ? Info : AlertTriangle;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-[11px]",
        tone === "ok" && "text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "text-amber-700 dark:text-amber-400",
        tone === "bad" && "text-destructive",
        tone === "info" && "text-muted-foreground"
      )}
    >
      <Icon className="mt-px size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function CampaignEditor({
  campaign,
  lists,
  totalActive,
  domains,
  requireVerified,
}: {
  campaign: EditorCampaign;
  lists: { id: string; name: string; active: number }[];
  totalActive: number;
  domains: { domain: string; status: string }[];
  requireVerified: boolean;
}) {
  const router = useRouter();
  const [confirmDialog, confirm] = useConfirm();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Fields the preview and the hints need are controlled. The rest are plain form fields.
  const [subject, setSubject] = useState(campaign.subject);
  const [previewText, setPreviewText] = useState(campaign.previewText);
  const [fromName, setFromName] = useState(campaign.fromName);
  const [fromEmail, setFromEmail] = useState(campaign.fromEmail);
  // The content: a block design (visual editor), or HTML. "null" = not chosen yet (a new campaign).
  const history = useDesignHistory(campaign.design);
  const design = history.design;
  const [html, setHtml] = useState(campaign.design ? "" : campaign.html);
  const [mode, setMode] = useState<"design" | "html" | null>(campaign.design ? "design" : campaign.html.trim() ? "html" : null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveName, setSaveName] = useState<string | null>(null); // set = the "Save as template" window is open
  const [audience, setAudience] = useState(campaign.id && campaign.listIds.length > 0 ? "lists" : "all");
  const [chosen, setChosen] = useState<string[]>(campaign.listIds);
  const [dirty, setDirty] = useState(false);

  // Ask before the browser leaves the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const { state, pending, onSubmit } = useActionForm(async (prev: CampaignFormState, fd: FormData) => {
    const res = await saveCampaign(prev, fd);
    if (res?.error) toast.error(res.error);
    if (res?.id) {
      setDirty(false);
      if (res.intent === "review") {
        router.push(`/campaigns/${res.id}`);
      } else {
        toast.success(res.message);
        if (!campaign.id) router.replace(`/campaigns/${res.id}/edit`); // later saves update this draft
      }
    }
    return res;
  }, undefined);

  // The HTML that is sent, and the HTML of the preview (with click-to-select in the visual editor).
  const sendHtml = useMemo(() => (mode === "design" && design ? renderDesign(design) : html), [mode, design, html]);
  const previewHtml = useMemo(() => (mode === "design" && design ? renderDesign(design, { preview: true, selectable: true }) : html), [mode, design, html]);

  const changeDesign: DesignChange = (next, key) => {
    history.change(next, key);
    setDirty(true);
  };
  const editorHistory = {
    ...history,
    undo: () => {
      history.undo();
      setDirty(true);
    },
    redo: () => {
      history.redo();
      setDirty(true);
    },
  };

  function startWith(next: { design: EmailDesign | null; html: string }) {
    if (next.design) {
      // Already in the visual editor: Undo can bring back the old content.
      if (mode === "design") history.change(next.design);
      else history.reset(next.design);
      setMode("design");
    } else {
      history.reset(null);
      setHtml(next.html);
      setMode("html");
    }
    setSelected(null);
    setDirty(true);
  }

  function applyTemplate(t: PickedTemplate) {
    const apply = () => {
      startWith(t);
      // Fill the subject and the preview text only when they are empty: never replace what the person wrote.
      if (!subject.trim() && t.subject) setSubject(t.subject);
      if (!previewText.trim() && t.previewText) setPreviewText(t.previewText);
    };
    const hasContent = mode === "design" ? (design?.blocks.length ?? 0) > 0 : mode === "html" && html.trim() !== "" && html !== BLANK_HTML;
    if (!hasContent) return apply();
    confirm({
      title: "Replace the current content?",
      description:
        mode === "design" && t.design
          ? "The template replaces the content of this email. You can use Undo to get it back."
          : "The template replaces the content of this email. You cannot undo this.",
      confirmLabel: "Replace content",
      onConfirm: apply,
    });
  }

  function editAsHtml() {
    if (!design) return;
    confirm({
      title: "Edit this email as HTML?",
      description:
        "You can then change the HTML code by hand, but you cannot go back to the visual editor for this email. To keep a visual copy, save it as a template first.",
      confirmLabel: "Edit as HTML",
      onConfirm: () => startWith({ design: null, html: renderDesign(design) }),
    });
  }

  function insertTag(tag: string) {
    const el = contentRef.current;
    const start = el?.selectionStart ?? html.length;
    const end = el?.selectionEnd ?? start;
    setHtml(html.slice(0, start) + tag + html.slice(end));
    setDirty(true);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  // ----- sender domain hint -----
  const domain = fromEmail.includes("@") ? fromEmail.split("@")[1].trim().toLowerCase() : "";
  const known = domains.find((d) => d.domain === domain);
  const verified = domains.filter((d) => d.status === "verified");
  let domainNote: ReactNode = null;
  if (domain && known?.status === "verified") domainNote = <Note tone="ok">{domain} is verified.</Note>;
  else if (domain && known) {
    domainNote = (
      <Note tone={requireVerified ? "bad" : "warn"}>
        {domain} is not verified yet. Finish its DNS setup in{" "}
        <Link href={`/domains`} className="underline underline-offset-2">Domains</Link>.
      </Note>
    );
  } else if (domain) {
    domainNote = (
      <Note tone={requireVerified ? "bad" : "info"}>
        {requireVerified ? `Add and verify ${domain} in ` : `Verify ${domain} in `}
        <Link href="/domains" className="underline underline-offset-2">Domains</Link>
        {requireVerified ? " before you send." : " so that your emails reach the inbox."}
      </Note>
    );
  }

  const listReach = lists.filter((l) => chosen.includes(l.id)).reduce((n, l) => n + l.active, 0);

  return (
    <form onSubmit={onSubmit} onChange={() => setDirty(true)} className="grid gap-6 xl:grid-cols-2">
      {campaign.id && <input type="hidden" name="id" value={campaign.id} />}

      <div className="min-w-0 space-y-6">
        <Section id="details" title="Campaign name" description="Only you see this name. Subscribers see the subject.">
          <Input ref={nameRef} name="name" defaultValue={campaign.name} required maxLength={150} placeholder="October newsletter" aria-label="Campaign name" />
        </Section>

        <Section id="audience" title="To" description="Only active contacts get campaigns.">
          <RadioGroup
            name="audience"
            value={audience}
            onValueChange={(v) => {
              setAudience(v === "lists" ? "lists" : "all");
              setDirty(true);
            }}
            className="gap-2 sm:grid-cols-2"
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary">
              <RadioGroupItem value="all" className="mt-0.5" />
              <span>
                <span className={`block ${label}`}>All active contacts</span>
                <span className={`block ${hint}`}>{plural(totalActive, "contact")}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary">
              <RadioGroupItem value="lists" className="mt-0.5" />
              <span>
                <span className={`block ${label}`}>Specific lists</span>
                <span className={`block ${hint}`}>Choose one or more lists</span>
              </span>
            </label>
          </RadioGroup>

          {audience === "lists" &&
            (lists.length === 0 ? (
              <Note tone="warn">
                You have no lists yet. <Link href="/contacts/lists" className="underline underline-offset-2">Create a list</Link>, or send to all active contacts.
              </Note>
            ) : (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {lists.map((l) => (
                    <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-xs">
                      <Checkbox
                        name="listIds"
                        value={l.id}
                        checked={chosen.includes(l.id)}
                        onCheckedChange={(on) => {
                          setChosen(on ? [...chosen, l.id] : chosen.filter((x) => x !== l.id));
                          setDirty(true);
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <Badge variant="secondary" className="font-normal tabular-nums">
                        {formatNumber(l.active)}
                      </Badge>
                    </label>
                  ))}
                </div>
                <p className={hint}>
                  {chosen.length === 0
                    ? "Choose at least one list."
                    : `Up to ${plural(listReach, "active contact")}. A person in more than one list gets the email once.`}
                </p>
              </div>
            ))}
        </Section>

        <Section id="sender" title="From" description="Who the email comes from, and where replies go.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="fromName" className={label}>Sender name</label>
              <Input id="fromName" name="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} maxLength={100} placeholder="Acme Team" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fromEmail" className={label}>
                Sender email <span className="text-destructive">*</span>
              </label>
              <Input
                id="fromEmail"
                name="fromEmail"
                type="email"
                required
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="hello@mail.yourdomain.com"
              />
            </div>
          </div>
          {domainNote}
          {verified.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={hint}>Verified domains:</span>
              {verified.map((d) => (
                <Badge
                  key={d.domain}
                  variant="outline"
                  className="cursor-pointer font-normal hover:border-foreground/30"
                  render={
                    <button
                      type="button"
                      onClick={() => {
                        const local = fromEmail.split("@")[0]?.trim() || "hello";
                        setFromEmail(`${local}@${d.domain}`);
                        setDirty(true);
                      }}
                    />
                  }
                >
                  {d.domain}
                </Badge>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="replyTo" className={label}>Reply-to email</label>
            <Input id="replyTo" name="replyTo" type="email" defaultValue={campaign.replyTo} placeholder="Leave empty to use the sender email" />
            <p className={hint}>Replies from subscribers go to this address.</p>
          </div>
        </Section>

        <Section id="subject" title="Subject" description="The first thing people see in their inbox.">
          <div className="space-y-1.5">
            <label htmlFor="subjectLine" className={label}>
              Subject line <span className="text-destructive">*</span>
            </label>
            <Input id="subjectLine" name="subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Our biggest update this year" />
            <p className={cn(hint, subject.length > 60 && "text-amber-700 dark:text-amber-400")}>
              {subject.length} characters. Subjects under 60 characters show in full on most phones.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="previewText" className={label}>Preview text</label>
            <Input
              id="previewText"
              name="previewText"
              maxLength={200}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="A short summary that shows after the subject"
            />
            <p className={hint}>
              Most inboxes show it after the subject. 40 to 100 characters work best. You can use {"{{name}}"}.
            </p>
          </div>
        </Section>

        <Section
          id="content"
          title="Content"
          description={
            mode === "design"
              ? "Build the email from blocks. Click a block in the preview to change it."
              : mode === "html"
                ? "The body of the email, in HTML."
                : "Choose how you want to make this email."
          }
        >
          {mode === null ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <StartOption icon={LayoutTemplate} title="Choose a template" text="Start from a ready design in the gallery." onClick={() => setPickerOpen(true)} primary />
              <StartOption icon={Blocks} title="Design with blocks" text="Start empty. Add text, pictures, and buttons. No code." onClick={() => startWith({ design: blankDesign(), html: "" })} />
              <StartOption icon={FileCode2} title="Write HTML" text="Paste or write your own HTML code." onClick={() => startWith({ design: null, html: BLANK_HTML })} />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {mode === "design" ? <Blocks /> : <Code />}
                {mode === "design" ? "Visual editor" : "HTML"}
              </Badge>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {mode === "html" && (
                  <>
                    <span className={hint}>Insert:</span>
                    <Button type="button" variant="outline" size="xs" onClick={() => insertTag("{{name}}")}>
                      Name
                    </Button>
                    <Button type="button" variant="outline" size="xs" onClick={() => insertTag("{{email}}")}>
                      Email
                    </Button>
                  </>
                )}
                <Button type="button" variant="outline" size="xs" onClick={() => setPickerOpen(true)}>
                  <LayoutTemplate />
                  Change template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={!sendHtml.trim()}
                  onClick={() => setSaveName(nameRef.current?.value.trim() || subject.trim() || "My template")}
                >
                  <BookmarkPlus />
                  Save as template
                </Button>
                {mode === "design" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-xs" aria-label="More content actions" />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={editAsHtml}>
                        <Code />
                        Edit as HTML
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}

          {mode === "design" && design && (
            // Enter in a block field must not submit the campaign form.
            <div onKeyDown={(e) => e.key === "Enter" && e.target instanceof HTMLInputElement && e.preventDefault()}>
              <BlockEditor design={design} onChange={changeDesign} selected={selected} onSelect={setSelected} history={editorHistory} />
              <input type="hidden" name="design" value={JSON.stringify(design)} />
              <input type="hidden" name="html" value={sendHtml} />
            </div>
          )}

          {mode === "html" && (
            <>
              <Textarea
                ref={contentRef}
                name="html"
                required
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={18}
                maxLength={60000}
                spellCheck={false}
                placeholder="<p>Hi {{name}},</p>"
                className="font-mono text-xs leading-relaxed"
                aria-label="Email content (HTML)"
              />
              <p className={hint}>
                {formatNumber(html.length)} of 60,000 characters. {"{{name}}"} becomes the contact&apos;s name (or
                &ldquo;friend&rdquo;). Mailflow adds the unsubscribe link and tracks opens and clicks.
              </p>
            </>
          )}
          {mode === "design" && (
            <p className={hint}>
              {"{{name}}"} becomes the contact&apos;s name (or &ldquo;friend&rdquo;). Mailflow adds the unsubscribe link and
              tracks opens and clicks.
            </p>
          )}
        </Section>
      </div>

      <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
        <EmailPreview
          html={previewHtml}
          subject={subject}
          previewText={previewText}
          fromName={fromName}
          fromEmail={fromEmail}
          selectedBlock={mode === "design" ? selected : undefined}
          onSelectBlock={mode === "design" ? setSelected : undefined}
        />
      </div>

      {/* ----- save bar ----- */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 xl:col-span-2">
        {state?.error && (
          <p role="alert" className="mb-2 rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {dirty ? "You have unsaved changes." : campaign.id ? "All changes are saved." : "This draft is not saved yet."}
          </span>
          <div className="flex gap-2">
            <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
              Save draft
            </Button>
            <Button type="submit" name="intent" value="review" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save and review
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
      {confirmDialog}
      <TemplatePicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={applyTemplate} />
      <SaveTemplateDialog
        open={saveName !== null}
        onOpenChange={(open) => !open && setSaveName(null)}
        defaultName={saveName ?? ""}
        content={() => ({ design: mode === "design" ? design : null, html: sendHtml })}
      />
    </form>
  );
}
