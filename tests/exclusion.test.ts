// Een categorie uitsluiten werkt overal door.
//
// De fout die hier bewaakt wordt: de merchant sluit een categorie uit, maar haar
// vragen staan nog op het vragensetscherm, haar kenmerken nog op het
// koppelscherm, of haar producten tellen nog mee in de noemer. Tegelijk mag een
// product dat óók onder een categorie hangt die blijft, daar niet verdwijnen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { pathKey } from '../src/intake/facets';
import { importQuestionList } from '../src/questions/list';
import { generateQuestionSets } from '../src/questions/generate';
import { attributeInventory } from '../src/questions/mapping';
import { isExcludedProduct, placeProduct } from '../src/engine/join';
import { profileCatalog } from '../src/engine/profile';

const catalogus = () => ingest('c.csv', [
  'sku;categorie;breedte;martindale',
  '1;Meubelstoffen;140;30000',
  '2;Meubelstoffen;140;40000',
  '3;Bijproducten;;',
  '4;Bijproducten | Meubelstoffen;150;20000',
  '5;Gordijnstoffen;280;',
].join('\n'));

const bank = () => {
  const read = importQuestionList([{
    name: 'woontextiel.csv',
    text: [
      'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen',
      'B1;Hoe breed is de rol?;How wide is the roll?;base;;kritiek;rolbreedte_cm',
      'M1;Is hij sterk genoeg?;Is it strong enough?;overlay;Meubelstoffen;kritiek;martindale_toeren',
      'X1;Welke naald heb ik nodig?;Which needle?;overlay;Bijproducten;hoog;naalddikte',
    ].join('\n'),
  }]);
  assert.ok(read.bank, 'de testlijst hoort in te lezen');
  return read.bank;
};

const BIJ = pathKey(['Bijproducten']);

test('een uitgesloten categorie krijgt geen vragenset, en haar kenmerken verdwijnen van het koppelscherm', () => {
  const zonder = generateQuestionSets(catalogus(), [bank()]);
  assert.ok(zonder.sets.some((set) => set.category === 'Bijproducten'), 'zonder uitsluiting hoort Bijproducten een set te hebben');
  assert.ok(attributeInventory(zonder).some((row) => row.key === 'naalddikte'));

  const met = generateQuestionSets(catalogus(), [bank()], {}, {}, { excluded: [BIJ] });
  assert.equal(met.sets.some((set) => set.category === 'Bijproducten'), false);
  assert.equal(attributeInventory(met).some((row) => row.key === 'naalddikte'), false);
  assert.deepEqual(met.excludedPaths, [BIJ]);
  // Wat blijft, blijft: de categorie ernaast houdt haar eigen vragen.
  assert.ok(met.sets.find((set) => set.category === 'Meubelstoffen')?.questions.some((q) => q.id === 'M1'));
});

test('een product dat alleen onder een uitgesloten pad hangt telt niet mee; een product dat ook elders hangt wel', () => {
  const data = catalogus();
  const excluded = new Set([BIJ]);
  const [, , alleenBij, ookMeubel] = data.products;
  assert.equal(isExcludedProduct(alleenBij, excluded), true);
  assert.equal(isExcludedProduct(ookMeubel, excluded), false);

  const sets = generateQuestionSets(data, [bank()], {}, {}, { excluded: [BIJ] }).sets;
  const plek = placeProduct(ookMeubel, sets, 0, new Set(), excluded);
  assert.deepEqual(plek.sets.map((set) => set.category), ['Meubelstoffen']);
});

test('het kolomprofiel telt uitgesloten producten niet mee', () => {
  const profiel = profileCatalog(catalogus(), 0, new Set(), new Set([BIJ]));
  assert.equal(profiel.breedte?.total, 4);
  assert.equal(profiel.breedte?.categories.some((entry) => entry.category === 'Bijproducten'), false);
});

test('zonder uitsluiting verandert er niets', () => {
  const data = catalogus();
  assert.equal(isExcludedProduct(data.products[2], new Set()), false);
  assert.equal(generateQuestionSets(data, [bank()]).excludedPaths, undefined);
});
