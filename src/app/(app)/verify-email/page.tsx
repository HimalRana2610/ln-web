import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyEmailForm } from "@/components/security/verify-email-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage() {
  // The layout has already confirmed a session; this only decides the content.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.is_email_verified) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
        Verify your email
      </h1>
      <VerifyEmailForm email={user.email} />
    </div>
  );
}
