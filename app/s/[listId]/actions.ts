"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { getList, subscribeEmail } from "@/lib/subscribe";
import { clientIp } from "@/lib/api-helpers";

type State = { error?: string; message?: string } | undefined;
const PENDING = "Check your email to confirm your subscription.";

export async function hostedSubscribe(_: State, formData: FormData): Promise<State> {
  const limit = await rateLimit("subscribe-ip", clientIp(await headers()), 20, 60);
  if (!limit.ok) return { error: "Too many attempts. Please wait a minute and try again." };

  if (String(formData.get("hp_field") ?? "").trim()) return { message: PENDING }; // a bot

  const list = await getList(String(formData.get("listId") ?? ""));
  if (!list || !list.hostedEnabled || !list.fromEmail) {
    return { error: "This sign-up page is not available." };
  }

  const result = await subscribeEmail({
    accountId: list.accountId,
    listIds: [list.$id],
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    source: "hosted",
    sourceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/s/${list.$id}`,
  });

  if (!result.ok) {
    return {
      error: result.code === "invalid_email" ? "Enter a valid email address." : "Sign-ups are closed right now.",
    };
  }
  return { message: result.status === "already_subscribed" ? "You are already subscribed." : PENDING };
}