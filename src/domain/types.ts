// Domeinmodel voor de Product Catalog Question Readiness Scan.
//
// De vraag die dit model beantwoordt is: **kan de catalogusdata van deze
// merchant de vragen beantwoorden die een koper in zijn markt stelt?** Niet:
// hoeveel velden zijn gevuld. Dat onderscheid stuurt elk type hieronder. Een
// veld heeft in dit model geen waarde op zichzelf — het bestaat alleen als
// bewijs onder een vraag, en een gat is pas een gat als er een vraag door
// onbeantwoord blijft.
//
// De catalogus is de enige bron. Dat is de export uit het systeem waar de
// merchant zijn productkennis werkelijk onderhoudt: zijn PIM of MDM, of anders
// Magento of Shopify. Daar staat wat hij wéét van zijn producten, en dat is wat
// hier gemeten wordt.

import type {
  Answerability, BankStatus, Importance, Intent,
} from '../questions/bank';

export type Locale = 'nl' | 'en';

export interface Bilingual {
  nl: string;
  en: string;
}

/** Het systeem waar een gegeven normaal vandaan komt. Bepaalt de gap-eigenaar. */
export type OwnerSystem =
  | 'pim'
  | 'content'
  | 'ecommerce'
  | 'erp'
  | 'reviews'
  | 'returns'
  | 'legal'
  | 'marketing'
  | 'ops';

/**
 * Waarom een antwoord ontbreekt, en daarmee wat voor werk het is.
 *
 * Dit is het onderscheid dat een lijst gaten tot een werkplan maakt. "Ontbreekt"
 * is geen opdracht; deze drie zijn dat wel, en ze horen bij een andere persoon,
 * een ander budget en een andere doorlooptijd.
 *
 * - `unfilled`   — je catalogus kent dit veld, maar het staat bij deze producten
 *                  leeg. Invulwerk: de plek bestaat al.
 * - `unmodelled` — je catalogus kent dit kenmerk helemaal niet. Modelwerk: er
 *                  moet eerst een veld komen, en daarna pas een waarde.
 * - `no-source`  — het komt uit een systeem dat je catalogus nooit gaat dragen,
 *                  zoals je reviewplatform of je retourenadministratie.
 */
export type GapCause = 'unfilled' | 'unmodelled' | 'no-source';

/** Eén canoniek veld: de vocabulaire waarin bewijs wordt uitgedrukt. */
export interface FieldDef {
  /** Interne, bron-onafhankelijke sleutel. */
  key: string;
  label: Bilingual;
  owner: OwnerSystem;
  /** Genormaliseerde kolomnamen die naar dit veld verwijzen (zie intake/fieldmap). */
  aliases: string[];
  /** Toelichting waarom dit veld ertoe doet; verschijnt in het rapport. */
  note?: Bilingual;
}

// --- Producten -------------------------------------------------------------

/** Eén productrecord, teruggebracht tot canonieke sleutels. */
export interface ProductRecord {
  /** Interne sleutel: sku of item_id. */
  key: string;
  /** Canonieke sleutel -> ruwe waarde zoals aangeleverd. */
  values: Record<string, string>;
  /** Kolomnamen die de bron gebruikte maar die we niet konden plaatsen. */
  unmapped: Record<string, string>;
}

/**
 * De catalogusexport, zoals wij hem lezen.
 *
 * `columns` en `presentKeys` dragen samen het datamodel van de merchant: welke
 * velden zijn catalogus überhaupt kent. Dat is precies wat een gat dat leeg is
 * onderscheidt van een gat dat niet bestaat, en daarom staan ze hier en niet
 * alleen in de UI.
 */
export interface Dataset {
  /** Bestandsnaam zoals aangeleverd. */
  filename: string;
  /** Herkend formaat, bv. "CSV (puntkomma-gescheiden)". */
  format: string;
  products: ProductRecord[];
  /** Alle bronkolommen in de volgorde waarin ze in het bestand staan. */
  columns: string[];
  /** De eerste regels ruw, zodat de merchant ziet wat wij zien. */
  preview: Record<string, string>[];
  /** Bronkolom -> canonieke sleutel. Voor transparantie in de UI. */
  mapping: Record<string, string>;
  /** Bronkolommen die nergens op matchten. */
  unmappedColumns: string[];
  /** Canonieke sleutels die deze bron kent (ook als de waarde soms leeg is). */
  presentKeys: string[];
}

// --- Vragensets ------------------------------------------------------------

