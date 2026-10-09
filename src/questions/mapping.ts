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

import { spellingKey } from '../spec/lexicon';
import type { AttributeShape, Bilingual, Dataset, QuestionSetState } from '../domain/types';
import type { AttributeDef, QuestionBank } from './bank';
import type { MappingPair } from '../spec/mapping';

/** De koppeling zoals een scherm hem vasthoudt: kenmerk -> kolommen. */
export type Mapping = Record<string, string[]>;

/**
 * Welke koppelingen een voorstel zijn: kenmerk -> de kolom die een model aanwees.
 *
 * Een voorstel is nooit een koppeling, en dat moet een herlaadbeurt overleven.
 * Voorheen stond dit alleen in het scherm: een voorstel werd meteen als gewone
 * koppeling bewaard, en bij het volgende bezoek was niet meer te zien dat de
 * merchant er nooit naar gekeken had. Een koppeling van een zwakker model bleef
 * dan voorgoed staan.
 *
 * Alleen namen, zoals de koppeling zelf.
 */
export type Proposed = Record<string, string>;

/** De koppeling met zijn herkomst; die twee veranderen altijd samen. */
export interface Linked {
  mapping: Mapping;
  proposed: Proposed;
}

/**
 * De voorstellen die nog voorstel zijn.
 *
 * Wijst de koppeling intussen naar een andere kolom, of naar geen, dan heeft de
 * merchant gekozen en is het zijn koppeling geworden.
 */
export function liveProposals({ mapping, proposed }: Linked): Proposed {
  const out: Proposed = {};
  for (const [key, column] of Object.entries(proposed)) {
    const current = mapping[key];
    if (current && current.length === 1 && current[0] === column) out[key] = column;
  }
  return out;
}

export interface ReviewOutcome extends Linked {
  /** Kenmerken waar een andere kolom voor in de plaats kwam. */
  replaced: { key: string; from: string; to: string }[];
  /** Kenmerken waar het model geen kolom meer voor aanwees; die staan weer open. */
  dropped: { key: string; from: string }[];
}

/**
 * Verwerk een beoordeling: nieuwe voorstellen, en een nieuw oordeel over oude.
 *
 * `asked` zijn de kenmerken die aan het model zijn voorgelegd, `pairs` wat het
 * erover zei. Een kenmerk dat gevraagd is en niet terugkomt, verliest de kolom
 * die het had: het model wijst hem niet meer aan, en dan is "nog open" eerlijker
 * dan een koppeling die niemand ooit bevestigde. `keep` zijn de kenmerken die de
 * merchant intussen zelf koos; daar komt niets overheen.
 *
 * "Geen kolom" — een lege lijst — is een keuze en blijft altijd staan.
 */
export function applyReview(
  current: Linked,
  asked: readonly string[],
  pairs: readonly MappingPair[],
  keep: ReadonlySet<string> = new Set(),
): ReviewOutcome {
  const mapping = { ...current.mapping };
  const proposed = { ...current.proposed };
  const replaced: ReviewOutcome['replaced'] = [];
  const dropped: ReviewOutcome['dropped'] = [];
  const answer = new Map(pairs.filter((pair) => pair.columns.length > 0).map((pair) => [pair.key, pair.columns[0]]));

  for (const key of asked) {
    const had = current.mapping[key];
    if (keep.has(key) || (Array.isArray(had) && had.length === 0)) continue;
    const from = had?.[0];
    const to = answer.get(key);
    if (to === undefined) {
      if (from === undefined) continue;
      delete mapping[key];
      delete proposed[key];
      dropped.push({ key, from });
      continue;
    }
    mapping[key] = [to];
    proposed[key] = to;
    if (from !== undefined && from !== to) replaced.push({ key, from, to });
  }
  return { mapping, proposed, replaced, dropped };
}

/**
 * De vragensets die een model nog mag voorstellen voor een categorie zonder set.
 *
 * Alleen wat nog nergens geland is. Een vragenset die op naam al bij een eigen
 * categorie hoort, is vergeven: hem ook voorstellen voor een ándere categorie
 * ging mis op de eerste echte catalogus. "Decoratiestoffen" heeft in de bank geen
 * eigen vragen, het model zocht de dichtstbijzijnde en koos "Tafelkleedstoffen" —
 * de set van haar eigen subcategorie. Daarmee kreeg elke decoratiestof de
 * tafelkleedvragen, en verdween de regel van Tafelkleedstoffen zelf, want die mat
 * nu hetzelfde als haar bovenliggende categorie.
 *
 * Een categorie waar geen set voor overblijft, houdt alleen de algemene vragen.
 * Dat is een geldig antwoord; de merchant kan in de keuzelijst nog elke set
 * kiezen, ook een vergeven.
 */
