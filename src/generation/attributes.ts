// Kenmerken typeren: welke waarde elk kenmerk van een bank in een catalogus hoort
// te dragen.
//
// De bank noemt een kenmerk bij naam — `hittebestendigheid_max_c`, `coatingtype`
// — en de generatie vraagt een antwoordtype per vraag, niet per kenmerk. Een
// vraag met vier kenmerken had dus één type voor alle vier. Zonder type per
// kenmerk kan het koppelscherm een °C-kenmerk op een ja/nee-kolom leggen, en dan
// verdwijnt een gat dat er wél is.
//
// Dit is een losse stap na de generatie, één keer per markt, en geen fase in de
// reeks: zo krijgt een bank die er al ligt zijn typen zonder opnieuw gegenereerd
// te worden. Het valt onder dezelfde drie voorwaarden als de generatie zelf:
//
//   1. **Geen SKU.** Het model krijgt kenmerknamen, de vragen die erop leunen en
//      hoe de sites ze noemen. Geen kolomnaam, geen productrij, geen waarde.
//   2. **Eén keer per markt.** De typering hoort bij de bank en geldt voor elke
//      merchant die erop meet.
//   3. **Een tabel die een mens bevestigt.** Wat terugkomt staat op review tot
//      de beheerder hem naloopt; pas daarna ziet een merchant de typen.
//
// Puur: de opdracht wordt hier samengesteld en het antwoord hier gelezen. De
// aanroep zelf gebeurt in `app/api/admin/attribute-types`.

import type { AttributeShape, ShapeKind } from '../domain/types';
import type { QuestionBank } from '../questions/bank';
import type { AskTask } from './pipeline';
import { UNIT_WORDS } from '../engine/profile';

/**
 * De versie van deze stap. Omhoog zodra de opdracht of de lezer iets verandert
 * dat de uitkomst op dezelfde bank anders kan maken.
 */
export const TYPING_VERSION = '1.0.0';

/**
 * Hoeveel kenmerken er per aanroep gaan. Klein genoeg dat het antwoord niet
 * tegen zijn limiet aanloopt; woontextiel v4 (729 kenmerken) wordt zeven
 * aanroepen die tegelijk lopen.
 */
export const TYPING_BATCH = 120;

const QUESTIONS_PER_ATTRIBUTE = 2;
const MAX_VALUES = 8;
const VALUE_LENGTH = 40;

/** Eén kenmerk zoals het model het te zien krijgt. */
export interface TypingInput {
  key: string;
  /** Hooguit twee vragen; een derde voegt weinig toe en verdunt de rest. */
  questions: string[];
  namedAs: string[];
}

/** Wat er van een typering bewaard wordt, naast de CSV van de bank. */
export interface StoredTyping {
  version: string;
  status: 'review' | 'confirmed';
  typedAt: string;
  confirmedAt?: string;
  /** Hoeveel kenmerken de bank had toen hij getypeerd werd. */
  attributes: number;
  shapes: Record<string, AttributeShape>;
  /** Wat de lezer weigerde of miste; een mens hoort het te zien. */
  errors: string[];
  /** Geschatte kosten in dollarcenten. */
  cents?: number;
}

