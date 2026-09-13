import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { NotificationsToggle } from "@/components/settings/notifications-toggle";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemePicker } from "@/components/settings/theme-picker";
import { authedFetch } from "@/lib/api/server";
import type { User } from "@/lib/api/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await authedFetch<User>("/users/me");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="-my-3 inline-block py-3 text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← All classes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <Card title="Profile">
        <ProfileForm user={user} />
      </Card>

      <Card title="Appearance">
        <ThemePicker />
      </Card>

      <Card title="Notifications">
        <NotificationsToggle />
      </Card>

      <Card title="Security">
        <p>
          Email verification, your attendance phone and face data.{" "}
          <Link
            href="/security"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Account security
          </Link>
        </p>
      </Card>

      <Card title="Account">
        <div className="flex flex-col gap-3">
          <div>
            <SignOutButton />
          </div>
          <DeleteAccountButton />
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}
