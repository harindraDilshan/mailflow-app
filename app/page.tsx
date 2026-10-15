import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/auth";

export default async function Home() {
  redirect((await getLoggedInUser()) ? "/dashboard" : "/login");
}