/** Alle kenmerken die een vraag in de bank noemt, basislaag plus overlays. */
export function typingInputs(bank: QuestionBank): TypingInput[] {
  const named = new Map<string, string[]>();
  for (const attribute of [...bank.attributes, ...bank.overlays.flatMap((overlay) => overlay.attributes ?? [])]) {
    if (attribute.namedAs && !named.has(attribute.key)) named.set(attribute.key, attribute.namedAs);
  }

  const out = new Map<string, TypingInput>();
  const walk = (questions: QuestionBank['questions']) => {
    for (const question of questions) {
      for (const key of question.evidence) {
        const entry = out.get(key) ?? { key, questions: [], namedAs: named.get(key) ?? [] };
        if (entry.questions.length < QUESTIONS_PER_ATTRIBUTE && !entry.questions.includes(question.label.nl)) {
          entry.questions.push(question.label.nl);
        }
        out.set(key, entry);
      }
    }
  };
  walk(bank.questions);
  for (const overlay of bank.overlays) walk(overlay.questions ?? []);

  return [...out.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** De kenmerken in blokken van `TYPING_BATCH`. */
export function typingBatches(inputs: TypingInput[]): TypingInput[][] {
  const out: TypingInput[][] = [];
  for (let start = 0; start < inputs.length; start += TYPING_BATCH) out.push(inputs.slice(start, start + TYPING_BATCH));
  return out;
}

const SYSTEM = `Je typeert de kenmerken van een vragenbank. Een vragenbank beschrijft wat
kopers in een markt vragen; elk kenmerk is een gegeven dat een productcatalogus
moet vastleggen om die vragen te kunnen beantwoorden.

Je bepaalt per kenmerk welke waarde er in een catalogus in hoort. Je ziet geen
catalogus, en dat is de bedoeling: de typering hoort bij de markt en niet bij één
winkel.

Vorm, precies één van:
- "ja/nee": het kenmerk is waar of niet waar (waterdicht, geschikt voor buiten)
- "getal": een meetbare hoeveelheid (breedte, gewicht, temperatuur, percentage,
  aantal toeren)
- "lijst": een keuze uit een beperkte set waarden (coatingtype, weefsel, kleur)
- "code": een identificatie of normcode (certificaatnummer, EAN, normnummer)
- "tekst": een vrije omschrijving (onderhoudsadvies, samenstelling in woorden)

Eenheid: alleen bij "getal", en alleen uit deze lijst: ${UNIT_WORDS.join(', ')}.
Heeft het getal geen eenheid uit de lijst (Martindale-toeren, blauwschaal),
laat eenheid dan leeg. Verzin geen eenheid.

Waarden: alleen bij "lijst", hooguit ${MAX_VALUES}, zoals een catalogus ze zou
schrijven. Noem alleen waarden die in de vraag of de synoniemen staan of die in
deze markt vanzelf spreken. Twijfel je, laat de lijst dan leeg.

De naam helpt: _cm, _mm, _pct, _c, _gram wijzen op een getal met die eenheid;
_ja_nee op ja/nee. Twijfel je tussen "lijst" en "tekst", kies "tekst".`;

/** De opdracht voor één blok kenmerken. */
export function typingTask(batch: TypingInput[], vertical: string, index: number): AskTask {
  const lines = batch.map((input) => {
    const parts = [`- ${input.key}`];
    if (input.questions.length > 0) parts.push(`  vragen: ${input.questions.join(' | ')}`);
    if (input.namedAs.length > 0) parts.push(`  op sites genoemd: ${input.namedAs.join(', ')}`);
    return parts.join('\n');
  });

  return {
    phase: `kenmerktypen:${index}`,
    model: 'reader',
    web: false,
    maxTokens: 16000,
    system: SYSTEM,
    prompt: `Markt: ${vertical}

KENMERKEN (${batch.length}):
${lines.join('\n')}

Geef elk kenmerk hierboven precies één keer terug, met exact dezelfde naam.
Antwoord met dit JSON-object:
{"kenmerken": [{"key": "...", "vorm": "ja/nee|getal|lijst|code|tekst", "eenheid": "", "waarden": []}]}`,
  };
}

const KINDS: Record<string, ShapeKind> = {
  'ja/nee': 'boolean', janee: 'boolean', boolean: 'boolean', 'yes/no': 'boolean',
  getal: 'number', number: 'number',
  lijst: 'list', list: 'list', enum: 'list',
  code: 'code',
  tekst: 'text', text: 'text',
};

export function isShapeKind(value: unknown): value is ShapeKind {
  return value === 'boolean' || value === 'number' || value === 'list' || value === 'code' || value === 'text';
}

/**
 * Eén vorm schoonmaken, uit het model of van het beheerscherm.
 *
 * Een eenheid die niet in de generieke lijst staat valt weg en wordt gemeld: een
 * verzonnen eenheid kan straks een kolom afwijzen die wél klopt.
 */
export function cleanShape(
  kind: ShapeKind,
  unit: unknown,
  values: unknown,
  errors: string[],
  key: string,
): AttributeShape {
  const shape: AttributeShape = { kind };
  if (kind === 'number' && typeof unit === 'string' && unit.trim() !== '') {
    const lower = unit.trim().toLowerCase();
    if (UNIT_WORDS.includes(lower)) shape.unit = lower;
    else errors.push(`${key}: eenheid "${unit.trim()}" staat niet in de lijst en is weggelaten.`);
  }
  if (kind === 'list' && Array.isArray(values)) {
    const clean = [...new Set(values
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim().slice(0, VALUE_LENGTH))
      .filter(Boolean))].slice(0, MAX_VALUES);
    if (clean.length > 0) shape.values = clean;
  }
  return shape;
}

export interface TypingRead {
  shapes: Record<string, AttributeShape>;
  errors: string[];
}

/**
 * Het antwoord van het model lezen.
 *
 * Streng op de sleutel — een kenmerk dat de bank niet kent, bestaat niet — en
 * hardop over wat ontbreekt. Een kenmerk zonder type is geen fout in de scan; het
 * koppelscherm legt er dan alleen niets naast.
 */
export function readTyping(json: unknown, keys: string[]): TypingRead {
  const known = new Set(keys);
  const shapes: Record<string, AttributeShape> = {};
  const errors: string[] = [];

  const list = (json as { kenmerken?: unknown } | null)?.kenmerken;
  if (!Array.isArray(list)) {
    return { shapes, errors: ['Het antwoord bevat geen lijst "kenmerken".'] };
  }

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const { key, vorm, eenheid, waarden } = entry as Record<string, unknown>;
    if (typeof key !== 'string' || !known.has(key)) {
      errors.push(`Onbekend kenmerk in het antwoord: ${String(key)}.`);
      continue;
    }
    const kind = typeof vorm === 'string' ? KINDS[vorm.trim().toLowerCase()] : undefined;
    if (!kind) {
      errors.push(`${key}: vorm "${String(vorm)}" is onbekend.`);
      continue;
    }
    shapes[key] = cleanShape(kind, eenheid, waarden, errors, key);
  }

  const missing = keys.filter((key) => !shapes[key]);
  if (missing.length > 0) {
    const shown = missing.slice(0, 10).join(', ');
    errors.push(`Zonder type: ${shown}${missing.length > 10 ? ` en nog ${missing.length - 10}` : ''}.`);
  }
  return { shapes, errors };
}