/** Eén attribuut met de velden die het in een catalogus kunnen dragen. */
export interface RequirementGroup {
  /** Sleutel van het domeinattribuut uit de vragenbank. */
  attributeKey: string;
  label: Bilingual;
  /** Canonieke veldsleutels of "attr:"-patronen. */
  fields: string[];
  /** 'any' = één gevuld veld volstaat; 'all' = alle velden nodig. */
  mode: 'any' | 'all';
}

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
  /** Waar de vraag vandaan komt. 'bank' = uit een vragenbank (zie questions/bank). */
  origin?: 'bank' | 'custom';

  // --- Uit de vragenbank ---------------------------------------------------
  // Deze velden komen mee uit de bank en veranderen niet door toedoen van de
  // merchant. Ze zijn optioneel omdat een zelf toegevoegde vraag ze niet heeft;
  // die krijgt een standaardgewicht (zie compose.ts).

  /** Weegt mee in de trechter: kritieke vragen vormen een eigen trede. */
  importance?: Importance;
  intent?: Intent;
  /** Op hoeveel panelsites dit onderwerp voorkomt; null = niet onderzocht. */
  coverage?: number | null;
  /** Uit attributen te beantwoorden? 'no' betekent: buiten de score, wel advies. */
  answerable?: Answerability;
  /**
   * Het bewijs, per domeinattribuut gegroepeerd.
   *
   * Twee lagen, omdat de vraag zelf twee lagen heeft: "hoeveel meter heb ik
   * nodig" vraagt baanbreedte ÉN rapport, en elk van die twee kan uit meerdere
   * kolommen komen. Platslaan tot één lijst maakt van die "of" een "en" en laat
   * een merchant zakken op een alias die hij nooit hoefde te gebruiken.
   *
   * Staat dit er, dan is dit leidend voor het antwoord en is `requires` slechts
   * de platgeslagen weergave ervan, voor de gaptoewijzing en het scherm.
   */
  evidence?: RequirementGroup[];
  /** Beslisregel die bepaalt wat een goed antwoord is. */
  ruleId?: string;
  /** Verantwoording als het gewicht afwijkt van wat de dekking suggereert. */
  weightNote?: Bilingual;
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
  /** Door de merchant bevestigd. Een set telt pas als hij gezien is. */
  validated?: boolean;

  // --- Herkomst uit de vragenbank ------------------------------------------

  /** De vertical-sleutel van de bank waaruit deze set is samengesteld. */
  bankId?: string;
  bankVersion?: string;
  /**
   * Voorlopig of bevroren. Een voorlopige bank is een terugval zonder panel en
   * zonder domeinreview; dat hoort de merchant te zien, niet te moeten raden.
   */
  bankStatus?: BankStatus;
  /** De categorie-overlay die op de basislaag lag, als die er was. */
  overlayId?: string;
  /** Toepassingsprofielen die binnen deze categorie gelden. */
  profileIds?: string[];
}

export type ChangeLogAction = 'edited' | 'disabled' | 'enabled' | 'added' | 'removed';

/** Elke mutatie wordt vastgelegd — de sleutel tot vergelijkbaarheid. */
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
  /**
   * Welke banken deze sets voedden, met hun versie en status.
   *
   * Staat op het rapport. Zonder dit kan een merchant niet zien of zijn cijfer
   * bewoog omdat zijn data veranderde of omdat de bank onder hem vernieuwd is.
   */
  banks: { id: string; label: Bilingual; version: string; status: BankStatus }[];
}

// --- Bevindingen en rapport ------------------------------------------------

export interface Gap {
  /** Canonieke veldsleutel, of een "attr:"-patroon voor een eigen kolom. */
  field: string;
  /** Leesbare naam voor in het rapport; nooit het ruwe patroon tonen. */
  label: Bilingual;
  cause: GapCause;
  owner: OwnerSystem;
  /** Aantal producten waarop deze gap speelt. */
  affected: number;
  /** Welke vragen hierdoor onbeantwoord blijven. Een gat zonder vraag bestaat niet. */
  questions: string[];
}

/**
 * De vijf toestanden waarin een vraag kan verkeren.
 *
 * Het verschil is niet cosmetisch: elke toestand wijst naar een andere handeling
 * en soms naar een andere afdeling. Eén boolean gooit ze op één hoop en levert
 * een lijst op waar niemand mee verder kan.
 *
 * - `answered`   — beantwoordbaar: de catalogus draagt het antwoord.
 * - `unusable`   — onbruikbaar: het veld is gevuld maar haalt de kwaliteitsdrempel
 *                  niet, zoals een omschrijving van vier woorden. Redactiewerk.
 * - `incomplete` — onvolledig: een deel van het benodigde bewijs staat er, de rest
 *                  niet. Alleen mogelijk bij een vraag die meerdere dingen vraagt.
 * - `empty`      — leeg: het veld bestaat in de catalogus maar is bij dit product
 *                  niet ingevuld. Invulwerk; de plek is er al.
 * - `absent`     — ontbreekt: de catalogus kent dit kenmerk niet. Modelwerk.
 */
export type AnswerState = 'answered' | 'unusable' | 'incomplete' | 'empty' | 'absent';

export interface QuestionOutcome {
  questionId: string;
  label: Bilingual;
  state: AnswerState;
  /** De catalogus beantwoordt de vraag. `state === 'answered'`. */
  answered: boolean;
  /** Bij onbeantwoord: welke velden ontbraken. */
  missing: string[];
  /** Het gewicht van deze vraag; 0 als hij buiten de score valt. */
  weight: number;
  /**
   * Telt deze vraag mee in de trechter? Procesvragen en structuurvragen staan
   * hier op false: ze leveren advies op maar geen enkel attribuut kan ze dragen,
   * en meetellen zou de meting vertekenen.
   */
  scored: boolean;
  importance: Importance;
}

