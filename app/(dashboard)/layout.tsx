import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="p-6">
      <header className="mb-6 flex items-center justify-between">
        <span>{user.email}</span>
        <form action={signOut}>
          <button className="underline">Log out</button>
        </form>
      </header>
      {!user.emailVerification && (
        <p className="mb-4 rounded bg-yellow-100 p-3 text-sm">
          Please verify your email. Check your inbox.
        </p>
      )}
      {children}
    </div>
  );
}