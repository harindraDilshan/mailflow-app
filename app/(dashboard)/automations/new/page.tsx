import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { WELCOME_SERIES } from "@/lib/automation-templates";
import { AutomationForm } from "../automation-form";
import { saveAutomation } from "../actions";

export default function NewAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
          Loading automation setup...
        </div>
      }
    >
      <NewAutomationContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NewAutomationContent({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const user = await requireUser();
  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">
        {template === "welcome" ? "New automation: welcome series" : "New automation"}
      </h1>
      {lists.length === 0 && <p className="mb-4 text-sm text-muted-foreground">Create a list first.</p>}
      <AutomationForm
        action={saveAutomation}
        lists={lists}
        initialSteps={template === "welcome" ? WELCOME_SERIES : []}
        locked={false}
      />
    </div>
  );
}
