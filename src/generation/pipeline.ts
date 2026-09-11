// Eén stap zetten, en niet meer dan één.
//
// Dit is de hele generator: een functie die een toestand plus een fase aanneemt,
// het model één vraag stelt, het antwoord opneemt en zegt welke stap volgt. Geen
// lus, geen agent die zelf bedenkt wat hij gaat doen. De methode ís de lus, en
// die staat in `state.ts` als `nextPhase`.
//
// Dat heeft drie gevolgen die alle drie het punt zijn van deze opzet: de run kan
// hervatten waar hij stopte, elke stap kost een bekend bedrag, en een bank die
// raar uitvalt is terug te voeren op één stap.
//
// Puur: het modelantwoord komt binnen via `ask` en de tijd via `at`. Zo is de
// hele reeks met vaste antwoorden na te spelen zonder netwerk en zonder klok.

import { promptFor, SYSTEM } from './prompts';
import { checkDraft, toCsv } from './csv';
import {
  addUsage,
  encodePhase,
  nextPhase,
  NO_USAGE,
  overlayCategories,
  type DraftQuestion,
  type FacetEntry,
  type GroupingEntry,
  type ModelChoice,
  type Phase,
  type RunState,
  type SiteHarvest,
  type Topic,
  type Usage,
} from './state';

/** Wat er aan het model gevraagd wordt. Wie dat uitvoert staat in `src/server/`. */
export interface AskTask {
  phase: string;
  model: ModelChoice;
  system: string;
  prompt: string;
  web: boolean;
  maxTokens: number;
}

export interface AskReply {
  /** Het geparseerde JSON-object. De uitvoerder faalt liever dan half te raden. */
  json: unknown;
  usage: Usage;
}

export type Ask = (task: AskTask) => Promise<AskReply>;

export interface Advanced {
  state: RunState;
  next: Phase;
  usage: Usage;
}

// --- Lezen wat er terugkomt --------------------------------------------------
//
// Het model levert JSON, maar een veld kan ontbreken of de verkeerde vorm
// hebben. Alles gaat daarom door een lezer die een lege waarde teruggeeft in
// plaats van te struikelen. Wat er ontbreekt valt straks op bij de poorten —
// een vraag zonder attributen wordt gemeld, een dekking zonder sites ook — en
// dat is de juiste plek: daar kijkt een mens mee.

const asObject = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asStrings = (value: unknown): string[] =>
  asArray(value).map(asString).filter((one) => one !== '');

const asNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(asString(value));
  return Number.isFinite(number) ? number : null;
};

const IMPORTANCE = new Set(['kritiek', 'hoog', 'middel', 'laag']);

/** Eén vraag zoals het model hem aanlevert. */
function readQuestion(raw: unknown, fallbackId: string): DraftQuestion | null {
  const source = asObject(raw);
  const id = asString(source.id) || fallbackId;
  const nl = asString(source.questionNl) || asString(source.question);
  const en = asString(source.questionEn) || nl;
  if (nl === '') return null;

  const importance = asString(source.importance).toLowerCase();
  const mode = asString(source.mode).toLowerCase();
  const answerable = asString(source.answerable).toLowerCase();

  return {
    id,
    questionNl: nl,
    questionEn: en,
    intent: asString(source.intent) || 'geschiktheid',
    importance: (IMPORTANCE.has(importance) ? importance : 'middel') as DraftQuestion['importance'],
    coverage: asNumber(source.coverage),
    coverageSites: asStrings(source.coverageSites),
    sources: asStrings(source.sources),
    evidence: asStrings(source.evidence).map((one) => one.toLowerCase().replace(/\s+/g, '_')),
    synonyms: asStrings(source.synonyms),
    rule: asString(source.rule) || undefined,
    ruleSource: asString(source.ruleSource) || undefined,
    answerType: asString(source.answerType) || 'tekst',
    answerable: answerable === 'false' || answerable === 'gedeeltelijk' ? answerable : 'true',
    mode: mode === 'alle' || mode === 'een' ? (mode as 'alle' | 'een') : undefined,
    note: asString(source.note) || undefined,
  };
}

