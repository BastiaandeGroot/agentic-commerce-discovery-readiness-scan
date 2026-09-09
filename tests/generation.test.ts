// De generatie, nagespeeld met vaste antwoorden.
//
// Dit is waarom `src/generation` puur moet blijven: de hele reeks van panel tot
// tabel draait hier zonder netwerk, zonder sleutel en zonder klok. Wat de test
// bewaakt is niet of het model goede vragen bedenkt — dat kan geen test — maar
// dat de reeks zichzelf stuurt, dat er niets stilzwijgend wegvalt, en dat wat
// eruit komt door dezelfde lezer heen gaat als de vragenlijst van een merchant.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { advance, type Ask } from '../src/generation/pipeline';
import { extractJson } from '../src/generation/json';
import {
  decodePhase,
  emptyState,
  encodePhase,
  FIRST_PHASE,
  type Phase,
  type RunState,
} from '../src/generation/state';
import { importQuestionList } from '../src/questions/list';

const BRIEF = {
  vertical: 'woontextiel',
  segments: [
    { name: 'Meubelstoffen', count: 2198 },
    { name: 'Gordijnstoffen', count: 878 },
    { name: 'Eetkamerstoelen', count: 120 },
    { name: 'Vlekwerend', count: 64 },
    { name: 'Vergeten categorie', count: 9 },
  ],
  merchantSite: 'https://voorbeeld.nl',
  suggestedSites: ['https://concurrent.nl'],
};

/** Wat het model per fase teruggeeft. Genoeg om de reeks te laten lopen. */
function antwoord(phase: string): unknown {
  if (phase === 'panel') {
    return {
      panel: [
        { name: 'Een', url: 'https://een.nl', type: 'categorieleider', reason: 'keurmerkreviews' },
        { name: 'Twee', url: 'https://twee.nl', type: 'categorieleider' },
        { name: 'Drie', url: 'https://drie.nl', type: 'specialist' },
        { name: 'Vier', url: 'https://vier.de', type: 'buitenlands' },
        { name: 'Vijf', url: 'https://voorbeeld.nl', type: 'merk' },
      ],
      shape: {
        unit: 'per meter',
        irreversibleMistake: 'op maat geknipt, geen herroepingsrecht',
        standards: ['EN ISO 12947'],
        legal: [],
      },
      grouping: [
        { category: 'Meubelstoffen', kind: 'overlay', reason: 'eigen slijtvragen' },
        { category: 'Gordijnstoffen', kind: 'overlay', reason: 'eigen lichtvragen' },
        { category: 'Eetkamerstoelen', kind: 'profiel', parent: 'Meubelstoffen', reason: 'zelfde vragen, andere drempel' },
        { category: 'Vlekwerend', kind: 'facet', reason: 'is een eigenschap' },
      ],
      findings: ['Het panel leunt op twee Nederlandse leiders.'],
    };
  }
  if (phase.startsWith('harvest')) {
    return {
      questions: [{ question: 'Is dit sterk genoeg voor mijn bank?', source: 'faq', url: 'https://een.nl/faq' }],
      attributes: [{ namedAs: 'slijtvastheid', meaning: 'schuurweerstand' }],
      rules: [{ name: 'martindale_bank', rule: '>= 30000 voor bankstof', url: 'https://een.nl/faq' }],
      notes: [],
    };
  }
  if (phase === 'consolidate') {
    return {
      topics: [
        { topic: 'slijtage', question: 'Is dit sterk genoeg voor mijn bank?', coverage: 5, coverageSites: ['Een', 'Twee', 'Drie', 'Vier', 'Vijf'], sources: ['faq'] },
        { topic: 'krimp', question: 'Krimpt dit na wassen?', coverage: 0, coverageSites: [], sources: ['vakkennis'] },
      ],
      findings: [],
    };
  }
  if (phase === 'base') {
    return {
      questions: [
        {
          id: 'BAS-01', questionNl: 'Is dit sterk genoeg voor mijn bank?', questionEn: 'Is this durable enough for my sofa?',
          intent: 'geschiktheid', importance: 'kritiek', coverage: 5, coverageSites: ['Een', 'Twee'],
          sources: ['faq'], evidence: ['schuurweerstand_martindale'], synonyms: ['slijtvastheid'],
          rule: 'martindale_bank', answerType: 'getal', answerable: 'true', mode: 'alle',
          note: 'drempel gepubliceerd op een.nl',
        },
        {
          id: 'BAS-02', questionNl: 'Kan ik een staal krijgen?', questionEn: 'Can I get a sample?',
          intent: 'koopzekerheid', importance: 'middel', coverage: 3, coverageSites: ['Een'],
          sources: ['faq'], evidence: [], synonyms: [], answerType: 'proces', answerable: 'false',
        },
      ],
      findings: ['De drempel voor huisdieren is beredeneerd.'],
    };
  }
  if (phase.startsWith('overlay')) {
    return {
      questions: [{
        id: 'MEU-01', questionNl: 'Hoeveel meter heb ik nodig?', questionEn: 'How many metres do I need?',
        intent: 'hoeveelheid', importance: 'kritiek', coverage: 4, coverageSites: ['Een', 'Twee'],
        sources: ['faq'], evidence: ['baanbreedte_cm', 'patroonrapport_cm'], synonyms: ['rapport'],
        rule: 'meterage', answerType: 'afgeleid_berekening', answerable: 'gedeeltelijk', mode: 'alle',
      }],
      reweight: [{ id: 'BAS-01', importance: 'kritiek', reason: 'slijtage telt hier het zwaarst' }],
      findings: [],
    };
  }
  if (phase === 'facets') {
    return {
      facets: [{ category: 'Vlekwerend', count: 64, attribute: 'vlekwerend', condition: 'behandeling aanwezig', panelSites: 4, priority: 'hoog' }],
      regroup: [{ category: 'Gordijnstoffen', kind: 'facet', reason: 'toch geen eigen vragen' }],
      findings: [],
    };
  }
  return {};
}

