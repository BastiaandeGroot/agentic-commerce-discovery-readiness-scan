// Domeinmodel voor de Agentic Commerce Discovery Readiness Scan.
//
// Twee ontwerpregels uit de design rationale sturen dit bestand:
//   1. Core en Selection worden NOOIT tot één cijfer samengevoegd (§4).
//   2. Elke bevinding draagt veld/vraag, tier, gap-oorzaak en eigenaar (§7).

export type Locale = 'nl' | 'en';

export interface Bilingual {
  nl: string;
  en: string;
}

/** De protocollen waartegen we meten. Copilot Checkout volgt zodra gedocumenteerd. */
export type Protocol = 'acp' | 'ucp';

/**
 * Tier-indeling. Dit is ONZE lijn, niet die van de specificaties — geen van beide
 * kent een categorie "discovery" (§3). Daarom is de indeling versie-gestempeld IP.
 */
export type Tier = 'core' | 'selection' | 'out';

/** Het systeem waar een veld normaal vandaan komt. Bepaalt de gap-eigenaar. */
export type OwnerSystem =
  | 'pim'
  | 'content'
  | 'ecommerce'
  | 'erp'
  | 'reviews'
  | 'returns'
  | 'legal'
  | 'payments'
  | 'marketing'
  | 'ops';

/** De drie gap-oorzaken uit §7 — de onderscheidende capability van de scan. */
export type GapCause = 'mapping' | 'enrichment' | 'no-source';

export interface ProtocolFieldSpec {
  /** Veldnaam zoals de specificatie hem schrijft. */
  name: string;
  tier: Tier;
  required: boolean;
}

/** Eén veld, één keer gedefinieerd, met per protocol zijn naam en tier. */
export interface FieldDef {
  /** Interne, bron-onafhankelijke sleutel. */
  key: string;
  label: Bilingual;
  owner: OwnerSystem;
  /** Genormaliseerde kolomnamen die naar dit veld verwijzen (zie intake/fieldmap). */
  aliases: string[];
  acp?: ProtocolFieldSpec;
  ucp?: ProtocolFieldSpec;
  /** Toelichting waarom dit veld ertoe doet; verschijnt in het rapport. */
  note?: Bilingual;
}

// --- Producten -------------------------------------------------------------

/** Eén productrecord, teruggebracht tot canonieke sleutels. */
export interface ProductRecord {
  /** Interne join-sleutel: sku of item_id. */
  key: string;
  /** Canonieke sleutel -> ruwe waarde zoals aangeleverd. */
  values: Record<string, string>;
  /** Kolomnamen die de bron gebruikte maar die we niet konden plaatsen. */
  unmapped: Record<string, string>;
}

export type DatasetRole = 'feed' | 'catalog';

export interface Dataset {
  role: DatasetRole;
  /** Bestandsnaam zoals aangeleverd. */
  filename: string;
  /** Herkend formaat, bv. "CSV (puntkomma-gescheiden)". */
  format: string;
  products: ProductRecord[];
  /** Bronkolom -> canonieke sleutel. Voor transparantie in de UI. */
  mapping: Record<string, string>;
  /** Bronkolommen die nergens op matchten. */
  unmappedColumns: string[];
  /** Canonieke sleutels die deze bron kent (ook als de waarde soms leeg is). */
  presentKeys: string[];
}

// --- Vragensets (§6) -------------------------------------------------------

export interface Question {
  id: string;
  label: Bilingual;
  /** Canonieke sleutels die de vraag beantwoorden. */
  requires: string[];
  /** 'any' = één gevuld veld volstaat; 'all' = alle velden nodig. */
  mode: 'any' | 'all';
  /** Uitgezet door de merchant; telt niet mee maar blijft zichtbaar. */
  disabled?: boolean;
  /** Toegevoegd door de merchant in plaats van door de generator. */
  custom?: boolean;
  /** 'archetype' = uit de bibliotheek, 'custom' = door de merchant toegevoegd. */
  origin?: 'archetype' | 'custom';
}

