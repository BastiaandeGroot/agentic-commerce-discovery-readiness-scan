// Klantvragen uit de klantenservice: inlezen, poetsen en naast de bank leggen.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchSupport, readSupportQuestions, supportId, unmatchedSupport } from '../src/questions/support';

const FILE = [
  '﻿Nr;Thema;Komt voort uit (aantal vragen 2026);Vraag;Kort antwoord;Status',
  '1;Bestellen en levering;Levering en status (159);Wanneer wordt mijn bestelling verzonden?;Binnen twee dagen.;Klaar',
  '2;Bestellen en levering;Bestelprobleem (94);Kan ik mijn bestelling nog aanpassen of annuleren?;Ja.;Check',
  '3;Stof kiezen;Productadvies (121);Krimpt de stof en hoe was ik hem? Mail jan@voorbeeld.nl;Ja.;Klaar',
  '4;Voorraad;Voorraad (62);Wanneer is deze stof weer op voorraad?;Mail ons.;Klaar',
  '5;Stof kiezen;Productadvies (121);Wanneer wordt mijn bestelling verzonden?;Dubbel.;Klaar',
].join('\n');

test('alleen vraag, thema en aantal komen mee, en een adres wordt weggepoetst', () => {
  const read = readSupportQuestions(FILE, 'mail.csv');
  assert.equal(read.error, undefined);
  const questions = read.list?.questions ?? [];
  assert.equal(questions.length, 4, 'een dubbele vraag telt één keer');
  assert.deepEqual(
    { theme: questions[0].theme, group: questions[0].group, count: questions[0].count },
    { theme: 'Bestellen en levering', group: 'Levering en status', count: 159 },
  );
  assert.equal(Object.keys(questions[0]).includes('answer'), false, 'het antwoord wordt niet gelezen');
  assert.match(questions[2].question, /\[e-mailadres\]/);
  assert.doesNotMatch(questions[2].question, /@/);
  assert.deepEqual(read.warnings, [{ kind: 'redacted', count: 1 }]);
});

test('een vraag houdt zijn id, hoe het bestand ook verandert', () => {
  assert.equal(supportId('Kan ik stof retourneren?'), supportId('kan ik stof retourneren'));
  assert.notEqual(supportId('Kan ik stof retourneren?'), supportId('Kan ik stof ruilen?'));
});

test('zonder vraagkolom geen lijst, en een duidelijke reden', () => {
  assert.equal(readSupportQuestions('Thema;Aantal\nLevering;3', 'x.csv').error, 'no-question-column');
});

test('koppelen aan de bank: streng, en een woord dat overal staat telt niet', () => {
  const bank = [
    { id: 'BAS-121', label: 'Kan ik mijn bestelling nog wijzigen of annuleren nadat ik betaald heb?', scored: false },
    { id: 'BAS-102', label: 'Hoe breed is de stof, en krijg ik daardoor een naad?', scored: true },
    { id: 'BAS-103', label: 'Hoe maak ik deze stof schoon?', scored: true },
    { id: 'BAS-104', label: 'Is deze stof geschikt voor buiten?', scored: true },
    { id: 'BAS-105', label: 'Welke kleur heeft deze stof?', scored: true },
  ];
  const support = [
    { id: 'a', question: 'Kan ik mijn bestelling nog aanpassen of annuleren?' },
    // "stof" en "krijg" delen met BAS-102, maar "stof" staat in elke bankvraag.
    { id: 'b', question: 'Ik zie een stof niet meer op de website. Is die nog te krijgen?' },
    { id: 'c', question: 'Hebben jullie een winkel?' },
  ];
  const matched = matchSupport(support, bank);
  assert.equal(matched[0].match?.questionId, 'BAS-121');
  assert.equal(matched[1].match, undefined);
  assert.equal(matched[2].match, undefined);
});

test('naar de sitetoets gaat wat de bank niet kent, zonder voorraad', () => {
  const list = {
    name: 'mail.csv',
    questions: [
      { id: 'a', question: 'Kan ik stof retourneren?' },
      { id: 'b', question: 'Wanneer is deze stof weer op voorraad?' },
      { id: 'c', question: 'Krimpt de stof?', match: { questionId: 'BAS-110', label: 'Krimpt deze stof?', scored: true } },
    ],
  };
  assert.deepEqual(unmatchedSupport(list), [{ id: 'a', label: 'Kan ik stof retourneren?' }]);
});
