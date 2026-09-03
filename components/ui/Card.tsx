'use client';

import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {sub ? <p className="mt-1 text-sm leading-relaxed text-muted">{sub}</p> : null}
    </header>
  );
}
