'use client';

// Kleine, gedeelde bouwstenen. Bewust klein gehouden: de betekenis zit in het
// rapport, niet in de versiering.

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

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  accent: 'bg-accent-soft text-accent border-transparent',
  ok: 'bg-ok-soft text-ok border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children, onClick, variant = 'primary', disabled, type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
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
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

/**
 * Stoplicht voor de voortgang.
 *
 * Groen betekent precies hetzelfde als vindbaar: álle vragen beantwoord. Zo kan
 * het licht nooit groen staan terwijl de trechter nul zegt. Daarmee blijft er
 * maar één verzonnen grens over — die tussen rood en oranje, op de helft — en
 * die bepaalt alleen een kleur, geen oordeel.
 */
export type Status = 'early' | 'partial' | 'complete';

export function statusOf(answered: number, total: number): Status {
  if (total <= 0) return 'early';
  if (answered >= total) return 'complete';
  return answered / total >= 0.5 ? 'partial' : 'early';
}

export function TrafficLight({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  const lamps: { id: Status; on: string }[] = [
    { id: 'early', on: 'bg-danger' },
    { id: 'partial', on: 'bg-warn' },
    { id: 'complete', on: 'bg-ok' },
  ];
  const dot = size === 'sm' ? 'size-2' : 'size-3';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 ${
        size === 'sm' ? 'px-1.5 py-1' : 'px-2 py-1.5'
      }`}
      aria-hidden
    >
      {lamps.map((lamp) => (
        <span
          key={lamp.id}
          className={`${dot} rounded-full ${lamp.id === status ? lamp.on : 'bg-line opacity-50'}`}
        />
      ))}
    </span>
  );
}

/** Staafje voor een verhouding. Toont de verhouding, nooit een cijfer alleen. */
export function Bar({ value, total, tone = 'accent' }: { value: number; total: number; tone?: Tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const fill = {
    neutral: 'bg-muted', accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger',
  }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
