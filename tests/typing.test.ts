// Kenmerken typeren, en wat het koppelscherm met een type doet.
//
// De fout die hier bewaakt wordt: een kenmerk dat een getal in °C verwacht wordt
// op een ja/nee-kolom gelegd, en het gat verdwijnt zonder dat iemand het ziet.
// Tegelijk mag een type nooit een kolom afwijzen die het antwoord wél kan
// dragen — dan toont het scherm een gat dat er niet is.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTyping, typingBatches, typingInputs, typingTask, TYPING_BATCH } from '../src/generation/attributes';
import { applyAttributeShapes } from '../src/questions/bank';
import { importQuestionList } from '../src/questions/list';
import { composeQuestions } from '../src/questions/compose';
import { profileCatalog, shapeMisfit } from '../src/engine/profile';
import { describeAttribute } from '../src/semantic/describe';
import { ingest } from '../src/intake/index';

const lijst = [
  'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen',
  'B1;Hoe breed is de rol?;How wide is the roll?;base;;kritiek;rolbreedte_cm',
  'B2;Is hij waterdicht?;Is it waterproof?;base;;hoog;waterdicht, waterkolom_mm',
  'B3;Past hij op mijn tafel?;Does it fit my table?;base;;middel;rolbreedte_cm',
].join('\n');

const bank = () => {
  const read = importQuestionList([{ name: 'woontextiel.csv', text: lijst }]);
  assert.ok(read.bank, 'de testlijst hoort in te lezen');
  return read.bank;
};

test('elk kenmerk één keer, met hooguit twee vragen erbij', () => {
  const inputs = typingInputs(bank());
  assert.deepEqual(inputs.map((input) => input.key), ['rolbreedte_cm', 'waterdicht', 'waterkolom_mm']);
  assert.deepEqual(inputs[0]?.questions, ['Hoe breed is de rol?', 'Past hij op mijn tafel?']);
});

test('de opdracht draagt kenmerken en vragen, zonder web en op het leesmodel', () => {
  const task = typingTask(typingInputs(bank()), 'woontextiel', 0);
  assert.equal(task.web, false);
  assert.equal(task.model, 'reader');
  assert.match(task.prompt, /rolbreedte_cm/);
  assert.match(task.prompt, /Hoe breed is de rol\?/);
});

test('een grote bank gaat in blokken', () => {
  const many = Array.from({ length: TYPING_BATCH * 2 + 1 }, (_, i) => ({ key: `k${i}`, questions: [], namedAs: [] }));
  assert.deepEqual(typingBatches(many).map((batch) => batch.length), [TYPING_BATCH, TYPING_BATCH, 1]);
});

test('het antwoord wordt streng gelezen en zegt wat er ontbreekt', () => {
  const read = readTyping({
    kenmerken: [
      { key: 'rolbreedte_cm', vorm: 'getal', eenheid: 'cm' },
      { key: 'waterdicht', vorm: 'ja/nee' },
      { key: 'verzonnen', vorm: 'getal' },
      { key: 'waterkolom_mm', vorm: 'getal', eenheid: 'toeren' },
    ],
  }, ['rolbreedte_cm', 'waterdicht', 'waterkolom_mm', 'coatingtype']);

  assert.deepEqual(read.shapes.rolbreedte_cm, { kind: 'number', unit: 'cm' });
  assert.deepEqual(read.shapes.waterdicht, { kind: 'boolean' });
  // Een eenheid die niet in de lijst staat valt weg, het getal blijft.
  assert.deepEqual(read.shapes.waterkolom_mm, { kind: 'number' });
  assert.equal(read.shapes.verzonnen, undefined);
  assert.ok(read.errors.some((error) => /verzonnen/.test(error)));
  assert.ok(read.errors.some((error) => /toeren/.test(error)));
  assert.ok(read.errors.some((error) => /coatingtype/.test(error)));
});

test('een lijst houdt hooguit acht waarden, zonder dubbele', () => {
  const read = readTyping({
    kenmerken: [{ key: 'coatingtype', vorm: 'lijst', waarden: ['PU', 'PU', 'acryl', 'PVC', 'geen', 'a', 'b', 'c', 'd', 'e'] }],
  }, ['coatingtype']);
  assert.deepEqual(read.shapes.coatingtype?.values, ['PU', 'acryl', 'PVC', 'geen', 'a', 'b', 'c', 'd']);
});

test('een bevestigd type komt via de bank tot op de vraag', () => {
  const typed = applyAttributeShapes(bank(), { rolbreedte_cm: { kind: 'number', unit: 'cm' } });
  const questions = composeQuestions(typed);
  const breedte = questions.find((question) => question.id === 'B1');
  assert.deepEqual(breedte?.evidence?.[0]?.shape, { kind: 'number', unit: 'cm' });
  // Een kenmerk zonder type blijft zonder.
  const water = questions.find((question) => question.id === 'B2');
  assert.equal(water?.evidence?.[0]?.shape, undefined);
});

test('het model ziet het verwachte type naast de naam', () => {
  assert.equal(
    describeAttribute({ key: 'hitte_c', questions: ['Kan er een pan op?'], shape: { kind: 'number', unit: '°c' } }),
    'hitte c [getal (°c)]: Kan er een pan op?',
  );
});

test('alleen wat zeker niet past wordt afgewezen', () => {
  const data = ingest('c.csv', [
    'sku;breedte;coated;kleur;temperatuur;waterkolom;leeg',
    '1;140 cm;Yes;Blauw;120 °C;1000 mm;',
    '2;150 cm;No;Rood;90 °C;2000 mm;',
    '3;140 cm;Yes;Blauw;120 °C;1000 mm;',
  ].join('\n'));
  const p = profileCatalog(data);
  const breedte = { kind: 'number' as const, unit: 'cm' };

  assert.equal(shapeMisfit(breedte, p.breedte!), false);
  assert.equal(shapeMisfit(breedte, p.coated!), true, 'een getal op ja/nee');
  assert.equal(shapeMisfit(breedte, p.kleur!), true, 'een getal op woorden zonder cijfer');
  assert.equal(shapeMisfit(breedte, p.temperatuur!), true, 'cm tegen °C');
  assert.equal(shapeMisfit({ kind: 'number', unit: 'mm' }, p.breedte!), false, 'mm en cm meten hetzelfde');
  // Een ja/nee-kenmerk wijst nooit af: een waterkolom beantwoordt "waterdicht" ook.
  assert.equal(shapeMisfit({ kind: 'boolean' }, p.waterkolom!), false);
  // Leeg is invulwerk en geen verkeerde kolom.
  assert.equal(shapeMisfit(breedte, p.leeg!), false);
});
