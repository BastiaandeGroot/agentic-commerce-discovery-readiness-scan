// De vijf betekenissen die een vlak of label kan dragen. Bewust vijf en niet
// twaalf: elke extra toon is een extra betekenis die een merchant moet leren.
export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';

export const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  accent: 'bg-accent-soft text-accent border-transparent',
  ok: 'bg-ok-soft text-ok border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
};

/** Vulkleur voor een balk; daar telt het vlak, niet de tekst erop. */
export const FILLS: Record<Tone, string> = {
  neutral: 'bg-muted',
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
};
