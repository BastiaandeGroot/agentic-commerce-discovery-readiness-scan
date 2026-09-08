'use client';

import type { ReactNode } from 'react';
import { TONES, type Tone } from './tone';

export function Badge({ children, tone = 'neutral', title }: {
  children: ReactNode;
  tone?: Tone;
  /** Uitleg bij aanwijzen; een label als "Modelwerk" zegt zonder dat niets. */
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
