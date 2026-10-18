import { Client, Account, Databases, TablesDB } from "node-appwrite";

// Uses the API key. No Next.js code in this file.
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    get account() { return new Account(client); },
    get databases() { return new Databases(client); },
    get tablesDB() { return new TablesDB(client); },
  };
}