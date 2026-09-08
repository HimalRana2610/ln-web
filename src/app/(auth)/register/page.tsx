import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
        Create your account
      </h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        It takes less than a minute.
      </p>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-slate-900 underline underline-offset-4 dark:text-white"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
