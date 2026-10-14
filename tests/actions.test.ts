// Wat de pdf als actie toont: uitgerekend uit de scan, nooit geschat.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ScanReport } from '../src/domain/types';
import { readinessPlan, topActions } from '../src/report/actions';

const hint = (key: string, field: string) => ({ attributeKey: key, label: { nl: key, en: key }, fields: [field] });
const outcome = (questionId: string, answered: boolean, missing: string[], importance = 'critical') => ({
  questionId, label: { nl: `Vraag ${questionId}`, en: `Question ${questionId}` }, state: answered ? 'answered' : 'empty',
  answered, missing, found: [], scored: true, importance,
  // Zoals een echte scan: per kenmerk de velden die het kunnen dragen.
  evidence: [hint(questionId === 'LICHT' ? 'lichtdoorlatendheid' : questionId.toLowerCase(), questionId === 'LICHT' ? 'attr:licht' : `attr:${questionId.toLowerCase()}`)],
});
const product = (key: string, qualified: boolean, questions: ReturnType<typeof outcome>[]) => ({
  key, unmatched: false, findable: false, qualified, weight: 0, earned: 0, questions, gaps: [], setId: 'gordijn',
});

function rapport(): ScanReport {
  return {
    stamp: { scanVersion: '6.1.0', fieldRegister: 'x', questionSetVersion: 1, banks: [], scannedAt: '2026-10-15T10:00:00.000Z',
      blindAttributes: [{ key: 'lichtdoorlatendheid', label: { nl: 'Lichtdoorlatendheid', en: 'Light' } }] },
    sources: { catalog: { filename: 'catalogus.csv' } },
    productCount: 4, unmatchedCount: 0,
    funnel: { total: 4, qualified: 1, findable: 0, avgAnswered: 1, avgApplicable: 3, avgEarned: 0, avgWeight: 0 },
    distance: [],
    questionCoverage: [
      { setId: 'gordijn', questionId: 'LICHT', label: { nl: 'Hoeveel licht?', en: 'Light?' }, answered: 1, empty: 0, unusable: 0, incomplete: 0, absent: 3, applicable: 4,
        importance: 'critical', scored: true, evidence: [hint('lichtdoorlatendheid', 'attr:licht')] },
      { setId: 'gordijn', questionId: 'RAPPORT', label: { nl: 'Hoe groot is het patroon?', en: 'Pattern?' }, answered: 0, empty: 4, unusable: 0, incomplete: 0, absent: 0, applicable: 4,
        importance: 'high', scored: true, evidence: [hint('rapport_hoogte_cm', 'attr:^pattern_height$'), hint('rapport_breedte_cm', 'attr:^pattern_width$')] },
    ],
    advisory: [],
    gaps: [
      { field: 'attr:^pattern_height$', label: { nl: 'pattern_height', en: 'pattern_height' }, cause: 'unfilled', owner: 'pim', affected: 4, questions: ['RAPPORT'] },
      { field: 'attr:^pattern_width$', label: { nl: 'pattern_width', en: 'pattern_width' }, cause: 'unfilled', owner: 'pim', affected: 3, questions: ['RAPPORT'] },
    ],
    categories: [],
    products: [
      product('a', true, [outcome('LICHT', true, [])]),
      product('b', false, [outcome('LICHT', false, ['attr:licht'])]),
      product('c', false, [outcome('LICHT', false, ['attr:licht'])]),
      // Hier staat nog een tweede kritieke vraag open: alleen licht toevoegen maakt hem niet basisgeschikt.
      product('d', false, [outcome('LICHT', false, ['attr:licht']), outcome('ANDERS', false, ['attr:anders'])]),
    ],
  } as unknown as ScanReport;
}

test('de winst van een actie is uitgerekend per product', () => {
  const plan = readinessPlan(rapport(), 'nl');
  const licht = plan.add.find((row) => row.key === 'lichtdoorlatendheid');
  assert.equal(licht?.gain, 2, 'd heeft nog een andere kritieke vraag open');
  assert.equal(licht?.critical, true);
});

test('twee lege kolommen voor dezelfde vraag zijn één actie', () => {
  const plan = readinessPlan(rapport(), 'nl');
  assert.equal(plan.fill.length, 1);
  assert.deepEqual(plan.fill[0].columns, ['pattern_height', 'pattern_width']);
  assert.equal(plan.fill[0].empty, 4);
});

test('eerst wat basisgeschikt oplevert, dan wat de meeste producten raakt', () => {
  const actions = topActions(readinessPlan(rapport(), 'nl'));
  assert.deepEqual(actions.map((action) => action.kind), ['add', 'fill']);
});

test('een kenmerk zonder kolom is werk: toevoegen, ook in de export', async () => {
  const { openGroups } = await import('../src/report/actions');
  const base = { questionId: 'Q', label: { nl: 'Q', en: 'Q' }, state: 'absent', answered: false, found: [], scored: true, importance: 'high' };
  // De merchant koos "geen kolom": het kenmerk heeft geen velden, en dus ook niets in `missing`.
  const zonderKolom = { ...base, missing: [], evidence: [{ attributeKey: 'vleug', label: { nl: 'Vleug', en: 'Nap' }, fields: [] }] };
  assert.deepEqual(openGroups(zonderKolom as never).map((hint) => hint.attributeKey), ['vleug']);
  // Twee kolommen voor één kenmerk, één gevuld: dan is dit kenmerk niet open.
  const eenGevuld = { ...base, missing: ['attr:b', 'attr:c'], evidence: [
    { attributeKey: 'gewicht', label: { nl: 'Gewicht', en: 'Weight' }, fields: ['attr:a', 'attr:b'] },
    { attributeKey: 'dikte', label: { nl: 'Dikte', en: 'Thickness' }, fields: ['attr:c'] },
  ] };
  assert.deepEqual(openGroups(eenGevuld as never).map((hint) => hint.attributeKey), ['dikte']);
  // Toepassing zonder kolom naast een ander open kenmerk: of de boom hem droeg is niet te zien, dus geen werk verzinnen.
  const metBoom = { ...base, missing: ['attr:c'], evidence: [
    { attributeKey: 'toepassing', label: { nl: 'Toepassing', en: 'Use' }, fields: [] },
    { attributeKey: 'dikte', label: { nl: 'Dikte', en: 'Thickness' }, fields: ['attr:c'] },
  ] };
  assert.deepEqual(openGroups(metBoom as never).map((hint) => hint.attributeKey), ['dikte']);
});
