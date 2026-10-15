import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/appwrite/server";

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getLoggedInUser();
  if (!user) redirect("/login");
  return user;
}