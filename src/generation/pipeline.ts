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

import { isGenericWord, meaningfulWords } from '../spec/lexicon';
import { exampleTargets, promptFor, SYSTEM } from './prompts';
import { checkDraft, toCsv } from './csv';
import {
  addUsage,
  encodePhase,
  nextPhase,
  NO_USAGE,
  overlayCategories,
  PANEL_SIZE,
  requesterSite,
  isSupportSource,
  SUPPORT_SOURCE,
  supportOnly,
  type HarvestedExample,
  type CriticalTest,
  type DraftQuestion,
  type FacetEntry,
  type GroupingEntry,
  type ModelChoice,
  type Phase,
  type RunState,
  type SiteHarvest,
  type Topic,
  type Usage,
  isStandaloneCategory,
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
  /**
   * Bij de voorbeeldenstap: de tekst van elke pagina die het antwoord noemt, op
   * adres. De uitvoerder haalt ze op; een voorbeeld telt alleen als zijn waarde
   * er letterlijk op staat. Zonder pagina's telt er geen.
   */
  pages?: Record<string, string>;
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

/**
 * Is dit een kenmerknaam, of een zin die zich als kenmerk voordoet?
 *
 * Een kenmerk is iets wat in een PIM een kolom kan zijn: `coatingtype`,
 * `lichtdoorlatendheid_pct`. "Expliciete lichtklasse op de productpagina in één
 * vaste woordenlijst" is een eis, geen kenmerk, en als kolomnaam komt hij in
 * geen enkele catalogus voor. Zo'n vraag zou bij elke winkel zakken en dus niets
 * meten. Vier woorden en 48 tekens is ruim voor elke echte naam.
 */
function isAttributeName(raw: string): boolean {
  const value = raw.trim();
  return value !== '' && value.length <= 48 && value.split(/[\s_]+/).length <= 5 && !/[():;,]/.test(value);
}

/** Eén vraag zoals het model hem aanlevert. */
function readQuestion(raw: unknown, id: string): DraftQuestion | null {
  // Het nummer zet de app en niet het model: het moet boven de nummers van een
  // eerdere bank liggen, en dat weet alleen de aanroeper.
  const source = asObject(raw);
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
    evidence: asStrings(source.evidence)
      .filter(isAttributeName)
      .map((one) => one.toLowerCase().replace(/\s+/g, '_')),
    synonyms: asStrings(source.synonyms),
    rule: asString(source.rule) || undefined,
    ruleSource: asString(source.ruleSource) || undefined,
    answerType: asString(source.answerType) || 'tekst',
    answerable: answerable === 'false' || answerable === 'gedeeltelijk' ? answerable : 'true',
    mode: mode === 'alle' || mode === 'een' ? (mode as 'alle' | 'een') : undefined,
    note: asString(source.note) || undefined,
    criticalTest: readCriticalTest(source.criticalTest),
  };
}

/** De vier criteria, alleen als ze er alle vier staan. */
function readCriticalTest(raw: unknown): CriticalTest | undefined {
  const source = asObject(raw);
  const test = {
    decisive: asString(source.decisive),
    irreversible: asString(source.irreversible),
    product: asString(source.product),
    catalogue: asString(source.catalogue),
  };
  return test.decisive && test.irreversible && test.product && test.catalogue ? test : undefined;
}

/**
 * Haalt deze vraag het derde of vierde criterium niet? Over beleid, levering of
 * voorraad in plaats van het product, of een berekening in plaats van een kenmerk.
 */
const notAboutProduct = (question: DraftQuestion) =>
  question.intent === 'koopzekerheid' || question.answerType === 'proces' || question.answerable === 'false'
  || question.answerType.startsWith('afgeleid') || question.answerType.startsWith('derived');

/**
 * De kritiek-toets afdwingen op wat het model aanleverde.
 *
 * Kritiek is de poort voor basisgeschikt en moet dus smal blijven. Het model
 * noemt per kritieke vraag waarom elk van de drie criteria geldt; ontbreekt er
 * één, of gaat de vraag niet over het product, dan wordt hij hoog. Bij twijfel
 * niet kritiek — en dat staat als bevinding in de bank, zodat de beheerder het
 * ziet en kan terugzetten.
 */
