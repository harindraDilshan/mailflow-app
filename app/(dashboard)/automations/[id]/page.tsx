import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { getAutomationStats, getOwnedAutomation, recentRuns } from "@/lib/automations";
import { reviewAutomation } from "@/lib/automation-review";
import { AutomationForm } from "../automation-form";
import { saveAutomation, setAutomationStatus } from "../actions";

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const a = await getOwnedAutomation(user.$id, id);
  if (!a) notFound();

  const lists = (await listOwnedLists(user.$id)).map((l) => ({ id: l.$id, name: l.name }));
  const { issues, steps } = await reviewAutomation(user.$id, a);
  const [stats, runs] = await Promise.all([getAutomationStats(a, steps), recentRuns(a.$id)]);
  const active = a.status === "active";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/automations" className="text-sm underline">← Automations</Link>
        <h1 className="mt-2 text-2xl font-semibold">{a.name}</h1>
        <p className="text-sm text-gray-600">Status: <b>{a.status}</b></p>
      </div>

      <section className="rounded border p-4">
        {active ? (
          <form action={setAutomationStatus}>
            <input type="hidden" name="id" value={a.$id} />
            <input type="hidden" name="to" value="paused" />
            <button className="rounded border px-4 py-2 text-sm">Pause</button>
          </form>
        ) : (
          <>
            {issues.length > 0 ? (
              <ul className="mb-3 list-disc pl-5 text-sm text-red-600">
                {issues.map((i) => <li key={i}>{i}</li>)}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-green-700">Ready to turn on.</p>
            )}
            <p className="mb-3 text-xs text-gray-600">
              Only people who join <b>after</b> you turn it on will enter. People already on the list will not get these emails.
            </p>
            <form action={setAutomationStatus}>
              <input type="hidden" name="id" value={a.$id} />
              <input type="hidden" name="to" value="active" />
              <button disabled={issues.length > 0} className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50">
                {a.status === "paused" ? "Resume" : "Turn on"}
              </button>
            </form>
          </>
        )}
      </section>

      <AutomationForm
        action={saveAutomation}
        lists={lists}
        locked={active}
        initialSteps={steps}
        automation={{
          id: a.$id, name: a.name, triggerType: a.triggerType, triggerValue: a.triggerValue,
          fromName: a.fromName ?? "", fromEmail: a.fromEmail,
        }}
      />

      <section>
        <h2 className="mb-2 font-medium">Results</h2>
        <p className="mb-3 text-sm">
          In progress: <b>{stats.active}</b> · Finished: <b>{stats.completed}</b> · Stopped early: <b>{stats.exited}</b>
        </p>
        <table className="w-full border text-left text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2">Email</th><th className="p-2">Sent</th><th className="p-2">Opened</th><th className="p-2">Clicked</th>
            </tr>
          </thead>
          <tbody>
            {stats.perStep.length === 0 && <tr><td colSpan={4} className="p-3 text-gray-500">No email steps.</td></tr>}
            {stats.perStep.map((s) => (
              <tr key={s.index} className="border-t">
                <td className="p-2">Step {s.index + 1}: {s.subject || "(no subject)"}</td>
                <td className="p-2">{s.sent}</td><td className="p-2">{s.opened}</td><td className="p-2">{s.clicked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Recent people</h2>
        <table className="w-full border text-left text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2">Contact</th><th className="p-2">Status</th><th className="p-2">Step</th>
              <th className="p-2">Next step at</th><th className="p-2">Why it stopped</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && <tr><td colSpan={5} className="p-3 text-gray-500">Nobody has entered yet.</td></tr>}
            {runs.map((r) => (
              <tr key={r.$id} className="border-t">
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.stepIndex + 1}</td>
                <td className="p-2">{r.status === "active" && r.nextRunAt ? new Date(r.nextRunAt).toLocaleString() : ""}</td>
                <td className="p-2">{r.exitReason ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}