"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MAX_TAGS, normalizeTags } from "@/lib/contact-rules";

/**
 * Tags as chips. Enter or a comma adds a tag, Backspace in the empty field removes the last one.
 * With `name`, a hidden field sends "a, b, c" with the form (the server normalizes it again).
 * The typed text that is not added yet counts too, so it is not lost when the user clicks Save.
 */
export function TagInput({
  id,
  name,
  defaultValue = [],
  onChange,
  placeholder = "Type a tag and press Enter",
  className,
  "aria-describedby": describedBy,
}: {
  id?: string;
  name?: string;
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  "aria-describedby"?: string;
}) {
  const [tags, setTags] = useState(() => normalizeTags(defaultValue));
  const [draft, setDraft] = useState("");
  const full = tags.length >= MAX_TAGS;

  function set(nextTags: string[], nextDraft: string) {
    setTags(nextTags);
    setDraft(nextDraft);
    onChange?.(normalizeTags([...nextTags, nextDraft]));
  }

  function onType(value: string) {
    if (!value.includes(",")) return set(tags, value);
    // Pasted or typed "a, b, c": add the finished parts, keep the last one for typing.
    const parts = value.split(",");
    const rest = parts.pop() ?? "";
    set(normalizeTags([...tags, ...parts]), rest.trimStart());
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // do not submit the form
      set(normalizeTags([...tags, draft]), "");
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      set(tags.slice(0, -1), "");
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-1.5 py-1 shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className
      )}
    >
      {name && <input type="hidden" name={name} value={[...tags, draft].filter(Boolean).join(", ")} />}
      {tags.map((t) => (
        <Badge key={t} variant="secondary" className="gap-0.5 pr-0.5 font-normal">
          {t}
          <button
            type="button"
            onClick={() => set(tags.filter((x) => x !== t), draft)}
            aria-label={`Remove tag ${t}`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        disabled={full}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && set(normalizeTags([...tags, draft]), "")}
        placeholder={full ? `Up to ${MAX_TAGS} tags` : tags.length > 0 ? "" : placeholder}
        aria-describedby={describedBy}
        className="h-6 min-w-28 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}