export interface ProductResult {
  key: string;
  title?: string;
  category?: string;
  /** Hoofdafbeelding; een product zonder is zelf een bevinding. */
  image?: string;
  /** Toegepaste vragenset, of undefined als het product nergens op matchte. */
  setId?: string;
  /** Product zonder categorie: geflagd en geteld, niet gescoord. */
  unmatched: boolean;
  /** Alle vragen van de categorie beantwoord. */
  findable: boolean;
  /**
   * Basisgeschikt: elke kritieke vraag beantwoord.
   *
   * Kritiek is in de methode niet "commercieel belangrijk" maar "voorkomt de
   * fout die de koper niet kan terugdraaien" — op maat gemaakt, aangebroken
   * verpakking, vervallen herroepingsrecht. Een product dat daar niet doorheen
   * komt, hoort een agent niet aan te bevelen, hoe compleet de rest ook is.
   */
  qualified: boolean;
  /** Som van de gewichten van alle gescoorde vragen. */
  weight: number;
  /** Daarvan behaald: de gewichten van de beantwoorde vragen. */
  earned: number;
  questions: QuestionOutcome[];
  gaps: Gap[];
}

export interface Funnel {
  total: number;
  /** Elke kritieke vraag beantwoord. De trede vóór volledig. */
  qualified: number;
  /** Elke vraag van de eigen categorie beantwoord. */
  findable: number;
  /** Gemiddeld beantwoorde vragen per product — "4 van de 12". */
  avgAnswered: number;
  avgApplicable: number;
  /** Hetzelfde in gewichtspunten: "34 van de 48" weegt kritiek zwaarder dan laag. */
  avgEarned: number;
  avgWeight: number;
}

/** Aggregatie op de eigen categorie-indeling van de merchant. */
export interface CategoryReport {
  setId: string;
  category: string;
  total: number;
  qualified: number;
  findable: number;
  avgAnswered: number;
  avgApplicable: number;
  avgEarned: number;
  avgWeight: number;
  /** De zwaarst wegende gaten binnen deze categorie. */
  topGaps: { field: string; label: Bilingual; cause: GapCause; affected: number }[];
}

/**
 * Hoe ver is een product nog van volledig af?
 *
 * De trechter is binair en zegt bij de meeste merchants nul. Dat leest als een
 * dichte deur terwijl er in werkelijkheid al veel staat. Deze verdeling laat de
 * afstand zien zonder de lat te verlagen: nul open vragen is nog steeds het
 * enige dat volledig heet.
 */
export interface DistanceBucket {
  /** Aantal vragen dat nog openstaat. */
  open: number;
  products: number;
}

/** Per vraag: hoeveel producten hem beantwoorden, en waar de rest strandt. */
export interface QuestionCoverage {
  setId: string;
  questionId: string;
  label: Bilingual;
  answered: number;
  /** Het veld bestaat, maar staat leeg. */
  empty: number;
  /** Gevuld maar te mager om een antwoord te heten. */
  unusable: number;
  /** Deels bewijs aanwezig, deels niet. */
  incomplete: number;
  /** De catalogus kent het kenmerk niet. */
  absent: number;
  applicable: number;
  importance: Importance;
  /** Het gewicht dat hier per product op het spel staat. */
  weight: number;
  /** Telt niet mee in de trechter; staat in het adviesblok. */
  scored: boolean;
}

/** Elke score verwijst naar de scanregels, het veldenregister én de vragenbank. */
export interface VersionStamp {
  /** Versie van de scanregels zelf; zonder dit is vergelijken over tijd blind. */
  scanVersion: string;
  /** Snapshot van het veldenregister: de vocabulaire waarin bewijs is uitgedrukt. */
  fieldRegister: string;
  questionSetVersion: number;
  /**
   * Een vragenbank kan onder een merchant vernieuwen — een panel dat uitgebreid
   * wordt, een drempel die na de domeinreview verschuift. Zonder dit nummer
   * lijkt zo'n verschuiving op vooruitgang.
   */
  banks: { id: string; label: Bilingual; version: string; status: BankStatus }[];
  scannedAt: string;
}

export interface ScanReport {
  stamp: VersionStamp;
  sources: { catalog: Dataset };
  productCount: number;
  /** Producten zonder categorie: geteld, niet gescoord. */
  unmatchedCount: number;
  funnel: Funnel;
  /** Oplopend op aantal openstaande vragen; alleen de standen die voorkomen. */
  distance: DistanceBucket[];
  questionCoverage: QuestionCoverage[];
  /**
   * Vragen die geen enkel attribuut kan dragen — proces, structuur, levenscyclus.
   *
   * Ze blijven in het rapport omdat ze advies opleveren ("bied een staal aan"),
   * maar buiten de score, want een merchant afrekenen op iets wat per definitie
   * niet in een catalogus past is geen meting.
   */
  advisory: { setId: string; questionId: string; label: Bilingual; importance: Importance }[];
  gaps: Gap[];
  categories: CategoryReport[];
  products: ProductResult[];
}
