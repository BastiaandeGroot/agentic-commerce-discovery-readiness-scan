'use client';

/**
 * Keuzelijst. Een lijst en geen knoppenrij: het aantal categorieën verschilt per
 * merchant en kan flink oplopen.
 *
 * Twee vormen, want er zijn twee plekken. In een **werkbalk** staat het label
 * ernaast en is de lijst zo breed als hij nodig heeft — dat leest als één regel
 * boven een tabel. In een **formulier** staat het label erboven en vult de lijst
 * zijn kolom, zodat hij op één lijn staat met de invoervelden ernaast.
 *
 * Zonder dat onderscheid vechten de twee om de ruimte: het inline label duwt de
 * lijst smal, de tekst erin wordt afgekapt, en de knop ernaast schuift eroverheen.
 */
export function Select({ label, value, onChange, options, stacked = false, id }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Label boven de lijst, en de lijst zo breed als zijn kolom. Voor formulieren. */
  stacked?: boolean;
  id?: string;
}) {
  const control = (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={
        stacked
          // Dezelfde maatvoering als `Input`, anders staan twee velden naast
          // elkaar met een verschil van een paar pixels — en dat zie je.
          ? 'w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition focus:outline-none focus:ring-2 focus:ring-accent/40'
          : 'rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink'
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  if (!stacked) {
    return (
      <label className="flex items-center gap-2 text-xs text-muted">
        {label}
        {control}
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      {control}
    </div>
  );
}
