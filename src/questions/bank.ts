// De vragenbank: het model uit `methode-vragenbank-genereren.md`.
//
// Het uitgangspunt van die methode is dat je geen attribuutlijst bouwt maar een
// lijst vragen die een koper stelt, en de attributen daaruit afleidt. Een
// attribuutlijst is een mening; een vragenlijst met per vraag het benodigde
// bewijs is een meetinstrument. Dit bestand legt dat verschil vast in types.
//
// Twee dingen zijn hier dragend en mogen niet wegbezuinigd worden:
//
//   1. **Een bank hoort bij een VERTICAL, niet bij een merchant.** Bouw je hem
//      uit de site van één winkel, dan meet je zijn blinde vlekken mee en zijn
//      twee merchants in dezelfde markt niet meer vergelijkbaar. Daarom draagt
//      elke bank zijn sitepanel, en is `coverage` alleen betekenisvol met dat
//      panel erbij.
//   2. **Herkomst staat bij elk getal.** Een drempel die een marktpartij
//      publiceert is iets anders dan een drempel die wij beredeneerden, en
//      dekking die onderzocht is iets anders dan dekking die nooit gemeten is.
//      Het model dwingt af dat je dat onderscheid niet kúnt verliezen.

import type { Bilingual } from '../domain/types';

// --- Herkomst en status ----------------------------------------------------

/**
 * Hoe ver is deze bank?
 *
 * `provisional` is de terugval die de app zelf meebrengt: bruikbaar, maar zonder
 * panel en zonder domeinreview. `frozen` is wat de methode oplevert — bevroren
 * vóórdat de catalogus van de merchant open ging, en daarmee het enige dat
 * eerlijk kan rapporteren dat een vraag onbeantwoordbaar is.
 */
export type BankStatus = 'provisional' | 'in-review' | 'frozen';

/** Het soort bron in het panel. Ze dragen elk iets anders bij (fase 1). */
export type PanelSiteType =
  | 'category-leader'
  | 'specialist'
  | 'brand'
  | 'foreign'
  | 'marketplace'
  /** De merchant zelf. Telt mee in het panel maar nooit als enige bron. */
  | 'merchant';

export interface PanelSite {
  id: string;
  name: string;
  url: string;
  type: PanelSiteType;
  /** Datum van raadpleging; zonder die datum is `coverage` niet reproduceerbaar. */
  consultedAt: string;
}

/** Waar een vraag vandaan komt, oplopend zwakker als bewijs (fase 2). */
export type EvidenceSource =
  | 'faq'
  | 'category-text'
  | 'blog'
  | 'product-page'
  | 'review'
  | 'service'
  | 'expertise';

/**
 * Op hoeveel panelsites dit onderwerp voorkomt.
 *
 * `null` betekent niet nul maar **niet onderzocht**: er was geen panel. Die twee
 * mogen nooit samenvallen — dekking 0 is een vondst (niemand beantwoordt dit,
 * daar zit je onderscheidend vermogen), niet-onderzocht is een gat in de methode.
 */
export type Coverage = number | null;

// --- Weging ----------------------------------------------------------------

export type Importance = 'critical' | 'high' | 'medium' | 'low';

/** De weging uit de methode. Niet aanpassen zonder SCAN_VERSION te verhogen. */
export const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1,
};

export const IMPORTANCE_ORDER: Importance[] = ['critical', 'high', 'medium', 'low'];

/** Waar de koper naar op zoek is. Stuurt geen berekening, wel de groepering. */
export type Intent =
  | 'fit'
  | 'quantity'
  | 'care'
  | 'expectation'
  | 'material'
  | 'processing'
  | 'durability'
  | 'safety'
  | 'purchase-certainty';

export type AnswerType =
  | 'enum'
  | 'number'
  | 'boolean'
  | 'derived'
  | 'text'
  | 'relation'
  | 'process';

/**
 * Is deze vraag überhaupt uit attributen te beantwoorden?
 *
 * `no` betekent niet dat de vraag weg moet. Procesvragen ("kan ik een staal
 * krijgen"), structuurvragen ("welke kleuren bestaan er nog in deze kwaliteit")
 * en levenscyclusvragen leveren advies op. Ze gaan alleen uit de score, want
 * anders meten we de merchant af aan iets wat geen enkel attribuut kan dragen.
 */
export type Answerability = 'yes' | 'partial' | 'no';

// --- Attributen ------------------------------------------------------------

/**
 * Eén canoniek domeinattribuut.
 *
 * Dit is bewust een andere laag dan de veldsleutels in `src/spec/fields.ts`.
 * Daar staat de vocabulaire waarin een feed of catalogus schrijft; hier staat
 * wat het vak kent. `evidence`
 * is de brug ertussen, en dat is precies de mappingstap die de methode
 * expliciet ná het bevriezen plaatst.
 */
