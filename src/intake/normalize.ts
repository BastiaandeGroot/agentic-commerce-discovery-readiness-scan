// Normalisatiehelpers. Overgenomen uit de eerste readiness-scan en licht ingekort:
// alleen wat deze scan nodig heeft.

export function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') {
    const t = v.trim();
    // Veelvoorkomende "leeg maar gevuld"-waarden uit exports.
    return t === '' || t === '-' || t === 'n/a' || t === 'N/A' || t === 'null' || t === 'undefined';
  }
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function str(v: unknown): string | undefined {
  if (isBlank(v)) return undefined;
  return String(v).trim();
}

/** Strip HTML-tags en normaliseer whitespace naar platte tekst. */
export function stripHtml(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  const text = s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text === '' ? undefined : text;
}

/** Tekstuele booleans naar echte boolean. Nodig voor de eligibility-vlaggen. */
export function parseBool(v: unknown): boolean | undefined {
  const s = str(v)?.toLowerCase();
  if (s === undefined) return undefined;
  if (['true', 'ja', 'yes', '1', 'y', 'waar'].includes(s)) return true;
  if (['false', 'nee', 'no', '0', 'n', 'onwaar'].includes(s)) return false;
  return undefined;
}

/** GTIN/EAN/UPC: alleen cijfers overhouden. */
export function digitsOnly(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  const d = s.replace(/\D/g, '');
  return d === '' ? undefined : d;
}

/** Geldige GTIN-lengtes zijn 8, 12, 13 of 14; laatste cijfer is mod-10-checksum. */
export function isValidGtin(gtin: string): boolean {
  if (!/^\d+$/.test(gtin)) return false;
  if (![8, 12, 13, 14].includes(gtin.length)) return false;
  const digits = gtin.split('').map(Number);
  const check = digits.pop() as number;
  let sum = 0;
  for (let i = digits.length - 1, pos = 0; i >= 0; i--, pos++) {
    sum += digits[i] * (pos % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === check;
}

export function toNumber(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s.replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}
