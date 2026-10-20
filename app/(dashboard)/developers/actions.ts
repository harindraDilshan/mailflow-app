"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getOwnedList } from "@/lib/contacts";
import { normalizeName } from "@/lib/contact-rules";
import { MAX_KEYS, countActiveKeys, createApiKey, normalizeOrigin, revokeApiKey } from "@/lib/api-keys";

type State = { error?: string; message?: string; key?: string } | undefined;

export async function createKey(_: State, formData: FormData): Promise<State> {
  const user = await requireUser();
  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 100);
  const type = formData.get("type") === "secret" ? "secret" : "public";

  if (!name) return { error: "Give the key a name." };
  if ((await countActiveKeys(user.$id)) >= MAX_KEYS) {
    return { error: `You can have up to ${MAX_KEYS} active keys. Revoke one first.` };
  }

  let listId: string | undefined;
  let origins: string[] = [];

  if (type === "public") {
    const list = await getOwnedList(user.$id, String(formData.get("listId") ?? ""));
    if (!list) return { error: "Choose a list." };
    if (!list.fromEmail) return { error: "Set a confirmation sender on that list first (Lists → Collect subscribers)." };

    const raw = String(formData.get("origins") ?? "").split(/[\s,]+/).filter(Boolean);
    const parsed = raw.map(normalizeOrigin);
    if (raw.length === 0 || parsed.some((o) => !o)) {
      return { error: "Enter the websites that may use this key, like https://www.example.com" };
    }
    if (raw.length > 10) return { error: "You can add up to 10 websites." };
    origins = [...new Set(parsed as string[])];
    listId = list.$id;
  }

  const key = await createApiKey(user.$id, { name, type, listId, origins });
  revalidatePath("/developers");
  return {
    message: type === "secret"
      ? "Copy this key now. You will not be able to see it again."
      : "Public key created. It also appears in the embed snippet of the list.",
    key,
  };
}

export async function revokeKey(formData: FormData): Promise<void> {
  const user = await requireUser();
  await revokeApiKey(user.$id, String(formData.get("id") ?? ""));
  revalidatePath("/developers");
}