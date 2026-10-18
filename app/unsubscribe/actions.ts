"use server";

import { redirect } from "next/navigation";
import { unsubscribeContact } from "@/lib/unsubscribe";
import { parseToken } from "@/lib/unsubscribe-token";

export async function confirmUnsubscribe(formData: FormData): Promise<void> {
  const t = parseToken(String(formData.get("t") ?? ""));
  if (!t) redirect("/unsubscribe");

  await unsubscribeContact(t.contactId, t.messageId);
  redirect("/unsubscribe/done");
}