/**
 * De vragen van één laag, met ids die gegarandeerd uniek zijn.
 *
 * Het model nummert per laag en weet niet wat de vorige laag koos, dus twee
 * overlays komen vroeg of laat met hetzelfde id aan. Voor de lezer is dat geen
 * waarschuwing maar een blokkerende fout: een id moet één vraag aanwijzen. Dat
 * zou een hele generatie weggooien op de laatste stap, en dus wordt het hier
 * hernoemd in plaats van daar afgekeurd.
 */
function readQuestions(raw: unknown, prefix: string, taken: Set<string>): DraftQuestion[] {
  const out: DraftQuestion[] = [];
  for (const [index, one] of asArray(raw).entries()) {
    const question = readQuestion(one, `${prefix}-${String(index + 1).padStart(2, '0')}`);
    if (!question) continue;

    let id = question.id;
    for (let suffix = 2; taken.has(id); suffix++) id = `${question.id}-${suffix}`;
    taken.add(id);
    out.push(id === question.id ? question : { ...question, id });
  }
  return out;
}

/** Alle ids die al vergeven zijn, zodat een nieuwe laag erlangs kan. */
function takenIds(state: RunState): Set<string> {
  return new Set([
    ...(state.base?.questions ?? []).map((question) => question.id),
    ...state.overlays.flatMap((overlay) => overlay.questions.map((question) => question.id)),
  ]);
}

const KINDS = new Set(['overlay', 'profiel', 'facet']);

function readGrouping(raw: unknown, state: RunState): GroupingEntry[] {
  const counts = new Map(state.brief.segments.map((segment) => [segment.name, segment.count]));
  return asArray(raw)
    .map((one): GroupingEntry | null => {
      const source = asObject(one);
      const category = asString(source.category);
      const kind = asString(source.kind).toLowerCase();
      if (category === '' || !KINDS.has(kind)) return null;
      return {
        category,
        count: counts.get(category) ?? asNumber(source.count) ?? 0,
        kind: kind as GroupingEntry['kind'],
        parent: asString(source.parent) || undefined,
        reason: asString(source.reason),
        distinct: kind === 'overlay' ? asStrings(source.distinct).slice(0, 5) : undefined,
      };
    })
    .filter((one): one is GroupingEntry => one !== null);
}

/** Hoeveel eigen vragen een categorie moet noemen om een eigen vragenset te krijgen. */
const OVERLAY_BAR = 3;

/**
 * De lat voor een overlay, nagerekend in plaats van geloofd.
 *
 * De prompt vraagt om drie vragen die in deze categorie gesteld worden en in
 * geen enkele andere. Noemt hij er geen enkele, dan is de toets niet afgelegd
 * en wordt het een toepassingsprofiel — dezelfde vragen, andere drempels, en
 * dat is bijna altijd het juiste antwoord. Noemt hij er één of twee, dan blijft
 * het een overlay maar staat het als bevinding op het scherm: dat is een
 * grensgeval en daar hoort een mens naar te kijken.
 *
 * Dat onderscheid — omzetten bij nul, melden bij te weinig — komt voort uit wat
 * er misgaat als je het fout doet. Een overlay ten onrechte omzetten kost een
 * markt zijn eigen vragen; een profiel ten onrechte laten staan kost een rij in
 * het rapport die niets onderscheidt. Het eerste is erger, dus we grijpen alleen
 * in waar het model niets heeft aan te voeren.
 */
function applyOverlayBar(grouping: GroupingEntry[]): { grouping: GroupingEntry[]; findings: string[] } {
  const findings: string[] = [];

  const next = grouping.map((entry) => {
    if (entry.kind !== 'overlay') return entry;
    const distinct = entry.distinct ?? [];

    if (distinct.length === 0) {
      findings.push(
        `${entry.category} kreeg geen eigen vragenset: er is geen enkele vraag genoemd die hier gesteld wordt en nergens anders. `
        + 'Hij telt nu als toepassingsprofiel — dezelfde vragen, andere drempels.',
      );
      return { ...entry, kind: 'profiel' as const };
    }

    if (distinct.length < OVERLAY_BAR) {
      findings.push(
        `${entry.category} kreeg een eigen vragenset op ${distinct.length} eigen vra${distinct.length === 1 ? 'ag' : 'gen'} `
        + `in plaats van ${OVERLAY_BAR}: ${distinct.join(' · ')}. Kijk na of dat werkelijk een eigen vragenset rechtvaardigt.`,
      );
    }
    return entry;
  });

  return { grouping: next, findings };
}

