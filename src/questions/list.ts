// Een vragenlijst inlezen: één tabel, één regel per vraag.
//
// De methode levert een vragenbank op, en die bank komt in de praktijk als tabel
// uit de promptreeks: kolommen voor het belang, de benodigde attributen, de laag
// en de herweging per categorie. Dat is precies wat een merchant aanlevert als je
// hem vraagt "upload je vragenlijst", en het is een andere vorm dan de YAML uit
// `import.ts` — dezelfde inhoud, platter opgeschreven.
//
// Drie dingen die deze lezer dragend maken:
//
// **De kolomnamen liggen niet vast.** Elke vertical levert een andere lijst, met
// andere categorieën en soms andere kolomnamen. Er wordt daarom op aliassen
// herkend en niet op positie, en wat niet herkend wordt zegt de lezer hardop in
// plaats van er stilzwijgend een lege waarde van te maken.
//
// **De laag bepaalt de vorm.** `basis` geldt voor elke categorie, `overlay`
// alleen voor de zijne, en `standalone` is een categorie die de basisvragen
// juist níét erft — naaigaren heeft geen baanbreedte. Die derde vorm bestaat in
// het model als een overlay die de hele basislaag uitschakelt.
//
// **Wat de lijst niet draagt, verzinnen we niet.** Geen sitepanel, dus dekking
// blijft `null` (niet onderzocht) en niet 0 (een vondst). Geen bron bij een
// beslisregel, dus die regel blijft beredeneerd en wordt niet gerekend. Geen
// onomkeerbare fout, dus `kritiek` staat er wel maar zonder de zin eronder — en
// dat staat als waarschuwing in de uitkomst.
//
// De module is puur: geen klok, geen IO. Dezelfde tabel geeft dezelfde bank.

import type { Bilingual } from '../domain/types';
import { detectDelimiter, parseDelimited } from '../intake/parse';
import type {
  AnswerType, Answerability, ApplicationProfile, AttributeDef, BankQuestion, DecisionRule,
  EvidenceSource, Importance, Intent, Overlay, QuestionBank,
} from './bank';
import { IMPORTANCE_WEIGHT } from './bank';
import {
  foldWarnings, importBankSet, patternFor, UNMAPPED,
  type BankFile, type ImportResult,
} from './import';

// --- Kolommen ---------------------------------------------------------------

/**
 * De kolommen die de lezer kent, met hun aliassen.
 *
 * Herkennen op naam en niet op positie: een lijst voor een andere vertical heeft
 * andere kolommen en een andere volgorde, en een lezer die op positie werkt leest
 * die stilzwijgend verkeerd.
 */
const COLUMNS = {
  id: ['id', 'vraag_id', 'question_id', 'nummer'],
  question: ['vraag', 'question', 'label', 'klantvraag'],
  /**
   * Dezelfde vraag in de andere taal, als de lijst hem draagt.
   *
   * Eén lijst met twee talen en niet twee lijsten: dan meten twee talen
   * gegarandeerd hetzelfde, want er is maar één rij per vraag. Twee bestanden
   * naast elkaar lopen uit de pas zodra iemand er één bewerkt.
   *
   * `question` blijft de hoofdkolom; deze twee vullen aan. Draagt een lijst
   * alleen `question`, dan staat die tekst in beide talen — zichtbaar dezelfde
   * woorden is eerlijker dan een lege kolom.
   */
  questionNl: ['vraag_nl', 'question_nl', 'nl', 'klantvraag_nl'],
  questionEn: ['vraag_en', 'question_en', 'en', 'klantvraag_en'],
  category: ['categorie', 'category', 'groep'],
  layer: ['laag', 'layer', 'niveau'],
  appliesTo: ['geldt_voor', 'applies_to', 'van_toepassing_op'],
  intent: ['intentie', 'intent', 'thema'],
  importance: ['belang', 'importance', 'prioriteit'],
  weight: ['gewicht', 'weight'],
  reweight: ['herweging', 'reweighting', 'reweight', 'herwegen'],
  evidence: [
    'benodigde_attributen', 'required_attributes', 'attributen', 'attributes',
    'bewijs', 'evidence', 'velden',
  ],
  evidenceCount: ['aantal_attributen', 'attribute_count', 'aantal_attributes'],
  rule: ['beslisregel', 'decision_rule', 'rule', 'regel'],
  /**
   * Waar de drempel van deze regel vandaan komt: de site die hem publiceert.
   *
   * Zonder deze kolom kon een tabel geen enkele gepubliceerde drempel dragen —
   * `collectRules` zette elke regel op "beredeneerd", en dan staat élke vraag
   * met een regel als bezwaar op het beoordeelscherm. Bij de eerste echte bank
   * waren dat er 105, met één oorzaak en geen enkele die per vraag te
   * verhelpen was.
   *
   * Wat erin hoort is de bron zoals de methode hem eist: een sitenaam of een
   * URL. Staat er niets, dan blijft de regel beredeneerd en telt hij niet mee
   * in de score — dat is en blijft de veilige aanname.
   */
  ruleSource: ['beslisregel_bron', 'drempel_bron', 'rule_source', 'bron_drempel'],
  answerType: ['antwoordtype', 'answer_type', 'antwoord'],
  answerable: ['beantwoordbaar_uit_attributen', 'answerable_from_attributes', 'beantwoordbaar', 'answerable'],
  scored: ['telt_mee_in_score', 'counts_in_score', 'telt_mee', 'in_score', 'scored'],
  legal: ['wettelijk', 'legally_required', 'legal', 'wettelijk_verplicht'],
  commercial: ['commerciele_waarde', 'commerciële_waarde', 'commercial_value'],
  caution: ['waarschuwing', 'warning', 'caution', 'let_op'],
  note: ['toelichting', 'note', 'opmerking', 'weight_note'],
  sources: ['bron', 'bronnen', 'sources', 'source'],
  profiles: ['toepassingsprofielen_kritiek', 'critical_in_profiles', 'toepassingsprofielen', 'profiles'],
  coverage: ['dekking', 'coverage'],
  /**
   * Op welke panelsites dit onderwerp gevonden is.
   *
   * Zonder deze kolom draagt een dekking van 6 geen herkomst meer zodra de bank
   * door een CSV heen gaat, en dan is de belangrijkste regel van de methode weg:
   * herkomst staat bij elk getal. De YAML had het wel en de tabel niet.
   */
  coverageSites: ['dekking_bronnen', 'coverage_sites', 'bronsites', 'panelsites', 'dekking_sites'],
  mode: ['modus', 'mode'],
  vertical: ['vertical', 'verticaal', 'markt', 'market'],
  /**
   * Hoe de markt dit kenmerk nog meer noemt. Dit is de plek voor vakwoorden:
   * de koppeling naar de kolommen van een merchant kan generieke taal aan
   * (`breedte` en `width`) maar geen vaktaal (`rapport` en `patroon`), en die
   * kennis hoort bij de vertical en dus bij deze lijst.
   */
  synonyms: ['synoniemen', 'synonyms', 'benoemd_als', 'named_as', 'kolommen', 'columns'],
  /** De fout die een koper niet kan terugdraaien; fase 0 van de methode. */
  mistake: ['onomkeerbare_fout', 'irreversible_mistake', 'irreversible_error'],
} satisfies Record<string, string[]>;

