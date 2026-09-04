// De motor op zijn beloftes: volledig is alles-of-niets, een gat kent zijn
// oorzaak, en een veld vullen is nog geen vraag beantwoorden.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { catalogKnows, satisfies, MIN_WORDS } from '../src/engine/evaluate';

/**
 * Een catalogusexport zoals een PIM hem levert. Let op de kolom `baanbreedte`:
 * die bestaat wél, maar staat bij het tweede product leeg. Dat is precies het
 * verschil tussen invulwerk en modelwerk dat deze motor moet kunnen zien.
 */
const CATALOG = [
  'sku,name,brand,category,description,image,color,material,baanbreedte',
  '1,Meubelstof Anker gestreept blauw,DeGroot,Meubelstoffen,Een stevige meubelstof met een gestreept dessin in blauw,https://x/1.jpg,blauw,katoen,140 cm',
  '2,Meubelstof Effen groen,DeGroot,Meubelstoffen,Kort,https://x/2.jpg,groen,,',
].join('\n');

/** Een vast tijdstip: de tests gaan over de uitkomst, niet over de klok. */
const VAST_TIJDSTIP = '2026-01-01T00:00:00.000Z';

function scan(text: string) {
  const catalog = ingest('catalogus.csv', text);
  return runScan(catalog, generateQuestionSets(catalog), { scannedAt: VAST_TIJDSTIP });
}

test('een te korte omschrijving vult het veld maar beantwoordt de vraag niet', () => {
  const kort = { key: 'x', values: { description: 'Kort' }, unmapped: {} };
  const lang = { key: 'y', values: { description: 'Een stevige meubelstof met een gestreept dessin in blauw' }, unmapped: {} };
  assert.equal(MIN_WORDS.description, 8);
  assert.equal(satisfies(kort, 'description'), false);
  assert.equal(satisfies(lang, 'description'), true);
});

test('een attr:-eis kijkt in de kolommen die we niet konden plaatsen', () => {
  const record = { key: 'x', values: {}, unmapped: { baanbreedte: '140 cm' } };
  assert.equal(satisfies(record, 'attr:breedte|width'), true);
  assert.equal(satisfies(record, 'attr:martindale|schuurtoer'), false);
});

test('volledig is alles-of-niets, niet een percentage', () => {
  const report = scan(CATALOG);
  for (const product of report.products) {
    // Over de gescoorde vragen: een procesvraag hoort in het advies en mag geen
    // enkele merchant permanent van volledig afhouden.
    const gescoord = product.questions.filter((q) => q.scored);
    const alles = gescoord.length > 0 && gescoord.every((q) => q.answered);
    assert.equal(product.findable, alles);
  }
  // Deze catalogus mist te veel; niemand haalt het.
  assert.equal(report.funnel.findable, 0);
});

test('een leeg veld is iets anders dan een veld dat niet bestaat', () => {
  const catalog = ingest('catalogus.csv', CATALOG);
  // De kolom staat in de export, dus de catalogus kent hem — ook al is hij bij
  // het tweede product leeg.
  assert.equal(catalogKnows(catalog, 'attr:breedte|width|baanbreedte|rolbreedte'), true);
  assert.equal(catalogKnows(catalog, 'material'), true);
  // Dit kenmerk komt in geen enkele kolom voor: modelwerk, geen invulwerk.
  assert.equal(catalogKnows(catalog, 'attr:martindale|schuurtoer|slijtage'), false);

  const report = scan(CATALOG);
  const tweede = report.products.find((p) => p.key === '2');
  // Samenstelling: de kolom bestaat, deze rij is leeg.
  assert.equal(tweede?.questions.find((q) => q.questionId === 'h3')?.state, 'empty');
  // Schuurweerstand: nergens een kolom voor.
  assert.equal(tweede?.questions.find((q) => q.questionId === 'h14')?.state, 'absent');
});

test('een gat draagt zijn oorzaak, en dus wat voor werk het is', () => {
  const report = scan(CATALOG);
  const causes = new Map(report.gaps.map((g) => [g.field, g.cause]));
  assert.equal(causes.get('material'), 'unfilled', 'de kolom bestaat, hij is niet gevuld');
  assert.equal(causes.get('attr:schuurtoer|martindale|slijtage'), 'unmodelled', 'geen kolom, dus modelwerk');
});

test('een gat bestaat alleen als er een vraag door onbeantwoord blijft', () => {
  const report = scan(CATALOG);
  for (const gap of report.gaps) {
    assert.ok(gap.questions.length > 0, `${gap.field} hangt aan geen enkele vraag`);
  }
  // Andersom: een veld dat in geen enkele vraag voorkomt is geen gat, ook niet
  // als het leeg is. Dat is het verschil met een compleetheidscontrole.
  assert.equal(report.gaps.some((g) => g.field === 'gtin'), false);
});

test('een product zonder categorie wordt geteld maar niet gescoord', () => {
  const report = scan(CATALOG + '\n3,Los product,DeGroot,,Geen categorie hier maar wel een nette omschrijving,https://x/3.jpg,rood,,');
  assert.equal(report.unmatchedCount, 1);
  const los = report.products.find((p) => p.key === '3');
  assert.equal(los?.unmatched, true);
  assert.equal(los?.questions.length, 0);
  assert.equal(los?.findable, false);
});

test('de trechter telt alle producten, de score alleen de gescoorde', () => {
  const report = scan(CATALOG);
  assert.equal(report.funnel.total, report.productCount);
  const totaal = report.distance.reduce((n, bucket) => n + bucket.products, 0);
  assert.equal(totaal, report.productCount - report.unmatchedCount);
  // Oplopend, en geen lege standen.
  assert.deepEqual(report.distance.map((b) => b.open), [...report.distance.map((b) => b.open)].sort((a, b) => a - b));
  for (const bucket of report.distance) assert.ok(bucket.products > 0);
});

test('nul openstaande vragen betekent precies volledig', () => {
  const report = scan(CATALOG);
  const nul = report.distance.find((b) => b.open === 0)?.products ?? 0;
  assert.equal(nul, report.funnel.findable);
});
