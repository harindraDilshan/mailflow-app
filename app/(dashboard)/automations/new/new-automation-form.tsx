"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, GitBranch, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActionForm } from "@/hooks/use-action-form";
import type { Recipe } from "@/lib/automation-templates";
import { createAutomation, type CreateState } from "../actions";

const label = "text-xs font-medium text-foreground";
const hint = "text-[11px] text-muted-foreground";
const card = "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-data-checked:border-primary";

export function NewAutomationForm({
  lists,
  recipes,
  initialRecipe,
}: {
  lists: { id: string; name: string }[];
  recipes: Recipe[];
  initialRecipe: string;
}) {
  const router = useRouter();
  const [recipe, setRecipe] = useState(initialRecipe);
  const [triggerType, setTriggerType] = useState(lists.length > 0 ? "list_joined" : "tag_added");
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const listItems = lists.map((l) => ({ value: l.id, label: l.name }));

  const { state, pending, onSubmit } = useActionForm(async (prev: CreateState, fd: FormData) => {
    const res = await createAutomation(prev, fd);
    if (res?.id) router.push(`/automations/${res.id}`);
    return res;
  }, undefined);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Start from</CardTitle>
          <CardDescription>A ready workflow that you change in the builder.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup name="recipe" value={recipe} onValueChange={(v) => setRecipe(String(v))} className="gap-2 sm:grid-cols-2">
            {recipes.map((r) => (
              <label key={r.id} className={card}>
                <RadioGroupItem value={r.id} className="mt-0.5" />
                <span className="min-w-0 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={label}>{r.name}</span>
                    <Badge variant="secondary" className="font-normal">
                      <GitBranch />
                      {r.steps}
                    </Badge>
                  </span>
                  <span className={`block ${hint}`}>{r.description}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Trigger</CardTitle>
          <CardDescription>What makes a person enter this automation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup name="triggerType" value={triggerType} onValueChange={(v) => setTriggerType(String(v))} className="gap-2 sm:grid-cols-2">
            <label className={card}>
              <RadioGroupItem value="list_joined" className="mt-0.5" />
              <span>
                <span className={`block ${label}`}>Someone joins a list</span>
                <span className={`block ${hint}`}>By sign-up form, import, API, or by hand</span>
              </span>
            </label>
            <label className={card}>
              <RadioGroupItem value="tag_added" className="mt-0.5" />
              <span>
                <span className={`block ${label}`}>A tag is added</span>
                <span className={`block ${hint}`}>By you, the API, or another automation</span>
              </span>
            </label>
          </RadioGroup>

          {triggerType === "list_joined" ? (
            lists.length === 0 ? (
              <p className={hint}>
                You have no lists yet.{" "}
                <Link href="/contacts/lists" className="underline underline-offset-2 hover:text-foreground">
                  Create a list
                </Link>{" "}
                or use a tag instead.
              </p>
            ) : (
              <div className="space-y-1.5">
                <span className={label}>List</span>
                <Select name="triggerValue" items={listItems} value={listId} onValueChange={(v) => setListId(String(v ?? ""))}>
                  <SelectTrigger className="w-full sm:w-80" aria-label="List">
                    <SelectValue placeholder="Choose a list" />
                  </SelectTrigger>
                  <SelectContent>
                    {listItems.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="trigger-tag" className={label}>
                Tag
              </label>
              <Input id="trigger-tag" name="triggerValue" required placeholder="vip" className="sm:w-80" />
              <p className={hint}>One tag, like vip or customer.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Name</CardTitle>
          <CardDescription>Only you see this name.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input name="name" required maxLength={150} placeholder={recipes.find((r) => r.id === recipe)?.name ?? "My automation"} aria-label="Automation name" className="sm:w-80" />
        </CardContent>
      </Card>

      {state?.error && (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Create and open the builder
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
