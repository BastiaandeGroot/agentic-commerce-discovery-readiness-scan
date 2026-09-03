'use client';

// Dialoog op het native <dialog>-element.
//
// Bewust geen eigen overlay met een z-index-race: de browser regelt de toplayer,
// het vangen van focus en Escape zelf, en doet dat beter dan een handgemaakte
// variant. Wat wij toevoegen is de vorm en het sluiten bij een klik ernaast.

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({ open, onClose, title, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Klik op de backdrop: het doel is dan het dialog-element zelf.
        if (event.target === ref.current) onClose();
      }}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Sluiten</span>
        </button>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed">{children}</div>
      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>
      ) : null}
    </dialog>
  );
}
