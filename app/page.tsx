import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/auth";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}

async function HomeRedirect() {
  redirect((await getLoggedInUser()) ? "/dashboard" : "/login");
  return null;
}
