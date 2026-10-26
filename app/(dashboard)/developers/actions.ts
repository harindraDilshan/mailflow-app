"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { normalizeName } from "@/lib/contact-rules";
import { MAX_KEYS, countActiveKeys, createApiKey, revokeApiKey } from "@/lib/api-keys";

export type CreateKeyState = { error?: string; key?: string; name?: string } | undefined;
export type Result = { ok: boolean; message: string };

// A server (secret) key. Website form keys are made on the sign-up form page of a list.
export async function createSecretKey(_: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const user = await requireUser();
  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 100);
  if (!name) return { error: "Give the key a name, so that you know later where it is used." };
  if ((await countActiveKeys(user.$id, "secret")) >= MAX_KEYS) {
    return { error: `You can have up to ${MAX_KEYS} server keys. Revoke one that you do not use.` };
  }

  const key = await createApiKey(user.$id, { name, type: "secret" });
  revalidatePath("/developers");
  return { key, name }; // the only time the full key is shown
}

export async function revokeKey(formData: FormData): Promise<Result> {
  const user = await requireUser();
  await revokeApiKey(user.$id, String(formData.get("id") ?? ""));
  revalidatePath("/developers");
  revalidatePath("/contacts/forms");
  return { ok: true, message: "The key is revoked. Requests with it fail from now on." };
}
