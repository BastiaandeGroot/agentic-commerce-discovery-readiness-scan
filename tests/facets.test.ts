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
import { classifyPaths, facetDebt, normalizeName, pathsFromProducts, segmentsToResearch, splitMemberships } from '../src/intake/facets';

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

test('het filterpaneel wijst een eigenschap aan; het menu wijst niets aan', () => {
  const rows = classifyPaths(
    [path('Meubelstoffen > Effen'), path('Meubelstoffen > Banken')],
    { navigation: ['Banken'], filters: ['Effen'] },
  );
  assert.equal(kindOf(rows, 'Effen'), 'facet');
  // "Banken" staat in het menu en blijft toch onbeslist. Dat is geen slordigheid
  // maar een meting: op de eerste echte winkel stonden "Effen", "Premium" en
  // "Gedessineerd" gewoon naast "Banken" in datzelfde menu. Een menu is een
  // verkoopinstrument, geen datamodel, en zou hier een gat wegpoetsen.
  assert.equal(kindOf(rows, 'Banken'), 'unclear');
  assert.equal(rows.find((r) => r.segments.includes('Banken'))!.reason, 'in-nav-only');
});

test('in het menu én tussen de filters is een eigenschap, geen twijfelgeval', () => {
  // Gemeten op de site van de testmerchant: "Vlekwerend" en "Gedessineerd"
  // staan op dezelfde pagina in allebei. Dat is de bevinding zelf — een kenmerk
  // dat in de categorieboom belandde omdat er geen attribuut voor was — en dat
  // mag niet in de twijfelhoek verdwijnen.
  const rows = classifyPaths([path('Meubelstoffen > Vlekwerend')], {
    navigation: ['Vlekwerend'], filters: ['Vlekwerend'],
  });
  assert.equal(rows[0].kind, 'facet');
  assert.equal(rows[0].reason, 'in-both');
});

test('een facet levert geen marktsegment op', () => {
  const rows = classifyPaths([
    path('Meubelstoffen > Vlamvertragend'), path('Gordijnstoffen > Vlamvertragend'),
    path('Meubelstoffen'), path('Gordijnstoffen'),
  ]);
  assert.deepEqual(segmentsToResearch(rows), ['Meubelstoffen', 'Gordijnstoffen']);
  assert.equal(facetDebt(rows).facets, 2);
});

test('een categorielijst wordt niet één categorienaam', () => {
  // De fout die dit voorkomt, en hij stond op het scherm: `|` scheidt
  // categorieën, `/` en `>` scheiden niveaus. Door elkaar gehaald wordt
  // "Meubelstoffen | Meubelstoffen/Banken" één naam ter lengte van een alinea.
  assert.deepEqual(
    splitMemberships('Meubelstoffen | Meubelstoffen/Banken | Meubelstoffen/Effen'),
    [['Meubelstoffen'], ['Meubelstoffen', 'Banken'], ['Meubelstoffen', 'Effen']],
  );
  assert.deepEqual(splitMemberships('Outdoorstoffen > Gestreept'), [['Outdoorstoffen', 'Gestreept']]);
  // Een id dat als naam is meegeleverd levert anders een vragenset "235" op.
  assert.deepEqual(splitMemberships('Stoffen/235'), [['Stoffen']]);
});

test('elk lidmaatschap telt voor zijn eigen pad', () => {
  const product = (raw: string) => ({ unmapped: { categories: raw }, values: {} });
  const rows = pathsFromProducts(
    [product('A | A/B'), product('A | A/B'), product('A | A/C')],
    (p) => (p as unknown as { unmapped: Record<string, string> }).unmapped.categories,
  );
  const find = (key: string) => rows.find((r) => r.segments.join('>') === key)?.productCount;
  assert.equal(find('A'), 3);
  assert.equal(find('A>B'), 2);
  assert.equal(find('A>C'), 1);
});

test('namen worden vergeleken zonder opmaak', () => {
  assert.equal(normalizeName('  Vlam-Vertragend '), 'vlam vertragend');
  assert.equal(normalizeName('Café-stoffen'), 'cafe stoffen');
});
