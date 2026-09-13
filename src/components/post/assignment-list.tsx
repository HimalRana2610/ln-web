"use client";

import { useEffect, useState, useTransition } from "react";

import {
  deletePost,
  fetchMySubmission,
  fetchSubmissions,
  submitWork,
} from "@/app/(app)/classroom/[classroomId]/post-actions";
import { Attachment } from "@/components/post/attachment";
import { LocalTime, useNowMinute } from "@/components/post/local-time";
import { PostComposer } from "@/components/post/post-composer";
import { UploadProgress, useAttachmentUpload } from "@/components/post/use-attachment-upload";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Post, Submission } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ATTACHMENT_ACCEPT, isOverdue } from "@/lib/validation/post";

interface AssignmentListProps {
  classroomId: string;
  initialPosts: Post[];
  canManage: boolean;
}

export function AssignmentList({ classroomId, initialPosts, canManage }: AssignmentListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [syncedFrom, setSyncedFrom] = useState(initialPosts);
  const [composing, setComposing] = useState(false);
  const [submittingTo, setSubmittingTo] = useState<Post | null>(null);
  const [reviewing, setReviewing] = useState<Post | null>(null);

  if (syncedFrom !== initialPosts) {
    setSyncedFrom(initialPosts);
    setPosts(initialPosts);
  }

  function replace(updated: Post) {
    setPosts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assignments</h2>
        {canManage && (
          <Button size="sm" onClick={() => setComposing(true)}>
            New assignment
          </Button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">No assignments yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <AssignmentRow
              key={post.id}
              post={post}
              classroomId={classroomId}
              canManage={canManage}
              onSubmit={() => setSubmittingTo(post)}
              onReview={() => setReviewing(post)}
              onDeleted={(id) => setPosts((current) => current.filter((p) => p.id !== id))}
            />
          ))}
        </ul>
      )}

      {canManage ? (
        <>
          <PostComposer
            classroomId={classroomId}
            kind="assignment"
            open={composing}
            onClose={() => setComposing(false)}
            onCreated={(post) => setPosts((current) => [post, ...current])}
          />
          {reviewing && (
            <SubmissionsDialog post={reviewing} onClose={() => setReviewing(null)} />
          )}
        </>
      ) : (
        submittingTo && (
          <SubmitDialog
            classroomId={classroomId}
            post={submittingTo}
            onClose={() => setSubmittingTo(null)}
            onSubmitted={(submission) =>
              replace({ ...submittingTo, my_submitted_at: submission.submitted_at })
            }
          />
        )
      )}
    </>
  );
}

