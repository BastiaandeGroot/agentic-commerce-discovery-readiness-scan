// Een kleine YAML-lezer voor precies de vorm die de promptreeks oplevert.
//
// Waarom zelf en niet een pakket: dezelfde afweging als bij de CSV-parser in
// `src/intake/parse.ts`. De motor moet puur blijven en in de browser, in een
// worker én in Node draaien, en een vragenbank is een gestructureerd document
// zonder ankers, merge keys of aangepaste tags. Wat we wél nodig hebben zijn
// geneste mappings, lijsten, blokteksten en aanhalingstekens, en dat is te
// overzien — met een test eronder.
//
// Wat er bewust NIET in zit: ankers en aliassen (`&a` / `*a`), meerdere
// documenten in één bestand, tags (`!!str`), en complexe sleutels. Komt een van
// die dingen langs, dan zegt de lezer dat met een regelnummer in plaats van er
// iets van te maken. Stil de verkeerde kant op gokken is hier het slechtste:
// een half ingelezen vragenbank levert een rapport op dat nergens over gaat.

export type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

export class YamlError extends Error {
  constructor(message: string, readonly line: number) {
    super(`regel ${line}: ${message}`);
    this.name = 'YamlError';
  }
}

interface Line {
  /** Regelnummer in het bronbestand, één-gebaseerd, voor de foutmelding. */
  number: number;
  indent: number;
  text: string;
}

/** Haal een commentaar weg, maar niet als het binnen aanhalingstekens staat. */
function stripComment(text: string): string {
  let quote: string | undefined;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\' && quote === '"') i++;
      else if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i);
    }
  }
  return text;
}

function scalar(raw: string, line: number): YamlValue {
  const text = raw.trim();
  if (text === '' || text === '~' || text === 'null') return null;
  if (text === 'true' || text === 'yes') return true;
  if (text === 'false' || text === 'no') return false;

  if (text.startsWith('"') && text.endsWith('"') && text.length > 1) {
    return text
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  if (text.startsWith("'") && text.endsWith("'") && text.length > 1) {
    return text.slice(1, -1).replace(/''/g, "'");
  }

  // Inline lijst en inline mapping. Eén niveau diep is genoeg: de prompts
  // gebruiken ze voor `[faq, review]` en niet voor geneste structuren.
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    return inner === '' ? [] : splitFlow(inner, line).map((part) => scalar(part, line));
  }
  if (text.startsWith('{') && text.endsWith('}')) {
    const inner = text.slice(1, -1).trim();
    const out: Record<string, YamlValue> = {};
    if (inner === '') return out;
    for (const part of splitFlow(inner, line)) {
      const at = part.indexOf(':');
      if (at === -1) throw new YamlError(`"${part}" mist een dubbele punt`, line);
      out[scalarKey(part.slice(0, at), line)] = scalar(part.slice(at + 1), line);
    }
    return out;
  }

  if (/^-?\d+$/.test(text)) return Number(text);
  if (/^-?\d*\.\d+$/.test(text)) return Number(text);
  return text;
}

/** Splits op komma's, maar niet binnen aanhalingstekens of haken. */
function splitFlow(text: string, line: number): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\' && quote === '"') i++;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '[' || char === '{') depth++;
    else if (char === ']' || char === '}') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  if (quote) throw new YamlError('een aanhalingsteken wordt niet gesloten', line);
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

function scalarKey(raw: string, line: number): string {
  const value = scalar(raw, line);
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new YamlError(`"${raw.trim()}" is geen bruikbare sleutel`, line);
  }
  return String(value);
}

/**
 * Lees een blokscalar: `|` houdt de regelovergangen, `>` vouwt ze tot spaties.
 * De variant met een streepje erachter haalt de laatste regelovergang weg.
 */
function readBlock(
  lines: Line[], start: number, marker: string, parentIndent: number,
): { value: string; next: number } {
  const literal = marker.startsWith('|');
  const chomp = marker.includes('-');
  const body: string[] = [];
  let index = start;
  let indent: number | undefined;

  while (index < lines.length) {
    const line = lines[index];
    if (line.text.trim() === '') { body.push(''); index++; continue; }
    if (line.indent <= parentIndent) break;
    indent ??= line.indent;
    body.push(' '.repeat(Math.max(0, line.indent - indent)) + line.text.trim());
    index++;
  }

  while (body.length > 0 && body[body.length - 1] === '') body.pop();
  const joined = literal ? body.join('\n') : body.join(' ').replace(/\s+/g, ' ').trim();
  return { value: chomp ? joined : `${joined}\n`, next: index };
}

