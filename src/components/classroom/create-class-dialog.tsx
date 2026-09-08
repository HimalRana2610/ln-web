"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { createClassroom } from "@/app/(app)/dashboard/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  createClassroomSchema,
  THEME_COLORS,
  type CreateClassroomValues,
} from "@/lib/validation/classroom";
import { cn } from "@/lib/utils";

interface CreateClassDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateClassDialog({ open, onClose }: CreateClassDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassroomValues>({
    resolver: zodResolver(createClassroomSchema),
    defaultValues: {
      name: "",
      section: "",
      type: "personal",
      theme_color: THEME_COLORS[0],
    },
  });

  // useWatch rather than watch(): watch() returns a fresh function each render,
  // which React Compiler cannot memoize safely.
  const selectedTheme = useWatch({ control, name: "theme_color" });
  const selectedType = useWatch({ control, name: "type" });

  function close() {
    reset();
    setFormError(null);
    onClose();
  }

  async function onSubmit(values: CreateClassroomValues) {
    setFormError(null);
    const result = await createClassroom(values);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Create a class">
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        You will be the owner. Share the join code with your students.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && <Alert>{formError}</Alert>}

        <Field
          label="Class name"
          placeholder="Discrete Mathematics"
          error={errors.name?.message}
          {...register("name")}
        />

        <Field
          label="Section"
          placeholder="Optional — e.g. B, Semester 4"
          error={errors.section?.message}
          {...register("section")}
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Visibility
          </legend>
          <div className="flex gap-2">
            {(["personal", "public"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue("type", value, { shouldDirty: true })}
                aria-pressed={selectedType === value}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition",
                  selectedType === value
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
              >
                {value === "personal" ? "Private" : "Public"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Card colour
          </legend>
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map((theme) => (
              <button
                key={theme}
                type="button"
                aria-label={theme}
                aria-pressed={selectedTheme === theme}
                onClick={() => setValue("theme_color", theme, { shouldDirty: true })}
                className={cn(
                  "size-9 rounded-lg bg-gradient-to-br transition",
                  theme,
                  selectedTheme === theme
                    ? "ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900"
                    : "hover:scale-105",
                )}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
