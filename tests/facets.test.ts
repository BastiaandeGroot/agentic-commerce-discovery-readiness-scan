// Welk pad is een categorie en welk is eigenlijk een filter?
//
// De fout die dit voorkomt: een vragenset voor "Gestreept". Dan krijgt een
// eigenschap de vragen van een productsoort, en meet de scan iets anders dan er
// verkocht wordt.
//
// Gemeten op de echte catalogus van de testmerchant: het structuursignaal alleen
// vindt 2 van de circa 22 facetten. Deze tests leggen vast wat het wél kan, en
// dat het bij twijfel `unclear` zegt in plaats van te gokken.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPaths, facetDebt, normalizeName, segmentsToResearch } from '../src/intake/facets';

const path = (p: string, n = 10) => ({ segments: p.split('>').map((s) => s.trim()), productCount: n });
const kindOf = (rows: ReturnType<typeof classifyPaths>, leaf: string) =>
  rows.find((r) => r.segments[r.segments.length - 1] === leaf)?.kind;

test('dezelfde naam onder meerdere ouders is een eigenschap', () => {
  const rows = classifyPaths([
    path('Meubelstoffen > Vlamvertragend'),
    path('Gordijnstoffen > Vlamvertragend'),
    path('Meubelstoffen > Banken'),
  ]);
  assert.equal(kindOf(rows, 'Vlamvertragend'), 'facet');
  // Eén ouder, geen site: dan weten we het niet, en dat zeggen we.
  assert.equal(kindOf(rows, 'Banken'), 'unclear');
});

test('bij twijfel gokt hij niet', () => {
  // Dit is de kern. "Effen" is een eigenschap en "Sedari" een productsoort, maar
  // ze hangen allebei onder één ouder en geen woordenlijst haalt ze uit elkaar.
  const rows = classifyPaths([path('Meubelstoffen > Effen'), path('Meubelstoffen > Sedari')]);
  assert.deepEqual(rows.map((r) => r.kind), ['unclear', 'unclear']);
});

test('de site wint van de structuur', () => {
  const rows = classifyPaths(
    [path('Meubelstoffen > Effen'), path('Meubelstoffen > Banken')],
    { navigation: ['Banken'], filters: ['Effen'] },
  );
  assert.equal(kindOf(rows, 'Effen'), 'facet');
  assert.equal(kindOf(rows, 'Banken'), 'category');
});

test('in het menu én tussen de filters is tegenspraak, geen uitspraak', () => {
  const rows = classifyPaths([path('Gordijnstoffen > Verduisterend')], {
    navigation: ['Verduisterend'], filters: ['Verduisterend'],
  });
  assert.equal(rows[0].kind, 'unclear');
});

test('een facet levert geen marktsegment op', () => {
  const rows = classifyPaths([
    path('Meubelstoffen > Vlamvertragend'), path('Gordijnstoffen > Vlamvertragend'),
    path('Meubelstoffen'), path('Gordijnstoffen'),
  ]);
  assert.deepEqual(segmentsToResearch(rows), ['Meubelstoffen', 'Gordijnstoffen']);
  assert.equal(facetDebt(rows).facets, 2);
});

test('namen worden vergeleken zonder opmaak', () => {
  assert.equal(normalizeName('  Vlam-Vertragend '), 'vlam vertragend');
  assert.equal(normalizeName('Café-stoffen'), 'cafe stoffen');
});
