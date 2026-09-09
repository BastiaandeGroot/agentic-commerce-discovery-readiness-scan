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

test('dekking is een getal per vraag, geen bezwaar', () => {
  // Eerder stond "dekking niet onderzocht" bij élke vraag. Een bevinding die
  // overal staat helpt nergens kiezen. Het getal zelf zegt wél iets: op hoeveel
  // sites dit onderwerp voorkwam.
  const rows = lees([
    'id;laag;vraag_nl;vraag_en;belang;benodigde_attributen;dekking;dekking_bronnen',
    'A-01;base;Hoe breed is dit?;How wide is this?;hoog;breedte;6;a, b, c, d, e, f',
    'A-02;base;En dit?;And this?;hoog;kleur',
  ].join('\n'));
  const find = (id: string) => rows.find((r) => r.id === id)!;
  assert.equal(find('A-01').coverage, 6);
  assert.equal(find('A-02').coverage, null);
  assert.ok(rows.every((r) => !r.issues.some((i) => String(i).startsWith('coverage'))));
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

test('een procesvraag en een structuurvraag zijn niet hetzelfde', () => {
  // Beide vallen buiten de score, maar om verschillende redenen. Een procesvraag
  // kan geen enkel veld ooit beantwoorden. Een structuurvraag wél — hij vraagt
  // alleen een verband dat de catalogus niet legt, en dát verband leggen is werk
  // met waarde. Ze onder één label zetten leest als "negeer allebei".
  const rows = lees([
    'id;laag;vraag_nl;vraag_en;belang;benodigde_attributen;antwoordtype;beantwoordbaar_uit_attributen',
    'A-01;base;Kan ik een staal krijgen?;Can I get a swatch?;hoog;staal;proces;nee',
    'A-02;base;Welke kleuren nog meer?;Which other colours?;hoog;kwaliteit_id;relatie;nee',
  ].join('\n'));
  const find = (id: string) => rows.find((r) => r.id === id)!;
  assert.ok(find('A-01').issues.includes('process-question'));
  assert.ok(find('A-02').issues.includes('structure-question'));
  // En de structuurvraag weegt zwaarder, want daar valt iets aan te doen.
  assert.ok(find('A-02').severity > find('A-01').severity);
});
