'use client';

// Bestand kiezen, met slepen als extra en niet als enige weg.
//
// Slepen werkt niet op een telefoon en niet met een toetsenbord, dus het vak is
// zelf een label om een echte file-input heen. Daarmee blijft kiezen bereikbaar
// voor iedereen en is slepen puur winst voor wie een muis heeft.

import { useState } from 'react';
import { Upload } from 'lucide-react';

export function FileDropzone({ id, label, hint, accept, onFile, multiple, disabled }: {
  id: string;
  label: string;
  hint: string;
  accept?: string;
  /** Krijgt alles wat gekozen of gesleept is; bij één bestand een lijst van één. */
  onFile: (files: File[]) => void;
  /**
   * Meerdere bestanden tegelijk. Een vragenbank uit de methode is opgesplitst in
   * een basislaag plus een overlay per categorie; die los inlezen laat elke
   * overlay zakken op attributen die in de basislaag staan.
   */
  multiple?: boolean;
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
        const files = [...(event.dataTransfer.files ?? [])];
        if (files.length > 0) onFile(multiple ? files : files.slice(0, 1));
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
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          if (files.length > 0) onFile(files);
          // Leegmaken, anders vuurt het kiezen van hetzelfde bestand geen change.
          event.target.value = '';
        }}
      />
    </label>
  );
}