/**
 * Categorieën die de groepering niet noemt.
 *
 * Stilzwijgend weglaten zou de ergste fout van de hele keten zijn: een categorie
 * die nergens landt, verdwijnt uit het rapport zonder dat iemand het ziet. Ze
 * worden daarom facet — het onschuldigste vak, want een facet krijgt geen eigen
 * vragenset — en het staat als bevinding op het scherm waar de beheerder hem
 * kan terugzetten.
 */
function completeGrouping(grouping: GroupingEntry[], state: RunState): { grouping: GroupingEntry[]; findings: string[] } {
  const named = new Set(grouping.map((entry) => entry.category));
  const missing = state.brief.segments.filter((segment) => !named.has(segment.name));
  if (missing.length === 0) return { grouping, findings: [] };

  return {
    grouping: [
      ...grouping,
      ...missing.map((segment) => ({
        category: segment.name,
        count: segment.count,
        kind: 'facet' as const,
        reason: 'De generatie noemde deze categorie niet; hij staat als facet tot iemand hem indeelt.',
      })),
    ],
    findings: [
      `${missing.length} categorie${missing.length === 1 ? '' : 'ën'} kwam${missing.length === 1 ? '' : 'en'} niet terug in de groepering `
      + `(${missing.slice(0, 5).map((segment) => segment.name).join(', ')}). Ze staan nu als facet.`,
    ],
  };
}

function readHarvest(raw: unknown, site: string): SiteHarvest {
  const source = asObject(raw);
  return {
    site,
    questions: asArray(source.questions).map((one) => {
      const entry = asObject(one);
      return {
        question: asString(entry.question),
        source: asString(entry.source),
        url: asString(entry.url) || undefined,
      };
    }).filter((one) => one.question !== ''),
    attributes: asArray(source.attributes).map((one) => {
      const entry = asObject(one);
      return { namedAs: asString(entry.namedAs), meaning: asString(entry.meaning) };
    }).filter((one) => one.namedAs !== ''),
    rules: asArray(source.rules).map((one) => {
      const entry = asObject(one);
      return { name: asString(entry.name), rule: asString(entry.rule), url: asString(entry.url) || undefined };
    }).filter((one) => one.rule !== ''),
    notes: asStrings(source.notes),
  };
}

function readTopics(raw: unknown): Topic[] {
  return asArray(raw)
    .map((one): Topic | null => {
      const source = asObject(one);
      const question = asString(source.question);
      if (question === '') return null;
      return {
        topic: asString(source.topic) || question.slice(0, 40),
        question,
        coverage: asNumber(source.coverage) ?? 0,
        coverageSites: asStrings(source.coverageSites),
        sources: asStrings(source.sources),
        conflict: asString(source.conflict) || undefined,
      };
    })
    .filter((one): one is Topic => one !== null);
}

function readFacets(raw: unknown): FacetEntry[] {
  return asArray(raw)
    .map((one): FacetEntry | null => {
      const source = asObject(one);
      const category = asString(source.category);
      if (category === '') return null;
      const priority = asString(source.priority).toLowerCase();
      return {
        category,
        count: asNumber(source.count) ?? 0,
        attribute: asString(source.attribute),
        condition: asString(source.condition),
        panelSites: asNumber(source.panelSites) ?? 0,
        priority: (priority === 'hoog' || priority === 'laag' ? priority : 'middel') as FacetEntry['priority'],
      };
    })
    .filter((one): one is FacetEntry => one !== null);
}

const findingsOf = (source: Record<string, unknown>): string[] => asStrings(source.findings).slice(0, 40);

