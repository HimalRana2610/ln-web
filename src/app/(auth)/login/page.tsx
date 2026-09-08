import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Welcome back</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Sign in to continue to your classes.
      </p>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{" "}
        <Link
          href="/register"
          className="font-medium text-slate-900 underline underline-offset-4 dark:text-white"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
