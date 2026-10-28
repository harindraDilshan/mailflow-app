"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, AlignCenter, AlignLeft, ArrowDown, ArrowUp, Bold, ChevronDown, Copy, GripVertical, Heading,
  ImageIcon, Italic, Link2, Minus, MousePointerClick, Palette, PanelBottom, PanelTop, Plus, Redo2, Trash2,
  Type, Undo2, UnfoldVertical, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FONTS, MAX_BLOCKS, blockIssue, newBlock, newId, type Align, type Block, type BlockType, type DesignSettings,
  type EmailDesign, type FontKey,
} from "@/lib/email-design";
import { cn } from "@/lib/utils";

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";

export const BLOCK_LOOK: Record<BlockType, { label: string; icon: typeof Type; description: string }> = {
  header: { label: "Header", icon: PanelTop, description: "Your brand name on a colored bar" },
  heading: { label: "Heading", icon: Heading, description: "A large title" },
  text: { label: "Text", icon: Type, description: "Paragraphs with bold, italic, and links" },
  image: { label: "Image", icon: ImageIcon, description: "A picture from a link" },
  button: { label: "Button", icon: MousePointerClick, description: "A link that looks like a button" },
  divider: { label: "Divider", icon: Minus, description: "A thin line between parts" },
  spacer: { label: "Space", icon: UnfoldVertical, description: "Empty space between blocks" },
  footer: { label: "Footer", icon: PanelBottom, description: "Your company name and address" },
};
const BLOCK_ORDER: BlockType[] = ["heading", "text", "image", "button", "divider", "spacer", "header", "footer"];

// The short text after the name of a block in the list.
function summary(b: Block) {
  const plain = (s: string) => s.replace(/\*\*|\*|\[|\]\([^)]*\)/g, "").split("\n").find((l) => l.trim()) ?? "";
  switch (b.type) {
    case "header":
    case "heading":
      return b.text;
    case "text":
    case "footer":
      return plain(b.text);
    case "image":
      return b.alt || (b.src ? b.src.replace(/^https?:\/\//, "") : "No picture yet");
    case "button":
      return b.label;
    case "spacer":
      return `${b.height} px`;
    case "divider":
      return "";
  }
}

// ---------- small fields ----------
function Field({ id, title, note, children }: { id?: string; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={label}>{title}</label>
      {children}
      {note && <p className={hint}>{note}</p>}
    </div>
  );
}

function ColorField({
  id, title, value, onChange, placeholder,
}: {
  id: string;
  title: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string; // shown when the value is empty (the color of the email style)
}) {
  // Keep what the person types, and only send a complete color.
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(value);
  }
  return (
    <Field id={id} title={title}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          aria-label={`${title}: pick a color`}
          value={value || placeholder || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        />
        <Input
          id={id}
          value={text}
          placeholder={placeholder}
          maxLength={7}
          spellCheck={false}
          className="h-8 font-mono text-xs"
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
            else if (!v && placeholder) onChange("");
          }}
          onBlur={() => setText(value)}
        />
      </div>
    </Field>
  );
}

function Segmented<T extends string>({
  value, onChange, options, ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: typeof Type }[];
  ariaLabel: string;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList className="h-8" aria-label={ariaLabel}>
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value} className="px-2.5 text-xs">
            {o.icon && <o.icon />}
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

const ALIGN_OPTIONS: { value: Align; label: string; icon: typeof Type }[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
];

function AlignField({ value, onChange }: { value: Align; onChange: (v: Align) => void }) {
  return (
    <div className="space-y-1.5">
      <span className={label}>Alignment</span>
      <Segmented value={value} onChange={onChange} options={ALIGN_OPTIONS} ariaLabel="Alignment" />
    </div>
  );
}

const TEXT_TOOLS = [
  { id: "bold", title: "Bold", icon: Bold },
  { id: "italic", title: "Italic", icon: Italic },
  { id: "link", title: "Link", icon: Link2 },
  { id: "name", title: "Insert the name of the contact", icon: UserRound },
] as const;

