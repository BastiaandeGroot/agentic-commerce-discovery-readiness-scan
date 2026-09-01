// Formaatherkenning en parsing. Een merchant levert aan wat zijn systeem uitspuugt,
// dus we accepteren CSV (komma, puntkomma of tab), JSON, NDJSON en XML.
//
// Alles komt uit als een platte lijst records: kolomnaam -> waarde als string.
// Geneste structuren worden platgeslagen met puntnotatie, arrays met komma's
// samengevoegd, zodat de veldherkenning verderop maar één vorm hoeft te kennen.

export interface ParseResult {
  /** Mensleesbare omschrijving van wat we herkenden, voor in de UI. */
  format: string;
  rows: Record<string, string>[];
}

export type RawFormat = 'delimited' | 'json' | 'ndjson' | 'xml';

/** Detecteer het formaat op inhoud; de bestandsnaam is slechts een hint. */
export function detectFormat(filename: string, text: string): RawFormat {
  const head = text.trimStart().slice(0, 2000);
  if (head.startsWith('<')) return 'xml';
  if (head.startsWith('{') || head.startsWith('[')) {
    // NDJSON: meerdere JSON-objecten, elk op een eigen regel.
    const lines = text.trim().split('\n').filter((l) => l.trim() !== '');
    if (lines.length > 1 && lines.every((l) => l.trim().startsWith('{'))) {
      try {
        JSON.parse(text);
        return 'json'; // parst als geheel -> gewone JSON
      } catch {
        return 'ndjson';
      }
    }
    return 'json';
  }
  if (/\.(xml|rss)$/i.test(filename)) return 'xml';
  if (/\.(json)$/i.test(filename)) return 'json';
  return 'delimited';
}

/** Kies het scheidingsteken op basis van de kopregel. */
export function detectDelimiter(text: string): { char: string; label: string } {
  const firstLine = text.split('\n')[0] ?? '';
  const counts: [string, string, number][] = [
    [',', 'komma', (firstLine.match(/,/g) || []).length],
    [';', 'puntkomma', (firstLine.match(/;/g) || []).length],
    ['\t', 'tab', (firstLine.match(/\t/g) || []).length],
    ['|', 'pipe', (firstLine.match(/\|/g) || []).length],
  ];
  counts.sort((a, b) => b[2] - a[2]);
  const [char, label, n] = counts[0];
  return n > 0 ? { char, label } : { char: ',', label: 'komma' };
}

/**
 * Afhankelijkheidsvrije parser voor gescheiden bestanden. Ondersteunt quotes,
 * scheidingstekens en newlines binnen quotes, en "" als ontsnapte quote.
 * Overgenomen uit de eerste readiness-scan, uitgebreid met vrij scheidingsteken.
 */
export function parseDelimited(text: string, delimiter = ','): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      record.push(field); field = '';
    } else if (ch === '\n') {
      record.push(field); field = '';
      rows.push(record); record = [];
    } else if (ch === '\r') {
      // negeren; \r\n wordt via \n afgehandeld
    } else {
      field += ch;
    }
  }
  if (field !== '' || record.length > 0) { record.push(field); rows.push(record); }
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().replace(/^﻿/, '')); // BOM weg
  return rows
    .slice(1)
    .filter((r) => !(r.length === 1 && r[0].trim() === ''))
    .map((r) => {
      const obj: Record<string, string> = {};
      header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

/**
 * Sla een genest object plat: { a: { b: 1 } } -> { "a.b": "1" }.
 * Arrays van primitieven worden komma-gescheiden; arrays van objecten krijgen
 * een index in de sleutel, met een dakje op de diepte zodat een feed met 300
 * reviews per product niet ontploft.
 */
export function flatten(value: unknown, prefix = '', out: Record<string, string> = {}, depth = 0): Record<string, string> {
  if (value === null || value === undefined) return out;
  if (depth > 4) return out;

  if (Array.isArray(value)) {
    if (value.length === 0) return out;
    const allPrimitive = value.every((v) => typeof v !== 'object' || v === null);
    if (allPrimitive) {
      out[prefix] = value.map((v) => String(v)).join(', ');
    } else {
      // Alleen het aantal en het eerste item; genoeg om aanwezigheid vast te stellen.
      out[prefix] = String(value.length);
      flatten(value[0], prefix ? `${prefix}.0` : '0', out, depth + 1);
    }
    return out;
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out, depth + 1);
    }
    return out;
  }

  out[prefix] = String(value);
  return out;
}

