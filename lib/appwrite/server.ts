import { Client, Account, Databases } from "node-appwrite";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-cookie";
export { createAdminClient } from "./admin";

const baseClient = () =>
  new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// Acts as the logged-in user: the session from the cookie, or `secret` right after log-in
// (a cookie set in this request is not readable yet).
export async function createSessionClient(secret?: string) {
  const client = baseClient();
  const value = secret ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) throw new Error("No session");
  client.setSession(value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}

// No session and no API key: for public steps, like finishing an email verification
// from a link that the user opens in another browser.
export function createPublicClient() {
  const client = baseClient();
  return {
    get account() {
      return new Account(client);
    },
  };
}

