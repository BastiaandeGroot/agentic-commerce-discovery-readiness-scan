// De naam van een gat in het rapport is leesbaar, zonder resten van het zoekpatroon.
//
// Een kenmerk zonder kolom wordt gezocht met een patroon als
// `attr:aanbevolen.?naalddikte`. Het rapport toonde daarvan "aanbevolen
// ?naalddikte": de punt van het scheidingsteken ging eruit, het vraagteken bleef.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { importQuestionList } from '../src/questions/list';
import { generateQuestionSets } from '../src/questions/generate';
import { evaluateProduct } from '../src/engine/evaluate';

test('een gat zonder kolom heet zoals het kenmerk, zonder vraagteken', () => {
  const catalogus = ingest('c.csv', ['sku;categorie', '1;Garens'].join('\n'));
  const read = importQuestionList([{
    name: 'woontextiel.csv',
    text: [
      'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen',
      'B1;Welke naald heb ik nodig?;Which needle do I need?;base;;hoog;aanbevolen_naalddikte',
    ].join('\n'),
  }]);
  assert.ok(read.bank, 'de testlijst hoort in te lezen');

  const sets = generateQuestionSets(catalogus, [read.bank]).sets;
  const result = evaluateProduct(catalogus.products[0], sets, catalogus);
  const gat = result.gaps.find((gap) => gap.field.startsWith('attr:') && gap.field.includes('naalddikte'));

  assert.ok(gat, 'het ontbrekende kenmerk hoort als gat in het resultaat te staan');
  assert.equal(gat.label.nl, 'aanbevolen naalddikte');
  assert.doesNotMatch(gat.label.nl, /\?/);
});