export interface AttributeDef {
  key: string;
  label: Bilingual;
  type: AnswerType;
  /** Testnorm of standaard, als die bestaat. Bijvoorbeeld "EN ISO 12947-2". */
  standard?: string;
  level: 'product' | 'variant';
  /** Alleen invullen bij een echte wettelijke verplichting, nooit als advies. */
  legal?: Bilingual;
  /** Hoe de panelsites dit kenmerk noemen. Marktobservatie, geen datamodel. */
  namedAs?: string[];
  /**
   * Canonieke veldsleutels of "attr:"-patronen die dit attribuut in een feed
   * dragen. Leeg betekent: geen enkel veld draagt dit, en de vraag die erop
   * leunt is dus per definitie onbeantwoordbaar uit de feed.
   */
  evidence: string[];
  /** 'any' = één gevuld veld volstaat; 'all' = alle velden nodig. */
  mode?: 'any' | 'all';
}

// --- Beslisregels ----------------------------------------------------------

/**
 * Herkomst van een drempel. Het onderscheid is niet cosmetisch: een
 * ongemarkeerd eigen getal is volgens de methode de snelste manier om
 * vertrouwen te verliezen bij de domeinexpert.
 */
export interface RuleSource {
  kind: 'published' | 'reasoned';
  /** Bij `published`: welke panelsite, en waar. */
  site?: string;
  url?: string;
  /** Bij `reasoned`: waarom dit getal, zodat de expert het kan tegenspreken. */
  rationale?: Bilingual;
}

export interface DecisionRule {
  id: string;
  label: Bilingual;
  source: RuleSource;
  /** Leesbare regels: drempels, rekenregels, geschiktheidsmatrices. */
  rules: Bilingual[];
  /**
   * Sites die een andere drempel hanteren. Geen fout maar een discussiepunt;
   * beide vastleggen is de opdracht, niet er één kiezen.
   */
  deviations?: { site: string; note: Bilingual }[];
}

// --- Vragen ----------------------------------------------------------------

export interface BankQuestion {
  id: string;
  /** Zoals een klant hem stelt. Nooit een attribuutnaam. */
  label: Bilingual;
  intent: Intent;
  importance: Importance;
  coverage: Coverage;
  /** Welke panelsites dit onderwerp behandelen. Maakt `coverage` navolgbaar. */
  coverageSites?: string[];
  sources: EvidenceSource[];
  /** Attribuutsleutels uit `attributes` die nodig zijn om te antwoorden. */
  evidence: string[];
  /** 'any' = één attribuut volstaat; 'all' = alle attributen nodig. */
  mode: 'any' | 'all';
  ruleId?: string;
  answerType: AnswerType;
  answerable: Answerability;
  /**
   * Waarom deze vraag zwaarder of lichter weegt dan de dekking suggereert.
   * Verplicht zodra weging en dekking uiteenlopen — anders is het een mening
   * die niemand kan narekenen.
   */
  weightNote?: Bilingual;
}

// --- Overlays en profielen -------------------------------------------------

/**
 * Per toepassingssubcategorie: dezelfde vragen, andere drempels.
 *
 * Banken, eetkamerstoelen en vouwgordijnen verschillen niet in wélke vragen
 * gesteld worden maar in wat een goed antwoord is. Een eigen vragenset per
 * subcategorie zou de bank opblazen en de vragen uit de pas laten lopen.
 */
export interface ApplicationProfile {
  id: string;
  label: Bilingual;
  /** Regex op de subcategorienaam van de merchant. */
  match?: string;
  /** Regel-id -> de drempel die in dit profiel geldt. */
  thresholds?: Record<string, string>;
  /** Vragen die juist in dit profiel kritiek zijn. */
  criticalQuestions?: string[];
  note?: Bilingual;
}

/**
 * De categorielaag. Erft van de basislaag en voegt alleen toe wat
 * categoriespecifiek is.
 *
 * Een overlay mag een basisvraag **herwegen** of uitschakelen, maar niet
 * herschrijven. Zou dat wel mogen, dan lopen dezelfde vragen tussen categorieën
 * uit de pas en is de bank geen meetinstrument meer.
 */
export interface Overlay {
  id: string;
  label: Bilingual;
  /** Regex op de hoofdcategorie van de merchant. */
  match: string;
  /** Basisvraag-id -> gewicht in deze categorie, met verantwoording. */
  reweight?: Record<string, { importance: Importance; why?: Bilingual }>;
  /** Basisvragen die in deze categorie niets te vragen hebben. */
  suppress?: string[];
  attributes?: AttributeDef[];
  rules?: DecisionRule[];
  questions?: BankQuestion[];
  profiles?: ApplicationProfile[];
}

// --- Facetten en benchmark -------------------------------------------------

/**
 * Een categoriepad dat eigenlijk een eigenschap is — "Vlekwerend", "Effen".
 *
 * Het aantal facetcategorieën is zelf een meetwaarde en over merchants heen
 * vergelijkbaar: hoe meer categorieën die eigenlijk een filter zijn, hoe groter
 * de onderliggende attribuutschuld.
 */
