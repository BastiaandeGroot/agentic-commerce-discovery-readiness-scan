// Een koppelvoorstel van het model telt alleen als het een waarde aanwijst die
// werkelijk in de kolom staat.
//
// Dit bewaakt de fout waar het koppelscherm om bestaat: een model dat een kolom
// kiest omdat de naam ergens op lijkt — vochtgedrag in het herkomstland — laat
// een gat verdwijnen dat er wél is.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readProposals } from '../src/semantic/prompt';

const attributes = [{ key: 'lichtechtheid_graad' }, { key: 'vochtgedrag_buiten' }, { key: 'wastemperatuur_c' }];
const columns = [
  { key: 'lightfatness', text: 'lightfatness [getal; gevuld in Outdoorstoffen]: 5, 4, 6' },
  { key: 'country_of_manufacture', text: 'country of manufacture [vaste lijst]: China, Belgium, Turkey' },
  { key: 'washing_label', text: 'washing label [vaste lijst, meerdere per product]: Niet bleken, 30 °C normale was' },
];
const answer = (koppelingen: unknown[]) => JSON.stringify({ koppelingen });

test('een voorstel met een waarde uit de kolom blijft staan', () => {
  const { proposals, rejected } = readProposals(answer([
    { kenmerk: 'lichtechtheid_graad', kolom: 'lightfatness', bewijs: '5', waarom: 'de graad' },
    { kenmerk: 'wastemperatuur_c', kolom: 'washing_label', bewijs: '30 °C', waarom: 'de temperatuur' },
  ]), attributes, columns);
  assert.deepEqual(proposals.map((p) => [p.key, p.column]), [
    ['lichtechtheid_graad', 'lightfatness'],
    ['wastemperatuur_c', 'washing_label'],
  ]);
  assert.equal(rejected.length, 0);
});

test('een verzonnen waarde valt af', () => {
  const { proposals, rejected } = readProposals(answer([
    { kenmerk: 'vochtgedrag_buiten', kolom: 'country_of_manufacture', bewijs: 'waterafstotend', waarom: '' },
  ]), attributes, columns);
  assert.equal(proposals.length, 0);
  assert.equal(rejected.length, 1);
});

test('de hele waardenrij overschrijven is geen bewijs', () => {
  const { proposals } = readProposals(answer([
    { kenmerk: 'lichtechtheid_graad', kolom: 'lightfatness', bewijs: '5, 4, 6', waarom: '' },
  ]), attributes, columns);
  assert.equal(proposals.length, 0);
});

test('de naam van de kolom is geen waarde', () => {
  const { proposals } = readProposals(answer([
    { kenmerk: 'wastemperatuur_c', kolom: 'washing_label', bewijs: 'washing', waarom: '' },
  ]), attributes, columns);
  assert.equal(proposals.length, 0);
});

test('een kolom die niet bestaat, of een kenmerk dat niet gevraagd is, valt af', () => {
  const { proposals, rejected } = readProposals(answer([
    { kenmerk: 'lichtechtheid_graad', kolom: 'uv_klasse', bewijs: '5', waarom: '' },
    { kenmerk: 'iets_anders', kolom: 'lightfatness', bewijs: '5', waarom: '' },
  ]), attributes, columns);
  assert.equal(proposals.length, 0);
  assert.equal(rejected.length, 1);
});

test('een onleesbaar antwoord geeft geen voorstellen maar een melding', () => {
  const { proposals, rejected } = readProposals('lichtechtheid_graad: lightfatness', attributes, columns);
  assert.equal(proposals.length, 0);
  assert.equal(rejected.length, 1);
});
