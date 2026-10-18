export const DB_ID = process.env.APPWRITE_DATABASE_ID!;
export const DOMAINS_TABLE = process.env.APPWRITE_DOMAINS_TABLE_ID!;

// These tables are created by the setup script with fixed IDs.
export const CONTACTS_TABLE = "contacts";
export const LISTS_TABLE = "lists";
export const CAMPAIGNS_TABLE = "campaigns";
export const MESSAGES_TABLE = "messages";
export const EVENTS_TABLE = "events";