function AssignmentRow({
  post,
  classroomId,
  canManage,
  onSubmit,
  onReview,
  onDeleted,
}: {
  post: Post;
  classroomId: string;
  canManage: boolean;
  onSubmit: () => void;
  onReview: () => void;
  onDeleted: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const submitted = post.my_submitted_at !== null;

  function remove() {
    const count = post.submission_count ?? 0;
    const warning =
      count > 0
        ? `Delete "${post.title}" and all ${count} submission${count === 1 ? "" : "s"}? Students' files are deleted too. This cannot be undone.`
        : `Delete "${post.title}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    startTransition(async () => {
      const result = await deletePost(classroomId, post.id);
      if (result.ok) onDeleted(post.id);
      else window.alert(result.error);
    });
  }

  return (
    <li
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white">{post.title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {post.due_date ? (
              <DueLabel dueDate={post.due_date} done={submitted} />
            ) : (
              "No due date"
            )}{" "}
            · {post.author_name}
          </p>
        </div>

        {canManage ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {post.submission_count ?? 0} submitted
          </span>
        ) : (
          <StudentBadge post={post} />
        )}
      </div>

      {post.description && (
        <p className="mt-3 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {post.description}
        </p>
      )}

      {post.asset && <Attachment asset={post.asset} className="mt-3" />}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {canManage ? (
          <>
            <Button variant="ghost" size="sm" onClick={remove} isLoading={isPending}>
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={onReview}>
              View submissions
            </Button>
          </>
        ) : (
          <Button size="sm" variant={submitted ? "secondary" : "primary"} onClick={onSubmit}>
            {submitted ? "View or resubmit" : "Submit work"}
          </Button>
        )}
      </div>
    </li>
  );
}

function DueLabel({ dueDate, done }: { dueDate: string; done: boolean }) {
  const now = useNowMinute();
  const overdue = !done && now !== null && isOverdue(dueDate, now);
  return (
    <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : undefined}>
      Due <LocalTime iso={dueDate} withTime />
    </span>
  );
}

function StudentBadge({ post }: { post: Post }) {
  if (post.my_submitted_at) {
    // Compared as instants: the two strings may carry different offsets.
    const late =
      post.due_date !== null &&
      new Date(post.my_submitted_at).getTime() > new Date(post.due_date).getTime();
    return (
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
          late
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
        )}
      >
        {late ? "Submitted late" : "Submitted"}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      Not submitted
    </span>
  );
}

// -- student -------------------------------------------------------------

function SubmitDialog({
  classroomId,
  post,
  onClose,
  onSubmitted,
}: {
  classroomId: string;
  post: Post;
  onClose: () => void;
  onSubmitted: (submission: Submission) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Submission | null>(null);
  const { upload, percent } = useAttachmentUpload();
  const hasSubmitted = post.my_submitted_at !== null;

  // Show the existing submission, when there is one.
  useEffect(() => {
    if (!hasSubmitted) return;
    let cancelled = false;
    void fetchMySubmission(post.id).then((result) => {
      if (!cancelled && result.ok) setCurrent(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [hasSubmitted, post.id]);

  async function send() {
    if (!file) return setError("Choose a file to submit");
    setError(null);
    setBusy(true);
    try {
      const uploaded = await upload(file);
      if (!uploaded.ok) return setError(uploaded.error);

      const result = await submitWork(classroomId, post.id, uploaded.assetId);
      if (!result.ok) return setError(result.error);

      onSubmitted(result.data);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const now = useNowMinute();
  const overdue = now !== null && isOverdue(post.due_date, now);

  return (
    <Modal open onClose={onClose} title={post.title}>
      <div className="mt-4 flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}

        {post.my_submitted_at && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Your submission
            </p>
            {current ? (
              <>
                <Attachment asset={current.asset} />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Submitted <LocalTime iso={current.submitted_at} withTime />
                  {current.is_late && " · late"}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Loading…</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="submission-file"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {post.my_submitted_at ? "Replace with a new file" : "Your work"}
          </label>
          <input
            id="submission-file"
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white dark:border-slate-700 dark:file:bg-white dark:file:text-slate-900"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {post.my_submitted_at
              ? "Resubmitting replaces your earlier file; your teacher sees only the latest."
              : "Up to 100 MB."}
            {overdue && " The due date has passed — this will be marked late."}
          </p>
          <UploadProgress percent={percent} />
        </div>

        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button type="button" onClick={send} isLoading={busy} className="flex-1">
            {post.my_submitted_at ? "Resubmit" : "Submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// -- teacher -------------------------------------------------------------

function SubmissionsDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSubmissions(post.id).then((result) => {
      if (cancelled) return;
      if (result.ok) setSubmissions(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  return (
    <Modal open onClose={onClose} title={`Submissions · ${post.title}`} size="wide">
      <div className="mt-4">
        {error && <Alert>{error}</Alert>}
        {!error && submissions === null && <p className="text-sm text-slate-500">Loading…</p>}
        {submissions?.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nobody has submitted yet.
          </p>
        )}

        {submissions && submissions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase dark:text-slate-400">
                <tr>
                  <th className="py-2 pr-4 font-medium">Student</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                  <th className="py-2 font-medium">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="align-middle">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {submission.student_name}
                      </p>
                      <p className="text-xs text-slate-500">{submission.student_email}</p>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <LocalTime iso={submission.submitted_at} withTime />
                      {submission.is_late && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Late
                        </span>
                      )}
                    </td>
                    <td className="min-w-56 py-3">
                      <Attachment asset={submission.asset} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
