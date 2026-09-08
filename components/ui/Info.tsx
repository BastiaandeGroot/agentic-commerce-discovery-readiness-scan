'use client';

import type { ReactNode } from 'react';

/**
 * Het "i"-knopje. De uitleg zelf zet de aanroeper eronder, niet als zwevend
 * paneel: twee open tooltips in dezelfde kaart gingen over elkaar heen, en een
 * paneel dat alleen op hover verschijnt bestaat niet op een telefoon. Inline
 * schuift de kaart een stukje op en blijft alles leesbaar.
 *
 * Hij opent op hover én op focus én op klik. Alleen hover zou hem op een
 * telefoon en met een toetsenbord onbereikbaar maken; alleen klik vraagt een
 * handeling voor iets wat je even wilt nalezen. Alle drie kost niets en sluit
 * niemand uit.
 */
export function InfoButton({ label, open, onToggle, onOpen, onClose }: {
  label: string;
  open: boolean;
  onToggle: () => void;
  /** Aanwijzen of focussen opent; laat weg om alleen op klik te openen. */
  onOpen?: () => void;
  onClose?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onFocus={onOpen}
      onBlur={onClose}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold leading-none transition ${
        open
          ? 'border-transparent bg-accent text-accent-ink'
          : 'border-line text-muted hover:border-accent hover:text-accent'
      }`}
    >
      i
    </button>
  );
}

/** De uitleg zelf, in de taal van de merchant. */
export function InfoPanel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-lg border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
      {children}
    </p>
  );
}
