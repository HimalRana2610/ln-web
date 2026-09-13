"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { disablePush, enablePush, isPushConfigured, storedPushToken } from "@/lib/push";

const noop = () => () => {};

/** Opt-in push. Never prompts for permission until the user asks. */
export function NotificationsToggle() {
  // localStorage is unknown during server rendering; treat it as off until hydrated.
  const storedOn = useSyncExternalStore(
    noop,
    () => storedPushToken() !== null,
    () => false,
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isPushConfigured()) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Notifications are not set up on this server.
      </p>
    );
  }

  const enabled = override ?? storedOn;

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert>{error}</Alert>}
      <p>
        {enabled
          ? "This browser gets notified about new materials, assignments and attendance."
          : "Get notified in this browser about new materials, assignments and attendance."}
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        isLoading={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            if (enabled) {
              await disablePush();
              setOverride(false);
              return;
            }
            try {
              const problem = await enablePush();
              if (problem) setError(problem);
              else setOverride(true);
            } catch {
              setError("Could not turn on notifications. Please try again.");
            }
          });
        }}
      >
        {enabled ? "Turn off notifications" : "Enable notifications"}
      </Button>
    </div>
  );
}
