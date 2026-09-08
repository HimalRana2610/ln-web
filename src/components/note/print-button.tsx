"use client";

import { Button } from "@/components/ui/button";

/**
 * PDF export, via the browser's own print dialog.
 *
 * The old app bundled html2pdf. Printing is free, needs no library, and gives a
 * better result — the text stays selectable instead of being rasterised to a
 * canvas. Print styling lives in `globals.css`.
 */
export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      Save as PDF
    </Button>
  );
}
