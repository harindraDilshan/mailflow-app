"use client";

import { useRef, useState, type ReactNode } from "react";
import { AlertCircle, BookmarkPlus, CheckCircle2, Eye, Info, LayoutTemplate, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { useConfirm } from "@/components/confirm-dialog";
import { SaveTemplateDialog } from "@/components/templates/save-template-dialog";
import { TemplatePicker, type PickedTemplate } from "@/components/templates/template-picker";
import { renderDesign } from "@/lib/email-design";
import { MAX_WAIT_DAYS, type FlowIssue, type FlowNode } from "@/lib/automation-flow";
import type { NodeStats } from "@/lib/automations";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STEP_LOOK, stepTitle } from "./step-meta";

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";

export type Settings = { name: string; fromName: string; fromEmail: string };
type Option = { value: string; label: string };

function Field({ id, title, children, note }: { id?: string; title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={label}>
        {title}
      </label>
      {children}
      {note && <p className={hint}>{note}</p>}
    </div>
  );
}

function Choice({
  value,
  items,
  onChange,
  disabled,
  placeholder,
  ariaLabel,
}: {
  value: string;
  items: Option[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <Select items={items} value={value || null} onValueChange={(v) => onChange(String(v ?? ""))} disabled={disabled}>
      <SelectTrigger className="w-full text-xs" aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value} className="text-xs">
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// One tag: lower case, no commas (the server cleans it again).
const tagValue = (v: string) => v.toLowerCase().replace(/,/g, "").slice(0, 50);

// ---------- one step ----------
export function StepInspector({
  step,
  readOnly,
  lists,
  emailSteps,
  problems,
  stats,
  sender,
  onChange,
  onDelete,
}: {
  step: FlowNode;
  readOnly: boolean;
  lists: Option[];
  emailSteps: Option[];
  problems: string[];
  stats?: NodeStats;
  sender: { fromName: string; fromEmail: string };
  onChange: (data: FlowNode["data"]) => void;
  onDelete: () => void;
}) {
  const look = STEP_LOOK[step.type];
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmDialog, confirm] = useConfirm();
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  // An automation email is HTML: a design from the visual editor becomes its HTML here.
  function applyTemplate(t: PickedTemplate) {
    if (step.type !== "email") return;
    const d = step.data;
    const apply = () =>
      onChange({
        ...d,
        html: t.design ? renderDesign(t.design) : t.html,
        subject: d.subject.trim() ? d.subject : t.subject,
        previewText: d.previewText.trim() ? d.previewText : t.previewText,
      });
    if (!d.html.trim()) return apply();
    confirm({
      title: "Replace the content of this email?",
      description: "The template replaces the HTML of this step. You cannot undo this.",
      confirmLabel: "Replace content",
      onConfirm: apply,
    });
  }

  function insertTag(tag: string) {
    if (step.type !== "email") return;
    const el = htmlRef.current;
    const html = step.data.html;
    const start = el?.selectionStart ?? html.length;
    const end = el?.selectionEnd ?? start;
    onChange({ ...step.data, html: html.slice(0, start) + tag + html.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  let form: ReactNode = null;
  switch (step.type) {
    case "trigger": {
      const d = step.data;
      form = (
        <>
          <Field title="Start when">
            <Choice
              ariaLabel="Trigger"
              value={d.triggerType}
              disabled={readOnly}
              items={[
                { value: "list_joined", label: "Someone joins a list" },
                { value: "tag_added", label: "A tag is added to someone" },
              ]}
              onChange={(v) => onChange({ ...d, triggerType: v === "tag_added" ? "tag_added" : "list_joined", triggerValue: "" })}
            />
          </Field>
          {d.triggerType === "list_joined" ? (
            <Field title="List">
              <Choice ariaLabel="List" value={d.triggerValue} items={lists} disabled={readOnly} placeholder="Choose a list" onChange={(v) => onChange({ ...d, triggerValue: v })} />
            </Field>
          ) : (
            <Field id="trigger-tag" title="Tag" note="One tag, like vip or customer.">
              <Input id="trigger-tag" value={d.triggerValue} disabled={readOnly} placeholder="vip" onChange={(e) => onChange({ ...d, triggerValue: tagValue(e.target.value) })} />
            </Field>
          )}
          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border p-2.5">
            <span>
              <span className={`block ${label}`}>
                {d.triggerType === "list_joined" ? "Stop when they leave the list" : "Stop when the tag is removed"}
              </span>
              <span className={`block ${hint}`}>Checked before every step.</span>
            </span>
            <Switch checked={d.exitOnLeave} disabled={readOnly} onCheckedChange={(on) => onChange({ ...d, exitOnLeave: on })} />
          </label>
          <p className={hint}>
            Only people who join after you turn the automation on enter it. Each person enters an automation once.
          </p>
        </>
      );
      break;
    }
    case "email": {
      const d = step.data;
      form = (
        <>
          <Field id="email-subject" title="Subject line">
            <Input id="email-subject" value={d.subject} disabled={readOnly} maxLength={200} placeholder="Welcome to the club" onChange={(e) => onChange({ ...d, subject: e.target.value })} />
          </Field>
          <Field id="email-preview" title="Preview text" note="Shows after the subject in most inboxes.">
            <Input id="email-preview" value={d.previewText} disabled={readOnly} maxLength={200} onChange={(e) => onChange({ ...d, previewText: e.target.value })} />
          </Field>
          <Field id="email-html" title="Content (HTML)">
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="outline" size="xs" onClick={() => setPickerOpen(true)}>
                  <LayoutTemplate />
                  Choose a template
                </Button>
                <Button type="button" variant="outline" size="xs" onClick={() => insertTag("{{name}}")}>Name</Button>
                <Button type="button" variant="outline" size="xs" onClick={() => insertTag("{{email}}")}>Email</Button>
              </div>
            )}
            <Textarea
              id="email-html"
              ref={htmlRef}
              value={d.html}
              disabled={readOnly}
              rows={12}
              spellCheck={false}
              className="font-mono text-[11px] leading-relaxed"
              onChange={(e) => onChange({ ...d, html: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye />
              Preview
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen(true)} disabled={!d.html.trim()}>
              <BookmarkPlus />
              Save as template
            </Button>
          </div>
          <TemplatePicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={applyTemplate} />
          <SaveTemplateDialog
            open={saveOpen}
            onOpenChange={setSaveOpen}
            defaultName={d.subject.trim() || "Automation email"}
            content={() => ({ design: null, html: d.html })}
          />
          {confirmDialog}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Email preview</DialogTitle>
                <DialogDescription>{d.subject || "No subject yet"}</DialogDescription>
              </DialogHeader>
              <EmailPreview html={d.html} subject={d.subject} previewText={d.previewText} fromName={sender.fromName} fromEmail={sender.fromEmail} />
            </DialogContent>
          </Dialog>
        </>
      );
      break;
    }
    case "wait": {
      const d = step.data;
      form = (
        <Field title="Wait for" note={`At most ${MAX_WAIT_DAYS} days. The person stays on this step until then.`}>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={d.amount || ""}
              disabled={readOnly}
              aria-label="Amount"
              className="w-24"
              onChange={(e) => onChange({ ...d, amount: Math.floor(Number(e.target.value)) || 0 })}
            />
            <Choice
              ariaLabel="Unit"
              value={d.unit}
              disabled={readOnly}
              items={[
                { value: "minutes", label: "minutes" },
                { value: "hours", label: "hours" },
                { value: "days", label: "days" },
              ]}
              onChange={(v) => onChange({ ...d, unit: v === "minutes" || v === "hours" ? v : "days" })}
            />
          </div>
        </Field>
      );
      break;
    }
    case "condition": {
      const d = step.data;
      form = (
        <>
          <Field title="Check if the person">
            <Choice
              ariaLabel="Condition"
              value={d.kind}
              disabled={readOnly}
              items={[
                { value: "opened", label: "Opened an email" },
                { value: "clicked", label: "Clicked a link in an email" },
                { value: "has_tag", label: "Has a tag" },
                { value: "in_list", label: "Is in a list" },
              ]}
              onChange={(v) => onChange({ kind: v as typeof d.kind, value: "" })}
            />
          </Field>
          {(d.kind === "opened" || d.kind === "clicked") && (
            <Field title="Email" note="Add a wait before this step, so that people have time to open the email.">
              <Choice ariaLabel="Email" value={d.value} items={emailSteps} disabled={readOnly} placeholder="Choose an email step" onChange={(v) => onChange({ ...d, value: v })} />
            </Field>
          )}
          {d.kind === "has_tag" && (
            <Field id="condition-tag" title="Tag">
              <Input id="condition-tag" value={d.value} disabled={readOnly} placeholder="vip" onChange={(e) => onChange({ ...d, value: tagValue(e.target.value) })} />
            </Field>
          )}
          {d.kind === "in_list" && (
            <Field title="List">
              <Choice ariaLabel="List" value={d.value} items={lists} disabled={readOnly} placeholder="Choose a list" onChange={(v) => onChange({ ...d, value: v })} />
            </Field>
          )}
          <p className={hint}>
            People who match go down the <b className="text-emerald-600 dark:text-emerald-400">Yes</b> path. The others go
            down the <b className="text-rose-600 dark:text-rose-400">No</b> path. A path with no step ends the automation.
          </p>
        </>
      );
      break;
    }
    case "split": {
      const d = step.data;
      form = (
        <Field title="How to split people" note="Each person gets one path at random, and always the same one.">
          <Slider
            min={1}
            max={99}
            value={[d.percentA]}
            disabled={readOnly}
            onValueChange={(v) => onChange({ percentA: Array.isArray(v) ? Number(v[0]) : Number(v) })}
            aria-label="Share of path A"
          />
          <div className="flex justify-between text-xs tabular-nums">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">A: {d.percentA}%</span>
            <span className="font-medium text-rose-600 dark:text-rose-400">B: {100 - d.percentA}%</span>
          </div>
        </Field>
      );
      break;
    }
    case "action": {
      const d = step.data;
      const isTag = d.kind.endsWith("_tag");
      form = (
        <>
          <Field title="Change">
            <Choice
              ariaLabel="Action"
              value={d.kind}
              disabled={readOnly}
              items={[
                { value: "add_tag", label: "Add a tag" },
                { value: "remove_tag", label: "Remove a tag" },
                { value: "add_list", label: "Add to a list" },
                { value: "remove_list", label: "Remove from a list" },
              ]}
              onChange={(v) => onChange({ kind: v as typeof d.kind, value: "" })}
            />
          </Field>
          {isTag ? (
            <Field id="action-tag" title="Tag">
              <Input id="action-tag" value={d.value} disabled={readOnly} placeholder="hot-lead" onChange={(e) => onChange({ ...d, value: tagValue(e.target.value) })} />
            </Field>
          ) : (
            <Field title="List">
              <Choice ariaLabel="List" value={d.value} items={lists} disabled={readOnly} placeholder="Choose a list" onChange={(v) => onChange({ ...d, value: v })} />
            </Field>
          )}
          {(d.kind === "add_tag" || d.kind === "add_list") && (
            <p className={hint}>This can start other automations that use this {isTag ? "tag" : "list"} as their trigger.</p>
          )}
        </>
      );
      break;
    }
    case "exit":
      form = <p className={hint}>The person leaves the automation here. Steps after an exit never run.</p>;
      break;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-md", look.tint)}>
          <look.icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium">{stepTitle(step)}</div>
          <div className={hint}>Step settings</div>
        </div>
      </div>

      {problems.map((p) => (
        <p key={p} className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {p}
        </p>
      ))}

      {stats && (stats.waiting > 0 || stats.sent !== undefined) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border p-2">
            <div className={hint}>Here now</div>
            <div className="font-medium tabular-nums">{formatNumber(stats.waiting)}</div>
          </div>
          {stats.sent !== undefined && (
            <div className="rounded-md border border-border p-2">
              <div className={hint}>Sent · opened · clicked</div>
              <div className="font-medium tabular-nums">
                {formatNumber(stats.sent)} · {formatNumber(stats.opened ?? 0)} · {formatNumber(stats.clicked ?? 0)}
              </div>
            </div>
          )}
        </div>
      )}

      {form}

      {step.type !== "trigger" && !readOnly && (
        <Button type="button" variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 />
          Delete step
        </Button>
      )}
    </div>
  );
}

// ---------- nothing selected: the automation itself ----------
export function AutomationSettings({
  settings,
  readOnly,
  issues,
  domainNote,
  onChange,
  onPick,
}: {
  settings: Settings;
  readOnly: boolean;
  issues: FlowIssue[];
  domainNote: string | null;
  onChange: (patch: Partial<Settings>) => void;
  onPick: (nodeId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">Automation settings</div>
        <div className={hint}>Select a step on the canvas to change it.</div>
      </div>
      <Field id="auto-name" title="Name">
        <Input id="auto-name" value={settings.name} disabled={readOnly} maxLength={150} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>
      <Field id="auto-from-name" title="Sender name">
        <Input id="auto-from-name" value={settings.fromName} disabled={readOnly} maxLength={100} placeholder="Acme Team" onChange={(e) => onChange({ fromName: e.target.value })} />
      </Field>
      <Field id="auto-from-email" title="Sender email" note={domainNote ?? "All emails of this automation come from this address."}>
        <Input id="auto-from-email" type="email" value={settings.fromEmail} disabled={readOnly} placeholder="hello@mail.yourdomain.com" onChange={(e) => onChange({ fromEmail: e.target.value })} />
      </Field>

      <div className="space-y-2 border-t border-border pt-4">
        <div className={label}>Before you turn it on</div>
        {issues.length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Everything is ready.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {issues.map((i, n) => (
              <li key={`${i.nodeId}-${n}`}>
                <button
                  type="button"
                  disabled={!i.nodeId}
                  onClick={() => i.nodeId && onPick(i.nodeId)}
                  className="flex w-full items-start gap-1.5 rounded-md p-1 text-left text-xs text-destructive enabled:hover:bg-destructive/10"
                >
                  <AlertCircle className="mt-px size-3.5 shrink-0" />
                  {i.message}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Info className="size-3.5" />
          How to build
        </p>
        <p>Drag a step from the step list onto the canvas, or click it to add it after the selected step. On a small screen, use Add step.</p>
        <p>Drag from the dot at the bottom of a step to the top of the next step to connect them.</p>
        <p>Select a step or a connection and press Delete to remove it.</p>
      </div>
    </div>
  );
}
