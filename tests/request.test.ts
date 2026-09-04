// De bankaanvraag mag geen productdata dragen.
//
// Dat is geen voorzichtigheid maar twee harde eisen tegelijk: fase 3 van de
// methode — bouw de bank vóórdat je de catalogus opent — en de belofte dat de
// catalogus het apparaat van de merchant niet verlaat. Een aanvraag is het enige
// wat de app naar buiten stuurt, dus dit is de plek om dat te bewaken.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { deriveCategories, generateQuestionSets } from '../src/questions/generate';
import { buildBankRequest, needsBank, renderBankRequest } from '../src/questions/request';
import { importBank } from '../src/questions/import';

const VAST_TIJDSTIP = '2026-09-04T09:00:00.000Z';

const CATALOG = [
  'sku,name,category,image,geheime_kolom',
  '1,Meubelstof Anker gestreept blauw,Meubelstoffen,https://x/1.jpg,vertrouwelijk-1',
  '2,Gordijnstof Effen groen,Gordijnstoffen,https://x/2.jpg,vertrouwelijk-2',
].join('\n');

function request(site?: string) {
  const catalog = ingest('catalogus.csv', CATALOG);
  const state = generateQuestionSets(catalog);
  return {
    state,
    request: buildBankRequest(state, deriveCategories(catalog), {
      createdAt: VAST_TIJDSTIP,
      merchantSite: site,
    }),
  };
}

test('de aanvraag draagt categorienamen met aantallen, en verder niets van de catalogus', () => {
  const { request: aanvraag } = request('https://degrootstoffen.example');
  // Aflopend op aantal, en bij gelijke aantallen alfabetisch — vaste volgorde,
  // anders verschilt de aanvraag per keer.
  assert.deepEqual(aanvraag.categories, [
    { name: 'Gordijnstoffen', count: 1 },
    { name: 'Meubelstoffen', count: 1 },
  ]);
  assert.equal(aanvraag.totalProducts, 2);
  assert.equal(aanvraag.vertical, 'home-textiles');
});

test('geen producttitel, geen veldwaarde en geen kolomnaam in de afgeleverde tekst', () => {
  const { request: aanvraag } = request('https://degrootstoffen.example');
  for (const locale of ['nl', 'en'] as const) {
    const tekst = renderBankRequest(aanvraag, locale);
    assert.ok(!tekst.includes('Meubelstof Anker'), 'een producttitel hoort hier niet');
    assert.ok(!tekst.includes('vertrouwelijk'), 'een veldwaarde hoort hier niet');
    // Ook kolomnamen niet: geen enkele prompt vraagt erom, en ze zien is precies
    // wat blinderen moet voorkomen.
    assert.ok(!tekst.includes('geheime_kolom'), 'een kolomnaam hoort hier niet');
    // De categorieboom hoort er wél in: fase 4 vraagt er expliciet om.
    assert.ok(tekst.includes('Meubelstoffen'));
  }
});

test('de site van de merchant is één panelsite, nooit de enige bron', () => {
  const tekst = renderBankRequest(request('https://degrootstoffen.example').request, 'nl');
  assert.match(tekst, /degrootstoffen\.example/);
  assert.match(tekst, /nooit als enige bron/);
  // En het panelrecept staat erbij, want vijf tot acht sites is de opdracht.
  assert.match(tekst, /category-leader/);
});

test('de aanvraag wijst de methode aan in plaats van hem te kopiëren', () => {
  const tekst = renderBankRequest(request().request, 'nl');
  assert.match(tekst, /kennis\/_methode\/methode-vragenbank-genereren\.md/);
  assert.match(tekst, /kennis\/_methode\/prompt-vragenbank-genereren\.md/);
});

test('de aanvraag is deterministisch: geen klok in de module', () => {
  const eerste = renderBankRequest(request().request, 'nl');
  const tweede = renderBankRequest(request().request, 'nl');
  assert.equal(eerste, tweede);
  assert.equal(request().request.id, 'bank-home-textiles-2026-09-04');
});

test('met een onderzochte bank is er niets meer aan te vragen', () => {
  const { state } = request();
  assert.equal(needsBank(state), true);

  const catalog = ingest('catalogus.csv', CATALOG);
  const { bank } = importBank([
    'meta:',
    '  vertical: stoffen',
    '  versie: "1.0.0"',
    '  status: bevroren',
    '  match: stof',
    '  sitepanel:',
    '    - {naam: A, url: "https://a.example", type: categorieleider, geraadpleegd: "2026-07-02"}',
    '  panelomvang: 1',
    'context_vertical:',
    '  onomkeerbare_fout: Op maat geknipt, dus geen herroepingsrecht.',
    'attributen:',
    '  baanbreedte: {type: getal, velden: ["attr:breedte"]}',
    'vragen:',
    '  - id: BAS-01',
    '    vraag: Hoe breed is de baan?',
    '    belang: kritiek',
    '    dekking: 1',
    '    bewijs: [baanbreedte]',
  ].join('\n'));
  assert.ok(bank);
  assert.equal(needsBank(generateQuestionSets(catalog, [bank])), false);
});
