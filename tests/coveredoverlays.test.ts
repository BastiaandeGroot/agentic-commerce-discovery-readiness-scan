// Een categorie krijgt alleen een eigen vragenset als een eigen vraag dekking > 0 heeft.
//
// De fout die hier bewaakt wordt: een subcategorie krijgt een eigen regel en een
// eigen rij in het rapport voor vragen die geen enkele webshop in de markt
// behandelt. En andersom: een lijst zonder sitepanel — dekking overal `null`,
// niet onderzocht — verliest al zijn categorieën omdat er niet gekeken is.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { importQuestionList } from '../src/questions/list';
import { withCoveredOverlays, type QuestionBank } from '../src/questions/bank';
import { generateQuestionSets } from '../src/questions/generate';

const lijst = [
  'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen',
  'B1;Hoe breed is de stof?;How wide is the fabric?;base;;kritiek;rolbreedte_cm',
  'M1;Is hij sterk genoeg voor mijn bank?;Is it strong enough?;overlay;Meubelstoffen;kritiek;martindale_toeren',
  'G1;Hoeveel licht laat hij door?;How much light?;overlay;Gordijnstoffen;kritiek;lichtdoorlatendheid_pct',
  'P1;Past het paneel op mijn kussen?;Does the panel fit?;overlay;Paneel;hoog;paneel_maat_cm',
].join('\n');

/** De bank uit de lijst, met dekking per vraag-id erop gelegd. */
function bankMet(dekking: Record<string, number | null>): QuestionBank {
  const read = importQuestionList([{ name: 'woontextiel.csv', text: lijst }]);
  assert.ok(read.bank, 'de testlijst hoort in te lezen');
  const zet = <T extends { id: string }>(question: T) => ({ ...question, coverage: dekking[question.id] ?? null });
  return {
    ...read.bank,
    questions: read.bank.questions.map(zet),
    overlays: read.bank.overlays.map((overlay) => ({ ...overlay, questions: overlay.questions?.map(zet) })),
  };
}

const catalogus = () => ingest('c.csv', [
  'sku;categorie',
  '1;Meubelstoffen',
  '2;Gordijnstoffen',
  '3;Gordijnstoffen/Paneel',
].join('\n'));

test('alleen overlays met een eigen vraag met dekking > 0 blijven', () => {
  const bank = withCoveredOverlays(bankMet({ B1: 4, M1: 3, G1: 0, P1: null }));
  assert.deepEqual(bank.overlays.map((overlay) => overlay.label.nl).sort(), ['Meubelstoffen']);
});

test('een bank zonder onderzochte dekking houdt al zijn categorieën', () => {
  const origineel = bankMet({});
  assert.equal(withCoveredOverlays(origineel), origineel);
});

test('een subcategorie zonder gedekte vraag krijgt geen eigen regel, een hoofdcategorie alleen de algemene vragen', () => {
  const state = generateQuestionSets(catalogus(), [bankMet({ B1: 4, M1: 3, G1: 0, P1: 0 })]);

  // Paneel: geen eigen regel, gemeten onder Gordijnstoffen.
  assert.equal(state.sets.some((set) => set.category === 'Paneel'), false);

  // Gordijnstoffen: wel een regel, maar zonder eigen vragen.
  const gordijn = state.sets.find((set) => set.category === 'Gordijnstoffen');
  assert.ok(gordijn, 'de hoofdcategorie blijft staan');
  assert.deepEqual(gordijn.questions.map((question) => question.id), ['B1']);

  // Meubelstoffen houdt zijn eigen vraag.
  const meubel = state.sets.find((set) => set.category === 'Meubelstoffen');
  assert.deepEqual(meubel?.questions.map((question) => question.id), ['B1', 'M1']);
});

test('met dekking op de subcategorie krijgt die wel een eigen regel', () => {
  const state = generateQuestionSets(catalogus(), [bankMet({ B1: 4, M1: 3, G1: 2, P1: 1 })]);
  const paneel = state.sets.find((set) => set.category === 'Paneel');
  assert.equal(paneel?.parent, 'Gordijnstoffen');
});
