import { Client, Account, Databases, TablesDB } from "node-appwrite";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "mailflow-session";

// Uses the API key. Used to sign up, log in, and recover passwords.
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
  };
}

// Uses the user's cookie. Acts as the logged-in user.
export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const session = (await cookies()).get(SESSION_COOKIE);
  if (!session?.value) throw new Error("No session");
  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}