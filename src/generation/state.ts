// Wat een generatie onderweg verzamelt, en waar hij is gebleven.
//
// De methode in `kennis/_methode/` is geen open onderzoeksopdracht maar een
// vaste reeks: panel, oogst per site, consolidatie, basislaag, overlays,
// facetten. Dat is de reden dat hier een fase-teller staat en geen agent. Elke
// beurt zet één stap en bewaart wat eruit kwam; valt er iets om bij site vier,
// dan begint de volgende beurt bij site vier.
//
// Deze map blijft puur, om dezelfde reden als de motor: geen klok, geen fetch,
// geen opslag. Het modelantwoord komt binnen als argument (`Ask`), zodat de
// hele reeks met vaste antwoorden na te spelen is in een test. Wat er wél naar
// buiten praat staat in `src/server/generator.ts`.

/** Hoe zwaar het model voor deze stap mag zijn. */
export type ModelChoice = 'reader' | 'judge';

/** Wat een stap aan tokens kostte. Niet in euro's: de prijs verandert, dit niet. */
export interface Usage {
  input: number;
  output: number;
  cached: number;
}

export const NO_USAGE: Usage = { input: 0, output: 0, cached: 0 };

export function addUsage(a: Usage, b: Usage): Usage {
  return { input: a.input + b.input, output: a.output + b.output, cached: a.cached + b.cached };
}

/** Eén stap in de reeks. */
export type Phase =
  | { kind: 'panel' }
  | { kind: 'harvest'; index: number }
  | { kind: 'consolidate' }
  | { kind: 'base' }
  | { kind: 'overlay'; index: number }
  | { kind: 'facets' }
  | { kind: 'assemble' }
  | { kind: 'done' };

export const FIRST_PHASE: Phase = { kind: 'panel' };

/**
 * De fase als tekst, want de database bewaart hem als kolom.
 *
 * Met de index erin en niet als los veld: één string die de hele plek in de
 * reeks aanwijst is bij het lezen van een rij meteen te begrijpen, en er kan
 * geen fase bestaan die bij een index hoort die er niet meer is.
 */
export function encodePhase(phase: Phase): string {
  if (phase.kind === 'harvest' || phase.kind === 'overlay') return `${phase.kind}:${phase.index}`;
  return phase.kind;
}

export function decodePhase(raw: string): Phase {
  const [kind, index] = raw.split(':');
  const at = Number(index);
  switch (kind) {
    case 'harvest': return { kind: 'harvest', index: Number.isFinite(at) ? at : 0 };
    case 'overlay': return { kind: 'overlay', index: Number.isFinite(at) ? at : 0 };
    case 'consolidate': return { kind: 'consolidate' };
    case 'base': return { kind: 'base' };
    case 'facets': return { kind: 'facets' };
    case 'assemble': return { kind: 'assemble' };
    case 'done': return { kind: 'done' };
    default: return FIRST_PHASE;
  }
}

// --- Wat de aanvraag meegeeft ------------------------------------------------

/**
 * De opdracht. Dit is alles wat de generatie over de merchant weet.
 *
 * Categorienamen met aantallen en een URL — geen kolomnamen, geen productrijen,
 * geen prijzen. Dat is fase 3 van de methode (blinderen: bouw de bank vóórdat
 * je de catalogus opent) én de privacybelofte, en het type kan niet meer dragen.
 */
export interface RunBrief {
  vertical: string;
  segments: { name: string; count: number }[];
  merchantSite?: string;
  suggestedSites: string[];
}

// --- Wat de fasen opleveren --------------------------------------------------

export interface PanelSite {
  name: string;
  url: string;
  /** categorieleider | specialist | merk | buitenlands — vrij, want het panel is een oordeel. */
  type: string;
  consultedAt: string;
  /** Waarom deze site, in één zin. Zonder dit is het panel niet te beoordelen. */
  reason?: string;
}

/** Fase 0 van de methode: wat voor soort markt dit is. */
export interface VerticalShape {
  /** Per stuk of per maateenheid — bepaalt of hoeveelheid een eigen vragencluster is. */
  unit: string;
  /** De fout die de koper niet kan terugdraaien. Stuurt élke kritieke weging. */
  irreversibleMistake: string;
  /** Sectorstandaard of testnormen om op te ankeren, als die er zijn. */
  standards: string[];
  /** Wetgeving die dit producttype dwingend raakt. Alleen verplichtingen. */
  legal: string[];
}

/**
 * Wat de merchant een categorie noemt, en wat het volgens de methode is.
 *
 * Dit is het enige echte oordeel in de hele keten. Een `overlay` krijgt een
 * eigen vragenset en dus een eigen rij in het rapport; een `profiel` is dezelfde
 * vragen met andere drempels; een `facet` is helemaal geen categorie maar een
 * eigenschap die als attribuutwaarde hoort. Zit dit verkeerd, dan meet het
 * rapport op het verkeerde niveau — daarom stelt de beheerder het vast.
 */
export interface GroupingEntry {
  category: string;
  count: number;
  kind: 'overlay' | 'profiel' | 'facet';
  /** Bij `profiel`: onder welke overlay hij hangt. */
  parent?: string;
  reason: string;
}

