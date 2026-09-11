// Waar een product hangt, en welke vragen het daarom krijgt.
//
// Alle vier de gevallen hieronder komen uit de catalogus van de testwinkel, en
// ze gingen allemaal stil mis: geen foutmelding, alleen een rapport dat er
// goed uitzag en het verkeerde mat.
//
// - Een product hangt op meer plekken, en de export zet ze op alfabet. De app
//   nam de eerste, en 1.371 stoffen werden decoratiestof omdat de D vóór de G
//   komt.
// - De lijst kent eigen vragen voor lampenkapstoffen, maar een lampenkapstof
//   kreeg de algemene decoratievragen: er werd alleen naar de hoofdcategorie
//   gekeken.
// - "Motieven > Lente" is een kenmerk, geen markt. Tien buitenkussens kregen
//   daardoor alleen de algemene vragen.
// - Een JSON-export bewaarde van een lijst categorieën alleen de eerste.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ingest } from '../src/intake/index';
import { flatten } from '../src/intake/parse';
import { importQuestionList } from '../src/questions/list';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { categoryMemberships, expandFacets } from '../src/engine/join';

const BANK = [
  'id,vraag,laag,categorie,belang,benodigde_attributen',
  'BAS-01,Hoe breed is de stof?,basis,,hoog,baanbreedte',
  'GOR-01,Hoeveel licht laat het door?,overlay,Gordijnstoffen,kritiek,lichtdoorlatendheid',
  'LAM-01,Mag deze stof dicht bij een lamp?,overlay,Lampenkapstoffen,kritiek,brandklasse',
  'BUI-01,Kan dit buiten blijven liggen?,overlay,Buitenkussens,kritiek,uv_bestendigheid',
].join('\n');

function bank() {
  const read = importQuestionList([{ name: 'woontextiel.csv', text: BANK }]);
  assert.ok(read.bank, read.errors.join('; '));
  return read.bank;
}

function catalogus(rows: string[]) {
  return ingest('catalogus.csv', ['sku;title;categories', ...rows].join('\n'));
}

const vast = { scannedAt: '2026-09-11T00:00:00Z' };

test('een product in drie takken wordt niet ingedeeld op alfabet', () => {
  const data = catalogus([
    '1;Stof A;Decoratiestoffen | Decoratiestoffen/Lampenkapstoffen | Gordijnstoffen | Gordijnstoffen/Gesloten',
    '2;Stof B;Gordijnstoffen | Gordijnstoffen/Gesloten',
    '3;Stof C;Decoratiestoffen | Decoratiestoffen/Sierkussenstoffen',
  ]);
  const state = generateQuestionSets(data, [bank()]);
  const report = runScan(data, state, vast);
  const a = report.products.find((product) => product.key === '1');

  // Lampenkapstoffen heeft een eigen set en is dieper dan Decoratiestoffen.
  const lamp = state.sets.find((set) => set.category === 'Lampenkapstoffen');
  assert.equal(lamp?.parent, 'Decoratiestoffen');
  assert.equal(a?.setId, lamp?.id);
  assert.equal(a?.subcategory, 'Lampenkapstoffen');

  // En hij hangt ook onder gordijnstoffen, dus die vragen gelden ook.
  const asked = new Set(a?.questions.map((question) => question.questionId));
  assert.ok(asked.has('LAM-01'), 'de lampenkapvraag');
  assert.ok(asked.has('GOR-01'), 'de gordijnvraag');
  assert.ok(asked.has('BAS-01'), 'de algemene vraag');
  // Eén keer, ook al staat hij in beide sets.
  assert.equal(a?.questions.filter((question) => question.questionId === 'BAS-01').length, 1);
});

test('een subcategorie zonder eigen vragen krijgt geen eigen set', () => {
  const data = catalogus([
    '1;Stof A;Decoratiestoffen | Decoratiestoffen/Sierkussenstoffen',
    '2;Stof B;Gordijnstoffen',
  ]);
  const state = generateQuestionSets(data, [bank()]);
  assert.equal(state.sets.some((set) => set.category === 'Sierkussenstoffen'), false);
});

test('een tak die alleen uit kenmerken bestaat verdwijnt, en het product valt onder zijn echte categorie', () => {
  const data = catalogus([
    '1;Kussen A;Motieven/Lente | Outdoorstoffen/Buitenkussens',
    '2;Kussen B;Outdoorstoffen/Buitenkussens',
  ]);
  const state = generateQuestionSets(data, [bank()], {}, {}, { facets: ['motieven > lente'] });

  // "Motieven" draagt niets meer, dus gaat er in zijn geheel af.
  assert.ok(state.facetPaths?.includes('motieven'));
  assert.equal(state.sets.some((set) => set.category === 'Motieven'), false);

  const report = runScan(data, state, vast);
  const a = report.products.find((product) => product.key === '1');
  assert.equal(a?.subcategory, 'Buitenkussens');
  assert.ok(a?.questions.some((question) => question.questionId === 'BUI-01'));
});

test('een product dat alleen onder kenmerken hangt, wordt geteld en niet gescoord', () => {
  const data = catalogus([
    '1;Stof A;Motieven/Lente',
    '2;Stof B;Gordijnstoffen',
  ]);
  const state = generateQuestionSets(data, [bank()], {}, {}, { facets: ['motieven > lente'] });
  const report = runScan(data, state, vast);
  const a = report.products.find((product) => product.key === '1');

  assert.equal(a?.unmatched, true);
  assert.equal(a?.facetOnly, true);
  assert.equal(report.unmatchedCount, 1);
});

test('een kenmerk onder een echte categorie knipt het kenmerk af en laat de categorie staan', () => {
  // "Outdoorstoffen > Gestreept": gestreept is een eigenschap, maar de stof is
  // wel een outdoorstof, en daar hangen andere producten ook onder.
  const facets = expandFacets(
    catalogus([
      '1;Stof A;Outdoorstoffen/Gestreept',
      '2;Stof B;Outdoorstoffen/Buitenkussens',
    ]).products,
    ['outdoorstoffen > gestreept'],
  );
  assert.deepEqual(facets, ['outdoorstoffen > gestreept']);
});

test('een JSON-export bewaart alle categorieën van een product, niet alleen de eerste', () => {
  const flat = flatten({
    sku: '1',
    categories: [
      { level: 2, path: 'Decoratiestoffen > Lampenkapstoffen' },
      { level: 2, path: 'Gordijnstoffen > Gesloten' },
    ],
  });
  assert.equal(flat['categories.paths'], 'Decoratiestoffen > Lampenkapstoffen | Gordijnstoffen > Gesloten');

  // En de motor leest ze allemaal.
  const memberships = categoryMemberships({ key: '1', values: {}, unmapped: flat });
  assert.deepEqual(memberships, [
    ['Decoratiestoffen', 'Lampenkapstoffen'],
    ['Gordijnstoffen', 'Gesloten'],
  ]);
});
