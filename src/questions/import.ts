// Een vragenbank inlezen die buiten de app is opgebouwd.
//
// De methode levert YAML op, geschreven in het Nederlands en met de sleutels uit
// `prompt-vragenbank-genereren.md`. Deze module vertaalt dat naar het model van
// de app, en zegt bij elke afwijking wat er mis is in plaats van er stilzwijgend
// iets van te maken. Een half ingelezen bank levert een rapport op dat nergens
// over gaat, en dat is erger dan een leesbare fout.
//
// Twee dingen die de methode bewust openlaat en die hier landen:
//
// **De mappinglaag.** De methode plaatst het koppelen van canonieke attributen
// aan merchantvelden expliciet ná het bevriezen: eerder kijken stuurt je denken.
// Draagt een attribuut een `velden:`-lijst, dan gebruiken we die. Zo niet, dan
// bouwen we een zoekpatroon uit de sleutel plus `benoemd_als` — precies de namen
// waaronder de markt dit kenmerk publiceert, en daarmee de beste gok naar de
// kolomnaam van een merchant. Die gok staat als waarschuwing in de uitkomst.
//
// **De tweede taal.** De banken zijn Nederlands. Ontbreekt een Engelse variant,
// dan zetten we de Nederlandse tekst in beide talen en zeggen dat erbij. Een
// vraag stilzwijgend onvertaald tonen is beter dan hem laten verdwijnen, maar
// niet iets om te verzwijgen.

import type { Bilingual } from '../domain/types';
import type {
  AnswerType, Answerability, AttributeDef, BankQuestion, BankStatus, DecisionRule,
  EvidenceSource, Importance, Intent, OpenPoint, Overlay, PanelSite, PanelSiteType,
  QuestionBank,
} from './bank';
import { IMPORTANCE_WEIGHT } from './bank';
import { parseYaml, YamlError, type YamlValue } from './yaml';

export interface ImportResult {
  bank?: QuestionBank;
  /** Blokkerend: hiermee kan de bank niet gebruikt worden. */
  errors: string[];
  /** Niet blokkerend, wel iets om te weten voordat je op het rapport vertrouwt. */
  warnings: string[];
}

type Dict = Record<string, YamlValue>;