export function overlaysToPropose(state: Pick<QuestionSetState, 'overlays' | 'sets'>): QuestionSetState['overlays'] {
  const landed = new Set(state.sets.map((set) => set.overlayId).filter((id): id is string => id !== undefined));
  return state.overlays.filter((overlay) => !landed.has(overlay.id));
}

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

/**
 * Een vraag die op dit kenmerk leunt maar er niet mee beantwoord is.
 *
 * Een vraag heeft al zijn kenmerken nodig. Koppel je de rolbreedte en laat je
 * de rapporthoogte leeg, dan blijft
 * "hoeveel meter heb ik nodig" onbeantwoordbaar — en dat is precies het moment
 * waarop de merchant er nog iets aan kan doen. Zonder deze lijst ziet hij een
 * gekoppeld kenmerk, denkt hij dat de vraag rond is, en ontdekt hij het gat pas
 * twee schermen later zonder te weten waar het vandaan kwam.
 */
export interface BlockedQuestion {
  question: Bilingual;
  /** De kenmerken die deze vraag óók nodig heeft en die nergens op uitkomen. */
  missing: { key: string; label: Bilingual }[];
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
  /** Vragen die blijven staan zolang een ánder kenmerk ongekoppeld is. */
  blocked: BlockedQuestion[];
  /** Wat de bank in dit kenmerk verwacht, als de typering bevestigd is. */
  shape?: AttributeShape;
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

/** Komt dit kenmerk ergens op uit — via de bank of via de keuze van nu? */
function isLinked(key: string, fields: string[], pending?: Mapping): boolean {
  const chosen = pending?.[key];
  if (chosen !== undefined) return chosen.length > 0;
  return fields.some((field) => !isGuess(field));
}

/** Wat de koppeling van nu nog openlaat, in één telling. */
export interface MappingSummary {
  /** Gescoorde vragen die met deze koppeling niet te beantwoorden zijn. */
  questions: number;
  /** De ongekoppelde kenmerken waar die vragen op wachten. */
  attributes: number;
}

/**
 * Hoeveel vragen er onbeantwoordbaar blijven door wat nog nergens op uitkomt.
 *
 * Eén telling voor het hele scherm, en geen melding per kenmerk. Per regel zei
 * die melding welke ándere kenmerken een vraag nog nodig had, en daar kon de
 * merchant op die regel niets aan doen — terwijl hij bij 700 kenmerken dezelfde
 * vraag tientallen keren voorbij zag komen. Welke vragen het precies zijn staat
 * in het rapport, waar elk gat de vragen noemt die het blokkeert.
 *
 * Een vraag staat open zodra één van zijn kenmerken ongekoppeld is: hij is pas
 * beantwoord als ze er allemaal staan.
 */
export function mappingSummary(state: QuestionSetState, pending?: Mapping): MappingSummary {
  const questions = new Set<string>();
  const attributes = new Set<string>();

  for (const set of state.sets) {
    for (const question of set.questions) {
      if (question.answerable === 'no' || question.disabled) continue;
      const groups = question.evidence ?? [];
      if (groups.length === 0) continue;
      const open = groups.filter((group) => !isLinked(group.attributeKey, group.fields, pending));
      if (open.length === 0) continue;
      questions.add(question.id);
      for (const group of open) attributes.add(group.attributeKey);
    }
  }

  return { questions: questions.size, attributes: attributes.size };
}

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
export function attributeInventory(
  state: QuestionSetState,
  /**
   * Wat de merchant op dit moment in het scherm heeft staan.
   *
   * Meegeven en niet afleiden uit de sets, omdat een keuze pas op de bank landt
   * als hij bevestigd wordt. Zonder deze laag zou de waarschuwing hieronder pas
   * verdwijnen ná het toepassen, en dan blijft er rood staan bij een kenmerk dat
   * de merchant zojuist gekoppeld heeft.
   */
  pending?: Mapping,
): AttributeRow[] {
  const rows = new Map<string, AttributeRow>();
  const linked = (key: string, fields: string[]) => isLinked(key, fields, pending);

  for (const set of state.sets) {
    for (const question of set.questions) {
      // Een vraag die de merchant uitzette of die niet meetelt, vraagt niets van
      // zijn catalogus. Zijn kenmerken hier laten staan betekent koppelwerk voor
      // een vraag die in het rapport nergens een gat kan maken.
      if (question.disabled || question.answerable === 'no') continue;
      const groups = question.evidence ?? [];
      for (const group of groups) {
        const row = rows.get(group.attributeKey) ?? {
          key: group.attributeKey,
          label: group.label,
          fields: group.fields.filter((field) => !isGuess(field)),
          questions: [],
          weight: 0,
          blocked: [],
          shape: group.shape,
        };
        if (!row.questions.some((entry) => entry.nl === question.label.nl)) {
          row.questions.push(question.label);

          // Een vraag heeft al zijn kenmerken nodig; dit ene draagt hem niet alleen.
          const missing = groups
            .filter((other) => other.attributeKey !== group.attributeKey)
            .filter((other) => !linked(other.attributeKey, other.fields))
            .map((other) => ({ key: other.attributeKey, label: other.label }));
          if (missing.length > 0) row.blocked.push({ question: question.label, missing });
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

/**
 * Neem over wat de merchant eerder al besliste.
 *
 * Een koppeling hangt aan de naam van het kenmerk, en een vragenbank die
 * vernieuwt hernoemt kenmerken: `bestelstap` wordt `bestelstap_cm`. Zonder dit
 * staat zo'n kenmerk bij elke nieuwe bank weer open, gaat het opnieuw naar het
 * model en loopt de merchant dezelfde lijst nog eens na.
 *
 * Overgenomen wordt alleen wat geen gok is: dezelfde naam op schrijfwijze,
 * eenheid en vulwoorden na (`spellingKey`). Eerst uit de koppeling van deze
 * markt, dan uit die van zijn andere markten, de meest recente eerst. Een kolom
 * die in deze catalogus niet meer bestaat komt niet mee — een koppeling naar een
 * kolom die er niet is, is een fout en geen keuze. "Geen kolom" komt wél mee:
 * dat het kenmerk niet in de catalogus staat was toen de bevinding, en dat is het
 * nu nog.
 *
 * Wat de merchant in deze sessie al heeft staan, blijft staan.
 */
export function inheritMapping(
  current: Mapping,
  /** De kenmerken van de vragenbank van nu. */
  attributes: string[],
  /** Eerdere koppelingen, de meest recente eerst. */
  earlier: Mapping[],
  /** De kolommen van de catalogus van nu. */
  columns: string[],
): { mapping: Mapping; inherited: string[] } {
  const known = new Set(columns);
  const next: Mapping = { ...current };
  const inherited: string[] = [];

  for (const key of attributes) {
    if (Array.isArray(current[key])) continue;
    const spelled = spellingKey(key);
    if (spelled === '') continue;
    for (const source of [current, ...earlier]) {
      const from = Object.keys(source).find((other) => (
        Array.isArray(source[other]) && (other === key ? source !== current : spellingKey(other) === spelled)
      ));
      if (from === undefined) continue;
      const before = source[from];
      const still = before.filter((column) => known.has(column));
      // Had het een kolom en bestaat die niet meer, dan is er niets over te nemen.
      if (before.length > 0 && still.length === 0) continue;
      next[key] = still;
      inherited.push(key);
      break;
    }
  }
  return { mapping: next, inherited };
}

/**
 * Wat een ander account van dezelfde webshop van een koppeling mag zien.
 *
 * Alleen koppelingen naar kolommen die de vrager zelf al noemt, en "geen kolom".
 * Wie de catalogus van die webshop heeft, noemt dezelfde kolommen en krijgt de
 * koppelingen terug. Wie alleen het adres intikt, heeft die kolommen niet en
 * leert er geen kolomnaam uit — een kolomnaam is informatie over iemands
 * catalogus, en die hoort niet bij een adres dat iedereen kan invullen.
 */
export function visibleMapping(mapping: Mapping, columns: string[]): Mapping {
  const known = new Set(columns);
  const out: Mapping = {};
  for (const [key, linked] of Object.entries(mapping)) {
    if (!Array.isArray(linked)) continue;
    const shared = linked.filter((column) => known.has(column));
    if (linked.length === 0 || shared.length > 0) out[key] = shared;
  }
  return out;
}