/**
 * Een fase die had moeten schrijven en niets opleverde.
 *
 * Een lezer die niet struikelt is goed zolang er íets binnenkomt. Maar een
 * basislaag of een categorie zonder één vraag is geen magere uitkomst, het is
 * een kapotte stap — en doorlopen verplaatst de fout naar het eind van de reeks,
 * waar hij pas na elf betaalde stappen opvalt als een lege tabel. Dat is precies
 * wat de eerste batchrun deed. Nu faalt de stap zelf en telt hij als poging.
 *
 * De tokens reizen mee, want die zijn betaald.
 */
export class EmptyPhase extends Error {
  constructor(message: string, readonly usage: Usage) {
    super(message);
    this.name = 'EmptyPhase';
  }
}

// --- De stap zelf ------------------------------------------------------------

/**
 * Zet één stap en zeg welke volgt.
 *
 * `at` is de datum waarop het panel geraadpleegd is. Die komt binnen als
 * argument en niet uit een klok, om dezelfde reden als bij de motor: anders
 * geeft dezelfde invoer twee keer een andere uitkomst.
 */
/**
 * Wat deze fase aan het model zou vragen, zonder het te vragen.
 *
 * Apart van het verwerken, want er zijn twee manieren om een antwoord te
 * krijgen: meteen, of via de batch-API die er een uur over doet en de helft
 * kost. Die tweede kan alleen als de vraag en de verwerking los van elkaar
 * staan — je stelt hem nu en verwerkt hem straks, in een ander verzoek en
 * misschien op een ander proces.
 *
 * `null` betekent: deze stap heeft geen model nodig.
 */
export function taskFor(state: RunState, phase: Phase): AskTask | null {
  if (phase.kind === 'assemble' || phase.kind === 'done') return null;
  const { prompt, model, web, maxTokens } = promptFor(phase, state);
  return { phase: encodePhase(phase), model, system: SYSTEM, prompt, web, maxTokens };
}

export async function advance(state: RunState, phase: Phase, ask: Ask, at: string): Promise<Advanced> {
  const task = taskFor(state, phase);
  if (task === null) return applyReply(state, phase, undefined, at);
  return applyReply(state, phase, await ask(task), at);
}

