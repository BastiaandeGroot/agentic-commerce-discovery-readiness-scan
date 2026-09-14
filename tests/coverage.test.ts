// Vragen zonder dekking uitzetten, en sorteren op dekking.
//
// De fout die hier bewaakt wordt: een vraag die niet onderzocht is (dekking
// `null`) valt mee onder "niemand behandelt dit" (dekking 0) en wordt uitgezet
// omdat wíj niet keken. En een algemene vraag die in één categorie uitgaat,
// meet daarna in twee categorieën iets anders onder hetzelfde id.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byCoverage, disableUncovered, disableUncoveredBase, stillToConfirm, toggleBaseValidated, toggleValidated } from '../src/questions/mutate';
import type { Question, QuestionSetState } from '../src/domain/types';

const AT = '2026-09-14T12:00:00.000Z';

const vraag = (id: string, layer: 'base' | 'category', coverage: number | null): Question => ({
  id, label: { nl: id, en: id }, requires: ['x'], mode: 'any', layer, coverage, origin: 'bank',
});

function stand(): QuestionSetState {
  const basis = [vraag('B-niemand', 'base', 0), vraag('B-veel', 'base', 4)];
  return {
    version: 1,
    changeLog: [],
    sets: [
      { id: 'meubel', label: { nl: 'Meubel', en: 'Meubel' }, category: 'Meubelstoffen',
        questions: [...basis, vraag('M-niemand', 'category', 0), vraag('M-onbekend', 'category', null), vraag('M-twee', 'category', 2)] },
      { id: 'gordijn', label: { nl: 'Gordijn', en: 'Gordijn' }, category: 'Gordijnstoffen',
        questions: [...basis, vraag('G-niemand', 'category', 0)] },
    ],
  } as unknown as QuestionSetState;
}

const uit = (state: QuestionSetState, setId: string) =>
  state.sets.find((set) => set.id === setId)?.questions.filter((q) => q.disabled).map((q) => q.id);

test('per categorie gaan alleen de eigen vragen met dekking 0 uit', () => {
  const na = disableUncovered(stand(), AT, 'meubel');
  assert.deepEqual(uit(na, 'meubel'), ['M-niemand']);
  // Niet onderzocht is geen nul, en een andere categorie blijft zoals hij was.
  assert.deepEqual(uit(na, 'gordijn'), []);
  assert.equal(na.changeLog.length, 1);
});

test('de algemene vragen zonder dekking gaan in elke categorie tegelijk uit', () => {
  const na = disableUncoveredBase(stand(), AT);
  assert.deepEqual(uit(na, 'meubel'), ['B-niemand']);
  assert.deepEqual(uit(na, 'gordijn'), ['B-niemand']);
});

test('twee keer drukken zet niets weer aan', () => {
  const eenmaal = disableUncovered(stand(), AT, 'meubel');
  assert.deepEqual(uit(disableUncovered(eenmaal, AT, 'meubel'), 'meubel'), ['M-niemand']);
});

test('sorteren: hoog naar laag, niet onderzocht onderaan, gelijke dekking in bankvolgorde', () => {
  const vragen = [vraag('a', 'category', 2), vraag('b', 'category', null), vraag('c', 'category', 4), vraag('d', 'category', 0), vraag('e', 'category', 2)];
  assert.deepEqual(byCoverage(vragen, (q) => q.coverage).map((q) => q.id), ['c', 'a', 'e', 'd', 'b']);
});

test('wat nog bevestigd moet worden, wordt bij naam genoemd', () => {
  const open = stand();
  assert.deepEqual(stillToConfirm(open), { base: true, categories: ['Meubel', 'Gordijn'] });

  const deels = toggleBaseValidated(toggleValidated(open, 'meubel'));
  assert.deepEqual(stillToConfirm(deels), { base: false, categories: ['Gordijn'] });
});