type Column = keyof typeof COLUMNS;

/** Kolomnamen vergelijkbaar maken: hoofdletters, accenten en tekens weg. */
function normalizeHeader(header: string): string {
  return header
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

type ColumnMap = Partial<Record<Column, string>>;

function resolveColumns(headers: string[]): ColumnMap {
  const byNormalized = new Map<string, string>();
  for (const header of headers) {
    const key = normalizeHeader(header);
    if (key && !byNormalized.has(key)) byNormalized.set(key, header);
  }

  const map: ColumnMap = {};
  for (const [column, aliases] of Object.entries(COLUMNS) as [Column, string[]][]) {
    for (const alias of aliases) {
      const hit = byNormalized.get(normalizeHeader(alias));
      if (hit) { map[column] = hit; break; }
    }
  }
  return map;
}

// --- Waardes ----------------------------------------------------------------

type Row = Record<string, string>;

function cell(row: Row, columns: ColumnMap, column: Column): string {
  const header = columns[column];
  return header === undefined ? '' : (row[header] ?? '').trim();
}

/** Een cel met meerdere waarden. Komma, puntkomma en regeleinde tellen alle drie. */
function splitList(value: string): string[] {
  return value.split(/[;,\n]+/).map((part) => part.trim()).filter((part) => part !== '');
}

const YES = /^(ja|yes|true|waar|1|x)$/i;
const NO = /^(nee|neen|no|false|onwaar|0)$/i;

// --- Vertalingen ------------------------------------------------------------

const IMPORTANCE: Record<string, Importance> = {
  kritiek: 'critical', hoog: 'high', middel: 'medium', midden: 'medium', laag: 'low',
  critical: 'critical', high: 'high', medium: 'medium', low: 'low',
};

const INTENT: Record<string, Intent> = {
  geschiktheid: 'fit', hoeveelheid: 'quantity', onderhoud: 'care',
  verwachting: 'expectation', materiaal: 'material', verwerking: 'processing',
  duurzaamheid: 'durability', veiligheid: 'safety', koopzekerheid: 'purchase-certainty',
  comfort: 'comfort', functie: 'function',
  fit: 'fit', quantity: 'quantity', care: 'care', expectation: 'expectation',
  material: 'material', processing: 'processing', durability: 'durability',
  safety: 'safety', 'purchase-certainty': 'purchase-certainty', function: 'function',
  suitability: 'fit', workability: 'processing', sustainability: 'durability',
  purchase_confidence: 'purchase-certainty', 'purchase-confidence': 'purchase-certainty',
};

const ANSWER_TYPE: Record<string, AnswerType> = {
  enum: 'enum', multi_enum: 'enum', getal: 'number', number: 'number',
  boolean: 'boolean', tekst: 'text', text: 'text', lijst: 'text', list: 'text',
  relatie: 'relation', relation: 'relation', proces: 'process', process: 'process',
};

const SOURCE: Record<string, EvidenceSource> = {
  faq: 'faq', blog: 'blog', review: 'review', reviews: 'review',
  service: 'service', servicetickets: 'service', service_tickets: 'service',
  vakkennis: 'expertise', domain_knowledge: 'expertise', expertise: 'expertise',
  categorietekst: 'category-text', cat_paginas: 'category-text',
  categoriepaginas: 'category-text', category_pages: 'category-text',
  category_text: 'category-text', stofsoortpaginas: 'category-text',
  fabric_type_pages: 'category-text',
  productpagina: 'product-page', productpaginas: 'product-page',
  product_page: 'product-page', product_pages: 'product-page',
};

/** `afgeleid_*` noemt de berekening; voor het model telt alleen dát het afgeleid is. */
function answerType(raw: string): AnswerType {
  const value = raw.toLowerCase();
  if (value.startsWith('afgeleid') || value.startsWith('derived')) return 'derived';
  return ANSWER_TYPE[value] ?? 'text';
}

// --- Groepen ----------------------------------------------------------------

type Layer = 'base' | 'overlay' | 'standalone';

function layerOfRow(raw: string): Layer {
  const value = raw.toLowerCase();
  if (value === 'overlay' || value === 'categorie' || value === 'category') return 'overlay';
  if (value === 'standalone' || value === 'losstaand' || value === 'zelfstandig') return 'standalone';
  return 'base';
}

/** Categorienamen vergelijkbaar maken zonder ze te verminken. */
function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Een regex die op deze categorienaam aanslaat, ongeacht koppelteken of spatie. */
function matchFor(name: string): string {
  return name.trim().replace(SPECIAL, '\\$&').replace(/[\s_-]+/g, '.?');
}

/** Eén regex uit alle categorieën waar deze lijst iets over zegt. */
function bankMatch(names: string[]): string | undefined {
  const parts = [...new Set(names.map(matchFor).filter((part) => part.length >= 3))];
  return parts.length > 0 ? parts.join('|') : undefined;
}

/** Van "alle interieurstoffen" naar "interieurstoffen": de markt, niet de reikwijdte. */
function verticalFrom(name: string): string {
  return name.trim().replace(/^(alle|all)\s+/i, '').trim();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Eén tekst in beide talen.
 *
 * Een tabel is eentalig — er is geen kolom voor een tweede taal en die zou de
 * lijst ook onleesbaar maken. Dat is één mededeling over de hele lijst en niet
 * één per zin; honderden identieke regels verbergen de waarschuwingen die er wél
 * toe doen.
 */
function same(value: string): Bilingual {
  return { nl: value, en: value };
}

/** Voorvoegsels waarop losse meldingen aan het eind worden samengevoegd. */
const WEIGHT_MISMATCH = '\u0000weight:';
const COUNT_MISMATCH = '\u0000count:';
const NO_EVIDENCE = '\u0000evidence:';

/**
 * Eén melding per soort in plaats van één per rij.
 *
 * Bij een lijst van honderd vragen levert een afwijkend gewicht honderd
 * identieke regels op. Los getoond verdrinken de meldingen die er wél toe doen
 * erin; samengevouwen is het één bevinding, en dat is het ook.
 */
function fold(warnings: string[]): string[] {
  const ids = (prefix: string) => [...new Set(warnings
    .filter((warning) => warning.startsWith(prefix))
    .map((warning) => warning.slice(prefix.length)))];

  const weight = ids(WEIGHT_MISMATCH);
  const count = ids(COUNT_MISMATCH);
  const evidence = ids(NO_EVIDENCE);
  const rest = warnings.filter((warning) => (
    !warning.startsWith(WEIGHT_MISMATCH)
    && !warning.startsWith(COUNT_MISMATCH)
    && !warning.startsWith(NO_EVIDENCE)
  ));

  if (weight.length > 0) {
    rest.push(`Bij ${weight.length} vra${weight.length === 1 ? 'ag' : 'gen'} wijkt de kolom \`gewicht\` af van het belang ernaast. De scan gebruikt de weging uit de methode (kritiek 5, hoog 3, middel 2, laag 1), zodat merchants onderling vergelijkbaar blijven. Het gaat om: ${weight.slice(0, 8).join(', ')}${weight.length > 8 ? ` en ${weight.length - 8} meer` : ''}.`);
  }
  if (count.length > 0) {
    rest.push(`Bij ${count.length} vra${count.length === 1 ? 'ag' : 'gen'} klopt \`aantal_attributen\` niet met wat er in \`benodigde_attributen\` staat. De lijst met namen is leidend. Het gaat om: ${count.slice(0, 8).join(', ')}${count.length > 8 ? ` en ${count.length - 8} meer` : ''}.`);
  }
  if (evidence.length > 0) {
    rest.push(`${evidence.length} vra${evidence.length === 1 ? 'ag draagt' : 'gen dragen'} geen benodigde attributen en ${evidence.length === 1 ? 'is' : 'zijn'} dus uit geen enkel veld te beantwoorden, terwijl de lijst ${evidence.length === 1 ? 'hem' : 'ze'} wél als beantwoordbaar opgeeft. Zet er attributen bij, of markeer ${evidence.length === 1 ? 'hem' : 'ze'} als procesvraag zodat ${evidence.length === 1 ? 'hij' : 'ze'} buiten de score valt. Het gaat om: ${evidence.slice(0, 8).join(', ')}${evidence.length > 8 ? ` en ${evidence.length - 8} meer` : ''}.`);
  }
  return foldWarnings(rest);
}

// --- De lezer ---------------------------------------------------------------

/**
 * Ziet dit bestand eruit als een vragenlijst?
 *
 * De toets is inhoudelijk en niet op extensie: een kopregel met een id-kolom én
 * een vraagkolom. Dat onderscheidt een vragenlijst van een productexport, die
 * ook CSV is en ook een `id` heeft maar geen vragen.
 */
export function looksLikeQuestionList(text: string): boolean {
  const head = text.trimStart();
  if (head.startsWith('{') || head.startsWith('[') || head.startsWith('<')) return false;

  const line = text.split(/\r?\n/, 1)[0] ?? '';
  if (line.trim() === '') return false;
  const { char } = detectDelimiter(text);
  const columns = resolveColumns(line.split(char));
  // Eén van de drie vraagkolommen volstaat. Een tweetalige lijst draagt vaak
  // alleen `vraag_nl` en `vraag_en` en geen algemene kolom; die eisen zou een
  // geldige lijst weigeren met de melding dat het geen vragenlijst is.
  const hasQuestion = columns.question !== undefined
    || columns.questionNl !== undefined
    || columns.questionEn !== undefined;
  return columns.id !== undefined && hasQuestion;
}

interface Group {
  /** De categorienaam zoals hij in de lijst staat. */
  name: string;
  layer: Layer;
  rows: { row: Row; id: string }[];
}

/**
 * Lees één of meer vragenlijsten tot één vragenbank.
 *
 * Meerdere bestanden zijn geen probleem zolang ze dezelfde kolommen hebben: de
 * rijen worden achter elkaar gezet en de laag in de rij bepaalt waar hij landt.
 * Dat is bewust anders dan bij YAML, waar het bestand zelf de laag draagt.
 */
export function importQuestionCsv(files: BankFile[]): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (files.length === 0) return { errors: ['Geen bestand gekozen.'], warnings };

  // --- inlezen -------------------------------------------------------------
  const rows: Row[] = [];
  let columns: ColumnMap = {};
  let headers: string[] = [];

  for (const file of files) {
    const { char } = detectDelimiter(file.text);
    const parsed = parseDelimited(file.text, char);
    if (parsed.length === 0) {
      errors.push(`${file.name} bevat geen rijen onder de kopregel.`);
      continue;
    }
    const own = resolveColumns(Object.keys(parsed[0]));
    // Eén van de drie vraagkolommen volstaat; een tweetalige lijst draagt vaak
    // alleen `vraag_nl` en `vraag_en`.
    const hasQuestion = own.question !== undefined
      || own.questionNl !== undefined
      || own.questionEn !== undefined;
    if (own.id === undefined || !hasQuestion) {
      const found = Object.keys(parsed[0]).slice(0, 12).join(', ');
      errors.push(`${file.name} heeft geen kolom met de vraag en/of een id. Gevonden kolommen: ${found}. Verwacht in elk geval \`id\` en \`vraag\` (of \`vraag_nl\` en \`vraag_en\`).`);
      continue;
    }
    if (headers.length === 0) { columns = own; headers = Object.keys(parsed[0]); }
    rows.push(...parsed);
  }

  if (errors.length > 0) return { errors, warnings };
  if (rows.length === 0) return { errors: ['De vragenlijst is leeg.'], warnings };

  const unknown = headers.filter((header) => !Object.values(columns).includes(header));
  if (unknown.length > 0) {
    warnings.push(`Deze kolommen zijn niet herkend en dus niet meegenomen: ${unknown.join(', ')}. Hernoem ze naar een bekende kolom als ze wél mee moeten tellen.`);
  }
  if (columns.importance === undefined) {
    return {
      errors: ['De lijst heeft geen kolom `belang`. Zonder belang per vraag kan de trechter geen kritieke trede maken en is elke vraag even zwaar — dat is geen meting.'],
      warnings,
    };
  }
  if (columns.layer === undefined) {
    warnings.push('Er is geen kolom `laag`. Alle vragen zijn als basislaag ingelezen en gelden dus voor élke categorie in je catalogus.');
  }
  if (columns.coverage === undefined) {
    warnings.push('Er is geen kolom `dekking`. De dekking staat op "niet onderzocht" — iets anders dan dekking nul, wat zou betekenen dat geen enkele site in het panel dit behandelt.');
  }

  // --- groeperen -----------------------------------------------------------
  const groups = new Map<string, Group>();
  const seen = new Set<string>();
  let duplicates = 0;
  let missingId = 0;

  for (const row of rows) {
    const id = cell(row, columns, 'id');
    // De vraag mag in elk van de drie kolommen staan; één ervan volstaat.
    const question = cell(row, columns, 'question')
      || cell(row, columns, 'questionNl')
      || cell(row, columns, 'questionEn');
    if (id === '' || question === '') { missingId++; continue; }
    if (seen.has(id)) { duplicates++; continue; }
    seen.add(id);

    const layer = columns.layer === undefined ? 'base' : layerOfRow(cell(row, columns, 'layer'));
    const name = cell(row, columns, 'category') || (layer === 'base' ? 'basis' : 'overig');
    const key = `${layer}:${normalizeCategory(name)}`;
    const group = groups.get(key) ?? { name, layer, rows: [] };
    group.rows.push({ row, id });
    groups.set(key, group);
  }

  // Draagt de lijst maar één taal, dan staat straks in beide rapporten dezelfde
  // tekst. Dat is geen fout — beter zichtbaar dezelfde woorden dan een lege regel
  // — maar het hoort wel gezegd te worden, want een merchant die een Nederlands
  // rapport opent en Engelse vragen ziet denkt dat er iets stuk is. De reparatie
  // hoort bij de bron: één rij per vraag met twee kolommen, niet een vertaling
  // achteraf die per keer anders uitvalt.
  if (columns.questionNl === undefined || columns.questionEn === undefined) {
    warnings.push(
      'Deze lijst draagt maar één taal. In beide talen staat dan dezelfde tekst, '
      + 'dus een Nederlands rapport toont Engelse vragen of andersom. Zet er een kolom '
      + '`vraag_nl` én `vraag_en` bij om dat op te lossen.',
    );
  }

  if (missingId > 0) {
    warnings.push(`${missingId} regel${missingId === 1 ? '' : 's'} zonder id of zonder vraagtekst ${missingId === 1 ? 'is' : 'zijn'} overgeslagen.`);
  }
  if (duplicates > 0) {
    errors.push(`${duplicates} vraag-id${duplicates === 1 ? '' : "'s"} kom${duplicates === 1 ? 't' : 'en'} meer dan één keer voor. Een id moet één vraag aanwijzen, anders is een rapport niet te herleiden.`);
  }
  if (seen.size === 0) errors.push('De lijst bevat geen bruikbare vragen.');
  if (errors.length > 0) return { errors, warnings };

  const baseGroups = [...groups.values()].filter((group) => group.layer === 'base');
  const otherGroups = [...groups.values()].filter((group) => group.layer !== 'base');

  // --- attributen ----------------------------------------------------------
  // Alle attributen op bankniveau, ook die alleen in een overlay voorkomen: een
  // overlay erft het register van zijn basislaag, en een attribuut dat maar op
  // één plek bestaat zou anders als onbekend gelden bij de vraag die erop leunt.
  const attributes = collectAttributes(rows, columns, warnings);

  // --- beslisregels --------------------------------------------------------
  const rules = collectRules(rows, columns, warnings);

  // --- vragen --------------------------------------------------------------
  const questionsOf = (group: Group): BankQuestion[] =>
    group.rows.map(({ row, id }) => toQuestion(row, id, columns, warnings));

  const baseQuestions = baseGroups.flatMap(questionsOf);
  const baseIds = baseQuestions.map((question) => question.id);

  // Een overlay bestaat ook voor een categorie die alleen herwogen wordt: de
  // herweging is de enige uitspraak die de lijst over die categorie doet, en
  // zonder overlay landt hij nergens.
  const overlays = new Map<string, Overlay>();
  const ensureOverlay = (name: string): Overlay => {
    const key = normalizeCategory(name);
    const existing = overlays.get(key);
    if (existing) return existing;
    const overlay: Overlay = {
      id: slug(name) || key,
      label: same(capitalize(name)),
      match: matchFor(name),
      reweight: {},
      questions: [],
    };
    overlays.set(key, overlay);
    return overlay;
  };

  for (const group of otherGroups) {
    const overlay = ensureOverlay(group.name);
    overlay.questions = [...(overlay.questions ?? []), ...questionsOf(group)];
    // `geldt_voor` telt mee als naam van de categorie, niet alleen `categorie`.
    // Daar kan een lijst de categorienamen van de merchant kwijt: een Engelse
    // vragenlijst noemt "curtain fabrics" en de catalogus heet "Gordijnstoffen",
    // en dan landt de overlay nergens. Zonder deze uitweg zou de merchant alleen
    // de basislaag krijgen zonder te kunnen ingrijpen.
    const aliases = [...new Set(group.rows.flatMap(({ row }) => splitList(cell(row, columns, 'appliesTo'))))]
      .filter((name) => normalizeCategory(name) !== normalizeCategory(group.name));
    if (aliases.length > 0) {
      overlay.match = [overlay.match, ...aliases.map(matchFor)].join('|');
    }
    // Standalone erft de basislaag níét: naaigaren heeft geen baanbreedte en
    // geen rapporthoogte. In het model is dat een overlay die de hele basislaag
    // uitschakelt — hetzelfde effect, zonder een tweede soort laag.
    if (group.layer === 'standalone') overlay.suppress = baseIds;
    overlay.profiles = mergeProfiles(overlay.profiles, group.rows, columns);
  }

  applyReweights(baseGroups, columns, ensureOverlay, warnings);

  let homeless = 0;
  for (const group of baseGroups) {
    for (const { row } of group.rows) {
      if (splitList(cell(row, columns, 'profiles')).length > 0) homeless++;
    }
  }
  if (homeless > 0) {
    // Niet suggereren dat de profielen bij de categorievragen wél meewegen: de
    // scan meet nog nergens per toepassingsprofiel. Zie het open punt
    // "beslisregels uitvoeren" in NOTES.md.
    warnings.push(`${homeless} basisvra${homeless === 1 ? 'ag noemt' : 'gen noemen'} een toepassingsprofiel — een subcategorie waarin die vraag kritiek is. De scan meet nog niet per toepassingsprofiel, dus geen enkel profiel weegt mee. Deze ${homeless === 1 ? 'is' : 'zijn'} bovendien niet overgenomen: een basisvraag heeft geen categorie om ze aan te hangen.`);
  }

  // --- meta ----------------------------------------------------------------
  const declared = cell(rows[0], columns, 'vertical');
  const source = declared || (baseGroups[0]?.name ?? otherGroups[0]?.name ?? files[0].name.replace(/\.[^.]+$/, ''));
  const vertical = verticalFrom(source);

  const covered = [
    ...rows.flatMap((row) => splitList(cell(row, columns, 'appliesTo'))),
    ...otherGroups.map((group) => group.name),
  ];

  // De onomkeerbare fout is fase 0 van de methode: in elke markt bestaat een
  // aankoopfout die niet te herstellen is, en de vragen die díe fout voorkomen
  // zijn de kritieke. Zonder die zin staat er wel een belang per vraag maar niet
  // waaraan het is afgemeten, en is "kritiek" een oordeel dat de lijst zelf niet
  // verantwoordt. Hij mag daarom uit een kolom komen — dan is de melding weg en
  // draagt het rapport de zin.
  const mistake = rows.map((row) => cell(row, columns, 'mistake')).find((value) => value !== '');
  if (mistake === undefined) {
    warnings.push('De lijst noemt de onomkeerbare fout niet: welke aankoopfout een koper in deze markt niet kan terugdraaien. Het belang per vraag staat er wél, maar zonder die zin is niet na te lopen waaraan "kritiek" is afgemeten. Zet er een kolom `onomkeerbare_fout` bij als je dat wilt vastleggen.');
  }

  const bank: QuestionBank = {
    meta: {
      vertical: slug(vertical) || 'vragenlijst',
      label: same(capitalize(vertical)),
      version: '1.0.0',
      // Geen panel, geen dekking, geen bron bij de drempels: dat is precies wat
      // "in review" betekent. Bevroren zou een domeinreview beloven die er niet is.
      status: 'in-review',
      panel: [],
      match: bankMatch(covered),
      origin: 'imported',
    },
    context: mistake ? { irreversibleMistake: same(mistake) } : {},
    attributes,
    rules,
    questions: baseQuestions,
    overlays: [...overlays.values()],
  };

  const orphans = [...overlays.values()]
    .flatMap((overlay) => Object.keys(overlay.reweight ?? {}))
    .filter((id) => !baseIds.includes(id));
  if (orphans.length > 0) {
    warnings.push(`De herweging verwijst naar ${orphans.length} vraag-id${orphans.length === 1 ? '' : "'s"} die niet in de basislaag staan: ${orphans.slice(0, 6).join(', ')}. Die herweging doet niets.`);
  }

  if (baseQuestions.length === 0 && overlays.size === 0) {
    return { errors: ['De lijst levert geen vragen op.'], warnings: fold(warnings) };
  }

  return { errors: [], warnings: fold(warnings), bank };
}

/**
 * Moeten álle genoemde attributen aanwezig zijn, of volstaat er één?
 *
 * Dit volgt de beslisregel, en dat is geen willekeurige keuze maar een navolging
 * van wat een agent doet met dezelfde vraag.
 *
 * **Zonder regel antwoordt een agent met wat hij heeft.** "Is deze stof duurzaam
 * geproduceerd?" leunt op certificeringen, gerecycled percentage en
 * vezelsamenstelling. Een agent die alleen het OEKO-TEX-keurmerk kent, geeft
 * antwoord — hij zwijgt niet omdat het derde veld leeg is. Alle drie eisen zou
 * een merchant die het keurmerk netjes publiceert laten zakken op een vraag die
 * hij beantwoordt. Bewijs stapelt; één attribuut dat de vraag draagt volstaat.
 * `garendikte_tex` en `garendikte_nm` maken dat onontkoombaar: dat zijn twee
 * eenheden voor hetzelfde getal, en allebei eisen is onzin.
 *
 * **Met een regel wordt er gerekend, en een som heeft al zijn termen nodig.**
 * "Hoeveel meter heb ik nodig voor mijn bank?" is baanbreedte én rapporthoogte
 * én vleug; ontbreekt er één, dan is de uitkomst niet onzeker maar fout. Bij een
 * stof die op maat geknipt wordt en niet retour kan, is een verkeerd getal
 * erger dan geen getal. Deels aanwezig bewijs valt dan in de toestand
 * "onvolledig" — zichtbaar als aanvulwerk, en niet als antwoord.
 *
 * Een expliciete kolom `modus` gaat hier altijd voor: de lijst kent zijn vak
 * beter dan deze afleiding.
 */
function modeOf(row: Row, columns: ColumnMap): 'any' | 'all' {
  const declared = cell(row, columns, 'mode').toLowerCase();
  if (declared !== '') {
    return declared.startsWith('een') || declared === 'any' || declared === 'one' ? 'any' : 'all';
  }
  return cell(row, columns, 'rule') !== '' ? 'all' : 'any';
}

/** Eén rij als bankvraag. */
function toQuestion(row: Row, id: string, columns: ColumnMap, warnings: string[]): BankQuestion {
  // Drie kolommen die dezelfde vraag kunnen dragen. Een lijst die alleen de
  // twee taalkolommen heeft is geen lijst zonder vragen, dus de terugval loopt
  // beide kanten op: mist er één taal, dan staat de andere er — zichtbaar
  // dezelfde woorden is eerlijker dan een lege regel in het rapport.
  const generic = cell(row, columns, 'question');
  const nl = cell(row, columns, 'questionNl');
  const en = cell(row, columns, 'questionEn');
  const label = generic || nl || en;
  const labelNl = nl || generic || en;
  const labelEn = en || generic || nl;
  const rawImportance = cell(row, columns, 'importance').toLowerCase();
  const importance = IMPORTANCE[rawImportance];
  if (!importance) {
    warnings.push(`vraag ${id}: belang "${rawImportance || 'leeg'}" is geen kritiek/hoog/middel/laag; hij telt als middel.`);
  }

  const declaredWeight = Number(cell(row, columns, 'weight'));
  if (importance && Number.isFinite(declaredWeight) && cell(row, columns, 'weight') !== ''
      && declaredWeight !== IMPORTANCE_WEIGHT[importance]) {
    // De weging hoort bij de scanregels en niet bij de lijst: zou elke lijst zijn
    // eigen gewichten meebrengen, dan zijn twee merchants niet vergelijkbaar.
    warnings.push(`${WEIGHT_MISMATCH}${id}`);
  }

  const scored = cell(row, columns, 'scored');
  const answerableRaw = cell(row, columns, 'answerable').toLowerCase();
  const answerable: Answerability = NO.test(scored) || NO.test(answerableRaw)
    ? 'no'
    : answerableRaw === 'gedeeltelijk' || answerableRaw === 'partial' ? 'partial' : 'yes';

  const evidence = splitList(cell(row, columns, 'evidence'));
  // Geen attributen is alleen een gebrek als de lijst wél beweert dat de vraag
  // uit de data te beantwoorden is. Een procesvraag — "kan ik een staal
  // krijgen" — hóórt er geen te hebben; dat schrijft de methode voor, en hem
  // daarvoor waarschuwen maakte de bevindingenlijst onbruikbaar: bij de eerste
  // echte bank waren 107 van de 200 meldingen precies dit, en dan leest niemand
  // de 92 die er wél toe deden.
  if (evidence.length === 0 && answerable !== 'no') {
    warnings.push(`${NO_EVIDENCE}${id}`);
  }
  const declaredCount = cell(row, columns, 'evidenceCount');
  if (declaredCount !== '' && Number(declaredCount) !== evidence.length) {
    warnings.push(`${COUNT_MISMATCH}${id}`);
  }

  const coverageRaw = cell(row, columns, 'coverage');
  const coverage = coverageRaw !== '' && Number.isFinite(Number(coverageRaw)) ? Number(coverageRaw) : null;

  const note = cell(row, columns, 'note');
  const caution = cell(row, columns, 'caution');

  return {
    id,
    label: { nl: labelNl, en: labelEn },
    intent: INTENT[cell(row, columns, 'intent').toLowerCase()] ?? 'fit',
    importance: importance ?? 'medium',
    coverage,
    sources: splitList(cell(row, columns, 'sources'))
      // "(erft bronnen van de bank)" wijst naar een andere laag en is zelf geen
      // bron; als bron overnemen zou een verwijzing tot bewijs promoveren.
      .filter((value) => !value.startsWith('('))
      .map((value) => SOURCE[normalizeHeader(value)] ?? 'expertise'),
    evidence,
    mode: modeOf(row, columns),
    coverageSites: splitList(cell(row, columns, 'coverageSites')),
    ruleId: cell(row, columns, 'rule') || undefined,
    answerType: answerType(cell(row, columns, 'answerType')),
    answerable,
    caution: caution ? same(caution) : undefined,
    weightNote: note ? same(note) : undefined,
  };
}



/**
 * Elk genoemd attribuut als definitie, met het zoekpatroon erbij.
 *
 * De lijst noemt attributen in de taal van het vak (`rolbreedte_cm`) en de
 * catalogus schrijft ze in de taal van het systeem (`fabric_width`). Zolang er
 * geen kolom met veldnamen bij zit, is het patroon een gok — en die gok staat als
 * waarschuwing in de uitkomst, want een verkeerd geraden kolom telt als een gat
 * dat er niet is.
 */
function collectAttributes(rows: Row[], columns: ColumnMap, warnings: string[]): AttributeDef[] {
  const out = new Map<string, AttributeDef>();
  for (const row of rows) {
    const legal = YES.test(cell(row, columns, 'legal'));
    for (const key of splitList(cell(row, columns, 'evidence'))) {
      const existing = out.get(key);
      if (existing) {
        if (legal && !existing.legal) existing.legal = legalNote(row, columns);
        continue;
      }
      const readable = capitalize(key.replace(/_/g, ' '));
      warnings.push(`${UNMAPPED}${key}`);
      // De synoniemen van de rij gelden voor elk attribuut dat de rij noemt. Dat
      // is grof, maar het alternatief is een kolom per attribuut en die maakt de
      // lijst onleesbaar; de matcher weegt ze als extra naam en niet als bewijs.
      const namedAs = splitList(cell(row, columns, 'synonyms'));
      out.set(key, {
        key,
        label: same(readable),
        type: 'text',
        level: 'product',
        legal: legal ? legalNote(row, columns) : undefined,
        namedAs: namedAs.length > 0 ? namedAs : undefined,
        evidence: patternFor([key]),
        mode: 'any',
      });
    }
  }
  return [...out.values()];
}

function legalNote(row: Row, columns: ColumnMap): Bilingual {
  return same(cell(row, columns, 'caution') || 'De lijst merkt dit kenmerk aan als wettelijk verplicht.');
}

/**
 * De genoemde beslisregels, zonder drempel en zonder bron.
 *
 * De lijst noemt een regel bij naam (`extra_stof_voor_rapport`) of als conditie
 * (`martindale >= 30000`), maar zegt nergens welke site die drempel publiceert.
 * Beredeneerd dus, en niet gerekend: de scan kijkt of het attribuut gevuld is,
 * niet of de waarde boven een grens uitkomt. Een verzonnen drempel op naam van
 * een site is erger dan geen drempel.
 */
function collectRules(rows: Row[], columns: ColumnMap, warnings: string[]): DecisionRule[] {
  const out = new Map<string, DecisionRule>();
  for (const row of rows) {
    const raw = cell(row, columns, 'rule');
    if (raw === '' || out.has(raw)) continue;
    const isCondition = /[<>=≥≤]/.test(raw);
    // Een genoemde bron maakt de drempel gepubliceerd; zonder blijft hij
    // beredeneerd en telt hij niet mee in de score. Een URL herkennen we als
    // zodanig, want de methode wil hem kunnen nalopen.
    const source = cell(row, columns, 'ruleSource');
    const url = /^https?:\/\//i.test(source);
    out.set(raw, {
      id: raw,
      label: same(isCondition ? raw : capitalize(raw.replace(/_/g, ' '))),
      source: source === ''
        ? { kind: 'reasoned' }
        : { kind: 'published', site: url ? undefined : source, url: url ? source : undefined },
      rules: isCondition ? [same(raw)] : [],
    });
  }
  const unsourced = [...out.values()].filter((rule) => rule.source.kind !== 'published');
  if (unsourced.length > 0) {
    // Onderscheid tussen "noemt een drempel" en "noemt alleen een naam": beide
    // missen hun bron, maar het zijn twee verschillende gebreken en de merchant
    // moet ze los kunnen herstellen.
    const withThreshold = unsourced.filter((rule) => rule.rules.length > 0);
    warnings.push(
      `De lijst noemt ${unsourced.length} beslisregel${unsourced.length === 1 ? '' : 's'} zonder bron. `
      + (withThreshold.length > 0
        ? `${withThreshold.length} daarvan noem${withThreshold.length === 1 ? 't' : 'en'} een drempel (${withThreshold.slice(0, 2).map((rule) => rule.id).join(', ')}), de rest alleen een naam. `
        : 'Ze noemen alleen een naam en geen drempel. ')
      + 'De scan rekent met geen van beide: hij kijkt of het attribuut gevuld is, niet of de waarde boven een grens uitkomt.',
    );
  }
  return [...out.values()];
}

/** De toepassingsprofielen van één categorie: subcategorieën waarin een vraag kritiek is. */
function mergeProfiles(
  existing: ApplicationProfile[] | undefined,
  entries: { row: Row; id: string }[],
  columns: ColumnMap,
): ApplicationProfile[] | undefined {
  const out = new Map<string, ApplicationProfile>();
  for (const profile of existing ?? []) out.set(profile.id, profile);

  for (const { row, id } of entries) {
    for (const name of splitList(cell(row, columns, 'profiles'))) {
      const key = slug(name) || normalizeCategory(name);
      const profile = out.get(key) ?? {
        id: key,
        label: same(capitalize(name.replace(/_/g, ' '))),
        match: matchFor(name),
        criticalQuestions: [],
      };
      profile.criticalQuestions = [...(profile.criticalQuestions ?? []), id];
      out.set(key, profile);
    }
  }
  return out.size > 0 ? [...out.values()] : undefined;
}

/**
 * De herweging van basisvragen per categorie.
 *
 * "gordijnstoffen: kritiek" bij een basisvraag betekent: in gordijnstoffen weegt
 * deze vraag zwaarder. Dat is precies wat een overlay mag — herwegen, niet
 * herschrijven — dus het landt daar en nergens anders.
 */
function applyReweights(
  groups: Group[],
  columns: ColumnMap,
  ensureOverlay: (name: string) => Overlay,
  warnings: string[],
): void {
  for (const group of groups) {
    for (const { row, id } of group.rows) {
      for (const part of splitList(cell(row, columns, 'reweight'))) {
        const at = part.lastIndexOf(':');
        if (at === -1) {
          warnings.push(`vraag ${id}: herweging "${part}" mist de categorie of het belang. Schrijf hem als "categorie: belang".`);
          continue;
        }
        const category = part.slice(0, at).trim();
        const importance = IMPORTANCE[part.slice(at + 1).trim().toLowerCase()];
        if (category === '' || !importance) {
          warnings.push(`vraag ${id}: herweging "${part}" noemt geen geldige categorie met een belang.`);
          continue;
        }
        const overlay = ensureOverlay(category);
        overlay.reweight = { ...overlay.reweight, [id]: { importance } };
      }
    }
  }
}

// --- De ingang --------------------------------------------------------------

/**
 * Lees wat de merchant heeft aangeleverd, in welke vorm het ook komt.
 *
 * Eén ingang, want de merchant wordt om zijn vragenlijst gevraagd en niet om een
 * bestandsformaat. Een tabel is de vorm die uit de promptreeks rolt; de YAML uit
 * `import.ts` blijft werken omdat de methode die vorm ook oplevert.
 */
export function importQuestionList(files: BankFile[]): ImportResult {
  if (files.length === 0) return { errors: ['Geen bestand gekozen.'], warnings: [] };

  const tables = files.filter((file) => looksLikeQuestionList(file.text));
  if (tables.length === files.length) return importQuestionCsv(files);
  if (tables.length > 0) {
    return {
      errors: [`Er zitten twee soorten bestanden bij elkaar: ${tables.map((file) => file.name).join(', ')} ${tables.length === 1 ? 'is een tabel' : 'zijn tabellen'} en de rest is een vragenbank in YAML. Lees ze apart in, anders is niet te bepalen welke vragen bij welke laag horen.`],
      warnings: [],
    };
  }
  return importBankSet(files);
}