export interface FacetFinding {
  path: string;
  /** Het attribuut dat deze categorie zou moeten vervangen. */
  attributeKey: string;
  /** Wanneer het facet waar is. */
  condition?: Bilingual;
  /** Op hoeveel panelsites dit als filter wordt aangeboden. */
  offeredAsFilter?: Coverage;
  /**
   * Veiligheid en claims staan bovenaan: een categorie "Brandvertragend" zonder
   * onderliggend attribuut is een claim zonder bewijs.
   */
  priority: 'high' | 'medium' | 'low';
  /** Commerciële segmentatie mag categorie blijven. */
  keepAsCategory?: boolean;
}

/**
 * Wat de markt publiek toont, per attribuut.
 *
 * Nadrukkelijk een publieke-databenchmark en geen merchantbenchmark: dit meet
 * wat sites tónen, niet wat ze vastleggen. Het bestaansrecht is de koude start —
 * je eerste klant kan zich ergens aan meten voordat er genoeg klanten zijn.
 */
export interface BenchmarkEntry {
  attributeKey: string;
  coverage: Coverage;
  sites?: string[];
  namedAs?: string[];
  /** Als filter beschikbaar, of alleen als specificatie op de productpagina. */
  asFilter?: boolean;
}

// --- De bank ---------------------------------------------------------------

export interface BankMeta {
  /** Stabiele sleutel, bv. "woontextiel". */
  vertical: string;
  label: Bilingual;
  version: string;
  status: BankStatus;
  panel: PanelSite[];
  /** Regex waarmee een categorie van een merchant op deze bank uitkomt. */
  match?: string;
  sources?: string[];
  /** Datum waarop deze bank bevroren is; leeg zolang dat niet gebeurd is. */
  frozenAt?: string;
  /** Waar de bank vandaan komt: meegeleverd of ingelezen. */
  origin: 'built-in' | 'imported';
}

/**
 * De onomkeerbare fout uit fase 0 — de belangrijkste vraag van de hele methode.
 *
 * In elke vertical bestaat een aankoopfout die niet te herstellen is, en de
 * vragen die die fout voorkomen krijgen het hoogste gewicht. Dat is iets anders
 * dan commercieel belang, en het is de reden dat `critical` niet naar de duurste
 * producten wijst maar naar de duurste vergissingen.
 */
export interface VerticalContext {
  irreversibleMistake: Bilingual;
  consequence?: Bilingual;
  /** Verkocht per stuk of per maateenheid; bepaalt of hoeveelheid een cluster is. */
  unitOfSale?: 'piece' | 'measure';
  /** Sectorstandaard om op te ankeren: ETIM, GPC/GS1, eCl@ss, ISO/EN. */
  standard?: string;
}

export interface OpenPoint {
  id: string;
  question: Bilingual;
  /** Waar dit over gaat: een beredeneerde drempel, een tegenspraak, een gat. */
  kind: 'reasoned-threshold' | 'contradiction' | 'gap' | 'other';
  weight?: Importance;
}

export interface QuestionBank {
  meta: BankMeta;
  context: VerticalContext;
  attributes: AttributeDef[];
  rules: DecisionRule[];
  /** De basislaag: vragen die voor elk product in deze vertical gelden. */
  questions: BankQuestion[];
  overlays: Overlay[];
  facets?: FacetFinding[];
  benchmark?: BenchmarkEntry[];
  openPoints?: OpenPoint[];
  /** Aantekening bij afwijkingen van de methode; hoort in het rapport thuis. */
  transparencyNotes?: Bilingual[];
}

// --- Afgeleiden ------------------------------------------------------------

/** Alle attributen van een bank, basislaag plus overlays, op sleutel. */
export function attributeIndex(bank: QuestionBank, overlay?: Overlay): Map<string, AttributeDef> {
  const index = new Map<string, AttributeDef>();
  for (const attribute of bank.attributes) index.set(attribute.key, attribute);
  for (const attribute of overlay?.attributes ?? []) index.set(attribute.key, attribute);
  return index;
}

/** Alle beslisregels van een bank, basislaag plus overlays, op id. */
export function ruleIndex(bank: QuestionBank, overlay?: Overlay): Map<string, DecisionRule> {
  const index = new Map<string, DecisionRule>();
  for (const rule of bank.rules) index.set(rule.id, rule);
  for (const rule of overlay?.rules ?? []) index.set(rule.id, rule);
  return index;
}

/** Hoeveel procent van het panel dit onderwerp behandelt; null zonder panel. */
export function coverageShare(bank: QuestionBank, coverage: Coverage): number | null {
  if (coverage === null) return null;
  const size = bank.meta.panel.length;
  if (size === 0) return null;
  return coverage / size;
}

/** Beredeneerde drempels die nog bevestigd moeten worden door de domeinexpert. */
export function reasonedRules(bank: QuestionBank): DecisionRule[] {
  const all = [...bank.rules, ...bank.overlays.flatMap((o) => o.rules ?? [])];
  return all.filter((rule) => rule.source.kind === 'reasoned');
}
