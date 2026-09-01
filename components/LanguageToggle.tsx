'use client';

import type { Locale } from '../src/i18n/strings';

export function LanguageToggle({ locale, onChange, label }: {
  locale: Locale; onChange: (next: Locale) => void; label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 rounded-lg border border-line bg-surface p-0.5">
      {(['nl', 'en'] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={locale === code}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            locale === code ? 'bg-accent text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
