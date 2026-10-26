import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// The message box of the auth and settings forms. role="alert" makes screen readers announce errors.
export function FormMessage({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border p-2.5 text-xs",
        tone === "error" && "border-destructive/20 bg-destructive/10 text-destructive",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "info" && "border-border bg-muted/60 text-muted-foreground"
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
