// The data access layer for authentication (see the Next.js guide "Creating a Data Access Layer").
// proxy.ts only checks that a session cookie exists. Every page, server action, and route handler
// that shows or changes private data must call requireUser(): that is the real check.

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Models } from "node-appwrite";
import { createSessionClient, SESSION_COOKIE } from "@/lib/appwrite/server";
import { isUnauthorized, needsSecondFactor } from "@/lib/auth-rules";

export type SessionState =
  | { status: "signed-in"; user: Models.User<Models.Preferences> }
  | { status: "second-factor" } // password done, the 2-step code is not
  | { status: "signed-out"; hadCookie: boolean };

// React cache: one Appwrite call per request, however many layouts, pages, and actions ask.
export const getSessionState = cache(async (): Promise<SessionState> => {
  const hadCookie = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
  if (!hadCookie) return { status: "signed-out", hadCookie };
  try {
    const { account } = await createSessionClient();
    return { status: "signed-in", user: await account.get() };
  } catch (e) {
    if (needsSecondFactor(e)) return { status: "second-factor" };
    if (isUnauthorized(e)) return { status: "signed-out", hadCookie };
    throw e; // Appwrite is down or slow: show an error, do not log the user out
  }
});

// For public pages that only show more when logged in (docs, the home redirect).
// If Appwrite cannot answer, they act as "not logged in" instead of showing an error.
export async function getLoggedInUser() {
  const state = await getSessionState().catch(() => null);
  return state?.status === "signed-in" ? state.user : null;
}

export async function requireUser() {
  const state = await getSessionState();
  if (state.status === "signed-in") return state.user;
  if (state.status === "second-factor") redirect("/login/verify");
  redirect(state.hadCookie ? "/login?reason=expired" : "/login");
}
