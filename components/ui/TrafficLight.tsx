'use client';

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
