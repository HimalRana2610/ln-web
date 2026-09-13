"use client";

import { useState } from "react";

import { presignUpload } from "@/app/(app)/classroom/[classroomId]/actions";
import { uploadToStorage } from "@/lib/upload";
import { attachmentContentType, MAX_ATTACHMENT_BYTES } from "@/lib/validation/post";

export type UploadOutcome = { ok: true; assetId: string } | { ok: false; error: string };

/**
 * Presign, then PUT straight to storage, reporting progress.
 *
 * Shared by the post composer and the submission dialog. Returns the asset id
 * to hand to the API; the API itself confirms with storage that the PUT landed.
 */
export function useAttachmentUpload() {
  const [percent, setPercent] = useState<number | null>(null);

  async function upload(file: File): Promise<UploadOutcome> {
    const contentType = attachmentContentType(file);
    if (!contentType) {
      return { ok: false, error: "That file type is not supported" };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: "That file is larger than 100 MB" };
    }

    const slot = await presignUpload(file.name, contentType, file.size, "attachment");
    if (!slot.ok) return { ok: false, error: slot.error };

    try {
      setPercent(0);
      await uploadToStorage(slot.data.upload_url, slot.data.content_type, file, setPercent);
    } catch (caught) {
      return { ok: false, error: caught instanceof Error ? caught.message : "Upload failed" };
    } finally {
      setPercent(null);
    }

    return { ok: true, assetId: slot.data.asset_id };
  }

  return { upload, percent };
}

export function UploadProgress({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  return (
    <div
      className="mt-2"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Uploading… {percent}%</p>
    </div>
  );
}
