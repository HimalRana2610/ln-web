"use client";

import { useState, useTransition } from "react";

import { updateProfile } from "@/app/(app)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { User } from "@/lib/api/types";

export function ProfileForm({ user }: { user: User }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [institute, setInstitute] = useState(user.institute ?? "");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await updateProfile({ full_name: fullName, institute });
          setMessage(
            result.ok
              ? { tone: "info", text: "Saved." }
              : { tone: "error", text: result.error },
          );
        });
      }}
    >
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Field label="Email" value={user.email} disabled readOnly />
      <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Field
        label="Institute"
        value={institute}
        onChange={(e) => setInstitute(e.target.value)}
        placeholder="Optional"
      />
      <Button type="submit" size="sm" isLoading={pending} className="self-start">
        Save profile
      </Button>
    </form>
  );
}