/** A text area with buttons for bold, italic, link, and the name tag. */
function MarkedText({
  id, value, onChange, rows = 5, maxLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Puts marks around the selected text (or a placeholder), then selects `select` in the result.
  function wrap(before: string, after: string, empty: string, select: "inner" | "after" = "inner") {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const inner = value.slice(start, end) || empty;
    onChange(value.slice(0, start) + before + inner + after + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      if (select === "inner") el?.setSelectionRange(start + before.length, start + before.length + inner.length);
      else {
        // For a link: select "https://" so that the person can paste the address.
        const urlStart = start + before.length + inner.length + 2;
        el?.setSelectionRange(urlStart, urlStart + "https://".length);
      }
    });
  }

  // Puts the name tag where the cursor is (in place of selected text).
  function insertName() {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const tag = "{{name}}";
    onChange(value.slice(0, start) + tag + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  function run(tool: (typeof TEXT_TOOLS)[number]["id"]) {
    if (tool === "bold") wrap("**", "**", "bold text");
    else if (tool === "italic") wrap("*", "*", "italic text");
    else if (tool === "link") wrap("[", "](https://)", "link text", "after");
    else insertName();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <div className="flex items-center gap-0.5 border-b border-input bg-muted/40 px-1 py-0.5" role="toolbar" aria-label="Text format">
        {TEXT_TOOLS.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger
              render={<Button type="button" variant="ghost" size="icon-xs" aria-label={t.title} onClick={() => run(t.id)} />}
            >
              <t.icon />
            </TooltipTrigger>
            <TooltipContent>{t.title}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Textarea
        ref={ref}
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-none border-0 text-sm shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

// ---------- the fields of each block ----------
function BlockFields({ block: b, settings, set }: { block: Block; settings: DesignSettings; set: (patch: Partial<Block>, field: string) => void }) {
  const id = (f: string) => `${b.id}-${f}`;
  switch (b.type) {
    case "header":
      return (
        <>
          <Field id={id("text")} title="Brand name">
            <Input id={id("text")} value={b.text} maxLength={120} onChange={(e) => set({ text: e.target.value }, "text")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField id={id("bg")} title="Bar color" value={b.background} onChange={(v) => set({ background: v }, "background")} />
            <ColorField id={id("color")} title="Text color" value={b.color} onChange={(v) => set({ color: v }, "color")} />
          </div>
          <AlignField value={b.align} onChange={(v) => set({ align: v }, "align")} />
        </>
      );
    case "heading":
      return (
        <>
          <Field id={id("text")} title="Heading">
            <Input id={id("text")} value={b.text} maxLength={200} onChange={(e) => set({ text: e.target.value }, "text")} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <span className={label}>Size</span>
              <Segmented
                value={b.size}
                onChange={(v) => set({ size: v }, "size")}
                ariaLabel="Size"
                options={[{ value: "large", label: "Large" }, { value: "medium", label: "Medium" }]}
              />
            </div>
            <AlignField value={b.align} onChange={(v) => set({ align: v }, "align")} />
          </div>
        </>
      );
    case "text":
      return (
        <>
          <Field
            id={id("text")}
            title="Text"
            note={<>Select words and click a button to make them bold, italic, or a link. An empty line starts a new paragraph.</>}
          >
            <MarkedText id={id("text")} value={b.text} maxLength={5000} onChange={(v) => set({ text: v }, "text")} />
          </Field>
          <AlignField value={b.align} onChange={(v) => set({ align: v }, "align")} />
        </>
      );
    case "image":
      return (
        <>
          <Field id={id("src")} title="Picture link" note="The address of a public picture, for example https://yoursite.com/photo.jpg.">
            <Input id={id("src")} type="url" value={b.src} maxLength={2000} placeholder="https://" onChange={(e) => set({ src: e.target.value }, "src")} />
          </Field>
          <Field id={id("alt")} title="Description" note="Inboxes show it when they block pictures. Screen readers read it.">
            <Input id={id("alt")} value={b.alt} maxLength={200} placeholder="What the picture shows" onChange={(e) => set({ alt: e.target.value }, "alt")} />
          </Field>
          <Field id={id("href")} title="Link when clicked (optional)">
            <Input id={id("href")} type="url" value={b.href} maxLength={2000} placeholder="https://" onChange={(e) => set({ href: e.target.value }, "href")} />
          </Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={label}>Width</span>
              <span className="text-xs tabular-nums text-muted-foreground">{b.width}%</span>
            </div>
            <Slider
              min={10}
              max={100}
              step={5}
              value={[b.width]}
              onValueChange={(v) => set({ width: Array.isArray(v) ? Number(v[0]) : Number(v) }, "width")}
              aria-label="Width of the picture"
            />
          </div>
          {b.width < 100 && <AlignField value={b.align} onChange={(v) => set({ align: v }, "align")} />}
        </>
      );
    case "button":
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={id("label")} title="Button text">
              <Input id={id("label")} value={b.label} maxLength={80} onChange={(e) => set({ label: e.target.value }, "label")} />
            </Field>
            <Field id={id("href")} title="Link">
              <Input id={id("href")} type="url" value={b.href} maxLength={2000} placeholder="https://" onChange={(e) => set({ href: e.target.value }, "href")} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-44">
              <ColorField
                id={id("color")}
                title="Color"
                value={b.color}
                placeholder={settings.buttonColor}
                onChange={(v) => set({ color: v }, "color")}
              />
            </div>
            <AlignField value={b.align} onChange={(v) => set({ align: v }, "align")} />
          </div>
          <p className={hint}>Leave the color empty to use the button color of the email style.</p>
        </>
      );
    case "divider":
      return <p className={hint}>A thin line between two parts of the email. It has no settings.</p>;
    case "spacer":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={label}>Height</span>
            <span className="text-xs tabular-nums text-muted-foreground">{b.height} px</span>
          </div>
          <Slider
            min={8}
            max={96}
            step={4}
            value={[b.height]}
            onValueChange={(v) => set({ height: Array.isArray(v) ? Number(v[0]) : Number(v) }, "height")}
            aria-label="Height of the space"
          />
        </div>
      );
    case "footer":
      return (
        <Field
          id={id("text")}
          title="Footer text"
          note="Add your company name and postal address: the law in many countries asks for it. Mailflow adds the unsubscribe link below this text."
        >
          <MarkedText id={id("text")} value={b.text} rows={3} maxLength={1000} onChange={(v) => set({ text: v }, "text")} />
        </Field>
      );
  }
}

// ---------- email style ----------
function StylePanel({ settings: s, set }: { settings: DesignSettings; set: (patch: Partial<DesignSettings>, field: string) => void }) {
  const fontItems = (Object.keys(FONTS) as FontKey[]).map((k) => ({ value: k, label: FONTS[k].label }));
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField id="style-bg" title="Page background" value={s.background} onChange={(v) => set({ background: v }, "background")} />
        <ColorField id="style-content" title="Email background" value={s.contentBackground} onChange={(v) => set({ contentBackground: v }, "contentBackground")} />
        <ColorField id="style-text" title="Text" value={s.textColor} onChange={(v) => set({ textColor: v }, "textColor")} />
        <ColorField id="style-link" title="Links" value={s.linkColor} onChange={(v) => set({ linkColor: v }, "linkColor")} />
        <ColorField id="style-button" title="Buttons" value={s.buttonColor} onChange={(v) => set({ buttonColor: v }, "buttonColor")} />
        <Field id="style-font" title="Font">
          <Select items={fontItems} value={s.font} onValueChange={(v) => v && set({ font: v as FontKey }, "font")}>
            <SelectTrigger id="style-font" className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontItems.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs" style={{ fontFamily: FONTS[f.value].stack }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={label}>Email width</span>
          <span className="text-xs tabular-nums text-muted-foreground">{s.width} px</span>
        </div>
        <Slider
          min={480}
          max={700}
          step={10}
          value={[s.width]}
          onValueChange={(v) => set({ width: Array.isArray(v) ? Number(v[0]) : Number(v) }, "width")}
          aria-label="Email width"
        />
        <p className={hint}>600 px works best in most inboxes. On phones, the email always fits the screen.</p>
      </div>
    </div>
  );
}

function IconAction({ title, onClick, disabled, children, destructive }: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            className={cn("text-muted-foreground", destructive && "hover:text-destructive")}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function AddBlockMenu({ onAdd, disabled, below }: { onAdd: (t: BlockType) => void; disabled: boolean; below?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="w-full border-dashed" disabled={disabled} />}>
        <Plus />
        Add block
        <ChevronDown className="ml-auto opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
            {below ? `Adds the block below “${below}”` : "Adds the block at the end"}
          </DropdownMenuLabel>
          {BLOCK_ORDER.map((t) => {
            const look = BLOCK_LOOK[t];
            return (
              <DropdownMenuItem key={t} onClick={() => onAdd(t)} className="items-start gap-2.5 py-1.5">
                <look.icon className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-xs font-medium">{look.label}</span>
                  <span className="text-[11px] text-muted-foreground">{look.description}</span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- the editor ----------
export type DesignChange = (next: EmailDesign, key?: string) => void;

/**
 * The visual editor: the email style, then the blocks from top to bottom.
 * One block is open at a time. A click on a block in the preview opens it here too.
 */
export function BlockEditor({
  design,
  onChange,
  selected,
  onSelect,
  history,
}: {
  design: EmailDesign;
  onChange: DesignChange;
  selected: string | null;
  onSelect: (id: string | null) => void;
  history?: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
}) {
  const [styleOpen, setStyleOpen] = useState(false);
  const [grab, setGrab] = useState<string | null>(null); // the block whose handle is pressed
  const [drag, setDrag] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const blocks = design.blocks;
  const full = blocks.length >= MAX_BLOCKS;

  // Show the open block: after a click in the preview, it can be far down the list.
  useEffect(() => {
    if (!selected) return;
    const el = listRef.current?.querySelector(`[data-block-row="${selected}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  // Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) when the focus is not in a text field. Text fields have their own undo.
  useEffect(() => {
    if (!history) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true]")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey && history.canUndo) {
        e.preventDefault();
        history.undo();
      } else if (((key === "z" && e.shiftKey) || key === "y") && history.canRedo) {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

  const setBlocks = (next: Block[], key?: string) => onChange({ ...design, blocks: next }, key);
  const update = (id: string, patch: Partial<Block>, field: string) =>
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)), `${id}:${field}`);

  function add(type: BlockType) {
    const block = newBlock(type);
    const at = selected ? blocks.findIndex((b) => b.id === selected) + 1 : -1;
    // Without a selection: above the footer, because the footer stays at the end.
    const index = at > 0 ? at : blocks.at(-1)?.type === "footer" && type !== "footer" ? blocks.length - 1 : blocks.length;
    setBlocks([...blocks.slice(0, index), block, ...blocks.slice(index)]);
    onSelect(block.id);
  }

  function move(id: string, to: number) {
    const from = blocks.findIndex((b) => b.id === id);
    if (from < 0 || to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [b] = next.splice(from, 1);
    next.splice(to, 0, b);
    setBlocks(next);
  }

  function duplicate(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0 || full) return;
    const copy = { ...blocks[i], id: newId() };
    setBlocks([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
    onSelect(copy.id);
  }

  function remove(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selected === id) onSelect(null);
    if (history) toast(`${BLOCK_LOOK[blocks[i].type].label} block deleted.`, { action: { label: "Undo", onClick: history.undo } });
    // Move the focus to a block that is still there, so keyboard users do not lose their place.
    requestAnimationFrame(() => {
      const rows = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-block-toggle]");
      rows?.[Math.min(i, rows.length - 1)]?.focus();
    });
  }

  function onDrop() {
    if (drag && drop && drag !== drop.id) {
      const rest = blocks.filter((b) => b.id !== drag);
      const target = rest.findIndex((b) => b.id === drop.id);
      const moved = blocks.find((b) => b.id === drag);
      if (moved && target >= 0) {
        const index = drop.after ? target + 1 : target;
        setBlocks([...rest.slice(0, index), moved, ...rest.slice(index)]);
      }
    }
    setDrag(null);
    setDrop(null);
    setGrab(null);
  }

  const selectedBlock = blocks.find((b) => b.id === selected);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <span className={hint}>
          {blocks.length} of {MAX_BLOCKS} blocks. Drag <GripVertical className="inline size-3 align-[-2px]" /> to change the order.
        </span>
        {history && (
          <span className="ml-auto flex">
            <IconAction title="Undo (Ctrl+Z)" onClick={history.undo} disabled={!history.canUndo}>
              <Undo2 />
            </IconAction>
            <IconAction title="Redo (Ctrl+Shift+Z)" onClick={history.redo} disabled={!history.canRedo}>
              <Redo2 />
            </IconAction>
          </span>
        )}
      </div>

      {/* email style */}
      <div className={cn("rounded-lg border border-border bg-card", styleOpen && "ring-1 ring-primary/20")}>
        <button
          type="button"
          aria-expanded={styleOpen}
          onClick={() => setStyleOpen(!styleOpen)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left"
        >
          <Palette className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Email style</span>
          <span className="flex items-center gap-1" aria-hidden>
            {[design.settings.background, design.settings.contentBackground, design.settings.buttonColor].map((c, i) => (
              <span key={i} className="size-3 rounded-full border border-border" style={{ background: c }} />
            ))}
          </span>
          <span className={`truncate ${hint}`}>
            {FONTS[design.settings.font].label}, {design.settings.width} px
          </span>
          <ChevronDown className={cn("ml-auto size-3.5 text-muted-foreground transition-transform", styleOpen && "rotate-180")} />
        </button>
        {styleOpen && (
          <div className="border-t border-border px-3 py-3">
            <StylePanel
              settings={design.settings}
              set={(patch, field) => onChange({ ...design, settings: { ...design.settings, ...patch } }, `style:${field}`)}
            />
          </div>
        )}
      </div>

      {/* blocks */}
      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-xs font-medium">This email has no blocks yet</p>
          <p className={hint}>Add a heading, some text, or a button to start.</p>
        </div>
      ) : (
        <ol ref={listRef} className="space-y-1.5" aria-label="Blocks of the email">
          {blocks.map((b, i) => {
            const look = BLOCK_LOOK[b.type];
            const open = b.id === selected;
            const issue = blockIssue(b);
            const sum = summary(b);
            return (
              <li
                key={b.id}
                data-block-row={b.id}
                draggable={grab === b.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", b.id);
                  setDrag(b.id);
                }}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const after = e.clientY > r.top + r.height / 2;
                  if (drop?.id !== b.id || drop.after !== after) setDrop({ id: b.id, after });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop();
                }}
                onDragEnd={() => {
                  setDrag(null);
                  setDrop(null);
                  setGrab(null);
                }}
                className={cn(
                  "group rounded-lg border bg-card transition-[border-color,box-shadow,opacity]",
                  open ? "border-primary/60 ring-1 ring-primary/20" : "border-border hover:border-foreground/20",
                  drag === b.id && "opacity-50",
                  drop?.id === b.id && drag !== b.id && (drop.after ? "shadow-[0_3px_0_0_var(--color-primary)]" : "shadow-[0_-3px_0_0_var(--color-primary)]")
                )}
              >
                <div className="flex items-center gap-1 py-1 pr-1 pl-0.5">
                  <span
                    className="flex cursor-grab touch-none items-center self-stretch px-1 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
                    onPointerDown={() => setGrab(b.id)}
                    onPointerUp={() => setGrab(null)}
                    aria-hidden
                  >
                    <GripVertical className="size-3.5" />
                  </span>
                  <button
                    type="button"
                    data-block-toggle
                    aria-expanded={open}
                    onClick={() => onSelect(open ? null : b.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <look.icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="shrink-0 text-xs font-medium">{look.label}</span>
                    {sum && <span className="min-w-0 truncate text-xs text-muted-foreground">{sum}</span>}
                    {issue && (
                      <AlertTriangle className="size-3 shrink-0 text-amber-600 dark:text-amber-400" aria-label="This block needs your attention" />
                    )}
                  </button>
                  <span className="flex shrink-0 items-center">
                    <IconAction title="Move up" onClick={() => move(b.id, i - 1)} disabled={i === 0}>
                      <ArrowUp />
                    </IconAction>
                    <IconAction title="Move down" onClick={() => move(b.id, i + 1)} disabled={i === blocks.length - 1}>
                      <ArrowDown />
                    </IconAction>
                    <IconAction title="Duplicate" onClick={() => duplicate(b.id)} disabled={full}>
                      <Copy />
                    </IconAction>
                    <IconAction title="Delete" onClick={() => remove(b.id)} destructive>
                      <Trash2 />
                    </IconAction>
                  </span>
                </div>
                {open && (
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    <BlockFields block={b} settings={design.settings} set={(patch, field) => update(b.id, patch, field)} />
                    {issue && (
                      <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-px size-3 shrink-0" />
                        {issue}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <AddBlockMenu onAdd={add} disabled={full} below={selectedBlock ? BLOCK_LOOK[selectedBlock.type].label : undefined} />
      {full && <p className={hint}>An email can have up to {MAX_BLOCKS} blocks.</p>}
    </div>
  );
}
