"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, Code2, Download, ExternalLink, Link2, Loader2, Mail, Paintbrush, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/copy-button";
import { CodeBlock } from "@/components/docs/code-block";
import { FormMessage } from "@/components/auth/form-message";
import { SignupPreview } from "@/components/forms/signup-card";
import { useActionForm } from "@/hooks/use-action-form";
import { runAction } from "@/components/run-action";
import { buildEmbedSnippet } from "@/lib/embed";
import { DEFAULT_COLOR, DEFAULT_SUCCESS, designOf, type FormDesign, type NameField } from "@/lib/forms";
import { saveDesign, saveSender, setHostedPage, setupWebsiteForm, type FormState } from "./actions";

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";

function useToastForm(action: (s: FormState, fd: FormData) => Promise<FormState>) {
  return useActionForm<FormState>(async (prev, fd) => {
    const res = await action(prev, fd);
    if (res?.message) toast.success(res.message);
    return res;
  }, undefined);
}

function Save({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

// ---------- the tabs ----------
export type FormTab = "design" | "share" | "embed" | "api" | "email";

export function FormTabs({ initial, panels }: { initial: FormTab; panels: Record<FormTab, ReactNode> }) {
  const tabs: { value: FormTab; label: string; icon: ReactNode }[] = [
    { value: "design", label: "Design", icon: <Paintbrush /> },
    { value: "share", label: "Share a link", icon: <Link2 /> },
    { value: "embed", label: "Embed on website", icon: <Code2 /> },
    { value: "api", label: "API", icon: <Terminal /> },
    { value: "email", label: "Confirmation email", icon: <Mail /> },
  ];
  return (
    <Tabs defaultValue={initial}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList variant="line">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-none px-2 text-xs">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((t) => (
        // keepMounted: unsaved changes in one tab survive a look at another tab.
        <TabsContent key={t.value} value={t.value} keepMounted className="pt-4">
          {panels[t.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ---------- design ----------
type ListValues = {
  id: string;
  name: string;
  pageTitle: string;
  pageText: string;
  formButton: string;
  formNameField: string;
  formSuccess: string;
  formColor: string;
};

const NAME_ITEMS = [
  { value: "optional", label: "Ask for the name (optional)" },
  { value: "required", label: "Ask for the name (required)" },
  { value: "off", label: "Do not ask for the name" },
];

export function DesignPanel({ list }: { list: ListValues }) {
  const [v, setV] = useState(list);
  const set = (patch: Partial<ListValues>) => setV((cur) => ({ ...cur, ...patch }));
  const design = designOf(v);
  const { state, pending, onSubmit } = useToastForm(saveDesign);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="listId" value={list.id} />
        <div className="space-y-1.5">
          <label htmlFor="pageTitle" className={label}>Title</label>
          <Input id="pageTitle" name="pageTitle" maxLength={120} value={v.pageTitle} placeholder={list.name} onChange={(e) => set({ pageTitle: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pageText" className={label}>Short text</label>
          <Textarea id="pageText" name="pageText" rows={3} maxLength={500} value={v.pageText} placeholder="One email a week with our best tips. Unsubscribe at any time." onChange={(e) => set({ pageText: e.target.value })} />
          <p className={hint}>Tell people what they get and how often. Clear promises get more sign-ups.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="formButton" className={label}>Button text</label>
            <Input id="formButton" name="formButton" maxLength={40} value={v.formButton} placeholder="Subscribe" onChange={(e) => set({ formButton: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="formColor" className={label}>Button color</label>
            <div className="flex items-center gap-2">
              <input
                id="formColor"
                type="color"
                value={design.color}
                onChange={(e) => set({ formColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                aria-label="Pick the button color"
              />
              <Input name="formColor" value={v.formColor || DEFAULT_COLOR} maxLength={7} onChange={(e) => set({ formColor: e.target.value })} className="font-mono" aria-label="Button color as #rrggbb" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className={label}>Name field</span>
          <Select name="formNameField" items={NAME_ITEMS} value={design.nameField} onValueChange={(x) => set({ formNameField: String(x) as NameField })}>
            <SelectTrigger className="w-full" aria-label="Name field">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NAME_ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className={hint}>Fewer fields get more sign-ups. Ask for the name only if you use it in your emails.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="formSuccess" className={label}>Message after sign-up</label>
          <Textarea id="formSuccess" name="formSuccess" rows={2} maxLength={300} value={v.formSuccess} placeholder={DEFAULT_SUCCESS} onChange={(e) => set({ formSuccess: e.target.value })} />
        </div>
        {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
        <Save pending={pending}>Save design</Save>
      </form>

      <div className="space-y-2">
        <span className={label}>Preview</span>
        <div className="flex justify-center rounded-xl border border-border bg-zinc-100 p-6 dark:bg-zinc-900">
          <SignupPreview design={design} />
        </div>
        <p className={hint}>The hosted page and the embed code use this design.</p>
      </div>
    </div>
  );
}

// ---------- share a link ----------
export function SharePanel({ listId, url, live, ready, qr }: { listId: string; url: string; live: boolean; ready: boolean; qr: string | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-3">
        <span>
          <span className={`block ${label}`}>Hosted sign-up page</span>
          <span className={`block ${hint}`}>A page on Mailflow where people can join this list. No website needed.</span>
        </span>
        <Switch
          checked={live}
          disabled={pending || !ready}
          onCheckedChange={(on) => startTransition(async () => void (await runAction(setHostedPage, { listId, on: String(on) })))}
        />
      </label>
      {!ready && <FormMessage tone="info">Set the confirmation email sender first (tab &ldquo;Confirmation email&rdquo;).</FormMessage>}

      {live && (
        <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className={label}>Your link</span>
              <div className="flex gap-2">
                <Input readOnly value={url} aria-label="Sign-up page link" className="font-mono text-xs" />
                <CopyButton text={url} />
              </div>
            </div>
            <Button variant="outline" size="sm" render={<a href={url} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
              Open the page
            </Button>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Where to share it</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>The link in your Instagram, TikTok, or LinkedIn profile</li>
                <li>Your email signature and your other emails</li>
                <li>Printed QR code on flyers, menus, or at your shop counter</li>
              </ul>
            </div>
          </div>
          {qr && (
            <div className="space-y-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- a data URI from Appwrite */}
              <img src={qr} alt="QR code of your sign-up page" width={140} height={140} className="mx-auto rounded-md border border-border bg-white p-1" />
              <a href={qr} download="signup-qr-code.png" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                <Download className="size-3" />
                Download QR code
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- embed on a website ----------
export function EmbedPanel({
  listId,
  appUrl,
  ready,
  formKey,
  design,
}: {
  listId: string;
  appUrl: string;
  ready: boolean;
  formKey: { publicKey: string; origins: string[] } | null;
  design: FormDesign;
}) {
  const [styled, setStyled] = useState(true);
  const [editing, setEditing] = useState(!formKey);
  const { state, pending, onSubmit } = useActionForm<FormState>(async (prev, fd) => {
    const res = await setupWebsiteForm(prev, fd);
    if (res?.message) {
      toast.success(res.message);
      setEditing(false);
    }
    return res;
  }, undefined);

  if (!ready) return <FormMessage tone="info">Set the confirmation email sender first (tab &ldquo;Confirmation email&rdquo;).</FormMessage>;

  const websites = (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="listId" value={listId} />
      <label htmlFor="origins" className={label}>
        {formKey ? "Websites that may use this form" : "1. Where will the form be?"}
      </label>
      <Textarea id="origins" name="origins" rows={3} defaultValue={formKey?.origins.join("\n") ?? ""} placeholder={"www.example.com\nshop.example.com"} />
      <p className={hint}>
        One website per line. Only these websites can send sign-ups with this form, so other sites cannot copy it.
      </p>
      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <div className="flex gap-2">
        <Save pending={pending}>{formKey ? "Save websites" : "Create the embed code"}</Save>
        {formKey && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (!formKey || editing) return <div className="max-w-xl">{websites}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Works on:</span>
        {formKey.origins.map((o) => (
          <code key={o} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{o}</code>
        ))}
        <Button variant="link" size="xs" onClick={() => setEditing(true)}>Change websites</Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={label}>2. Copy this code into your website</span>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Switch size="sm" checked={styled} onCheckedChange={setStyled} />
            Include simple styles
          </label>
        </div>
        <CodeBlock code={buildEmbedSnippet(appUrl, formKey.publicKey, design, { styled })} language="html" />
        <p className={hint}>
          Paste it where the form should show, for example in a &ldquo;Custom HTML&rdquo; block in WordPress, Webflow, Wix,
          or Squarespace. Turn off the styles to use the look of your website.
        </p>
      </div>

      <div className="space-y-1.5 rounded-lg border border-border p-3 text-xs">
        <p className="font-medium">3. Test it</p>
        <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
          <li>Open your website and sign up with your own email address.</li>
          <li>Open the confirmation email and click the link.</li>
          <li>Find yourself in &ldquo;Recent sign-ups&rdquo; on this page, first as pending, then as active.</li>
        </ol>
        <p className="flex items-start gap-1.5 pt-1 text-muted-foreground">
          <Check className="mt-px size-3.5 shrink-0" />
          Without JavaScript the form still works: it opens a thank-you page.
        </p>
      </div>
    </div>
  );
}

// ---------- the confirmation email sender ----------
export function SenderPanel({ listId, fromName, fromEmail }: { listId: string; fromName: string; fromEmail: string }) {
  const { state, pending, onSubmit } = useToastForm(saveSender);
  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <input type="hidden" name="listId" value={listId} />
      <p className="text-xs text-muted-foreground">
        Every new subscriber gets an email with a confirmation link first (double opt-in). Only confirmed people get
        your campaigns. This keeps fake and mistyped addresses off your list.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="fromName" className={label}>Sender name</label>
          <Input id="fromName" name="fromName" maxLength={100} defaultValue={fromName} placeholder="Acme Team" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="fromEmail" className={label}>Sender email</label>
          <Input id="fromEmail" name="fromEmail" type="email" required defaultValue={fromEmail} placeholder="hello@mail.yourdomain.com" />
        </div>
      </div>
      <p className={hint}>Use an address on a domain that you verified in Sending domains.</p>
      {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
      <Save pending={pending}>Save sender</Save>
    </form>
  );
}
