import { toast } from "sonner";
import type { ActionResult } from "./actions";

// Runs a campaign server action and shows its message. Returns the result, or null after an error.
export async function runAction(action: (fd: FormData) => Promise<ActionResult>, fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  try {
    const res = await action(fd);
    if (res.ok) toast.success(res.message);
    else toast.error(res.message);
    return res;
  } catch {
    toast.error("Something went wrong. Try again.");
    return null;
  }
}