/** Vind de productlijst in een JSON-document, ook als die een niveau dieper zit. */
function findProductArray(doc: unknown): unknown[] {
  if (Array.isArray(doc)) return doc;
  if (doc && typeof doc === 'object') {
    const obj = doc as Record<string, unknown>;
    // Veelgebruikte omhullende sleutels, in volgorde van waarschijnlijkheid.
    for (const key of ['products', 'items', 'data', 'results', 'entries', 'catalog', 'rows']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    // Anders: de eerste array van objecten die we tegenkomen.
    for (const v of Object.values(obj)) {
      if (Array.isArray(v) && v.some((e) => e && typeof e === 'object')) return v;
    }
  }
  return [];
}

export function parseJsonDocument(text: string): Record<string, string>[] {
  const doc = JSON.parse(text);
  return findProductArray(doc).map((p) => flatten(p));
}

export function parseNdjson(text: string): Record<string, string>[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .map((l) => flatten(JSON.parse(l)));
}

/**
 * XML-feeds. Google Shopping levert RSS met <item>-knopen en een g:-namespace;
 * andere exports gebruiken <product> of <entry>. We pakken de knoopnaam die het
 * vaakst voorkomt op het diepste herhalende niveau.
 */
export function parseXmlDocument(text: string): Record<string, string>[] {
  const itemNames = ['item', 'product', 'entry', 'row', 'record', 'article'];

  // In de browser: echte XML-parser. Elders: de regex-fallback hieronder.
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (!doc.querySelector('parsererror')) {
      for (const name of itemNames) {
        const nodes = Array.from(doc.getElementsByTagName(name));
        if (nodes.length === 0) continue;
        return nodes.map((node) => {
          const row: Record<string, string> = {};
          for (const child of Array.from(node.children)) {
            const key = child.tagName; // inclusief g:-prefix; die strippen we later
            const val = (child.textContent ?? '').trim();
            if (val === '') continue;
            // Herhaalde knopen (bv. additional_image_link) samenvoegen.
            row[key] = row[key] ? `${row[key]}, ${val}` : val;
          }
          return row;
        });
      }
      return [];
    }
  }

  // Fallback zonder DOM: knip op de meest voorkomende herhalende knoop.
  for (const name of itemNames) {
    const blocks = text.match(new RegExp(`<${name}[\\s>][\\s\\S]*?</${name}>`, 'gi'));
    if (!blocks || blocks.length === 0) continue;
    return blocks.map((block) => {
      const row: Record<string, string> = {};
      const re = /<([A-Za-z_][\w:.-]*)[^>]*>([\s\S]*?)<\/\1>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(block)) !== null) {
        const key = m[1];
        if (key.toLowerCase() === name.toLowerCase()) continue;
        const val = m[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
        if (val === '' || /<[a-z]/i.test(val)) continue; // geneste knoop: overslaan
        row[key] = row[key] ? `${row[key]}, ${val}` : val;
      }
      return row;
    });
  }
  return [];
}

/** Eén ingang voor alle formaten. */
export function parseAny(filename: string, text: string): ParseResult {
  const format = detectFormat(filename, text);
  switch (format) {
    case 'json':
      return { format: 'JSON', rows: parseJsonDocument(text) };
    case 'ndjson':
      return { format: 'NDJSON (één object per regel)', rows: parseNdjson(text) };
    case 'xml':
      return { format: 'XML', rows: parseXmlDocument(text) };
    default: {
      const { char, label } = detectDelimiter(text);
      return { format: `CSV (${label}-gescheiden)`, rows: parseDelimited(text, char) };
    }
  }
}
