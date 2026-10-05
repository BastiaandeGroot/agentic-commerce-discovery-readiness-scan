// De herkomst van een koppeling: voorstel van een model, of keuze van de merchant.
//
// De fout die hier bewaakt wordt: een voorstel dat na herladen een gewone
// koppeling lijkt en daardoor nooit meer nagelopen wordt — en de omgekeerde: een
// nieuwe beoordeling die over een keuze van de merchant heen walst.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReview, liveProposals } from '../src/questions/mapping';

test('een voorstel blijft voorstel tot de merchant de koppeling wijzigt', () => {
  const proposed = { droogvoorschrift: 'description', breedte: 'fabric_width', coating: 'coated' };
  const live = liveProposals({
    mapping: { droogvoorschrift: ['description'], breedte: ['width'], coating: [] },
    proposed,
  });
  assert.deepEqual(live, { droogvoorschrift: 'description' });
});

test('een nieuw voorstel wordt een koppeling mét herkomst', () => {
  const uit = applyReview({ mapping: {}, proposed: {} }, ['breedte'], [{ key: 'breedte', columns: ['fabric_width'] }]);
  assert.deepEqual(uit.mapping, { breedte: ['fabric_width'] });
  assert.deepEqual(uit.proposed, { breedte: 'fabric_width' });
  assert.deepEqual(uit.replaced, []);
  assert.deepEqual(uit.dropped, []);
});

test('een oud voorstel dat het model anders ziet, wordt vervangen en genoemd', () => {
  const uit = applyReview(
    { mapping: { droogvoorschrift: ['description'] }, proposed: { droogvoorschrift: 'description' } },
    ['droogvoorschrift'],
    [{ key: 'droogvoorschrift', columns: ['washing_label'] }],
  );
  assert.deepEqual(uit.mapping, { droogvoorschrift: ['washing_label'] });
  assert.deepEqual(uit.replaced, [{ key: 'droogvoorschrift', from: 'description', to: 'washing_label' }]);
});

test('een oud voorstel dat het model niet meer aanwijst, staat weer open', () => {
  const uit = applyReview(
    { mapping: { soepelheid: ['short_description'] }, proposed: { soepelheid: 'short_description' } },
    ['soepelheid'],
    [],
  );
  assert.deepEqual(uit.mapping, {});
  assert.deepEqual(uit.proposed, {});
  assert.deepEqual(uit.dropped, [{ key: 'soepelheid', from: 'short_description' }]);
});

test('hetzelfde voorstel opnieuw is geen wijziging', () => {
  const uit = applyReview(
    { mapping: { breedte: ['fabric_width'] }, proposed: { breedte: 'fabric_width' } },
    ['breedte'],
    [{ key: 'breedte', columns: ['fabric_width'] }],
  );
  assert.deepEqual(uit.replaced, []);
  assert.deepEqual(uit.dropped, []);
});

test('wat niet voorgelegd is, blijft zoals het was', () => {
  const start = { mapping: { breedte: ['fabric_width'], gewicht: ['weight'] }, proposed: { breedte: 'fabric_width' } };
  const uit = applyReview(start, ['breedte'], [{ key: 'breedte', columns: ['fabric_width'] }, { key: 'gewicht', columns: ['iets_anders'] }]);
  assert.deepEqual(uit.mapping.gewicht, ['weight']);
});

test('geen kolom is een keuze en blijft staan, ook als het model iets vindt', () => {
  const uit = applyReview({ mapping: { certificaat: [] }, proposed: {} }, ['certificaat'], [{ key: 'certificaat', columns: ['oem'] }]);
  assert.deepEqual(uit.mapping, { certificaat: [] });
  assert.deepEqual(uit.proposed, {});
});

test('wat de merchant tijdens de ronde zelf koos, wint van het antwoord', () => {
  const uit = applyReview(
    { mapping: { breedte: ['rol_breedte'] }, proposed: {} },
    ['breedte'],
    [],
    new Set(['breedte']),
  );
  assert.deepEqual(uit.mapping, { breedte: ['rol_breedte'] });
  assert.deepEqual(uit.dropped, []);
});

test('de invoer blijft ongemoeid', () => {
  const start = { mapping: { a: ['x'] }, proposed: { a: 'x' } };
  applyReview(start, ['a'], []);
  assert.deepEqual(start, { mapping: { a: ['x'] }, proposed: { a: 'x' } });
});
