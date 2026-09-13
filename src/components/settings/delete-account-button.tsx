"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteAccount } from "@/app/(app)/settings/actions";
import { clearOfflineCache } from "@/components/offline/service-worker-registrar";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PUSH_TOKEN_KEY } from "@/lib/push";

/**
 * Deleting an account removes every class, note and file the user owns, so it
 * asks for the password rather than a click-through confirm.
 */
export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setPassword("");
    setError(null);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="self-start text-red-700 dark:text-red-300"
        onClick={() => setOpen(true)}
      >
        Delete account
      </Button>

      <Modal open={open} onClose={close} title="Delete account">
        <form
          className="mt-3 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await deleteAccount(password);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              // The session cookies went with the account; tidy this browser too.
              try {
                localStorage.removeItem(PUSH_TOKEN_KEY);
              } catch {
                // Ignore.
              }
              await clearOfflineCache();
              router.replace("/login");
              router.refresh();
            });
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This permanently deletes your account, the classes you own and everything in them.
            It cannot be undone.
          </p>
          {error && <Alert>{error}</Alert>}
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" isLoading={pending} disabled={!password}>
              Delete forever
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