/** De hele reeks draaien, met een teller zodat de test de volgorde kan nakijken. */
async function draai(): Promise<{ state: RunState; phases: string[] }> {
  const phases: string[] = [];
  const ask: Ask = async (task) => {
    phases.push(task.phase);
    return { json: antwoord(task.phase), usage: { input: 100, output: 50, cached: 0 } };
  };

  let state = emptyState(BRIEF);
  let phase: Phase = FIRST_PHASE;

  for (let stap = 0; stap < 40 && phase.kind !== 'done'; stap++) {
    // Elke beurt begint bij een verse rij uit de database: fase als tekst,
    // toestand als JSON. Loopt de reeks door die heenreis heen kapot, dan zou
    // hervatten in productie ook stukgaan en zou geen enkele test dat zien.
    const bewaard = JSON.parse(JSON.stringify(state)) as RunState;
    const opnieuw = decodePhase(encodePhase(phase));
    const result = await advance(bewaard, opnieuw, ask, '2026-09-09');
    state = result.state;
    phase = result.next;
  }

  return { state, phases };
}

test('de reeks loopt van panel tot tabel en stuurt zichzelf', async () => {
  const { state, phases } = await draai();

  assert.deepEqual(phases, [
    'panel',
    'harvest:0', 'harvest:1', 'harvest:2', 'harvest:3', 'harvest:4',
    'consolidate',
    'base',
    'overlay:0', 'overlay:1',
    'facets',
  ]);

  assert.ok(state.csv, 'de reeks levert een tabel op');
  assert.equal(state.panel.length, 5);
  assert.equal(state.harvest.length, 5);
});

test('de tabel gaat door dezelfde lezer als de vragenlijst van een merchant', async () => {
  const { state } = await draai();
  const read = importQuestionList([{ name: 'woontextiel.csv', text: state.csv ?? '' }]);

  assert.deepEqual(read.errors, [], 'geen blokkerende fouten');
  assert.ok(read.bank, 'er komt een bank uit');
  assert.equal(read.bank?.questions.length, 2, 'de twee basisvragen');
  assert.equal(read.bank?.overlays.length, 2, 'twee overlays');

  // De procesvraag telt niet mee in de score: hij kan uit geen enkel veld
  // beantwoord worden en elke merchant zou er identiek op zakken.
  const proces = read.bank?.questions.find((question) => question.id === 'BAS-02');
  assert.equal(proces?.answerable, 'no');

  // Een som heeft al zijn termen nodig; bewijs zonder regel stapelt.
  const meterage = read.bank?.overlays[0]?.questions?.find((question) => question.id === 'MEU-01');
  assert.equal(meterage?.mode, 'all');
});

test('een categorie die de groepering vergeet valt niet stilzwijgend weg', async () => {
  const { state } = await draai();
  const vergeten = state.grouping.find((entry) => entry.category === 'Vergeten categorie');

  assert.ok(vergeten, 'hij staat er alsnog in');
  assert.equal(vergeten?.kind, 'facet', 'als facet, want dat is het onschuldigste vak');
  assert.ok(
    state.findings.some((finding) => finding.includes('Vergeten categorie')),
    'en het staat als bevinding op het scherm',
  );
});

test('de facetanalyse haalt geen overlay meer weg waar al vragen voor geschreven zijn', async () => {
  const { state } = await draai();
  const gordijn = state.grouping.find((entry) => entry.category === 'Gordijnstoffen');

  assert.equal(gordijn?.kind, 'overlay', 'de indeling blijft staan');
  assert.ok(
    state.findings.some((finding) => finding.includes('Gordijnstoffen')),
    'maar het voorstel om hem te verplaatsen is zichtbaar',
  );
});

test('de aanvraag draagt geen productdata het model in', async () => {
  const teksten: string[] = [];
  const ask: Ask = async (task) => {
    teksten.push(task.prompt);
    return { json: antwoord(task.phase), usage: { input: 0, output: 0, cached: 0 } };
  };

  let state = emptyState(BRIEF);
  let phase: Phase = FIRST_PHASE;
  for (let stap = 0; stap < 40 && phase.kind !== 'done'; stap++) {
    const result = await advance(state, phase, ask, '2026-09-09');
    state = result.state;
    phase = result.next;
  }

  // Wat er wél in mag: categorienamen met aantallen en de URL van de winkel.
  // Wat er nooit in mag: een kolomnaam of een productrij. Het type kan het niet
  // dragen, en deze test bewaakt dat de prompt het er ook niet zelf bij verzint.
  const alles = teksten.join('\n');
  assert.ok(alles.includes('Meubelstoffen'), 'categorienamen gaan mee');
  assert.ok(alles.includes('2198'), 'met hun aantallen');
  for (const verboden of ['fabric_width', 'sku', 'artikelnummer', 'ean', 'gtin']) {
    assert.ok(
      !new RegExp(`\\b${verboden}\\b`, 'i').test(alles),
      `${verboden} hoort er niet in te staan`,
    );
  }
});

test('het JSON-object komt ook uit een antwoord met een zin ervoor', () => {
  assert.deepEqual(extractJson('Hier is het:\n```json\n{"a": 1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Prima. {"a": {"b": "}"}} en dat was het'), { a: { b: '}' } });
  assert.throws(() => extractJson('geen object'), /geen JSON-object/);
  assert.throws(() => extractJson('{"a": 1'), /niet afgesloten/);
});