/** De ruwe oogst van één site. Fase 2 van de methode. */
export interface SiteHarvest {
  site: string;
  questions: { question: string; source: string; url?: string }[];
  attributes: { namedAs: string; meaning: string }[];
  rules: { name: string; rule: string; url?: string }[];
  /** Wat er niet lukte — een site die niet laadt is een bevinding, geen stilte. */
  notes: string[];
}

/** Eén onderwerp na consolidatie over het panel. Fase 1b. */
export interface Topic {
  topic: string;
  question: string;
  coverage: number;
  coverageSites: string[];
  sources: string[];
  /** Sites die elkaar tegenspreken: een discussiepunt, geen fout. */
  conflict?: string;
}

/** Eén vraag zoals hij in de bank komt. De vorm volgt fase 5 van de methode. */
export interface DraftQuestion {
  id: string;
  questionNl: string;
  questionEn: string;
  intent: string;
  importance: 'kritiek' | 'hoog' | 'middel' | 'laag';
  coverage: number | null;
  coverageSites: string[];
  sources: string[];
  evidence: string[];
  synonyms: string[];
  rule?: string;
  /**
   * Waar de drempel van die regel vandaan komt: de site die hem publiceert.
   *
   * Zonder dit blijft elke regel "beredeneerd" en telt hij niet mee in de score
   * — de veilige aanname, maar bij de eerste echte bank betekende het dat 105
   * vragen als bezwaar op het beoordeelscherm stonden met één oorzaak. De
   * oogst kent die bron: hij neemt drempeltabellen letterlijk over mét URL.
   */
  ruleSource?: string;
  answerType: string;
  answerable: 'true' | 'gedeeltelijk' | 'false';
  mode?: 'alle' | 'een';
  note?: string;
}

/** Een laag: de basis, of een overlay bij één categorie. */
export interface LayerDraft {
  /** Leeg voor de basislaag. */
  category: string;
  questions: DraftQuestion[];
  /** Basisvragen die in deze categorie anders wegen. Herwegen mag, herschrijven niet. */
  reweight: { id: string; importance: string; reason: string }[];
}

export interface FacetEntry {
  category: string;
  count: number;
  attribute: string;
  condition: string;
  panelSites: number;
  priority: 'hoog' | 'middel' | 'laag';
}

/** Alles wat de reeks tot nu toe opleverde. */
export interface RunState {
  brief: RunBrief;
  shape?: VerticalShape;
  panel: PanelSite[];
  grouping: GroupingEntry[];
  harvest: SiteHarvest[];
  topics: Topic[];
  base?: LayerDraft;
  overlays: LayerDraft[];
  facets: FacetEntry[];
  /** Wat de generatie zelf al markeerde. Gaat mee als bevinding naar de review. */
  findings: string[];
  csv?: string;
}

export function emptyState(brief: RunBrief): RunState {
  return {
    brief,
    panel: [],
    grouping: [],
    harvest: [],
    topics: [],
    overlays: [],
    facets: [],
    findings: [],
  };
}

/** De categorieën die een eigen overlay verdienen, in vaste volgorde. */
export function overlayCategories(state: RunState): string[] {
  return state.grouping.filter((entry) => entry.kind === 'overlay').map((entry) => entry.category);
}

/**
 * Welke stap volgt op deze, gegeven wat er al ligt.
 *
 * Op één plek en niet verspreid over de fasen: de reeks is de methode, en die
 * hoort in één oogopslag te lezen te zijn.
 */
export function nextPhase(phase: Phase, state: RunState): Phase {
  switch (phase.kind) {
    case 'panel':
      return state.panel.length > 0 ? { kind: 'harvest', index: 0 } : { kind: 'consolidate' };
    case 'harvest':
      return phase.index + 1 < state.panel.length
        ? { kind: 'harvest', index: phase.index + 1 }
        : { kind: 'consolidate' };
    case 'consolidate':
      return { kind: 'base' };
    case 'base':
      return overlayCategories(state).length > 0 ? { kind: 'overlay', index: 0 } : { kind: 'facets' };
    case 'overlay':
      return phase.index + 1 < overlayCategories(state).length
        ? { kind: 'overlay', index: phase.index + 1 }
        : { kind: 'facets' };
    case 'facets':
      return { kind: 'assemble' };
    default:
      return { kind: 'done' };
  }
}

/** Hoeveel stappen deze run in totaal telt, zodat een scherm voortgang kan tonen. */
export function totalPhases(state: RunState): number {
  // panel + oogst per site + consolidatie + basis + overlay per categorie + facetten + samenstellen
  return 1 + Math.max(state.panel.length, 1) + 1 + 1 + overlayCategories(state).length + 1 + 1;
}

/** De hoeveelste stap dit is. Alleen voor de voortgang; de reeks stuurt zichzelf. */
export function phaseNumber(phase: Phase, state: RunState): number {
  const sites = Math.max(state.panel.length, 1);
  const overlays = overlayCategories(state).length;
  switch (phase.kind) {
    case 'panel': return 1;
    case 'harvest': return 2 + phase.index;
    case 'consolidate': return 2 + sites;
    case 'base': return 3 + sites;
    case 'overlay': return 4 + sites + phase.index;
    case 'facets': return 4 + sites + overlays;
    case 'assemble': return 5 + sites + overlays;
    default: return totalPhases(state);
  }
}
