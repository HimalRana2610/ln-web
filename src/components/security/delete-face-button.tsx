"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteMyFace } from "@/app/(app)/security-actions";
import { Button } from "@/components/ui/button";

export function DeleteFaceButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      isLoading={pending}
      className="self-start"
      onClick={() => {
        if (!window.confirm("Delete your face data? You can enrol again later.")) return;
        startTransition(async () => {
          const result = await deleteMyFace();
          if (!result.ok) window.alert(result.error);
          router.refresh();
        });
      }}
    >
      Delete face data
    </Button>
  );
}
