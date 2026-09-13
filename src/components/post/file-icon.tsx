import { fileCategory, type FileCategory } from "@/lib/validation/post";
import { cn } from "@/lib/utils";

const STYLE: Record<FileCategory, { label: string; className: string }> = {
  pdf: { label: "PDF", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  document: {
    label: "DOC",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  slides: {
    label: "PPT",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  sheet: {
    label: "XLS",
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  image: {
    label: "IMG",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  audio: {
    label: "AUD",
    className: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  },
  video: {
    label: "VID",
    className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  },
  archive: {
    label: "ZIP",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  text: {
    label: "TXT",
    className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  },
  other: {
    label: "FILE",
    className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  },
};

/** A type badge. Text rather than an icon font, so it needs no extra asset. */
export function FileIcon({
  contentType,
  filename,
  className,
}: {
  contentType: string;
  filename?: string;
  className?: string;
}) {
  const { label, className: tone } = STYLE[fileCategory(contentType, filename)];
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold tracking-wide",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
