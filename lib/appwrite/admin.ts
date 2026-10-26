import { Client, Account, Avatars, Databases, TablesDB, Users } from "node-appwrite";

// Uses the API key. No Next.js code in this file.
// `userAgent`: the visitor's browser. Appwrite saves it on new sessions, so the list of
// devices in the account settings shows the real browser, not the server.
export function createAdminClient(opts: { userAgent?: string } = {}) {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  if (opts.userAgent) client.setForwardedUserAgent(opts.userAgent);

  return {
    get account() { return new Account(client); },
    get avatars() { return new Avatars(client); },
    get databases() { return new Databases(client); },
    get tablesDB() { return new TablesDB(client); },
    get users() { return new Users(client); },
  };
}
