export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto mt-20 max-w-sm p-4">{children}</main>;
}