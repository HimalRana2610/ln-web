"use client";

import { useState } from "react";

import { createPost } from "@/app/(app)/classroom/[classroomId]/post-actions";
import { UploadProgress, useAttachmentUpload } from "@/components/post/use-attachment-upload";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { Post, PostKind } from "@/lib/api/types";
import {
  ATTACHMENT_ACCEPT,
  KIND_LABEL,
  localInputToIso,
  postSchema,
} from "@/lib/validation/post";

interface PostComposerProps {
  classroomId: string;
  kind: PostKind;
  open: boolean;
  onClose: () => void;
  onCreated: (post: Post) => void;
}

const FILE_LABEL: Record<PostKind, string> = {
  material: "File",
  announcement: "Attachment (optional)",
  assignment: "Brief or worksheet (optional)",
};

export function PostComposer({
  classroomId,
  kind,
  open,
  onClose,
  onCreated,
}: PostComposerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { upload, percent } = useAttachmentUpload();

  function close() {
    setTitle("");
    setDescription("");
    setDue("");
    setFile(null);
    setError(null);
    setBusy(false);
    onClose();
  }

  async function submit() {
    setError(null);

    // Validate before uploading, so a missing title does not cost a 50 MB PUT.
    const parsed = postSchema.safeParse({
      kind,
      title,
      description,
      due,
      hasFile: file !== null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check what you entered");
      return;
    }

    setBusy(true);
    try {
      let assetId: string | null = null;
      if (file) {
        const uploaded = await upload(file);
        if (!uploaded.ok) return setError(uploaded.error);
        assetId = uploaded.assetId;
      }

      const result = await createPost(classroomId, {
        kind,
        title,
        description,
        due,
        // Converted here, in the browser, which knows the teacher's timezone.
        dueIso: kind === "assignment" ? localInputToIso(due) : null,
        assetId,
      });
      if (!result.ok) return setError(result.error);

      onCreated(result.data);
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={`New ${KIND_LABEL[kind].toLowerCase()}`}>
      <div className="mt-4 flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}

        <Field
          label="Title"
          value={title}
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={
            kind === "assignment"
              ? "Lab 3: process scheduling"
              : kind === "material"
                ? "Week 3 slides"
                : "No lecture on Friday"
          }
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="post-description"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {kind === "announcement" ? "Message" : "Description (optional)"}
          </label>
          <textarea
            id="post-description"
            rows={kind === "announcement" ? 5 : 3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400"
          />
        </div>

        {kind === "assignment" && (
          <Field
            label="Due"
            type="datetime-local"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            hint="In your timezone. Students see it converted to theirs. Leave blank for no deadline."
          />
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="post-file"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {FILE_LABEL[kind]}
          </label>
          <input
            id="post-file"
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white dark:border-slate-700 dark:file:bg-white dark:file:text-slate-900"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Documents, slides, spreadsheets, images, audio or video, up to 100 MB.
          </p>
          <UploadProgress percent={percent} />
        </div>

        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={submit} isLoading={busy} className="flex-1">
            Post
          </Button>
        </div>
      </div>
    </Modal>
  );
}
