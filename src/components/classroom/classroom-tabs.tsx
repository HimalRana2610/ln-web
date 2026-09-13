"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { visibleTabs, type ClassroomTab } from "@/lib/classroom-tabs";
import { cn } from "@/lib/utils";

/**
 * Section tabs as links, so each section has a shareable URL and the back
 * button works. The page fetches only the active section's data.
 */
export function ClassroomTabs({
  active,
  canManage,
  children,
}: {
  active: ClassroomTab;
  canManage: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <nav
        aria-label="Classroom sections"
        className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700"
      >
        {visibleTabs(canManage).map(({ value, label }) => (
          <Link
            key={value}
            href={value === "stream" ? pathname : `${pathname}?tab=${value}`}
            aria-current={active === value ? "page" : undefined}
            scroll={false}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition",
              active === value
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
