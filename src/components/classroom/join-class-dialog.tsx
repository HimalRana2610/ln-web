"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { joinClassroom } from "@/app/(app)/dashboard/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { CLASS_CODE_LENGTH, joinClassroomSchema } from "@/lib/validation/classroom";

interface JoinClassDialogProps {
  open: boolean;
  onClose: () => void;
}

// The schema uppercases the code, so the parsed output type differs from the
// form's input type. `useForm` is typed on the raw input.
interface JoinFormValues {
  code: string;
}

export function JoinClassDialog({ open, onClose }: JoinClassDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(joinClassroomSchema),
    defaultValues: { code: "" },
  });

  function close() {
    reset();
    setFormError(null);
    onClose();
  }

  async function onSubmit(values: JoinFormValues) {
    setFormError(null);
    const result = await joinClassroom(values);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Join a class">
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        Enter the {CLASS_CODE_LENGTH}-character code your teacher shared.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && <Alert>{formError}</Alert>}

        <Field
          label="Class code"
          placeholder="A1B2C3"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={CLASS_CODE_LENGTH}
          className="text-center font-mono text-lg tracking-[0.3em] uppercase"
          error={errors.code?.message}
          {...register("code")}
        />

        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Join
          </Button>
        </div>
      </form>
    </Modal>
  );
}
