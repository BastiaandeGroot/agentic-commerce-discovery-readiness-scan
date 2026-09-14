// Wat het rapport laat zien, en de pdf die daaruit wordt opgebouwd.
//
// De fout die hier bewaakt wordt: het scherm en de pdf rekenen elk hun eigen
// versie uit, en het bestand dat de merchant bewaart zegt iets anders dan wat hij
// zag. Beide gebruiken daarom `src/report/derive.ts`; dit legt vast wat die
// functies doen, en dat er van hetzelfde rapport een leesbare pdf komt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ScanReport } from '../src/domain/types';
import { STRINGS } from '../src/i18n/strings';
import { adviceKey, advisoryItems, mergedGaps, scoreRows, topBlockers, unansweredQuestions } from '../src/report/derive';
import { buildReportPdf, pdfFilename, pdfText } from '../components/reportPdf';

const vraag = (questionId: string, setId: string, answered: number, applicable: number, extra: Record<string, unknown> = {}) => ({
  setId, questionId, label: { nl: `Vraag ${questionId}`, en: `Question ${questionId}` },
  answered, empty: 0, unusable: 0, incomplete: 0, absent: applicable - answered, applicable,
  importance: 'high', weight: 3, scored: true, evidence: [{ attributeKey: 'x', label: { nl: 'x', en: 'x' }, fields: ['attr:^x$'] }],
  ...extra,
});

function rapport(): ScanReport {
  return {
    stamp: {
      scanVersion: '5.0.0', fieldRegister: '2026-09', questionSetVersion: 3,
      banks: [{ id: 'woontextiel', label: { nl: 'Woontextiel', en: 'Home textiles' }, version: '4', status: 'review' }],
      blindAttributes: [], scannedAt: '2026-09-14T12:00:00.000Z',
    },
    sources: { catalog: { filename: 'Product Catalog – De Groot.csv' } },
    productCount: 3,
    unmatchedCount: 0,
    funnel: { total: 3, qualified: 1, findable: 0, avgAnswered: 4, avgApplicable: 6, avgEarned: 10, avgWeight: 18 },
    distance: [{ open: 1, products: 2 }],
    questionCoverage: [
      vraag('A', 'meubel', 1, 3, { empty: 2, absent: 0 }),
      vraag('B', 'meubel', 2, 3),
      vraag('C', 'gordijn', 3, 3),
      vraag('D', 'gordijn', 0, 2, { scored: false }),
    ],
    advisory: [
      { setId: 'meubel', questionId: 'S1', label: { nl: 'Kan ik een staal krijgen?', en: 'Can I get a sample?' }, importance: 'medium' },
      { setId: 'gordijn', questionId: 'S1', label: { nl: 'Kan ik een staal krijgen?', en: 'Can I get a sample?' }, importance: 'medium' },
    ],
    gaps: [
      { field: 'attr:^x$', label: { nl: 'rolbreedte', en: 'roll width' }, cause: 'unfilled', owner: 'pim', affected: 2, questions: ['A'] },
      { field: 'attr:^x$', label: { nl: 'rolbreedte', en: 'roll width' }, cause: 'unfilled', owner: 'pim', affected: 5, questions: ['A', 'B'] },
      { field: 'attr:^y$', label: { nl: 'martindale → toeren', en: 'rubs' }, cause: 'unmodelled', owner: 'pim', affected: 1, questions: ['B'] },
    ],
    categories: [
      { setId: 'meubel', category: 'Meubelstoffen', total: 2, qualified: 1, findable: 0, avgAnswered: 3, avgApplicable: 6, avgEarned: 0, avgWeight: 0,
        critical: { answered: 1, total: 2 }, general: { answered: 2, total: 3 }, all: { answered: 3, total: 6 }, topGaps: [] },
      { setId: 'gordijn', category: 'Gordijnstoffen', total: 1, qualified: 0, findable: 0, avgAnswered: 6, avgApplicable: 6, avgEarned: 0, avgWeight: 0,
        critical: { answered: 2, total: 2 }, general: { answered: 3, total: 3 }, all: { answered: 6, total: 6 }, topGaps: [] },
    ],
    products: [],
  } as unknown as ScanReport;
}

test('de gemiddelden over alle categorieën wegen naar producten', () => {
  const [alle, meubel] = scoreRows(rapport(), 'Alle');
  assert.equal(alle.key, 'all');
  assert.equal(alle.total, 3);
  // (1*2 + 2*1) / 3
  assert.ok(Math.abs(alle.critical.answered - 4 / 3) < 1e-9);
  assert.equal(meubel.key, 'meubel|');
});

test('onbeantwoorde vragen: alleen gescoord en open, beste eerst', () => {
  assert.deepEqual(unansweredQuestions(rapport()).map((row) => row.questionId), ['B', 'A']);
  assert.deepEqual(unansweredQuestions(rapport(), 'gordijn'), []);
});

test('de goedkoopste handeling komt eerst in het advies', () => {
  const [a] = rapport().questionCoverage;
  assert.equal(adviceKey(a), 'qNextEmpty');
  assert.equal(adviceKey({ ...a, evidence: [{ attributeKey: 'x', label: { nl: 'x', en: 'x' }, fields: [] }] }), 'qNextUnlinked');
});

test('gaten één keer per veld en oorzaak, de meeste producten eerst', () => {
  const gaps = mergedGaps(rapport());
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0].affected, 5);
});

test('een adviesvraag staat één keer, met al zijn categorieën', () => {
  assert.deepEqual(advisoryItems(rapport(), 'nl'), [
    { id: 'S1', label: 'Kan ik een staal krijgen?', importance: 'medium', categories: ['Meubelstoffen', 'Gordijnstoffen'] },
  ]);
});

test('de grootste blokkade telt over categorieën heen', () => {
  const { top, nearest } = topBlockers(rapport(), 'nl');
  assert.equal(top[0].label, 'Vraag A');
  assert.equal(nearest?.open, 1);
});

test('tekens die een pdf-letter niet kent worden omgezet of weggelaten', () => {
  assert.equal(pdfText('✓ compleet'), 'compleet');
  assert.equal(pdfText('a → b'), 'a -> b');
  assert.equal(pdfText('Gordijnstoffen › Paneel — €12'), 'Gordijnstoffen › Paneel — €12');
});

test('van een rapport komt een pdf, in beide talen', () => {
  const palette = {
    text: '#221f1a', muted: '#6a6156', line: '#ddd2bd', surface2: '#ebe3d4',
    ok: '#3a7637', warn: '#87610f', danger: '#a11f2a', warnSoft: '#faefd8',
  };
  for (const locale of ['nl', 'en'] as const) {
    const doc = buildReportPdf(rapport(), STRINGS[locale], locale, palette);
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
    assert.ok(doc.getNumberOfPages() >= 1);
  }
});

test('de bestandsnaam draagt de catalogus en de datum', () => {
  assert.equal(pdfFilename(rapport()), 'rapport-product-catalog-de-groot-2026-09-14.pdf');
});