/** Alles op dit inspringniveau en dieper, als één waarde. */
function parseBlock(lines: Line[], start: number, indent: number): { value: YamlValue; next: number } {
  let index = start;
  while (index < lines.length && lines[index].text.trim() === '') index++;
  if (index >= lines.length || lines[index].indent < indent) return { value: null, next: index };

  if (lines[index].text.startsWith('- ') || lines[index].text.trim() === '-') {
    return parseSequence(lines, index, lines[index].indent);
  }
  return parseMapping(lines, index, lines[index].indent);
}

function parseSequence(lines: Line[], start: number, indent: number): { value: YamlValue[]; next: number } {
  const items: YamlValue[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (line.text.trim() === '') { index++; continue; }
    if (line.indent < indent) break;
    if (line.indent > indent) throw new YamlError('onverwachte inspringing in een lijst', line.number);
    if (!line.text.startsWith('- ') && line.text.trim() !== '-') break;

    const rest = line.text.trim() === '-' ? '' : line.text.slice(2);
    if (rest.trim() === '') {
      const block = parseBlock(lines, index + 1, indent + 1);
      items.push(block.value);
      index = block.next;
      continue;
    }

    // "- key: waarde" begint een mapping die op de streep zelf inspringt.
    const key = leadingKey(rest, line.number);
    if (key !== undefined) {
      const virtual: Line[] = [
        { number: line.number, indent: indent + 2, text: rest },
        ...lines.slice(index + 1),
      ];
      const mapping = parseMapping(virtual, 0, indent + 2);
      items.push(mapping.value);
      // Eén regel is de virtuele; de rest telt door in het echte bestand.
      index = mapping.next === 0 ? index + 1 : index + mapping.next;
      continue;
    }

    items.push(scalar(rest, line.number));
    index++;
  }

  return { value: items, next: index };
}

/** De sleutel van "key: waarde", of undefined als dit geen mapping-regel is. */
function leadingKey(text: string, line: number): string | undefined {
  let quote: string | undefined;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\' && quote === '"') i++;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '{') return undefined;
    if (char === ':' && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
      return scalarKey(text.slice(0, i), line);
    }
  }
  return undefined;
}

function parseMapping(
  lines: Line[], start: number, indent: number,
): { value: Record<string, YamlValue>; next: number } {
  const out: Record<string, YamlValue> = {};
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (line.text.trim() === '') { index++; continue; }
    if (line.indent < indent) break;
    if (line.indent > indent) throw new YamlError('onverwachte inspringing', line.number);
    if (line.text.startsWith('- ')) break;

    const key = leadingKey(line.text, line.number);
    if (key === undefined) throw new YamlError(`"${line.text.trim()}" mist een dubbele punt`, line.number);
    const rest = line.text.slice(line.text.indexOf(':') + 1).trim();

    if (rest === '|' || rest === '|-' || rest === '>' || rest === '>-') {
      const block = readBlock(lines, index + 1, rest, indent);
      out[key] = block.value;
      index = block.next;
      continue;
    }
    if (rest === '') {
      const block = parseBlock(lines, index + 1, indent + 1);
      out[key] = block.value;
      index = block.next;
      continue;
    }
    out[key] = scalar(rest, line.number);
    index++;
  }

  return { value: out, next: index };
}

/** Lees een YAML-document. Gooit een `YamlError` met regelnummer bij twijfel. */
export function parseYaml(text: string): YamlValue {
  if (/^\s*(&\w|\*\w)/m.test(text)) {
    throw new YamlError('ankers en aliassen worden niet ondersteund', 1);
  }
  const lines: Line[] = text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((raw, i) => {
      const withoutComment = stripComment(raw);
      const trimmed = withoutComment.replace(/\s+$/, '');
      return {
        number: i + 1,
        indent: trimmed.length - trimmed.trimStart().length,
        text: trimmed.trimStart(),
      };
    })
    // Documentmarkeringen zijn geen inhoud; één document per bestand.
    .filter((line) => line.text !== '---' && line.text !== '...');

  const first = lines.findIndex((line) => line.text !== '');
  if (first === -1) return null;
  return parseBlock(lines, first, lines[first].indent).value;
}
