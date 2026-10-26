"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerification } from "@/app/(auth)/actions";

export function ResendVerificationButton({ size = "xs" }: { size?: "xs" | "sm" }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await resendVerification();
          if (res?.error) toast.error(res.error);
          else toast.success(res?.message ?? "Email sent.");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <MailCheck />}
      Send the link again
    </Button>
  );
}
