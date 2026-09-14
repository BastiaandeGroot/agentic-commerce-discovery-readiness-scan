// Het werk van de merchant op zijn vragensets overleeft een nieuwe samenstelling.
//
// De fout die hier bewaakt wordt: een merchant zet vragen uit, past er een aan,
// voegt er een toe en bevestigt — en één wijziging op het koppelscherm stelt de
// sets opnieuw samen en gooit dat allemaal weg. Tegelijk mag een bevestiging niet
// blijven staan als de bank de vragen onder hem veranderde.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { importQuestionList } from '../src/questions/list';
import { generateQuestionSets } from '../src/questions/generate';
import { addQuestion, editQuestion, toggleBaseValidated, toggleQuestion, toggleValidated } from '../src/questions/mutate';
import { applyWork, extractWork, setKey } from '../src/questions/work';
import type { QuestionSetState } from '../src/domain/types';

const AT = '2026-09-14T12:00:00.000Z';

const catalogus = () => ingest('c.csv', [
  'sku;categorie;kleur',
  '1;Meubelstoffen;Blauw',
  '2;Meubelstoffen;Rood',
  '3;Gordijnstoffen;Wit',
].join('\n'));

const lijst = (overlayVraag = 'Is deze stof sterk genoeg voor mijn bank?', basisVraag = 'Hoe breed is de rol?') => [
  'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen',
  `B1;${basisVraag};How wide is the roll?;base;;kritiek;rolbreedte_cm`,
  'B2;Is hij waterdicht?;Is it waterproof?;base;;hoog;waterdicht',
  `M1;${overlayVraag};Is it strong enough?;overlay;Meubelstoffen;kritiek;martindale_toeren`,
  'M2;Hoe reinig ik hem?;How do I clean it?;overlay;Meubelstoffen;middel;reinigingscode',
].join('\n');

function samenstellen(tekst = lijst()): QuestionSetState {
  const read = importQuestionList([{ name: 'woontextiel.csv', text: tekst }]);
  assert.ok(read.bank, 'de testlijst hoort in te lezen');
  return generateQuestionSets(catalogus(), [read.bank]);
}

const meubel = (state: QuestionSetState) => {
  const set = state.sets.find((candidate) => setKey(candidate) === 'Meubelstoffen');
  assert.ok(set, 'Meubelstoffen hoort een eigen set te hebben');
  return set;
};

/** Wat een merchant op het vragensetscherm zou doen. */
function werk(pristine: QuestionSetState): QuestionSetState {
  const id = meubel(pristine).id;
  let state = toggleQuestion(pristine, AT, id, 'M2');
  state = editQuestion(state, AT, id, 'M1', { nl: 'Kan mijn kat eraan krabben?', en: 'Can my cat scratch it?' });
  state = addQuestion(state, AT, id, { nl: 'Welke kleur is het?', en: 'What colour is it?' }, ['attr:^kleur$']);
  state = toggleValidated(state, id);
  return toggleBaseValidated(state);
}

test('uitgezet, aangepast, toegevoegd en bevestigd blijft staan na een nieuwe samenstelling', () => {
  const pristine = samenstellen();
  const gedaan = extractWork(werk(pristine), pristine);

  const opnieuw = applyWork(samenstellen(), gedaan);
  const set = meubel(opnieuw.state);

  assert.equal(set.questions.find((q) => q.id === 'M2')?.disabled, true);
  assert.equal(set.questions.find((q) => q.id === 'M1')?.label.nl, 'Kan mijn kat eraan krabben?');
  assert.ok(set.questions.some((q) => q.custom && q.label.nl === 'Welke kleur is het?'));
  assert.equal(set.validated, true);
  assert.equal(opnieuw.state.baseValidated, true);
  assert.deepEqual(opnieuw.reconfirm, []);
  assert.equal(opnieuw.baseChanged, false);
  // De versie gaat niet terug: die staat op elk rapport.
  assert.ok(opnieuw.state.version >= werk(samenstellen()).version);
});

test('zonder werk verandert er niets', () => {
  const pristine = samenstellen();
  assert.equal(applyWork(pristine, undefined).state, pristine);
});

test('herschrijft de bank een categorievraag, dan vervalt de aanpassing en moet de categorie opnieuw bevestigd worden', () => {
  const pristine = samenstellen();
  const gedaan = extractWork(werk(pristine), pristine);

  const nieuweVersie = applyWork(samenstellen(lijst('Hoeveel Martindale-toeren heeft deze stof?')), gedaan);
  const set = meubel(nieuweVersie.state);

  assert.equal(set.questions.find((q) => q.id === 'M1')?.label.nl, 'Hoeveel Martindale-toeren heeft deze stof?');
  assert.equal(nieuweVersie.droppedEdits, 1);
  assert.equal(set.validated, false);
  assert.deepEqual(nieuweVersie.reconfirm, ['Meubelstoffen']);
  // Wat niet veranderde, blijft: de uitgezette vraag en de eigen vraag.
  assert.equal(set.questions.find((q) => q.id === 'M2')?.disabled, true);
  assert.ok(set.questions.some((q) => q.custom));
  // De algemene vragen zijn niet veranderd, dus die bevestiging staat nog.
  assert.equal(nieuweVersie.state.baseValidated, true);
});

test('verandert een algemene vraag, dan moeten de algemene vragen opnieuw bevestigd worden', () => {
  const pristine = samenstellen();
  const gedaan = extractWork(werk(pristine), pristine);

  const nieuweVersie = applyWork(samenstellen(lijst(undefined, 'Hoe breed is de stof op de rol?')), gedaan);
  assert.equal(nieuweVersie.baseChanged, true);
  assert.equal(nieuweVersie.state.baseValidated, false);
});

test('het werk draagt geen productdata', () => {
  const pristine = samenstellen();
  const tekst = JSON.stringify(extractWork(werk(pristine), pristine));
  for (const waarde of ['Blauw', 'Rood', 'Wit']) assert.doesNotMatch(tekst, new RegExp(waarde));
});
