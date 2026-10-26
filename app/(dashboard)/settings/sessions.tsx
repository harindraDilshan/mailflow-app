"use client";

import { useTransition } from "react";
import { LogOut, Monitor, Smartphone, Tablet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocalTime } from "@/components/local-time";
import { useConfirm } from "@/components/confirm-dialog";
import { runAction } from "@/components/run-action";
import { signOut } from "@/app/(auth)/actions";
import { endAllOtherSessions, endSession } from "./actions";

export type DeviceSession = {
  id: string;
  current: boolean;
  browser: string;
  os: string;
  device: string; // desktop, smartphone, tablet, ...
  createdAt: string;
};

const iconOf = (device: string) =>
  /phone/i.test(device) ? Smartphone : /tablet/i.test(device) ? Tablet : Monitor;

export function SessionsList({ sessions }: { sessions: DeviceSession[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmDialog, confirm] = useConfirm();
  const others = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {sessions.map((s) => {
          const Icon = iconOf(s.device);
          return (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  {s.browser || "Unknown browser"} on {s.os || "an unknown system"}
                  {s.current && (
                    <Badge variant="secondary" className="font-normal">
                      This device
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Logged in <LocalTime iso={s.createdAt} />
                </div>
              </div>
              {s.current ? (
                <form action={signOut}>
                  <Button type="submit" variant="ghost" size="xs">
                    <LogOut />
                    Log out
                  </Button>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={pending}
                  onClick={() => startTransition(async () => void (await runAction(endSession, { id: s.id })))}
                >
                  <LogOut />
                  Log out
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others > 0 && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            confirm({
              title: "Log out of all other devices?",
              description: `This ends ${others} other ${others === 1 ? "session" : "sessions"}. This device stays logged in.`,
              confirmLabel: "Log them out",
              onConfirm: () => runAction(endAllOtherSessions, {}),
            })
          }
        >
          Log out of all other devices
        </Button>
      )}
      <p className="text-[11px] text-muted-foreground">
        Do not know a device? Log it out and change your password.
      </p>
      {confirmDialog}
    </div>
  );
}
