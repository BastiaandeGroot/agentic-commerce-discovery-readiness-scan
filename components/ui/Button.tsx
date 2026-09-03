'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children, onClick, variant = 'primary', disabled, loading, type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  /** Bezig: de knop blijft staan met zijn eigen tekst, zodat niet verschuift
   *  waar iemand net op klikte. */
  loading?: boolean;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-accent text-white hover:opacity-90 border-transparent',
    secondary: 'bg-surface text-ink border-line hover:bg-surface-2',
    quiet: 'bg-transparent text-muted border-transparent hover:text-ink hover:bg-surface-2',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
