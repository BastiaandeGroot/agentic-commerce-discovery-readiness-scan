// Een bewaarde analyse is terug te lezen, zonder productdata.
//
// De fout die hier bewaakt wordt: een merchant die zijn eerdere analyse opent,
// ziet alleen een paar totalen, omdat de snapshot de werklijst niet meenam. Of
// andersom: om de werklijst te bewaren gaat er productdata mee de opslag in,
// en dan verlaat de catalogus alsnog het apparaat.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ScanReport } from '../src/domain/types';
import { toSnapshot } from '../src/engine/snapshot';
import { modelFromReport, modelFromSnapshot } from '../src/report/model';

function rapport(): ScanReport {
  const vraag = (questionId: string, answered: number, applicable: number, scored = true) => ({
    setId: 'meubel', questionId, label: { nl: `Vraag ${questionId}`, en: `Question ${questionId}` },
    answered, empty: 1, unusable: 1, incomplete: 0, absent: applicable - answered - 2, applicable,
    importance: 'critical', layer: 'category', weight: 5, scored,
  });
  return {
    stamp: {
      scanVersion: '5.0.0', fieldRegister: '2026-09', questionSetVersion: 2,
      banks: [{ id: 'woontextiel', label: { nl: 'Woontextiel', en: 'Home textiles' }, version: '4', status: 'ready' }],
      blindAttributes: [], scannedAt: '2026-09-15T09:00:00.000Z',
    },
    sources: { catalog: { filename: 'catalogus.csv', products: [{ key: 'SKU-1', values: { title: 'Geheime velours Bordeaux' }, unmapped: {} }] } },
    productCount: 10, unmatchedCount: 1,
    funnel: { total: 10, qualified: 4, findable: 2, avgAnswered: 5, avgApplicable: 8, avgEarned: 20, avgWeight: 30 },
    distance: [{ open: 1, products: 3 }],
    questionCoverage: [vraag('A', 3, 9), vraag('B', 9, 9), vraag('C', 1, 9, false)],
    advisory: [
      { setId: 'meubel', questionId: 'S1', label: { nl: 'Staal?', en: 'Sample?' }, importance: 'medium' },
      { setId: 'gordijn', questionId: 'S1', label: { nl: 'Staal?', en: 'Sample?' }, importance: 'medium' },
    ],
    gaps: [{ field: 'attr:^x$', label: { nl: 'rolbreedte', en: 'roll width' }, cause: 'unfilled', owner: 'pim', affected: 6, questions: ['A'] }],
    categories: [{
      setId: 'meubel', category: 'Meubelstoffen', total: 9, qualified: 4, findable: 2,
      avgAnswered: 5, avgApplicable: 8, avgEarned: 20, avgWeight: 30,
      critical: { answered: 1, total: 2 }, general: { answered: 3, total: 4 }, all: { answered: 5, total: 8 }, topGaps: [],
    }],
    products: [{ key: 'SKU-1', title: 'Geheime velours Bordeaux', questions: [] }],
  } as unknown as ScanReport;
}

const bewaar = () => toSnapshot(rapport(), { id: 'scan-1', accountId: 'acc', savedAt: '2026-09-15T09:01:00.000Z', label: 'catalogus.csv' });

test('de werklijst gaat mee: alleen gescoorde vragen die open staan', () => {
  const snapshot = bewaar();
  assert.deepEqual(snapshot.questions?.map((row) => row.questionId), ['A']);
  assert.deepEqual(snapshot.questions?.[0], {
    setId: 'meubel', questionId: 'A', label: { nl: 'Vraag A', en: 'Question A' }, importance: 'critical',
    layer: 'category', answered: 3, applicable: 9, empty: 1, weak: 1, unusable: 1, incomplete: 0, absent: 4,
    evidence: undefined,
  });
});

test('een bewaarde analyse geeft hetzelfde rapportmodel als de scan waar hij uit kwam', () => {
  const vers = modelFromReport(rapport(), 'nl', 'Alle');
  const bewaard = modelFromSnapshot(bewaar(), 'nl', 'Alle');
  assert.deepEqual(bewaard.funnel, vers.funnel);
  assert.deepEqual(bewaard.scoreRows, vers.scoreRows);
  assert.deepEqual(bewaard.blockers.top, vers.blockers.top);
  assert.equal(bewaard.blockers.wouldBecome, vers.blockers.wouldBecome);
  assert.deepEqual(bewaard.gaps, vers.gaps.map(({ field, label, cause, affected, questions }) => ({ field, label, cause, affected, questions })));
  assert.deepEqual(bewaard.advisory, vers.advisory);
  assert.equal(bewaard.hasCritical, vers.hasCritical);
  assert.equal(bewaard.stamp.banks[0].label?.nl, 'Woontextiel');
});

test('een oudere bewaarde analyse laat weg wat hij niet weet, in plaats van het te raden', () => {
  const oud = { ...bewaar(), questions: undefined, wouldBecome: undefined, hasSubcategories: undefined };
  oud.categories = oud.categories.map(({ critical: _c, general: _g, all: _a, ...row }) => row);
  const model = modelFromSnapshot(oud, 'nl', 'Alle');
  assert.equal(model.questions, undefined);
  assert.equal(model.blockers.wouldBecome, undefined);
  assert.equal(model.scoreRows[0].critical, undefined);
  assert.deepEqual(model.scoreRows[1].all, { answered: 5, total: 8 });
});

test('de gemiddelden per categorie en het advies gaan mee', () => {
  const snapshot = bewaar();
  assert.deepEqual(snapshot.categories[0].critical, { answered: 1, total: 2 });
  assert.deepEqual(snapshot.advisory, [
    { questionId: 'S1', label: { nl: 'Staal?', en: 'Sample?' }, importance: 'medium', setIds: ['meubel', 'gordijn'] },
  ]);
});

test('er gaat geen product mee de opslag in', () => {
  const tekst = JSON.stringify(bewaar());
  assert.doesNotMatch(tekst, /Geheime velours/);
  assert.doesNotMatch(tekst, /SKU-1/);
});
