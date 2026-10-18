export const metadata = { title: "Unsubscribed", robots: "noindex" };

export default function DonePage() {
  return (
    <main className="mx-auto mt-24 max-w-md p-6 text-center">
      <h1 className="mb-2 text-xl font-semibold">You are unsubscribed</h1>
      <p className="text-sm text-gray-600">You will not receive more emails from this sender.</p>
    </main>
  );
}