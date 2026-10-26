"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3, CalendarClock, ChevronDown, Copy, Loader2, MailCheck, PencilLine, Send, Trash2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/confirm-dialog";
import { canDeleteCampaign, canEditCampaign, hasReport } from "@/lib/campaign-status";
import { plural } from "@/lib/format";
import {
  cancelSchedule, deleteCampaign, duplicateCampaign, scheduleCampaign, sendCampaign, sendTestEmail,
} from "../actions";
import { runAction } from "../run-action";

const run = runAction;

// ---------- header buttons ----------
export function CampaignActions({ campaign }: { campaign: { id: string; name: string; status: string } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDialog, confirm] = useConfirm();
  const { id, status } = campaign;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEditCampaign(status) && (
        <Button variant="outline" size="sm" render={<Link href={`/campaigns/${id}/edit`} />}>
          <PencilLine />
          Edit
        </Button>
      )}
      {hasReport(status) && (
        <Button variant="outline" size="sm" render={<Link href={`/campaigns/${id}/report`} />}>
          <BarChart3 />
          Report
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
          {pending && <Loader2 className="animate-spin" />}
          More
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const res = await run(duplicateCampaign, { id });
                if (res?.ok && res.id) router.push(`/campaigns/${res.id}/edit`);
              })
            }
          >
            <Copy />
            Duplicate
          </DropdownMenuItem>
          {canDeleteCampaign(status) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  confirm({
                    title: `Delete "${campaign.name}"?`,
                    description:
                      status === "draft"
                        ? "You cannot undo this."
                        : "Its report is deleted too. The contacts keep the email in their history. You cannot undo this.",
                    confirmLabel: "Delete campaign",
                    destructive: true,
                    onConfirm: async () => {
                      const res = await run(deleteCampaign, { id });
                      if (res?.ok) router.push("/campaigns");
                    },
                  })
                }
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmDialog}
    </div>
  );
}

// ---------- send panel of a draft ----------
// "2026-10-27T09:00" in the browser's time zone, for <input type="datetime-local">.
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function quickTimes(now: Date) {
  const inHour = new Date(now.getTime() + 3_600_000);
  inHour.setMinutes(0, 0, 0);
  inHour.setHours(inHour.getHours() + 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const monday = new Date(now);
  monday.setDate(now.getDate() + (((8 - now.getDay()) % 7) || 7));
  monday.setHours(9, 0, 0, 0);
  return [
    { label: "In about an hour", at: inHour },
    { label: "Tomorrow, 9:00", at: tomorrow },
    { label: "Next Monday, 9:00", at: monday },
  ];
}

function ScheduleDialog({ campaignId, open, onClose }: { campaignId: string; open: boolean; onClose: () => void }) {
  // The time the dialog opened. It mounts fresh every time it opens (see SendPanel).
  const [now] = useState(() => new Date());
  const quick = quickTimes(now);
  const [value, setValue] = useState(() => toLocalInput(quick[1].at));
  const [pending, startTransition] = useTransition();
  const chosen = value ? new Date(value) : null; // a datetime-local value is read as local time
  const valid = chosen !== null && !Number.isNaN(chosen.getTime());
  const tooSoon = valid && chosen.getTime() - now.getTime() < 5 * 60_000;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule the campaign</DialogTitle>
          <DialogDescription>Mailflow sends it at this time. Until then, you can cancel the schedule.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <Button key={q.label} type="button" variant="outline" size="xs" onClick={() => setValue(toLocalInput(q.at))}>
              {q.label}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sendAt" className="text-xs font-medium">
            Date and time
          </label>
          <Input id="sendAt" type="datetime-local" value={value} min={toLocalInput(now)} onChange={(e) => setValue(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">
            {valid
              ? `Sends ${chosen.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} (${zone}).`
              : `Your time zone: ${zone}.`}
          </p>
          {tooSoon && <p className="text-[11px] text-destructive">Choose a time at least 5 minutes from now.</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button
            disabled={!valid || tooSoon || pending}
            onClick={() =>
              startTransition(async () => {
                const res = await run(scheduleCampaign, { id: campaignId, sendAt: chosen!.toISOString() });
                if (res?.ok) onClose();
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <CalendarClock />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestEmailDialog({
  campaignId,
  defaultEmail,
  open,
  onClose,
}: {
  campaignId: string;
  defaultEmail: string;
  open: boolean;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState(defaultEmail);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await run(sendTestEmail, { id: campaignId, emails });
              if (res?.ok) onClose();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Send a test email</DialogTitle>
            <DialogDescription>
              See the email in a real inbox before you send it. The subject starts with [Test]. Tests are not
              tracked and do not count in the report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="test-emails" className="text-xs font-medium">
              Send to
            </label>
            <Input id="test-emails" value={emails} onChange={(e) => setEmails(e.target.value)} autoFocus placeholder="you@example.com, team@example.com" />
            <p className="text-[11px] text-muted-foreground">Up to 5 addresses, separated by commas.</p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !emails.trim()}>
              {pending ? <Loader2 className="animate-spin" /> : <MailCheck />}
              Send test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SendPanel({
  campaign,
  audience,
  blocked,
  userEmail,
}: {
  campaign: { id: string; name: string };
  audience: number;
  blocked: string | null; // why the campaign cannot be sent yet
  userEmail: string;
}) {
  const [dialog, setDialog] = useState<"test" | "schedule" | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [confirmDialog, confirm] = useConfirm();
  const open = (d: "test" | "schedule") => {
    setDialogKey((k) => k + 1); // fresh values every time
    setDialog(d);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send</CardTitle>
        <CardDescription>
          {blocked ? "Fix the items below before you send." : `Ready to go to ${plural(audience, "active contact")}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocked && (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">{blocked}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => open("test")}>
            <MailCheck />
            Send a test
          </Button>
          <Button variant="outline" size="sm" disabled={!!blocked} onClick={() => open("schedule")}>
            <CalendarClock />
            Schedule
          </Button>
          <Button
            size="sm"
            disabled={!!blocked}
            onClick={() =>
              confirm({
                title: `Send "${campaign.name}" now?`,
                description: `It goes to ${plural(audience, "active contact")}. You cannot stop or change a campaign after sending starts.`,
                confirmLabel: "Send now",
                onConfirm: () => run(sendCampaign, { id: campaign.id }),
              })
            }
          >
            <Send />
            Send now
          </Button>
        </div>
      </CardContent>
      <TestEmailDialog
        key={`t${dialogKey}`}
        campaignId={campaign.id}
        defaultEmail={userEmail}
        open={dialog === "test"}
        onClose={() => setDialog(null)}
      />
      <ScheduleDialog key={`s${dialogKey}`} campaignId={campaign.id} open={dialog === "schedule"} onClose={() => setDialog(null)} />
      {confirmDialog}
    </Card>
  );
}

export function CancelScheduleButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(async () => void (await run(cancelSchedule, { id: campaignId })))}
    >
      {pending ? <Loader2 className="animate-spin" /> : <XCircle />}
      Cancel schedule
    </Button>
  );
}
