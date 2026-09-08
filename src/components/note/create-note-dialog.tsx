"use client";

import { useState } from "react";

import {
  createNoteFromText,
  createNoteFromUpload,
  createNoteFromYoutube,
  presignUpload,
} from "@/app/(app)/classroom/[classroomId]/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { Note } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  isSupportedUpload,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  uploadContentType,
} from "@/lib/validation/note";

type Tab = "upload" | "text" | "youtube";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "upload", label: "Audio / PDF" },
  { value: "text", label: "Paste text" },
  { value: "youtube", label: "YouTube" },
];

interface CreateNoteDialogProps {
  classroomId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (note: Note) => void;
}

export function CreateNoteDialog({
  classroomId,
  open,
  onClose,
  onCreated,
}: CreateNoteDialogProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setText("");
    setYoutubeUrl("");
    setFile(null);
    setDate("");
    setError(null);
    setUploadPercent(null);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  function succeed(note: Note) {
    onCreated(note);
    close();
  }

  /**
   * PUT the file straight to object storage.
   *
   * `XMLHttpRequest` rather than `fetch` purely for `upload.onprogress` —
   * `fetch` still cannot report upload progress, and a 90-minute recording
   * without a progress bar looks indistinguishable from a hang.
   */
  function uploadToStorage(url: string, contentType: string, blob: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", url);
      request.setRequestHeader("Content-Type", contentType);

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadPercent(Math.round((event.loaded / event.total) * 100));
        }
      };
      request.onload = () =>
        request.status >= 200 && request.status < 300
          ? resolve()
          : reject(new Error(`Upload failed (${request.status})`));
      request.onerror = () => reject(new Error("Upload failed. Check your connection."));

      request.send(blob);
    });
  }

  async function submit() {
    setError(null);
    setBusy(true);

    try {
      if (tab === "text") {
        const result = await createNoteFromText(classroomId, { text, date });
        if (!result.ok) return setError(result.error);
        return succeed(result.data);
      }

      if (tab === "youtube") {
        const result = await createNoteFromYoutube(classroomId, {
          youtube_url: youtubeUrl,
          date,
        });
        if (!result.ok) return setError(result.error);
        return succeed(result.data);
      }

      if (!file) return setError("Choose a recording or PDF first");
      if (!isSupportedUpload(file)) {
        return setError("That file type is not supported. Use audio or a PDF.");
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return setError("That file is larger than 200 MB");
      }

      const contentType = uploadContentType(file);
      const slot = await presignUpload(file.name, contentType, file.size);
      if (!slot.ok) return setError(slot.error);

      setUploadPercent(0);
      await uploadToStorage(slot.data.upload_url, slot.data.content_type, file);
      setUploadPercent(null);

      const result = await createNoteFromUpload(classroomId, slot.data.asset_id, date);
      if (!result.ok) return setError(result.error);
      succeed(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="New note">
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        Notes are generated in the background. You can close this and come back —
        the list updates itself.
      </p>

      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition",
              tab === value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}

        {tab === "upload" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="note-file"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Recording or PDF
            </label>
            <input
              id="note-file"
              type="file"
              accept={UPLOAD_ACCEPT}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white dark:border-slate-700 dark:file:bg-white dark:file:text-slate-900"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Up to 200 MB. Uploads go straight to storage, not through the server.
            </p>

            {uploadPercent !== null && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Uploading… {uploadPercent}%</p>
              </div>
            )}
          </div>
        )}

        {tab === "text" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="note-text"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Lecture material
            </label>
            <textarea
              id="note-text"
              rows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste a transcript, your rough notes, or the lecture handout…"
              className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400"
            />
          </div>
        )}

        {tab === "youtube" && (
          <Field
            label="YouTube link"
            placeholder="https://youtu.be/…"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
          />
        )}

        <Field
          label="Lecture date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          hint="Leave blank for today."
        />

        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={submit} isLoading={busy} className="flex-1">
            Generate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
