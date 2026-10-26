import { Suspense } from "react";
import { CheckCircle2, MailWarning } from "lucide-react";
import { createSessionClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth";
import { LocalTime } from "@/components/local-time";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailForm, NameForm, PasswordForm } from "./account-forms";
import { SessionsList, type DeviceSession } from "./sessions";
import { TwoFactor } from "./two-factor";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Account settings</h1>
        <p className="text-xs text-muted-foreground">Your profile, password, 2-step verification, and logged-in devices</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-xl" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const user = await requireUser();
  const { account } = await createSessionClient();
  const { sessions } = await account.listSessions();

  const devices: DeviceSession[] = sessions
    .map((s) => ({
      id: s.$id,
      current: s.current,
      browser: [s.clientName, s.clientVersion].filter(Boolean).join(" "),
      os: [s.osName, s.osVersion].filter(Boolean).join(" "),
      device: s.deviceName,
      createdAt: s.$createdAt,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Member since <LocalTime iso={user.registration || user.$createdAt} dateOnly />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NameForm name={user.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email address</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-foreground">{user.email}</span>
            {user.emailVerification ? (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <MailWarning className="size-3.5" />
                Not verified yet
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user.emailVerification && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              Verify your email to send campaigns and turn on automations.
              <ResendVerificationButton />
            </div>
          )}
          <EmailForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            {user.passwordUpdate ? (
              <>
                Last changed <LocalTime iso={user.passwordUpdate} dateOnly />
              </>
            ) : (
              "Use a password that you do not use on other websites."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm email={user.email} name={user.name} />
        </CardContent>
      </Card>

      <Card id="two-factor">
        <CardHeader>
          <CardTitle>2-step verification</CardTitle>
          <CardDescription>A second check when you log in, after your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactor enabled={user.mfa} />
        </CardContent>
      </Card>

      <Card id="devices">
        <CardHeader>
          <CardTitle>Logged-in devices</CardTitle>
          <CardDescription>The browsers where your account is logged in now.</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsList sessions={devices} />
        </CardContent>
      </Card>
    </>
  );
}
