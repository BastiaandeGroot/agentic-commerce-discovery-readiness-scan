// Wat er per vraag te beoordelen valt.
//
// Een beheerder beoordeelt vragen en geen tellingen: "26 beslisregels zonder
// bron" zegt niet wélke vragen het betreft, en dan is er niets na te lopen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewBank } from '../src/questions/review';
import { importQuestionList } from '../src/questions/list';

function lees(csv: string) {
  const result = importQuestionList([{ name: 'test.csv', text: csv }]);
  assert.deepEqual(result.errors, []);
  return reviewBank(result.bank!);
}

test('het ergste staat bovenaan', () => {
  // Een vraag zonder kenmerken kan nooit beantwoord worden; een vraag met een
  // dekking en een gekoppeld kenmerk is in orde. Die volgorde moet vastliggen,
  // anders moet een beheerder zelf gaan zoeken waar het misgaat.
  const rows = lees([
    'id;laag;vraag_nl;vraag_en;belang;benodigde_attributen;dekking;dekking_bronnen',
    'A-01;base;Prima vraag;Fine question;hoog;breedte;3;a, b, c',
    'A-02;base;Vraag zonder kenmerk;Question without attribute;hoog;;3;a, b, c',
  ].join('\n'));
  assert.equal(rows[0].id, 'A-02');
  assert.ok(rows[0].issues.includes('no-attributes'));
  assert.ok(rows[0].severity > rows[1].severity);
});

test('een dekking zonder onderzoek wordt gemeld', () => {
  const rows = lees([
    'id;laag;vraag_nl;vraag_en;belang;benodigde_attributen',
    'A-01;base;Hoe breed is dit?;How wide is this?;hoog;breedte',
  ].join('\n'));
  assert.ok(rows[0].issues.includes('coverage-unknown'));
});

test('elke vraag komt mee, ook de goede', () => {
  // Vrijgeven gaat over de bank als geheel. Wie alleen de probleemgevallen ziet,
  // weet niet wat hij vrijgeeft.
  const rows = lees([
    'id;laag;vraag_nl;vraag_en;belang;benodigde_attributen;dekking;dekking_bronnen',
    'A-01;base;Eerste;First;hoog;breedte;3;a, b, c',
    'A-02;base;Tweede;Second;laag;kleur;3;a, b, c',
  ].join('\n'));
  assert.equal(rows.length, 2);
});
