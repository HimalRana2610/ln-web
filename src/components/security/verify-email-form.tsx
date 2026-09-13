"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { sendVerificationCode, verifyEmailCode } from "@/app/(app)/security-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { normaliseOtp, resendLabel } from "@/lib/security";

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [verifying, startVerifying] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function send() {
    setError(null);
    startSending(async () => {
      const result = await sendVerificationCode();
      if (result.ok) {
        setSentTo(result.data.sent_to);
        setCooldown(result.data.resend_after_seconds);
      } else {
        setError(result.error);
      }
    });
  }

  function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startVerifying(async () => {
      const result = await verifyEmailCode(code);
      if (result.ok) router.replace("/dashboard");
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <Alert>{error}</Alert>}

      {sentTo === null ? (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            We will email a six-digit code to <strong>{email}</strong>. You need a verified
            email to mark attendance.
          </p>
          <Button onClick={send} isLoading={sending}>
            Send code
          </Button>
        </>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Enter the code sent to <strong>{sentTo}</strong>. It expires in 10 minutes.
          </p>
          <Field
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="font-mono tracking-[0.4em]"
          />
          <Button type="submit" isLoading={verifying} disabled={normaliseOtp(code) === null}>
            Verify email
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={send}
            disabled={cooldown > 0}
            isLoading={sending}
          >
            {resendLabel(cooldown)}
          </Button>
        </form>
      )}
    </div>
  );
}
