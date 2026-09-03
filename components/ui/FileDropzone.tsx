'use client';

// Bestand kiezen, met slepen als extra en niet als enige weg.
//
// Slepen werkt niet op een telefoon en niet met een toetsenbord, dus het vak is
// zelf een label om een echte file-input heen. Daarmee blijft kiezen bereikbaar
// voor iedereen en is slepen puur winst voor wie een muis heeft.

import { useState } from 'react';
import { Upload } from 'lucide-react';

export function FileDropzone({ id, label, hint, accept, onFile, disabled }: {
  id: string;
  label: string;
  hint: string;
  accept?: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled) return;
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      } ${over ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent'}`}
    >
      <Upload className="size-5 text-muted" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
      <span className="max-w-sm text-xs leading-relaxed text-muted">{hint}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // Leegmaken, anders vuurt het kiezen van hetzelfde bestand geen change.
          event.target.value = '';
        }}
      />
    </label>
  );
}
