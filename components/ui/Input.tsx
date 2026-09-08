'use client';

/** Tekstveld. Het label hoort erbij en niet erboven te zweven: een placeholder
 *  verdwijnt zodra iemand typt, en dan is niet meer te zien wat er gevraagd werd. */
export function Input({ label, value, onChange, placeholder, type = 'text', id, hint, invalid, autoComplete }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'search' | 'password';
  id: string;
  hint?: string;
  invalid?: string;
  /** Wat de browser hier mag invullen. Zonder dit biedt een wachtwoordmanager
   *  niets aan, en dan typt iemand zijn wachtwoord met de hand over. */
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`rounded-md border bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 ${
          invalid ? 'border-danger' : 'border-line'
        }`}
      />
      {invalid ? (
        <p id={`${id}-error`} className="text-xs text-danger">{invalid}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
