"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearOfflineCache } from "@/components/offline/service-worker-registrar";
import { Button } from "@/components/ui/button";
import { disablePush } from "@/lib/push";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    // Before logout, while the session can still authorise the removal: the
    // next person on this browser must not get the previous user's alerts.
    await disablePush().catch(() => {});
    await fetch("/api/auth/logout", { method: "POST" });
    // Cached notes belong to the person who opened them.
    await clearOfflineCache().catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" onClick={signOut} isLoading={isPending}>
      Sign out
    </Button>
  );
}
