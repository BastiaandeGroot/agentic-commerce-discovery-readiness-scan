// Gevuld is niet hetzelfde als bruikbaar.
//
// Een agent kan alleen antwoorden met een waarde die hij kan vergelijken,
// filteren of narekenen. `n.v.t.` vult de kolom en beantwoordt niets; een
// streepjescode met een verkeerd controlecijfer vindt in geen enkele database
// een product. Beide zijn `weak` en niet `absent`: er staat iets, en dat is werk
// aan bestaande rijen in plaats van een leeg veld.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldState } from '../src/engine/evaluate';
import { isPlaceholder, isValidGtin } from '../src/intake/normalize';
import type { ProductRecord } from '../src/domain/types';

function product(values: Record<string, unknown>, unmapped: Record<string, unknown> = {}): ProductRecord {
  return { id: 'p1', values, unmapped } as unknown as ProductRecord;
}

test('een plaatshouder is gevuld en onbruikbaar', () => {
  assert.equal(fieldState(product({ title: 'n.v.t.' }), 'title'), 'weak');
  assert.equal(fieldState(product({ title: 'Op aanvraag' }), 'title'), 'weak');
  assert.equal(fieldState(product({ title: 'ONBEKEND' }), 'title'), 'weak');
});

test('een plaatshouder in een losse kolom telt net zo goed', () => {
  const p = product({}, { martindale: 'volgt' });
  assert.equal(fieldState(p, 'attr:^martindale$'), 'weak');
});

test('één bruikbare waarde is genoeg', () => {
  // Twee kolommen matchen het patroon; als er één een echte waarde draagt kan
  // de agent antwoorden, en dan is het geen gat.
  const p = product({}, { martindale_a: 'n.v.t.', martindale_b: '30000' });
  assert.equal(fieldState(p, 'attr:martindale'), 'ok');
});

test('vaktaal wordt niet weggepoetst', () => {
  // Alleen exacte treffers: `geen` is een plaatshouder, maar `geen
  // strijkbehandeling nodig` is een antwoord.
  assert.equal(isPlaceholder('geen'), true);
  assert.equal(isPlaceholder('geen strijkbehandeling nodig'), false);
  assert.equal(isPlaceholder('diverse'), true);
  assert.equal(isPlaceholder('diverse kleuren op aanvraag'), false);
});

test('een streepjescode met een fout controlecijfer is onbruikbaar', () => {
  assert.equal(isValidGtin('4006381333931'), true);
  assert.equal(fieldState(product({ gtin: '4006381333931' }), 'gtin'), 'ok');
  assert.equal(fieldState(product({ gtin: '4006381333930' }), 'gtin'), 'weak');
  assert.equal(fieldState(product({ gtin: '12345' }), 'gtin'), 'weak');
});

test('een lege kolom blijft leeg en wordt geen zwakke waarde', () => {
  // Het verschil bepaalt wat een merchant moet doen: invullen of herschrijven.
  assert.equal(fieldState(product({ title: '' }), 'title'), 'absent');
  assert.equal(fieldState(product({}), 'title'), 'absent');
});
