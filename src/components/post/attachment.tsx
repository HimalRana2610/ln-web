"use client";

import { useState, useTransition } from "react";

import { getDownloadLink } from "@/app/(app)/classroom/[classroomId]/post-actions";
import { FileIcon } from "@/components/post/file-icon";
import type { AssetInfo } from "@/lib/api/types";
import { formatBytes } from "@/lib/validation/post";
import { cn } from "@/lib/utils";

/**
 * A file with a download button.
 *
 * The URL is fetched on click, not rendered into the page: presigned URLs
 * expire after fifteen minutes, so one baked into the HTML would be dead for
 * anyone who left the tab open. Storage serves it as an attachment under its
 * original filename, so plain navigation downloads rather than replacing the
 * page — and the bytes never pass through our server.
 */
export function Attachment({ asset, className }: { asset: AssetInfo; className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function download() {
    setError(null);
    startTransition(async () => {
      const link = await getDownloadLink(asset.id);
      if (!link.ok) {
        setError(link.error);
        return;
      }
      window.location.assign(link.data.url);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700",
        className,
      )}
    >
      <FileIcon contentType={asset.content_type} filename={asset.filename} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
          {asset.filename}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {error ? (
            <span className="text-red-600 dark:text-red-400">{error}</span>
          ) : (
            formatBytes(asset.size_bytes)
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={download}
        disabled={isPending}
        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-300 dark:hover:bg-blue-950"
      >
        {isPending ? "Preparing…" : "Download"}
      </button>
    </div>
  );
}