export function enforceCriticalTest(
  questions: DraftQuestion[],
  where: string,
  /** De panelsite van de aanvrager; zie `requesterSite`. */
  requester?: string,
): { questions: DraftQuestion[]; findings: string[] } {
  const lowered: string[] = [];
  const ownBar: string[] = [];
  // Alleen de aanvrager behandelt dit: dan is het zijn eigen lat. Dekking 0 valt
  // hier niet onder — dat is vakkennis, en die legt een vakexpert vast.
  // Hetzelfde voor een vraag die alleen uit zijn klantenservice komt: dat is
  // zijn eigen mail, geen panelsite en geen vakkennis.
  const onlyRequester = (question: DraftQuestion) =>
    supportOnly(question)
    || (requester !== undefined
      && question.coverageSites.length > 0
      && question.coverageSites.every((site) => site.toLowerCase() === requester.toLowerCase()));
  const out = questions.map((question) => {
    if (question.importance !== 'kritiek') return { ...question, criticalTest: undefined };
    if (onlyRequester(question)) {
      ownBar.push(question.id);
      return { ...question, importance: 'hoog' as const, criticalTest: undefined };
    }
    if (question.criticalTest && !notAboutProduct(question)) return question;
    lowered.push(question.id);
    return { ...question, importance: 'hoog' as const, criticalTest: undefined };
  });
  return {
    questions: out,
    findings: [
      ...(lowered.length === 0 ? [] : [
        `${where}: ${lowered.length} vra${lowered.length === 1 ? 'ag' : 'gen'} kwam${lowered.length === 1 ? '' : 'en'} als kritiek terug zonder de volledige toets, ${lowered.length === 1 ? 'gaat' : 'gaan'} over beleid, levering of voorraad, of ${lowered.length === 1 ? 'is een berekening' : 'zijn berekeningen'}. Die staan op hoog: ${lowered.join(', ')}.`,
      ]),
      ...(ownBar.length === 0 ? [] : [
        `${where}: ${ownBar.length} vra${ownBar.length === 1 ? 'ag wordt' : 'gen worden'} alleen op de site of in de klantenservice van de aanvrager behandeld en ${ownBar.length === 1 ? 'kan' : 'kunnen'} daarom niet kritiek zijn: wie gemeten wordt, legt niet zijn eigen poort. ${ownBar.length === 1 ? 'Die staat' : 'Die staan'} op hoog: ${ownBar.join(', ')}.`,
      ]),
    ],
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
function readQuestions(raw: unknown, prefix: string, taken: Set<string>, first = 1): DraftQuestion[] {
  const out: DraftQuestion[] = [];
  for (const [index, one] of asArray(raw).entries()) {
    const question = readQuestion(one, `${prefix}-${String(index + first).padStart(2, '0')}`);
    if (!question) continue;

    let id = question.id;
    for (let suffix = 2; taken.has(id); suffix++) id = `${question.id}-${suffix}`;
    taken.add(id);
    out.push(id === question.id ? question : { ...question, id });
  }
  return out;
}

/**
 * Kwam deze stap terug met vragen waar niets mee te meten is?
 *
 * Eén vraag zonder kenmerken is een vergissing die de beheerder ziet en
 * overslaat. De meerderheid is een stap die de gevraagde vorm niet volgde — bij
 * woontextiel v3 alle negen categorieën — en dan hoort de stap opnieuw, niet de
 * beheerder die tientallen vragen één voor één wegklikt.
 */
function unmeasurable(questions: DraftQuestion[]): { empty: number; total: number } | null {
  const scored = questions.filter((question) => question.answerable !== 'false');
  const empty = scored.filter((question) => question.evidence.length === 0).length;
  return scored.length >= 3 && empty * 2 > scored.length ? { empty, total: scored.length } : null;
}

/** Alle ids die al vergeven zijn, zodat een nieuwe laag erlangs kan. */
function takenIds(state: RunState): Set<string> {
  return new Set([
    ...(state.base?.questions ?? []).map((question) => question.id),
    ...state.overlays.flatMap((overlay) => overlay.questions.map((question) => question.id)),
  ]);
}

const KINDS = new Set(['overlay', 'profiel', 'facet', 'losstaand']);

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

/**
 * Een bevinding als geen enkele eigen vraag van deze categorie op een panelsite
 * voorkomt. De vragen blijven in de bank staan; de app geeft zo'n categorie geen
 * eigen vragenset, en dat hoort de beheerder te weten vóór het vrijgeven.
 */
function uncoveredFinding(category: string, questions: { coverage: number | null }[]): string | undefined {
  if (questions.some((question) => typeof question.coverage === 'number' && question.coverage > 0)) return undefined;
  return `${category} heeft geen eigen vraag die een panelsite behandelt (dekking > 0). In de app krijgt deze categorie `
    + 'daardoor geen eigen vragenset: een subcategorie wordt onder haar categorie gemeten, een hoofdcategorie krijgt alleen de algemene vragen.';
}

/** Vanaf hoeveel panelsites een segment van de markt is, en niet van één winkel. */
export const SEGMENT_SITES = 2;

/** Twee schrijfwijzen van dezelfde naam: "Outdoorstoffen" en "Outdoor Stoffen". */
const sameName = (name: string) => name.toLowerCase().replace(/[\s_-]+/g, '');

/**
 * De naam die panelsites samen aan een segment geven, als ze het eens zijn.
 *
 * Een naam telt per site één keer, en pas als minstens `SEGMENT_SITES` sites hem
 * gebruiken is het de naam van de markt. Bij gelijke stand de kortste, en daarna
 * op alfabet, zodat dezelfde oogst altijd dezelfde naam geeft.
 *
 * `undefined` als elke site het anders noemt. Dan valt er niets te tellen, en is
 * de kortste naam geen betere keuze dan een willekeurige: bij de eerste echte
 * markt werd gecoate tafelstof zo "PVC fabric" en lichtdoorlatende gordijnstof
 * "vitrage". In dat geval geldt de werknaam van het model, zichtbaar als bevinding.
 */
function agreedName(aliases: { site: string; name: string }[]): string | undefined {
  const tally = new Map<string, { name: string; sites: Set<string> }>();
  for (const alias of aliases) {
    const key = sameName(alias.name);
    const seen = tally.get(key) ?? { name: alias.name, sites: new Set<string>() };
    seen.sites.add(alias.site);
    tally.set(key, seen);
  }
  return [...tally.values()]
    .filter((one) => one.sites.size >= SEGMENT_SITES)
    .sort((x, y) => y.sites.size - x.sites.size || x.name.length - y.name.length || x.name.localeCompare(y.name))[0]?.name;
}

/**
 * De marktsegmenten zoals het model ze uit de indelingen van het panel haalde, door de
 * poorten van de app.
 *
 * Het model legt categorieën van verschillende sites op elkaar; dat is een
 * oordeel en dat mag het hebben. Wat het níet mag is tellen. Een alias telt
 * alleen als die site die categorie werkelijk voert — het staat in haar oogst —
 * en elke categorie van een site hoort bij hoogstens één segment. Het aantal
 * sites volgt daaruit, en daarmee de poort: een segment dat minder dan
 * `SEGMENT_SITES` sites voeren is de menukeuze van één winkel en krijgt geen
 * eigen vragenset.
 */
function readStructure(raw: unknown, state: RunState): { grouping: GroupingEntry[]; findings: string[] } {
  const carried = new Map<string, { site: string; names: Map<string, string> }>();
  for (const harvest of state.harvest) {
    carried.set(harvest.site.toLowerCase(), {
      site: harvest.site,
      names: new Map((harvest.segments ?? []).map((segment) => [segment.name.toLowerCase(), segment.name])),
    });
  }
  // De categorienamen uit de catalogus van de aanvrager mogen als alias mee: de
  // scan plaatst zijn producten op die naam, ook als zijn site hem anders toont.
  // Ze dragen geen segment — zie `catalogOnly` hieronder.
  const own = requesterSite(state);
  const ownNames = own ? carried.get(own.toLowerCase()) : undefined;
  const fromSite = new Set(ownNames ? [...ownNames.names.keys()] : []);
  for (const segment of ownNames ? state.brief.segments : []) {
    if (!ownNames?.names.has(segment.name.toLowerCase())) ownNames?.names.set(segment.name.toLowerCase(), segment.name);
  }
  const catalogOnly = (alias: { site: string; name: string }) =>
    alias.site === own && !fromSite.has(alias.name.toLowerCase());

  const claimed = new Set<string>();
  const invented: string[] = [];
  const read = asArray(raw)
    .map((one) => {
      const source = asObject(one);
      const working = asString(source.category);
      const kind = asString(source.kind).toLowerCase();
      if (working === '' || !KINDS.has(kind)) return null;
      const aliases: { site: string; name: string }[] = [];
      for (const item of asArray(source.aliases)) {
        const alias = asObject(item);
        const site = carried.get(asString(alias.site).toLowerCase());
        const name = site?.names.get(asString(alias.name).toLowerCase());
        const key = `${site?.site.toLowerCase()}|${name?.toLowerCase()}`;
        if (!site || !name || claimed.has(key)) continue;
        claimed.add(key);
        aliases.push({ site: site.site, name });
      }
      return {
        working,
        kind: kind as GroupingEntry['kind'],
        parent: asString(source.parent) || undefined,
        reason: asString(source.reason),
        distinct: asStrings(source.distinct).slice(0, 5),
        aliases,
      };
    })
    .filter((one): one is NonNullable<typeof one> => one !== null)
    // Een segment dat op geen enkele site terug te vinden is, komt niet uit het
    // panel. Het wordt genoemd en niet meegenomen.
    .filter((one) => {
      // Een naam uit de catalogus van de aanvrager alleen is geen vondst op een site.
      if (one.aliases.some((alias) => !catalogOnly(alias))) return true;
      invented.push(one.working);
      return false;
    });

  // De namen: wat de sites samen zeggen als ze het eens zijn, anders de werknaam.
  // Elke naam maar één keer.
  const taken = new Set<string>();
  const ownName: string[] = [];
  const named = read.map((one) => {
    const agreed = agreedName(one.aliases.filter((alias) => !catalogOnly(alias)));
    const name = agreed !== undefined && !taken.has(agreed.toLowerCase()) ? agreed : one.working;
    // Alleen melden waar sites elkaar tegenspreken. Bij één site is er niemand
    // om het mee oneens te zijn.
    const sites = new Set(one.aliases.filter((alias) => !catalogOnly(alias)).map((alias) => alias.site)).size;
    if (agreed === undefined && sites >= SEGMENT_SITES) ownName.push(one.working);
    taken.add(name.toLowerCase());
    return { ...one, name };
  });
  const finalName = new Map(named.map((one) => [one.working.toLowerCase(), one.name]));

  // Onder welke namen een site vragen behandelt, om na te gaan wie een segment
  // werkelijk van vragen voorziet. De toepassingen van een segment tellen mee:
  // een vraag onder "Banken" is een vraag over meubelstof.
  const requester = requesterSite(state);
  const asked = new Set(state.harvest.flatMap((harvest) =>
    harvest.questions
      .filter((question) => question.segment)
      .map((question) => `${harvest.site.toLowerCase()}|${(question.segment as string).toLowerCase()}`)));
  const membersOf = (name: string) => named.filter((other) =>
    other.name === name || (other.kind === 'profiel' && other.parent && finalName.get(other.parent.toLowerCase()) === name));
  const askedElsewhere = (name: string) => membersOf(name).some((member) => member.aliases.some((alias) =>
    alias.site !== requester && asked.has(`${alias.site.toLowerCase()}|${alias.name.toLowerCase()}`)));

  const single: string[] = [];
  const ownOnly: string[] = [];
  const grouping = named.map((one): GroupingEntry => {
    const sites = [...new Set(one.aliases.filter((alias) => !catalogOnly(alias)).map((alias) => alias.site))];
    const ownSet = one.kind === 'overlay' || one.kind === 'losstaand';
    const tooFew = ownSet && sites.length < SEGMENT_SITES;
    // De aanvrager zit in het panel, maar draagt geen vragenset: er moet een
    // ándere site zijn die onder dit segment een vraag behandelt.
    const selfSet = ownSet && !tooFew && requester !== undefined && !askedElsewhere(one.name);
    if (tooFew) single.push(`${one.name} (${sites.join(', ')})`);
    if (selfSet) ownOnly.push(one.name);
    const kind = tooFew || selfSet ? 'profiel' : one.kind;
    return {
      category: one.name,
      count: 0,
      kind,
      parent: kind === 'profiel' && one.parent ? finalName.get(one.parent.toLowerCase()) : undefined,
      reason: tooFew
        ? `${one.reason} Alleen ${sites.join(', ')} voert dit als categorie; daarom geen eigen vragenset.`.trim()
        : selfSet
          ? `${one.reason} Alleen de site van de aanvrager behandelt hier vragen; daarom geen eigen vragenset.`.trim()
          : one.reason,
      distinct: kind === 'overlay' ? one.distinct : undefined,
      aliases: one.aliases,
      sites,
    };
  });

  // Door de markt gevoerd, en toch zonder eigen vragenset en zonder overlay om
  // onder te vallen: die categorie houdt bij een winkel alleen de algemene
  // vragen. Dat is een geldige uitkomst, maar een die iemand bewust hoort te
  // laten staan.
  const baseOnly = grouping
    .filter((entry) => entry.kind === 'profiel' && !entry.parent && (entry.sites?.length ?? 0) >= SEGMENT_SITES && !ownOnly.includes(entry.category))
    .map((entry) => `${entry.category} (${entry.sites?.length} sites)`);

  const unplaced = [...carried.values()].flatMap((site) =>
    [...site.names.entries()]
      .filter(([key]) => !claimed.has(`${site.site.toLowerCase()}|${key}`))
      // Een catalogusnaam van de aanvrager is geen categorie die zijn site toont.
      .filter(([key]) => !(site.site === own && !fromSite.has(key)))
      .map(([, name]) => `${name} (${site.site})`));
  const silent = state.harvest.filter((harvest) => (harvest.segments ?? []).length === 0).map((harvest) => harvest.site);

  return {
    grouping,
    findings: [
      ...(single.length > 0
        ? [`${single.length} segment${single.length === 1 ? ' wordt' : 'en worden'} maar door één panelsite als categorie gevoerd en ${single.length === 1 ? 'krijgt' : 'krijgen'} daarom geen eigen vragenset: ${single.slice(0, 12).join('; ')}. Dat is de menukeuze van één winkel; zet het hier terug als het wél een segment van de markt is.`]
        : []),
      ...(ownOnly.length > 0
        ? [`${ownOnly.length} segment${ownOnly.length === 1 ? ' wordt' : 'en worden'} door meer sites gevoerd, maar alleen de site van de aanvrager behandelt er vragen: ${ownOnly.join(', ')}. ${ownOnly.length === 1 ? 'Het krijgt' : 'Ze krijgen'} geen eigen vragenset, want wie gemeten wordt legt niet zijn eigen meetlat. Zet het hier terug als een vakexpert de vragen bevestigt.`]
        : []),
      ...(baseOnly.length > 0
        ? [`${baseOnly.length} segment${baseOnly.length === 1 ? ' wordt' : 'en worden'} door meer panelsites gevoerd en ${baseOnly.length === 1 ? 'krijgt' : 'krijgen'} toch alleen de algemene vragen, omdat er geen vraag is die alleen daar gesteld wordt: ${baseOnly.join('; ')}. Laat dat staan als het klopt, of maak er een eigen vragenset van.`]
        : []),
      ...(ownName.length > 0
        ? [`${ownName.length} segment${ownName.length === 1 ? ' heeft' : 'en hebben'} geen naam waar twee panelsites het over eens zijn en ${ownName.length === 1 ? 'draagt' : 'dragen'} de werknaam uit de indeling: ${ownName.slice(0, 20).join(', ')}. Loop die namen na; de namen van de sites reizen als alias mee.`]
        : []),
      ...(invented.length > 0
        ? [`${invented.length} segment${invented.length === 1 ? '' : 'en'} uit het antwoord ${invented.length === 1 ? 'is' : 'zijn'} op geen enkele panelsite terug te vinden en ${invented.length === 1 ? 'is' : 'zijn'} niet meegenomen: ${invented.slice(0, 8).join(', ')}.`]
        : []),
      ...(unplaced.length > 0
        ? [`${unplaced.length} categorie${unplaced.length === 1 ? '' : 'ën'} van panelsites ${unplaced.length === 1 ? 'is' : 'zijn'} in geen segment ondergebracht: ${unplaced.slice(0, 12).join('; ')}${unplaced.length > 12 ? ' en meer' : ''}.`]
        : []),
      ...(silent.length > 0
        ? [`${silent.join(', ')} gaf${silent.length === 1 ? '' : 'en'} geen indeling prijs. De noemer voor "op hoeveel sites" is daardoor ${state.harvest.length - silent.length} en geen ${state.harvest.length}.`]
        : []),
      ...(grouping.some((entry) => entry.kind === 'overlay' || entry.kind === 'losstaand')
        ? []
        : ['Geen enkel segment krijgt een eigen vragenset: de panelsites delen te weinig indeling. De bank bestaat dan alleen uit de algemene vragen.']),
    ],
  };
}

function readHarvest(raw: unknown, site: string): SiteHarvest {
  const source = asObject(raw);
  // Ontdubbeld op naam: een site die een categorie in twee menu's zet, voert er
  // nog steeds één.
  const seen = new Set<string>();
  const segments = asArray(source.segments).map((one) => {
    const entry = asObject(one);
    return {
      name: asString(entry.name),
      parent: asString(entry.parent) || undefined,
      url: asString(entry.url) || undefined,
    };
  }).filter((one) => {
    const key = one.name.toLowerCase();
    if (one.name === '' || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    site,
    segments,
    questions: asArray(source.questions).map((one) => {
      const entry = asObject(one);
      return {
        question: asString(entry.question),
        source: asString(entry.source),
        url: asString(entry.url) || undefined,
        segment: asString(entry.segment) || undefined,
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

/**
 * De klantenservice van de aanvrager telt niet als site.
 *
 * Het model zou hem in `coverageSites` kunnen zetten, of een onderwerp dat
 * alleen daaruit komt een dekking kunnen geven. Allebei terugdraaien: wat de
 * klantenservice aandroeg staat met dekking 0 en bron `SUPPORT_SOURCE`, en een
 * onderwerp dat ook panelsites behandelen houdt alleen de dekking van die sites.
 */
function withoutSupportCoverage(topic: Topic): Topic {
  const fromSupport = topic.sources.some(isSupportSource) || topic.coverageSites.some(isSupportSource);
  if (!fromSupport) return topic;
  const coverageSites = topic.coverageSites.filter((site) => !isSupportSource(site));
  const sources = [...topic.sources.filter((source) => !isSupportSource(source)), SUPPORT_SOURCE];
  return coverageSites.length === 0
    ? { ...topic, coverage: 0, coverageSites, sources: [SUPPORT_SOURCE] }
    : { ...topic, coverage: Math.min(topic.coverage, coverageSites.length), coverageSites, sources };
}

/** Wat de klantenservice in deze stap aandroeg, zodat de beheerder het kan nakijken. */
function supportFindings(state: RunState, topics: Topic[], step: 'samenvoegen' | 'nalopen'): string[] {
  const given = state.brief.support?.length ?? 0;
  if (given === 0) return [];
  const own = topics.filter(supportOnly);
  if (step === 'nalopen' && own.length === 0) return [];
  const names = own.slice(0, 8).map((topic) => topic.topic).join(', ') + (own.length > 8 ? ', …' : '');
  return [step === 'samenvoegen'
    ? `Klantenservice van de aanvrager: ${given} vra${given === 1 ? 'ag' : 'gen'} meegegeven als aanwijzing, niet als panelsite. ${own.length === 0 ? 'Geen onderwerp komt alleen daaruit.' : `${own.length} onderwerp${own.length === 1 ? ' komt' : 'en komen'} alleen daaruit en ${own.length === 1 ? 'staat' : 'staan'} op dekking 0 (${names}).`}`
    : `Nalopen: ${own.length} onderwerp${own.length === 1 ? '' : 'en'} uit de klantenservice van de aanvrager erbij, op dekking 0 (${names}).`];
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
 * Synoniemen die te algemeen zijn voor het kenmerk eruit.
 *
 * Een synoniem is een extra naam waarop de matcher een kolom zoekt. "lengte" bij
 * de looplengte van garen legde het kenmerk op de rollengte van stof — een gat
 * dat verdwijnt terwijl het er is. Eén los woord uit de generieke woordenlijst
 * blijft alleen staan als het kenmerk zelf niets anders zegt dan dat woord.
 */
function withoutGenericSynonyms(questions: DraftQuestion[]): { questions: DraftQuestion[]; findings: string[] } {
  const dropped: string[] = [];
  const cleaned = questions.map((question) => {
    const plain = new Set(question.evidence.filter((key) => meaningfulWords(key).length === 1).map((key) => meaningfulWords(key)[0]));
    const kept = question.synonyms.filter((synonym) => {
      if (!isGenericWord(synonym) || plain.has(meaningfulWords(synonym)[0])) return true;
      dropped.push(`${question.id}: ${synonym}`);
      return false;
    });
    return kept.length === question.synonyms.length ? question : { ...question, synonyms: kept };
  });
  return {
    questions: cleaned,
    findings: dropped.length > 0
      ? [`Synoniemen weggelaten omdat ze te algemeen zijn voor het kenmerk en het op een verkeerde kolom zouden leggen: ${dropped.join('; ')}.`]
      : [],
  };
}

/** Tekst vergelijkbaar maken: kleine letters, één spatie, geen harde spaties. */
const flat = (text: string) => text.toLowerCase().replace(/[\s\u00a0]+/g, ' ').trim();

/**
 * De voorbeelden die het model aanwees, en alleen die letterlijk op de pagina staan.
 *
 * Een voorbeeld is altijd een echte waarde: het kenmerk moet in de bank staan,
 * het adres moet van een panelsite zijn, en de waarde moet op de opgehaalde
 * pagina te vinden zijn. Wat één van de drie mist, vervalt — en wordt geteld,
 * zodat de beheerder ziet hoeveel het model erbij verzon.
 */
function readExamples(raw: unknown, state: RunState, pages: Record<string, string>): { examples: HarvestedExample[]; findings: string[] } {
  const host = (url: string) => url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  const panel = new Set(state.panel.map((site) => host(site.url)));
  const wanted = new Set(exampleTargets(state).map((target) => target.attribute));
  const text = new Map(Object.entries(pages).map(([url, body]) => [url, flat(body)]));

  const examples: HarvestedExample[] = [];
  let offered = 0;
  let unread = 0;
  let absent = 0;
  for (const one of asArray(raw)) {
    const source = asObject(one);
    const attribute = asString(source.attribute);
    const value = asString(source.value).trim();
    const url = asString(source.url);
    if (!wanted.has(attribute) || value === '' || !/^https?:\/\//i.test(url) || !panel.has(host(url))) continue;
    offered += 1;
    if (examples.some((example) => example.attribute === attribute)) continue;
    const page = text.get(url);
    if (page === undefined) { unread += 1; continue; }
    if (!page.includes(flat(value))) { absent += 1; continue; }
    examples.push({ attribute, value: value.replace(/[\s\u00a0]+/g, ' '), url });
  }

  const findings = [
    `Voorbeelden: ${examples.length} van de ${wanted.size} kenmerken hebben een waarde die letterlijk op een productpagina van een panelsite staat. Loop ze na: een waarde kan er staan en de vraag toch niet beantwoorden.`,
  ];
  if (absent > 0) findings.push(`${absent} aangewezen voorbeeld${absent === 1 ? '' : 'en'} stond${absent === 1 ? '' : 'en'} niet letterlijk op de genoemde pagina en ${absent === 1 ? 'is' : 'zijn'} weggelaten.`);
  if (unread > 0) findings.push(`${unread} voorbeeld${unread === 1 ? '' : 'en'} ${unread === 1 ? 'is' : 'zijn'} weggelaten omdat de pagina niet op te halen was${offered === unread ? ' — geen enkele pagina is gelezen' : ''}.`);
  return { examples, findings };
}

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
        .slice(0, PANEL_SIZE);

      updated = {
        ...state,
        panel,
        // De indeling volgt later, uit het panel als geheel; zie `structure`.
        grouping: [],
        shape: {
          unit: asString(shape.unit),
          irreversibleMistake: asString(shape.irreversibleMistake),
          standards: asStrings(shape.standards),
          legal: asStrings(shape.legal),
        },
        findings: [
          ...state.findings,
          ...findingsOf(answer),
          ...(panel.length < PANEL_SIZE
            ? [`Het panel telt ${panel.length} sites in plaats van ${PANEL_SIZE}. De dekking per vraag is daarmee grover dan de methode aanneemt.`]
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
      const topics = readTopics(answer.topics).map(withoutSupportCoverage);
      updated = {
        ...state,
        topics,
        findings: [
          ...state.findings,
          ...findingsOf(answer),
          ...supportFindings(state, topics, 'samenvoegen'),
          // Een onderwerp uit de klantenservice is geen vakkennis: dat heeft één
          // winkel aangedragen, niet de stap die de hele branche naloopt.
          ...(topics.some((topic) => topic.coverage === 0 && !supportOnly(topic))
            ? []
            : ['Geen enkel onderwerp heeft dekking 0. De stap voor vragen die niemand beantwoordt heeft niets opgeleverd, en dan meet de bank het marktgemiddelde.']),
        ],
      };
      break;
    }

    case 'recheck': {
      // De dekking wordt hier geteld en niet overgenomen: alleen sites uit het
      // panel tellen, en een onderwerp dat er al staat komt er niet nog eens bij.
      const sites = new Map(state.panel.map((site) => [site.name.toLowerCase(), site.name]));
      const known = new Set(state.topics.map((topic) => topic.topic.toLowerCase()));
      const added: Topic[] = [];
      for (const topic of readTopics(answer.topics)) {
        if (known.has(topic.topic.toLowerCase())) continue;
        known.add(topic.topic.toLowerCase());
        const coverageSites = [...new Set(topic.coverageSites.flatMap((name) => sites.get(name.toLowerCase()) ?? []))];
        const fromSupport = topic.sources.some(isSupportSource);
        added.push({
          ...topic,
          coverage: coverageSites.length,
          coverageSites,
          sources: coverageSites.length === 0
            ? [fromSupport ? SUPPORT_SOURCE : 'vakkennis']
            : [...topic.sources.filter((source) => !isSupportSource(source)), 'nagelopen na het samenvoegen', ...(fromSupport ? [SUPPORT_SOURCE] : [])],
          conflict: undefined,
        });
      }
      updated = {
        ...state,
        topics: [...state.topics, ...added],
        findings: [
          ...state.findings,
          ...findingsOf(answer),
          ...supportFindings(state, added, 'nalopen'),
          added.length > 0
            ? `Samenvoegen nagelopen: ${added.length} onderwerp${added.length === 1 ? '' : 'en'} die bij het samenvoegen ${added.length === 1 ? 'was' : 'waren'} weggevallen, ${added.length === 1 ? 'staat' : 'staan'} er weer bij (${added.slice(0, 8).map((topic) => topic.topic).join(', ')}${added.length > 8 ? ', …' : ''}).`
            : 'Samenvoegen nagelopen: geen geoogste vraag is weggevallen.',
        ],
      };
      break;
    }

    case 'examples': {
      const read = readExamples(answer.examples, state, reply.pages ?? {});
      updated = {
        ...state,
        examples: read.examples,
        findings: [...state.findings, ...findingsOf(answer), ...read.findings],
      };
      break;
    }

    case 'structure': {
      const structure = readStructure(answer.segments, state);
      updated = {
        ...state,
        grouping: structure.grouping,
        findings: [...state.findings, ...findingsOf(answer), ...structure.findings],
      };
      break;
    }

    case 'base': {
      const cleaned = withoutGenericSynonyms(readQuestions(answer.questions, 'BAS', takenIds(state), state.brief.firstNumber));
      const tested = enforceCriticalTest(cleaned.questions, 'Basislaag', requesterSite(state));
      tested.findings.push(...cleaned.findings);
      const questions = tested.questions;
      if (questions.length === 0) {
        throw new EmptyPhase('De basislaag kwam terug zonder één vraag.', reply.usage);
      }
      const blind = unmeasurable(questions);
      if (blind) {
        throw new EmptyPhase(
          `De basislaag noemt bij ${blind.empty} van de ${blind.total} vragen geen bruikbare kenmerknaam.`,
          reply.usage,
        );
      }
      updated = {
        ...state,
        base: { category: '', questions, reweight: [] },
        findings: [...state.findings, ...findingsOf(answer), ...tested.findings],
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
            importance: asString(entry.importance).toLowerCase(),
            reason: asString(entry.reason),
            criticalTest: readCriticalTest(entry.criticalTest),
          };
        })
        .filter((entry) => entry.id !== '');
      // Ook een herweging naar kritiek maakt een poort, dus dezelfde toets. De
      // basisvraag zelf moet over het product gaan; zonder toets wordt het hoog.
      const baseById = new Map((state.base?.questions ?? []).map((question) => [question.id, question]));
      const loweredReweights: string[] = [];
      for (const entry of reweight) {
        if (entry.importance !== 'kritiek') { entry.criticalTest = undefined; continue; }
        const question = baseById.get(entry.id);
        if (entry.criticalTest && question && !notAboutProduct(question)) continue;
        entry.importance = 'hoog';
        entry.criticalTest = undefined;
        loweredReweights.push(entry.id);
      }

      // Een overlay bestaat omdat hij eigen vragen heeft; dat is de lat die hij
      // bij het panel haalde. Zonder één vraag is de stap mislukt.
      const cleaned = withoutGenericSynonyms(readQuestions(answer.questions, prefix, takenIds(state), state.brief.firstNumber));
      const tested = enforceCriticalTest(cleaned.questions, category, requesterSite(state));
      tested.findings.push(...cleaned.findings);
      const questions = tested.questions;
      if (questions.length === 0) {
        throw new EmptyPhase(`De categorie ${category} kwam terug zonder één eigen vraag.`, reply.usage);
      }
      const blind = unmeasurable(questions);
      if (blind) {
        throw new EmptyPhase(
          `De categorie ${category} noemt bij ${blind.empty} van de ${blind.total} vragen geen bruikbare kenmerknaam.`,
          reply.usage,
        );
      }

      // Een losstaande categorie erft de basislaag niet, en herwegen van een
      // basisvraag die hier niet gesteld wordt heeft dan geen betekenis.
      const standalone = isStandaloneCategory(state, category);
      const uncovered = uncoveredFinding(category, questions);
      updated = {
        ...state,
        overlays: [
          ...state.overlays,
          standalone
            ? { category, questions, reweight: [], standalone: true }
            : { category, questions, reweight },
        ],
        findings: [
          ...state.findings,
          ...findingsOf(answer),
          ...(uncovered ? [uncovered] : []),
          ...tested.findings,
          ...(loweredReweights.length > 0
            ? [`${category}: de herweging naar kritiek van ${loweredReweights.join(', ')} kwam zonder volledige toets, of de vraag gaat niet over het product of is een berekening. Die staat op hoog.`]
            : []),
        ],
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
        // Losstaand telt als overlay: er hangt een eigen vragenset aan.
        const ownSet = (kind: string) => kind === 'overlay' || kind === 'losstaand';
        if (ownSet(entry.kind) || ownSet(before.kind)) {
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
