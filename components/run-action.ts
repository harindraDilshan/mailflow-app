import { toast } from "sonner";

/**
 * Runs a server action that returns { ok, message }, and shows the message as a toast.
 * Returns the result, or null after an error.
 */
export async function runAction<R extends { ok: boolean; message: string }>(
  action: (fd: FormData) => Promise<R>,
  fields: Record<string, string>
) {
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
