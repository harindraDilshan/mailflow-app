// The address of this Mailflow server, for samples on pages that do not need the reader's account.
export const docsContextBase = () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