/** Het antwoord opnemen en zeggen welke stap volgt. */
export function applyReply(
  state: RunState,
  phase: Phase,
  reply: AskReply | undefined,
  at: string,
): Advanced {
  // Samenstellen is de enige stap zonder model: op dit punt is alles besloten.
  if (phase.kind === 'assemble') {
    const findings = checkDraft(state);
    const next: RunState = {
      ...state,
      csv: toCsv(state),
      findings: [...state.findings, ...findings],
    };
    return { state: next, next: { kind: 'done' }, usage: NO_USAGE };
  }

  if (phase.kind === 'done' || reply === undefined) return { state, next: phase, usage: NO_USAGE };

  const answer = asObject(reply.json);

  let updated: RunState;

  switch (phase.kind) {
    case 'panel': {
      const shape = asObject(answer.shape);
      const panel = asArray(answer.panel)
        .map((one) => {
          const site = asObject(one);
          const url = asString(site.url);
          if (url === '') return null;
          return {
            name: asString(site.name) || url,
            url,
            type: asString(site.type) || 'onbekend',
            consultedAt: at,
            reason: asString(site.reason) || undefined,
          };
        })
        .filter((one): one is NonNullable<typeof one> => one !== null)
        .slice(0, 8);

      const read = readGrouping(answer.grouping, state);
      const barred = applyOverlayBar(read);
      const completed = completeGrouping(barred.grouping, state);

      updated = {
        ...state,
        panel,
        grouping: completed.grouping,
        shape: {
          unit: asString(shape.unit),
          irreversibleMistake: asString(shape.irreversibleMistake),
          standards: asStrings(shape.standards),
          legal: asStrings(shape.legal),
        },
        findings: [
          ...state.findings,
          ...findingsOf(answer),
          ...barred.findings,
          ...completed.findings,
          ...(panel.length < 5
            ? [`Het panel telt ${panel.length} sites in plaats van vijf. De dekking per vraag is daarmee grover dan de methode aanneemt.`]
            : []),
          ...(asString(shape.irreversibleMistake) === ''
            ? ['De onomkeerbare fout is niet vastgesteld. Zonder die fout is "kritiek" een mening en niet een maat.']
            : []),
        ],
      };
      break;
    }

    case 'harvest': {
      const site = state.panel[phase.index];
      updated = {
        ...state,
        harvest: [...state.harvest, readHarvest(answer, site?.name ?? `site ${phase.index + 1}`)],
      };
      break;
    }

    case 'consolidate': {
      const topics = readTopics(answer.topics);
      updated = {
        ...state,
        topics,
        findings: [
          ...state.findings,
          ...findingsOf(answer),
          ...(topics.some((topic) => topic.coverage === 0)
            ? []
            : ['Geen enkel onderwerp heeft dekking 0. De stap voor vragen die niemand beantwoordt heeft niets opgeleverd, en dan meet de bank het marktgemiddelde.']),
        ],
      };
      break;
    }

    case 'base': {
      const questions = readQuestions(answer.questions, 'BAS', takenIds(state));
      if (questions.length === 0) {
        throw new EmptyPhase('De basislaag kwam terug zonder één vraag.', reply.usage);
      }
      updated = {
        ...state,
        base: { category: '', questions, reweight: [] },
        findings: [...state.findings, ...findingsOf(answer)],
      };
      break;
    }

    case 'overlay': {
      const category = overlayCategories(state)[phase.index] ?? '';
      const prefix = (category.slice(0, 3) || 'CAT').toUpperCase();
      const reweight = asArray(answer.reweight)
        .map((one) => {
          const entry = asObject(one);
          return {
            id: asString(entry.id),
            importance: asString(entry.importance),
            reason: asString(entry.reason),
          };
        })
        .filter((entry) => entry.id !== '');

      // Een overlay bestaat omdat hij eigen vragen heeft; dat is de lat die hij
      // bij het panel haalde. Zonder één vraag is de stap mislukt.
      const questions = readQuestions(answer.questions, prefix, takenIds(state));
      if (questions.length === 0) {
        throw new EmptyPhase(`De categorie ${category} kwam terug zonder één eigen vraag.`, reply.usage);
      }

      updated = {
        ...state,
        overlays: [
          ...state.overlays,
          { category, questions, reweight },
        ],
        findings: [...state.findings, ...findingsOf(answer)],
      };
      break;
    }

    case 'facets': {
      // De herindeling van deze stap wint van fase 0: toen was de vragenlijst er
      // nog niet, en nu wel. Wat er verschuift blijft zichtbaar als bevinding,
      // want het is het oordeel dat de beheerder vaststelt.
      const regroup = readGrouping(answer.regroup, state);
      const byCategory = new Map(state.grouping.map((entry) => [entry.category, entry]));
      const moved: string[] = [];
      for (const entry of regroup) {
        const before = byCategory.get(entry.category);
        if (!before || before.kind === entry.kind) continue;

        // Verschuivingen tussen profiel en facet gaan meteen door: daar hangt
        // geen vragenset aan. Alles wat een overlay raakt niet — in beide
        // richtingen. Een categorie die hier alsnog een eigen vragenset zou
        // verdienen krijgt hem niet meer, want die stap ligt achter ons; en een
        // overlay wegnemen zou de vragen weggooien die er al voor geschreven
        // zijn. Beide worden een bevinding, en dan beslist de beheerder of het
        // een herziening waard is.
        if (entry.kind === 'overlay' || before.kind === 'overlay') {
          moved.push(
            `De facetanalyse zou ${entry.category} liever als ${entry.kind} zien dan als ${before.kind} (${entry.reason}). `
            + 'Dat is niet doorgevoerd: de vragensets waren op dat moment al gebouwd.',
          );
          continue;
        }

        moved.push(`${entry.category}: ${before.kind} → ${entry.kind} (${entry.reason})`);
        byCategory.set(entry.category, { ...before, ...entry });
      }

      updated = {
        ...state,
        grouping: [...byCategory.values()],
        facets: readFacets(answer.facets),
        findings: [...state.findings, ...findingsOf(answer), ...moved],
      };
      break;
    }

    default:
      updated = state;
  }

  return { state: updated, next: nextPhase(phase, updated), usage: addUsage(NO_USAGE, reply.usage) };
}
