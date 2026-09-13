import type { Metadata } from "next";
import Link from "next/link";

import { DeleteFaceButton } from "@/components/security/delete-face-button";
import { LocalTime } from "@/components/post/local-time";
import { authedFetch } from "@/lib/api/server";
import type { FaceStatus, MySecurityStatus } from "@/lib/api/types";

export const metadata: Metadata = { title: "Account security" };

export default async function SecurityPage() {
  const [status, face] = await Promise.all([
    authedFetch<MySecurityStatus>("/users/me/security"),
    authedFetch<FaceStatus>("/face/status"),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="-my-3 inline-block py-3 text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← All classes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Account security
        </h1>
      </div>

      <Card title="Email">
        {status.email_verified ? (
          <p>Verified.</p>
        ) : (
          <p>
            Not verified.{" "}
            <Link href="/verify-email" className="font-medium text-blue-600 hover:underline">
              Verify now
            </Link>{" "}
            — needed before you can mark attendance.
          </p>
        )}
      </Card>

      <Card title="Attendance phone">
        {status.device ? (
          <p>
            Bound to {status.device.model ?? status.device.platform} since{" "}
            <LocalTime iso={status.device.bound_at} />. Attendance can only be marked from this
            phone. If you change phones, ask a teacher to reset it.
          </p>
        ) : (
          <p>No phone bound yet. Sign in to the mobile app to bind one.</p>
        )}
      </Card>

      <Card title="Face data">
        {!face.available ? (
          <p>Face recognition is not set up on this server.</p>
        ) : face.enrolled ? (
          <div className="flex flex-col gap-3">
            <p>
              Enrolled {face.enrolled_at && <LocalTime iso={face.enrolled_at} />}. Only a
              numerical description of your face is stored — never a photo. You can delete it at
              any time.
            </p>
            <DeleteFaceButton />
          </div>
        ) : (
          <p>Not enrolled. Enrolment is done from the mobile app.</p>
        )}
      </Card>

      {status.blocks.length > 0 && (
        <Card title="Blocked classes">
          <ul className="flex flex-col gap-2">
            {status.blocks.map((block) => (
              <li key={block.classroom_id}>
                <strong>{block.classroom_name}</strong>
                {block.reason ? ` — ${block.reason}` : ""}. Speak to your teacher to have it
                cleared.
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}
