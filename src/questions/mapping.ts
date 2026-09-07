// De koppeling toepassen op een vragenbank, en de inventaris eromheen.
//
// `spec/match.ts` doet het automatische deel, `spec/mapping.ts` stelt de opdracht
// voor een agent samen. Hier landt het resultaat: een koppeling die de merchant
// heeft gezien, op de bank die hij bewaart. Vanaf dat moment is het geen gok
// meer maar een uitspraak van hem, en die overleeft elke volgende scan.
//
// Dat de koppeling op de bánk landt en niet naast de scan is een keuze. Een bank
// hoort bij een markt, en de kolomnamen van een merchant horen bij die merchant
// — maar de bank ís hier per merchant opgeslagen, en dit is precies de plek waar
// de methode de `velden:`-lijst wil hebben. Zo blijft er één vorm: een attribuut
// met de velden die het dragen, of het nu uit de YAML komt, uit de matcher of
// uit dit scherm.
//
// Puur: geen klok, geen opslag, geen DOM.

import type { Bilingual, Dataset, QuestionSetState } from '../domain/types';
import type { AttributeDef, QuestionBank } from './bank';
import type { MappingPair } from '../spec/mapping';

/** De koppeling zoals een scherm hem vasthoudt: kenmerk -> kolommen. */
export type Mapping = Record<string, string[]>;

export function toMapping(pairs: MappingPair[]): Mapping {
  const out: Mapping = {};
  for (const pair of pairs) out[pair.key] = pair.columns;
  return out;
}

/**
 * Zet de gekozen kolommen op de attributen van deze bank.
 *
 * Vervangen en niet aanvullen: een merchant die zegt dat `rapport_hoogte_cm` in
 * `patroon_hoogte` staat, heeft daarmee ook gezegd dat het zoekpatroon dat wij
 * eromheen gokten er niet meer toe doet. Blijft dat patroon staan, dan kan een
 * toevallige kolom het antwoord alsnog leveren en is niet meer na te gaan waar
 * het vandaan kwam.
 *
 * Een lege lijst betekent "geen kolom", en dat is een geldig antwoord: het
 * kenmerk staat niet in deze catalogus. Het attribuut houdt dan geen enkel veld
 * over, en de vraag die erop leunt is dus onbeantwoordbaar — precies de
 * bevinding waar het om gaat.
 */
export function applyMapping(
  bank: QuestionBank,
  mapping: Mapping,
  catalog: Dataset,
): QuestionBank {
  if (Object.keys(mapping).length === 0) return bank;

  const apply = (attributes: AttributeDef[]): AttributeDef[] => attributes.map((attribute) => {
    const columns = mapping[attribute.key];
    if (columns === undefined) return attribute;
    return { ...attribute, evidence: columns.map((column) => requirementFor(column, catalog)), mode: 'any' as const };
  });

  return {
    ...bank,
    attributes: apply(bank.attributes),
    overlays: bank.overlays.map((overlay) => (
      overlay.attributes ? { ...overlay, attributes: apply(overlay.attributes) } : overlay
    )),
  };
}

/** Eén regel op het koppelscherm. */
export interface AttributeRow {
  key: string;
  label: Bilingual;
  /** De velden waar dit kenmerk nu op uitkomt; leeg betekent ongekoppeld. */
  fields: string[];
  /** De vragen die op dit kenmerk leunen, zonder dubbele. */
  questions: Bilingual[];
  /** Hoeveel producten er onder de sets vallen die deze vraag stellen. */
  weight: number;
}

/**
 * De vorm waarin de motor deze kolom kan terugvinden.
 *
 * Een kolomnaam is niet zomaar bruikbaar als bewijs. De intake slokt herkende
 * kolommen op in een canoniek veld — `rol_breedte` wordt `dimensions` — en zet
 * alleen de rest onder zijn eigen naam weg. Wijs je dan `rol_breedte` aan, dan
 * zoekt de motor naar een sleutel die niet bestaat en telt het kenmerk als gat
 * terwijl de kolom gevuld is. Precies het gat-dat-er-niet-is dat dit product
 * hoort te voorkomen, en daarom vertaalt deze functie de keuze één keer.
 */
export function requirementFor(column: string, catalog: Dataset): string {
  const canonical = catalog.mapping[column];
  if (canonical) return canonical;
  // Niet herkend, dus staat hij onder zijn eigen naam bij de losse kolommen.
  // Verankerd, anders vangt `breedte` ook `rol_breedte`.
  return `attr:^${column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

/** Komt dit veld uit de catalogus, of is het nog een zoekpatroon van ons? */
const isGuess = (field: string) => field.startsWith('attr:') && !field.startsWith('attr:^');

/**
 * Alle kenmerken die de samengestelde sets gebruiken, met hun vragen erbij.
 *
 * Uit de sets en niet uit de bank, omdat alleen de sets weten wélke vragen deze
 * merchant werkelijk gesteld krijgt: een overlay die nergens op matcht draagt
 * kenmerken die hier niets te zoeken hebben, en die zou een koppellijst nodeloos
 * verdubbelen.
 *
 * De volgorde is het handelingsperspectief: eerst wat ongekoppeld is, en daar
 * eerst wat de meeste producten raakt. Wie halverwege stopt heeft dan het
 * belangrijkste deel gehad.
 */
export function attributeInventory(state: QuestionSetState): AttributeRow[] {
  const rows = new Map<string, AttributeRow>();

  for (const set of state.sets) {
    for (const question of set.questions) {
      for (const group of question.evidence ?? []) {
        const row = rows.get(group.attributeKey) ?? {
          key: group.attributeKey,
          label: group.label,
          fields: group.fields.filter((field) => !isGuess(field)),
          questions: [],
          weight: 0,
        };
        if (!row.questions.some((entry) => entry.nl === question.label.nl)) {
          row.questions.push(question.label);
        }
        row.weight += set.productCount ?? 0;
        rows.set(group.attributeKey, row);
      }
    }
  }

  return [...rows.values()].sort((a, b) => {
    const linked = Number(a.fields.length > 0) - Number(b.fields.length > 0);
    return linked || b.weight - a.weight || a.key.localeCompare(b.key);
  });
}
