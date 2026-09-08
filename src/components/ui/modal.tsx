"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Dialog built on the native `<dialog>` element.
 *
 * Using the platform element rather than a div gives focus trapping, Escape to
 * close, inert background content and the top layer for free — all things a
 * hand-rolled modal usually gets wrong.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // Fires on Escape as well as dialog.close(), so both paths are handled.
      onClose={onClose}
      onClick={(event) => {
        // Clicks land on the dialog itself only when hitting the backdrop,
        // because the inner wrapper covers the whole content box.
        if (event.target === dialogRef.current) onClose();
      }}
      aria-label={title}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="p-6">
        <h2 className="mb-1 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
