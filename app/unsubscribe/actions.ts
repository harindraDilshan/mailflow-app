"use server";

import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/unsubscribe-token";
import { unsubscribeContact } from "@/lib/unsubscribe";

export async function confirmUnsubscribe(formData: FormData): Promise<void> {
  const contactId = verifyToken(String(formData.get("t") ?? ""));
  if (!contactId) redirect("/unsubscribe"); // shows "not valid"

  await unsubscribeContact(contactId);
  redirect("/unsubscribe/done");
}