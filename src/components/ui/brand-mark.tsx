import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Logo tile and handwritten wordmark, as in the old app's header and sign-in
 * screen. The wordmark is Kalam — the same face as note headings.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const large = size === "lg";

  return (
    <span className={cn("flex items-center gap-3", large && "flex-col gap-4", className)}>
      <Image
        src="/logo.png"
        alt=""
        width={large ? 80 : 40}
        height={large ? 80 : 40}
        priority
        className={cn(
          "shadow-lg shadow-blue-500/20",
          large ? "size-20 rounded-3xl ring-4 ring-white/20" : "size-10 rounded-xl",
        )}
      />
      <span
        className={cn(
          "font-handwriting font-bold tracking-tight text-white",
          large ? "text-4xl" : "text-xl",
        )}
      >
        LectureNote AI
      </span>
    </span>
  );
}