const isDict = (value: YamlValue): value is Dict =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function text(value: YamlValue): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function list(value: YamlValue): YamlValue[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function strings(value: YamlValue): string[] {
  return list(value).map(text).filter((v): v is string => v !== undefined);
}

// --- Vertalingen van de Nederlandse sleutels --------------------------------

const IMPORTANCE: Record<string, Importance> = {
  kritiek: 'critical', hoog: 'high', middel: 'medium', laag: 'low',
  critical: 'critical', high: 'high', medium: 'medium', low: 'low',
};

const INTENT: Record<string, Intent> = {
  geschiktheid: 'fit', hoeveelheid: 'quantity', onderhoud: 'care',
  verwachting: 'expectation', materiaal: 'material', verwerking: 'processing',
  duurzaamheid: 'durability', veiligheid: 'safety', koopzekerheid: 'purchase-certainty',
};

const ANSWER_TYPE: Record<string, AnswerType> = {
  enum: 'enum', getal: 'number', number: 'number', boolean: 'boolean',
  tekst: 'text', text: 'text', relatie: 'relation', relation: 'relation',
  proces: 'process', process: 'process',
};

/**
 * De methode schrijft `afgeleid_*`: het achtervoegsel noemt de berekening,
 * bijvoorbeeld `afgeleid_meterage`. Voor het model telt alleen dat het antwoord
 * uit een regel volgt en niet uit één veld.
 */
function answerType(raw: string | undefined): AnswerType {
  const value = raw?.toLowerCase() ?? '';
  if (value.startsWith('afgeleid') || value.startsWith('derived')) return 'derived';
  return ANSWER_TYPE[value] ?? 'text';
}

const SOURCE: Record<string, EvidenceSource> = {
  faq: 'faq', categorietekst: 'category-text', blog: 'blog',
  productpagina: 'product-page', review: 'review', reviews: 'review',
  servicetickets: 'service', service: 'service', vakkennis: 'expertise',
};

const SITE_TYPE: Record<string, PanelSiteType> = {
  categorieleider: 'category-leader', specialist: 'specialist',
  merk: 'brand', fabrikant: 'brand', 'merk/fabrikant': 'brand',
  buitenlands: 'foreign', marketplace: 'marketplace', merchant: 'merchant',
};

const STATUS: Record<string, BankStatus> = {
  bevroren: 'frozen', frozen: 'frozen', in_review: 'in-review',
  review: 'in-review', voorlopig: 'provisional', concept: 'provisional',
};

/** `beantwoordbaar_uit_attributen: gedeeltelijk` is een derde antwoord, geen bijna-ja. */
function answerability(value: YamlValue): Answerability {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  const raw = text(value)?.toLowerCase();
  if (raw === 'gedeeltelijk' || raw === 'partial') return 'partial';
  if (raw === 'false' || raw === 'nee' || raw === 'no') return 'no';
  return 'yes';
}

// --- Bouwstenen -------------------------------------------------------------

/**
 * Eén tekst in twee talen.
 *
 * De banken zijn Nederlands; een Engelse variant mag onder dezelfde sleutel met
 * `_en` erachter. Ontbreekt die, dan staat de Nederlandse tekst in beide talen.
 */
function bilingual(source: Dict, key: string, warnings: string[], where: string): Bilingual | undefined {
  const nl = text(source[key]);
  if (nl === undefined) return undefined;
  const en = text(source[`${key}_en`]);
  // Eén melding voor de hele bank, niet één per zin. Een lijst van dertig keer
  // dezelfde regel verbergt de waarschuwingen die er wél toe doen.
  if (en === undefined) warnings.push(`${UNTRANSLATED}${where}`);
  return { nl, en: en ?? nl };
}

/** Voorvoegsel waarop de losse taalmeldingen aan het eind worden samengevoegd. */
const UNTRANSLATED = '\u0000untranslated:';

function foldWarnings(warnings: string[]): string[] {
  const untranslated = warnings
    .filter((warning) => warning.startsWith(UNTRANSLATED))
    .map((warning) => warning.slice(UNTRANSLATED.length));
  const rest = warnings.filter((warning) => !warning.startsWith(UNTRANSLATED));
  if (untranslated.length === 0) return rest;
  const unique = [...new Set(untranslated)];
  return [
    ...rest,
    `${unique.length} onderde${unique.length === 1 ? 'el heeft' : 'len hebben'} geen Engelse tekst; daar staat de Nederlandse nu in beide talen. Het gaat om: ${unique.slice(0, 6).join(', ')}${unique.length > 6 ? ` en ${unique.length - 6} meer` : ''}.`,
  ];
}

/**
 * Het zoekpatroon waarmee een attribuut in een feed teruggevonden wordt.
 *
 * Zonder expliciete `velden` bouwen we er een uit de sleutel en `benoemd_als`.
 * Dat is een gok, maar een navolgbare: dit zijn de namen waaronder de markt het
 * kenmerk publiceert. De waarschuwing hoort de merchant te zien, want een
 * verkeerd geraden kolom telt als een gat dat er niet is.
 */
function evidenceFor(key: string, source: Dict, warnings: string[]): string[] {
  const explicit = strings(source.velden ?? source.fields ?? source.bewijs_velden);
  if (explicit.length > 0) return explicit;

  const names = [key, ...strings(source.benoemd_als ?? source.named_as)];
  // Ontdubbelen ná het normaliseren: "Bandenmaat" en "bandenmaat" leveren
  // hetzelfde patroon op en zouden anders twee keer in de melding staan.
  const parts = [...new Set(names
    .map((name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.?'))
    .filter((part) => part.length >= 3))];
  if (parts.length === 0) return [];
  warnings.push(`attribuut "${key}": geen veldkoppeling opgegeven; er wordt gezocht op ${parts.join(', ')}.`);
  return [`attr:${parts.join('|')}`];
}

function attributes(node: YamlValue, warnings: string[]): AttributeDef[] {
  const out: AttributeDef[] = [];
  const entries: [string, Dict][] = [];

  // De methode schrijft attributen als mapping; een lijst met `naam:` erin komt
  // in de praktijk ook voor en kost niets om te accepteren.
  if (isDict(node)) {
    for (const [key, value] of Object.entries(node)) if (isDict(value)) entries.push([key, value]);
  } else {
    for (const item of list(node)) {
      if (!isDict(item)) continue;
      const key = text(item.naam ?? item.key ?? item.sleutel);
      if (key) entries.push([key, item]);
    }
  }

  for (const [key, value] of entries) {
    out.push({
      key,
      label: bilingual(value, 'label', warnings, `attribuut ${key}`) ?? { nl: key, en: key },
      type: answerType(text(value.type)),
      standard: text(value.normering ?? value.standard),
      level: text(value.niveau ?? value.level) === 'variant' ? 'variant' : 'product',
      legal: bilingual(value, 'wettelijk', warnings, `attribuut ${key}`),
      namedAs: strings(value.benoemd_als ?? value.named_as),
      evidence: evidenceFor(key, value, warnings),
      mode: text(value.modus ?? value.mode) === 'all' ? 'all' : 'any',
    });
  }
  return out;
}

function rules(node: YamlValue, warnings: string[], errors: string[]): DecisionRule[] {
  const out: DecisionRule[] = [];
  const entries: [string, Dict][] = [];
  if (isDict(node)) {
    for (const [key, value] of Object.entries(node)) if (isDict(value)) entries.push([key, value]);
  } else {
    for (const item of list(node)) {
      if (!isDict(item)) continue;
      const key = text(item.naam ?? item.id);
      if (key) entries.push([key, item]);
    }
  }

  for (const [id, value] of entries) {
    const raw = text(value.bron ?? value.source) ?? '';
    const published = /gepubliceerd|published/i.test(raw);
    const site = text(value.site) ?? (published ? raw.replace(/gepubliceerd|published/gi, '').replace(/[():,-]/g, ' ').trim() : undefined);

    // Het onderscheid gepubliceerd/beredeneerd is de hele reden dat dit veld
    // bestaat. Een gepubliceerde drempel zonder site is niet controleerbaar en
    // dus per definitie beredeneerd; dat zeggen we hardop.
    if (published && !site) {
      errors.push(`beslisregel "${id}": bron staat op gepubliceerd maar noemt geen site. Zonder site is de drempel niet na te trekken.`);
    }
    if (!published && !text(value.onderbouwing ?? value.rationale)) {
      warnings.push(`beslisregel "${id}": beredeneerde drempel zonder onderbouwing. De domeinexpert kan hem zo niet tegenspreken.`);
    }

    out.push({
      id,
      label: bilingual(value, 'label', warnings, `beslisregel ${id}`) ?? { nl: id, en: id },
      source: {
        kind: published && site ? 'published' : 'reasoned',
        site,
        url: text(value.url),
        rationale: bilingual(value, 'onderbouwing', warnings, `beslisregel ${id}`),
      },
      rules: strings(value.regels ?? value.rules).map((rule) => ({ nl: rule, en: rule })),
      deviations: list(value.afwijkingen ?? value.deviations)
        .filter(isDict)
        .map((item) => ({
          site: text(item.site) ?? '—',
          note: bilingual(item, 'toelichting', warnings, `beslisregel ${id}`) ?? { nl: '', en: '' },
        })),
    });
  }
  return out;
}

function questions(
  node: YamlValue, excluded: Set<string>, warnings: string[], errors: string[],
): BankQuestion[] {
  const out: BankQuestion[] = [];
  for (const item of list(node)) {
    if (!isDict(item)) continue;
    const id = text(item.id);
    if (!id) { errors.push('een vraag zonder id is niet te herleiden en wordt overgeslagen.'); continue; }

    const label = bilingual(item, 'vraag', warnings, `vraag ${id}`) ?? bilingual(item, 'label', warnings, `vraag ${id}`);
    if (!label) { errors.push(`vraag ${id}: geen tekst.`); continue; }

    const evidence = strings(item.bewijs ?? item.evidence);
    if (evidence.length === 0) {
      warnings.push(`vraag ${id}: geen bewijs opgegeven; hij kan uit geen enkel attribuut beantwoord worden.`);
    }

    const rawImportance = text(item.belang ?? item.importance)?.toLowerCase() ?? '';
    const importance = IMPORTANCE[rawImportance];
    if (!importance) errors.push(`vraag ${id}: belang "${rawImportance}" is geen kritiek/hoog/middel/laag.`);

    const coverageRaw = item.dekking ?? item.coverage;
    const coverage = typeof coverageRaw === 'number' ? coverageRaw : null;

    const answerable = excluded.has(id) ? 'no' : answerability(item.beantwoordbaar_uit_attributen ?? item.answerable);

    // De methode vraagt om verantwoording zodra gewicht en dekking uiteenlopen.
    // Dat is niet af te dwingen zonder de panelomvang, maar wél te signaleren.
    if (importance === 'critical' && coverage === 0 && !text(item.toelichting ?? item.weightNote)) {
      warnings.push(`vraag ${id}: kritiek bij dekking 0 zonder uitleg waarom je van de dekking afwijkt.`);
    }

    out.push({
      id,
      label,
      intent: INTENT[text(item.intentie ?? item.intent)?.toLowerCase() ?? ''] ?? 'fit',
      importance: importance ?? 'medium',
      coverage,
      coverageSites: strings(item.dekking_bronnen ?? item.coverage_sites),
      sources: strings(item.bron ?? item.sources)
        .map((source) => SOURCE[source.toLowerCase()])
        .filter((source): source is EvidenceSource => source !== undefined),
      evidence,
      mode: text(item.modus ?? item.mode) === 'any' ? 'any' : 'all',
      ruleId: text(item.beslisregel ?? item.rule),
      answerType: answerType(text(item.antwoordtype ?? item.answerType)),
      answerable,
      weightNote: bilingual(item, 'toelichting', warnings, `vraag ${id}`),
    });
  }
  return out;
}

function panel(node: YamlValue, warnings: string[]): PanelSite[] {
  return list(node).filter(isDict).map((item, index) => {
    const name = text(item.naam ?? item.name) ?? `site ${index + 1}`;
    const consulted = text(item.geraadpleegd ?? item.consulted);
    if (!consulted) warnings.push(`panelsite "${name}": geen datum van raadpleging; dekking is daarmee niet reproduceerbaar.`);
    return {
      id: text(item.id) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      url: text(item.url) ?? '',
      type: SITE_TYPE[text(item.type)?.toLowerCase() ?? ''] ?? 'specialist',
      consultedAt: consulted ?? '',
    };
  });
}

function openPoints(node: YamlValue, warnings: string[]): OpenPoint[] {
  return list(node).map((item, index): OpenPoint | undefined => {
    if (typeof item === 'string') {
      return { id: `open-${index + 1}`, kind: 'other' as const, question: { nl: item, en: item } };
    }
    if (!isDict(item)) return undefined;
    const question = bilingual(item, 'vraag', warnings, 'open punt') ?? bilingual(item, 'punt', warnings, 'open punt');
    if (!question) return undefined;
    const kind = text(item.soort ?? item.kind) ?? '';
    return {
      id: text(item.id) ?? `open-${index + 1}`,
      kind: (['reasoned-threshold', 'contradiction', 'gap'].includes(kind) ? kind : 'other') as OpenPoint['kind'],
      question,
      weight: IMPORTANCE[text(item.belang ?? item.weight)?.toLowerCase() ?? ''],
    };
  }).filter((point): point is OpenPoint => point !== undefined);
}

function overlays(node: YamlValue, warnings: string[], errors: string[]): Overlay[] {
  return list(node).filter(isDict).map((item, index) => {
    const id = text(item.id ?? item.categorie) ?? `overlay-${index + 1}`;
    const reweight: Overlay['reweight'] = {};
    const source = item.herweging_basisvragen ?? item.reweight;
    if (isDict(source)) {
      for (const [questionId, value] of Object.entries(source)) {
        const raw = isDict(value) ? text(value.belang ?? value.importance) : text(value);
        const importance = IMPORTANCE[raw?.toLowerCase() ?? ''];
        if (!importance) { errors.push(`overlay ${id}: herweging van ${questionId} noemt geen geldig belang.`); continue; }
        reweight[questionId] = {
          importance,
          why: isDict(value) ? bilingual(value, 'waarom', warnings, `overlay ${id}`) : undefined,
        };
      }
    }

    return {
      id,
      label: bilingual(item, 'label', warnings, `overlay ${id}`) ?? { nl: id, en: id },
      match: text(item.match ?? item.categorie) ?? id,
      reweight,
      suppress: strings(item.uitschakelen ?? item.suppress),
      attributes: attributes(item.attributen ?? item.attributes, warnings),
      rules: rules(item.beslisregels ?? item.rules, warnings, errors),
      questions: questions(item.vragen ?? item.questions, new Set(strings(item.uitgesloten_van_score)), warnings, errors),
      profiles: list(item.toepassingsprofielen ?? item.profiles).filter(isDict).map((profile, i) => ({
        id: text(profile.id ?? profile.naam) ?? `profiel-${i + 1}`,
        label: bilingual(profile, 'label', warnings, `profiel in ${id}`) ?? { nl: text(profile.naam) ?? '', en: text(profile.naam) ?? '' },
        match: text(profile.match),
        criticalQuestions: strings(profile.kritieke_vragen ?? profile.critical),
        note: bilingual(profile, 'toelichting', warnings, `profiel in ${id}`),
      })),
    };
  });
}

// --- De ingang --------------------------------------------------------------

/**
 * Lees een vragenbank uit YAML of JSON.
 *
 * Levert altijd een uitkomst: bij blokkerende fouten zonder bank, met een lijst
 * die zegt wat er hersteld moet worden. `errors` is leeg voordat een bank
 * gebruikt mag worden; `warnings` mag blijven staan maar hoort in beeld.
 */
export function importBank(source: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: YamlValue;
  try {
    // JSON is geldige YAML, maar de eigen parser hoeft dat niet te bewijzen:
    // begint het met een accolade, dan leest JSON.parse het sneller en strenger.
    parsed = source.trimStart().startsWith('{') ? JSON.parse(source) : parseYaml(source);
  } catch (error) {
    const message = error instanceof YamlError ? error.message : (error as Error).message;
    return { errors: [`Het bestand is niet te lezen — ${message}`], warnings };
  }

  if (!isDict(parsed)) return { errors: ['Het bestand bevat geen vragenbank maar een losse waarde.'], warnings };

  const meta = isDict(parsed.meta) ? parsed.meta : {};
  const vertical = text(meta.vertical ?? meta.verticaal ?? parsed.vertical);
  if (!vertical) errors.push('meta.vertical ontbreekt. Zonder vertical is niet te bepalen op welke markt deze bank slaat.');

  const status = STATUS[text(meta.status)?.toLowerCase() ?? ''] ?? 'in-review';
  const sites = panel(meta.sitepanel ?? meta.panel, warnings);
  const declared = typeof meta.panelomvang === 'number' ? meta.panelomvang : undefined;
  if (declared !== undefined && declared !== sites.length) {
    errors.push(`meta.panelomvang zegt ${declared} maar er staan ${sites.length} sites in het panel. Dekking is dan niet na te rekenen.`);
  }
  if (status === 'frozen' && sites.length === 0) {
    // Bevroren zonder panel is de vorm van de methode zonder de inhoud ervan.
    errors.push('Deze bank staat op bevroren maar heeft geen sitepanel. Dekking is dan een getal zonder noemer.');
  }

  // De weging is onderdeel van de scanregels en niet van de bank: zou elke bank
  // zijn eigen gewichten meebrengen, dan zijn twee merchants niet vergelijkbaar.
  const weights = isDict(parsed.weging) && isDict(parsed.weging.belang) ? parsed.weging.belang : undefined;
  if (weights) {
    const mismatch = Object.entries(IMPORTANCE).some(([nl, key]) =>
      weights[nl] !== undefined && weights[nl] !== IMPORTANCE_WEIGHT[key]);
    if (mismatch) {
      warnings.push('Deze bank draagt een eigen weging. De scan gebruikt de weging uit de methode (kritiek 5, hoog 3, middel 2, laag 1), zodat merchants onderling vergelijkbaar blijven.');
    }
  }

  const context = isDict(parsed.context_vertical) ? parsed.context_vertical : {};
  const irreversible = bilingual(context, 'onomkeerbare_fout', warnings, 'context_vertical');
  if (!irreversible) {
    errors.push('context_vertical.onomkeerbare_fout ontbreekt. Dat is de vraag waar de hele weging aan hangt: zonder die fout is "kritiek" een mening.');
  }

  const excluded = new Set(strings(parsed.uitgesloten_van_score ?? parsed.excluded_from_score));
  const bankQuestions = questions(parsed.vragen ?? parsed.questions, excluded, warnings, errors);
  if (bankQuestions.length === 0) errors.push('De bank bevat geen vragen.');

  const bankAttributes = attributes(parsed.attributen ?? parsed.attributes, warnings);
  const known = new Set(bankAttributes.map((attribute) => attribute.key));
  const bankOverlays = overlays(parsed.overlays ?? parsed.categorieen, warnings, errors);
  for (const overlay of bankOverlays) for (const attribute of overlay.attributes ?? []) known.add(attribute.key);

  for (const question of [...bankQuestions, ...bankOverlays.flatMap((o) => o.questions ?? [])]) {
    for (const key of question.evidence) {
      if (!known.has(key)) {
        errors.push(`vraag ${question.id} leunt op attribuut "${key}", maar dat staat niet in het attribuutregister.`);
      }
    }
  }

  const bankRules = rules(parsed.beslisregels ?? parsed.rules, warnings, errors);
  const ruleIds = new Set([...bankRules, ...bankOverlays.flatMap((o) => o.rules ?? [])].map((r) => r.id));
  for (const question of bankQuestions) {
    if (question.ruleId && !ruleIds.has(question.ruleId)) {
      warnings.push(`vraag ${question.id} verwijst naar beslisregel "${question.ruleId}", die niet in dit bestand staat.`);
    }
  }

  if (errors.length > 0) return { errors, warnings: foldWarnings(warnings) };

  return {
    errors,
    warnings: foldWarnings(warnings),
    bank: {
      meta: {
        vertical: vertical as string,
        label: bilingual(meta, 'label', warnings, 'meta') ?? { nl: vertical as string, en: vertical as string },
        version: text(meta.versie ?? meta.version) ?? '1.0.0',
        status,
        panel: sites,
        match: text(meta.match ?? meta.categoriematch),
        sources: strings(meta.bronnen ?? meta.sources),
        frozenAt: status === 'frozen' ? text(meta.bevroren_op ?? meta.frozen_at) : undefined,
        origin: 'imported',
      },
      context: {
        irreversibleMistake: irreversible as Bilingual,
        consequence: bilingual(context, 'gevolg', warnings, 'context_vertical'),
        unitOfSale: text(context.koopeenheid) === 'maateenheid' ? 'measure' : text(context.koopeenheid) === 'stuk' ? 'piece' : undefined,
        standard: text(context.sectorstandaard ?? context.standard),
      },
      attributes: bankAttributes,
      rules: bankRules,
      questions: bankQuestions,
      overlays: bankOverlays,
      openPoints: openPoints(parsed.open_punten ?? parsed.open_points, warnings),
      transparencyNotes: strings(parsed.transparantienoten ?? parsed.transparency_notes)
        .map((note) => ({ nl: note, en: note })),
    },
  };
}