export interface QuestionSet {
  id: string;
  label: Bilingual;
  /** Regex op de eigen categorie van het product. Leeg = generieke fallback. */
  match?: string;
  questions: Question[];
  /** De categorienaam zoals die letterlijk in de data van de merchant staat. */
  category?: string;
  /** Hoeveel producten in deze categorie vallen. */
  productCount?: number;
  /** Uit welk archetype de set is opgebouwd. */
  archetypeId?: string;
  /** Door de merchant bevestigd. Een set telt pas als hij gezien is (S6). */
  validated?: boolean;
}

export type ChangeLogAction = 'edited' | 'disabled' | 'enabled' | 'added' | 'removed';

/** §6/§8: elke mutatie wordt vastgelegd — de sleutel tot vergelijkbaarheid. */
export interface ChangeLogEntry {
  at: string;
  setId: string;
  questionId: string;
  action: ChangeLogAction;
  before?: string;
  after?: string;
}

export interface QuestionSetState {
  version: number;
  sets: QuestionSet[];
  changeLog: ChangeLogEntry[];
}

// --- Bevindingen en rapport ------------------------------------------------

export interface Gap {
  /** Canonieke veldsleutel, of een "attr:"-patroon voor een eigen kolom. */
  field: string;
  /** Leesbare naam voor in het rapport; nooit het ruwe patroon tonen. */
  label: Bilingual;
  tier: Tier;
  cause: GapCause;
  owner: OwnerSystem;
  /** Aantal producten waarop deze gap speelt. */
  affected: number;
}

export interface QuestionOutcome {
  questionId: string;
  label: Bilingual;
  answered: boolean;
  /** Bij onbeantwoord: welke velden ontbraken. */
  missing: string[];
}

export interface ProtocolProductResult {
  /** Alle fit-vragen van de categorie beantwoord (§5). */
  findable: boolean;
  /** Volledige Selection-checklist aanwezig en bruikbaar (§5). */
  competitive: boolean;
  questions: QuestionOutcome[];
  selection: { id: string; label: Bilingual; present: boolean }[];
  /** Out-tier bevindingen: buiten de score, wel gerapporteerd (§3). */
  outWarnings: { id: string; label: Bilingual; present: boolean }[];
}

export interface ProductResult {
  key: string;
  title?: string;
  category?: string;
  /** Hoofdafbeelding uit de feed; een product zonder is zelf een bevinding. */
  image?: string;
  /** Toegepaste vragenset, of undefined als het product nergens op matchte. */
  setId?: string;
  /** Product zonder categorie: geflagd en geteld, niet gescoord (§6). */
  unmatched: boolean;
  perProtocol: Record<Protocol, ProtocolProductResult>;
  gaps: Gap[];
}

export interface Funnel {
  total: number;
  findable: number;
  competitive: number;
  /** Gemiddeld beantwoorde fit-vragen per product — "4 van de 12" (§2). */
  avgAnswered: number;
  avgApplicable: number;
}

/** Aggregatie op de eigen categorie-indeling van de merchant. */
export interface CategoryReport {
  setId: string;
  category: string;
  total: number;
  findable: number;
  competitive: number;
  avgAnswered: number;
  avgApplicable: number;
  /** De zwaarst wegende gaten binnen deze categorie. */
  topGaps: { field: string; label: Bilingual; cause: GapCause; affected: number }[];
}

export interface ProtocolReport {
  protocol: Protocol;
  funnel: Funnel;
  /** Per vraag: hoeveel producten hem beantwoorden. */
  questionCoverage: {
    setId: string;
    questionId: string;
    label: Bilingual;
    answered: number;
    applicable: number;
  }[];
  /** Per Selection-item: hoeveel producten het hebben. */
  selectionCoverage: { id: string; label: Bilingual; present: number; total: number }[];
  /** Out-tier waarschuwingsblok, los van de score. */
  outWarnings: { id: string; label: Bilingual; affected: number; note?: Bilingual }[];
  gaps: Gap[];
  categories: CategoryReport[];
}

/** §8: elke score verwijst naar spec-snapshot én vragenset-versie. */
export interface VersionStamp {
  specSnapshot: string;
  questionSetVersion: number;
  scannedAt: string;
}

export interface ScanReport {
  stamp: VersionStamp;
  sources: { feed: Dataset; catalog?: Dataset };
  productCount: number;
  /** Producten zonder categorie: geteld, niet gescoord. */
  unmatchedCount: number;
  protocols: Record<Protocol, ProtocolReport>;
  products: ProductResult[];
}
