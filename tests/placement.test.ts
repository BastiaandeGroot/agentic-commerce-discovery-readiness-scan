// Waar een product voor bedoeld is, mag uit de categorieboom komen.
//
// De fout die hier bewaakt wordt, aan twee kanten. Te streng: een winkel die zijn
// stoffen onder Meubelstoffen hangt krijgt te horen dat nergens staat waar ze voor
// bedoeld zijn, en zakt daarmee op een kritieke vraag. Te soepel: de boom
// beantwoordt ook andere kenmerken, of een plek die de vragenbank niet kent telt
// als toepassing — en dan verdwijnt een gat dat er wél is.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { importQuestionList } from '../src/questions/list';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { captureOutcomes, rescoreOutcomes } from '../src/engine/rescore';
import { PLACEMENT_FIELD, isPlacementAttribute } from '../src/spec/placement';
import { adviceKey, unansweredQuestions } from '../src/report/derive';

const bank = () => {
  const read = importQuestionList([{
    name: 'woontextiel.csv',
    text: [
      'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen',
      'B1;Waar is deze stof voor bedoeld?;What is this fabric for?;base;;kritiek;toepassing',
      'B2;Hoe breed is de rol?;How wide is the roll?;base;;hoog;rolbreedte_cm',
      'M1;Is hij sterk genoeg?;Is it strong enough?;overlay;Meubelstoffen;hoog;martindale_toeren',
    ].join('\n'),
  }]);
  assert.ok(read.bank, 'de testlijst hoort in te lezen');
  return read.bank;
};

const scan = (rows: string[]) => {
  const catalog = ingest('c.csv', rows.join('\n'));
  const state = generateQuestionSets(catalog, [bank()]);
  return { state, report: runScan(catalog, state, { scannedAt: '2026-10-06T00:00:00Z' }) };
};

const vraag = (report: ReturnType<typeof scan>['report'], sku: string, id: string) => {
  const found = report.products.find((product) => product.key === sku)?.questions.find((q) => q.questionId === id);
  assert.ok(found, `product ${sku} hoort vraag ${id} te krijgen`);
  return found;
};

test('alleen de hele naam is het toepassingskenmerk', () => {
  for (const key of ['toepassing', 'Geschikt_voor', 'intended_use', 'application']) assert.equal(isPlacementAttribute(key), true, key);
  for (const key of ['toepassing_garen', 'geschikt_voor_stofsoort', 'rolbreedte_cm', 'staal_beschikbaar']) assert.equal(isPlacementAttribute(key), false, key);
});

test('zonder kolom beantwoordt een plek die de bank kent de toepassingsvraag, en geen andere', () => {
  const { report } = scan([
    'sku;categorie;martindale_toeren',
    '1;Meubelstoffen;30000',
    '2;Restpartijen;',
  ]);
  const kent = vraag(report, '1', 'B1');
  assert.equal(kent.answered, true);
  assert.deepEqual(kent.found, [PLACEMENT_FIELD]);
  // De boom zegt niets over de breedte: dat blijft een gat.
  assert.equal(vraag(report, '1', 'B2').answered, false);
  // Restpartijen kent de bank niet als segment: daar staat het dus nergens.
  assert.equal(vraag(report, '2', 'B1').answered, false);
  assert.equal(report.products.find((product) => product.key === '1')?.qualified, true);
  assert.equal(report.products.find((product) => product.key === '2')?.qualified, false);
});

test('een gevulde kolom gaat voor de boom', () => {
  const { report } = scan([
    'sku;categorie;toepassing',
    '1;Meubelstoffen;bank, stoel',
    '2;Meubelstoffen;',
  ]);
  assert.equal(vraag(report, '1', 'B1').found.includes(PLACEMENT_FIELD), false);
  assert.equal(vraag(report, '1', 'B1').answered, true);
  // Leeg in de kolom, maar de plek is bekend: beantwoord uit de boom.
  assert.deepEqual(vraag(report, '2', 'B1').found, [PLACEMENT_FIELD]);
});

test('het rapport telt apart wat alleen uit de boom komt, en houdt de vraag in beeld', () => {
  const { report, state } = scan([
    'sku;categorie',
    '1;Meubelstoffen',
    '2;Meubelstoffen',
  ]);
  const rij = report.questionCoverage.find((row) => row.questionId === 'B1');
  assert.equal(rij?.answered, 2);
  assert.equal(rij?.fromTree, 2);
  const open = unansweredQuestions(report).find((row) => row.questionId === 'B1');
  assert.ok(open, 'volledig beantwoord uit de boom hoort in de lijst te blijven: het is werk');
  assert.equal(adviceKey(open), 'qNextTree');

  // En na herberekenen zonder catalogus staat het er nog.
  const opnieuw = rescoreOutcomes(captureOutcomes(report), state, { filename: 'c.csv', scannedAt: '2026-10-06T00:00:00Z' });
  assert.equal(opnieuw.report.questionCoverage.find((row) => row.questionId === 'B1')?.fromTree, 2);
});
