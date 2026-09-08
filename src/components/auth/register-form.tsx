"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  PASSWORD_MIN_LENGTH,
  registerSchema,
  type RegisterValues,
} from "@/lib/validation/auth";

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      institute: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setFormError(body?.error?.message ?? "Could not create your account. Please try again.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {formError && <Alert>{formError}</Alert>}

      <Field
        label="Full name"
        autoComplete="name"
        placeholder="Ada Lovelace"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@university.edu"
        error={errors.email?.message}
        {...register("email")}
      />

      <Field
        label="Institute"
        autoComplete="organization"
        placeholder="Optional"
        error={errors.institute?.message}
        {...register("institute")}
      />

      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. A passphrase works well.`}
        error={errors.password?.message}
        {...register("password")}
      />

      <Field
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" isLoading={isSubmitting} className="mt-2">
        Create account
      </Button>
    </form>
  );
}
