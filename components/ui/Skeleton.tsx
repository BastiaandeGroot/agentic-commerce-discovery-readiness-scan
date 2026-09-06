'use client';

/**
 * Laadtoestand in de vorm van wat er komt.
 *
 * Geen spinner in het midden: een merchant die zijn catalogus laat analyseren wil
 * zien dat er een rapport aankomt, niet dat er iets draait. De maten komen mee
 * als Tailwind-klassen zodat een skeleton de echte rij kan nadoen.
 */
export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden />;
}

/** Een paar regels skeleton met oplopende breedte; leest als tekst-in-aanbouw. */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-11/12', 'w-9/12', 'w-10/12', 'w-8/12'];
  return (
    <div className="flex flex-col gap-2" role="status" aria-busy>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={`h-4 ${widths[index % widths.length]}`} />
      ))}
    </div>
  );
}
