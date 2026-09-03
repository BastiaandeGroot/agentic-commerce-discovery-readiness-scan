// Dezelfde invoer moet exact dezelfde uitvoer geven. Dat is geen wens maar de
// belofte waarop het vergelijken over tijd rust: beweegt een rapport, dan komt
// dat door de data of door een opgehoogde versie, nooit door de scan zelf.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { SCAN_VERSION } from '../src/engine/version';

const FEED = [
  'g:id,title,g:brand,g:product_type,description,g:image_link,g:price,g:availability,g:gtin,g:color',
  '1,Meubelstof Anker,DeGroot,Meubelstoffen,Een stevige meubelstof met een gestreept dessin in blauw,https://x/1.jpg,10 EUR,in stock,0614141000012,blauw',
  '2,Gordijnstof Effen,DeGroot,Gordijnstoffen,Een lichte gordijnstof die veel daglicht doorlaat overdag,https://x/2.jpg,12 EUR,in stock,0614141000029,groen',
].join('\n');

function scan(scannedAt: string) {
  const feed = ingest('feed.csv', FEED, 'feed');
  return runScan(feed, undefined, generateQuestionSets(feed, undefined), { scannedAt });
}

test('twee scans op dezelfde invoer zijn tot op het laatste veld gelijk', () => {
  const a = scan('2026-01-01T00:00:00.000Z');
  const b = scan('2026-01-01T00:00:00.000Z');
  assert.deepEqual(a, b);
});

test('de scanversie staat op elk rapport', () => {
  const report = scan('2026-01-01T00:00:00.000Z');
  assert.equal(report.stamp.scanVersion, SCAN_VERSION);
  assert.match(SCAN_VERSION, /^\d+\.\d+\.\d+$/);
});

test('het tijdstip komt van buiten, zodat de motor geen klok heeft', () => {
  const report = scan('2020-05-04T12:00:00.000Z');
  assert.equal(report.stamp.scannedAt, '2020-05-04T12:00:00.000Z');
});

test('de volgorde van vragen en categorieën ligt vast', () => {
  const a = scan('2026-01-01T00:00:00.000Z');
  const b = scan('2026-01-01T00:00:00.000Z');
  assert.deepEqual(
    a.protocols.acp.questionCoverage.map((q) => `${q.setId}|${q.questionId}`),
    b.protocols.acp.questionCoverage.map((q) => `${q.setId}|${q.questionId}`),
  );
  assert.deepEqual(
    a.protocols.acp.categories.map((c) => c.setId),
    b.protocols.acp.categories.map((c) => c.setId),
  );
});
