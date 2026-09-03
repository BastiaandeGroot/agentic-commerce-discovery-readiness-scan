'use client';

import { FILLS, type Tone } from './tone';

/** Staafje voor een verhouding. Toont de verhouding, nooit een cijfer alleen. */
export function Bar({ value, total, tone = 'accent' }: { value: number; total: number; tone?: Tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const fill = FILLS[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
