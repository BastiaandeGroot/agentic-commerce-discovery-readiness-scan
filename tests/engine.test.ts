// De motor op zijn beloftes: vindbaar is alles-of-niets, een gat uit de
// catalogus heet verrijkbaar en niet ontbrekend, en aanwezigheid is niet
// hetzelfde als bruikbaarheid.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { satisfies, MIN_WORDS } from '../src/engine/evaluate';

const FEED = [
  'g:id,title,g:brand,g:product_type,description,g:image_link,g:price,g:availability,g:gtin,g:color,materiaal',
  '1,Meubelstof Anker gestreept blauw,DeGroot,Meubelstoffen,Een stevige meubelstof met een gestreept dessin in blauw,https://x/1.jpg,10 EUR,in stock,0614141000012,blauw,katoen',
  '2,Meubelstof Effen groen,DeGroot,Meubelstoffen,Kort,https://x/2.jpg,12 EUR,in stock,0614141000029,groen,',
].join('\n');

/** Een vast tijdstip: de tests gaan over de uitkomst, niet over de klok. */
const VAST_TIJDSTIP = '2026-01-01T00:00:00.000Z';

const CATALOG = JSON.stringify([
  { item_id: '2', material: 'linnen' },
]);

function scan(feedText: string, catalogText?: string) {
  const feed = ingest('feed.csv', feedText, 'feed');
  const catalog = catalogText ? ingest('cat.json', catalogText, 'catalog') : undefined;
  return runScan(feed, catalog, generateQuestionSets(feed, catalog), { scannedAt: VAST_TIJDSTIP });
}

test('een te korte omschrijving vult het veld maar beantwoordt de vraag niet', () => {
  const kort = { key: 'x', values: { description: 'Kort' }, unmapped: {} };
  const lang = { key: 'y', values: { description: 'Een stevige meubelstof met een gestreept dessin in blauw' }, unmapped: {} };
  assert.equal(MIN_WORDS.description, 8);
  assert.equal(satisfies(kort, 'description'), false);
  assert.equal(satisfies(lang, 'description'), true);
});

test('een attr:-eis kijkt in de kolommen die we niet konden plaatsen', () => {
  const record = { key: 'x', values: {}, unmapped: { materiaal: 'katoen' } };
  assert.equal(satisfies(record, 'attr:materiaal|stof'), true);
  assert.equal(satisfies(record, 'attr:breedte|width'), false);
});

test('vindbaar is alles-of-niets, niet een percentage', () => {
  const report = scan(FEED);
  for (const product of report.products) {
    const result = product.perProtocol.acp;
    const alles = result.questions.length > 0 && result.questions.every((q) => q.answered);
    assert.equal(result.findable, alles);
  }
  // Deze feed mist te veel; niemand haalt het.
  assert.equal(report.protocols.acp.funnel.findable, 0);
});

test('wat de feed mist maar de catalogus heeft, heet verrijkbaar', () => {
  const zonder = scan(FEED);
  const met = scan(FEED, CATALOG);

  const vraagZonder = zonder.protocols.acp.questionCoverage.find((q) => q.enrichable > 0);
  assert.equal(vraagZonder, undefined, 'zonder catalogus kan niets verrijkbaar zijn');

  const totaalVerrijkbaar = met.protocols.acp.questionCoverage.reduce((n, q) => n + q.enrichable, 0);
  assert.ok(totaalVerrijkbaar > 0, 'met catalogus moet er iets verrijkbaar zijn');
});

test('een product zonder categorie wordt geteld maar niet gescoord', () => {
  const feed = FEED + '\n3,Los product,DeGroot,,Geen categorie hier maar wel een nette omschrijving,https://x/3.jpg,9 EUR,in stock,0614141000036,rood,';
  const report = scan(feed);
  assert.equal(report.unmatchedCount, 1);
  const los = report.products.find((p) => p.key === '3');
  assert.equal(los?.unmatched, true);
  assert.equal(los?.perProtocol.acp.questions.length, 0);
  assert.equal(los?.perProtocol.acp.findable, false);
});

test('de trechter telt alleen gescoorde producten, de out-checks alle', () => {
  const report = scan(FEED);
  const funnel = report.protocols.acp.funnel;
  assert.equal(funnel.total, report.productCount);
  for (const warning of report.protocols.acp.outWarnings) {
    assert.equal(warning.affected, report.productCount, 'geen enkel product is afrekenbaar');
  }
});

test('de afstand tot vindbaar telt alle gescoorde producten', () => {
  const report = scan(FEED);
  const distance = report.protocols.acp.distance;
  const totaal = distance.reduce((n, bucket) => n + bucket.products, 0);
  assert.equal(totaal, report.productCount - report.unmatchedCount);
  // Oplopend, en geen lege standen.
  assert.deepEqual(distance.map((b) => b.open), [...distance.map((b) => b.open)].sort((a, b) => a - b));
  for (const bucket of distance) assert.ok(bucket.products > 0);
});

test('nul openstaande vragen betekent precies vindbaar', () => {
  const report = scan(FEED);
  const nul = report.protocols.acp.distance.find((b) => b.open === 0)?.products ?? 0;
  assert.equal(nul, report.protocols.acp.funnel.findable);
});
