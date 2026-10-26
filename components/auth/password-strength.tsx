"use client";

import { cn } from "@/lib/utils";
import { MIN_PASSWORD, passwordProblem, passwordStrength } from "@/lib/auth-rules";

const BAR = ["", "bg-destructive", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

/** The strength bar under a new password. It runs the same check as the server. */
export function PasswordStrength({ id, password, email, name }: { id?: string; password: string; email?: string; name?: string }) {
  if (!password) {
    return (
      <p id={id} className="text-[11px] text-muted-foreground">
        Use {MIN_PASSWORD} or more characters. A short sentence is easy to remember and hard to guess.
      </p>
    );
  }
  const problem = passwordProblem(password, { email, name });
  const { score, label } = passwordStrength(password);
  const shown = problem ? 1 : score;

  return (
    <div id={id} className="space-y-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("h-1 rounded-full bg-muted", i <= shown && BAR[shown])} />
        ))}
      </div>
      <p className={cn("text-[11px]", problem ? "text-destructive" : "text-muted-foreground")}>
        {problem ?? `Password strength: ${label}`}
      </p>
    </div>
  );
}
