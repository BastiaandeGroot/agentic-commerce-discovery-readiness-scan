// Losstaande categorieën, en een gecorrigeerd label dat blijft aansluiten.
//
// De fout die hier bewaakt wordt: een klos garen krijgt "hoe breed is de stof"
// als algemene vraag, omdat de bank niet weet dat garen niet het kernproduct van
// de markt is. En een label dat de beheerder corrigeert, laat de categorie van de
// merchant stil haar vragenset kwijtraken.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importQuestionList } from '../src/questions/list';
import { applyOverlaySettings } from '../src/questions/bank';
import { composeQuestions, ownOverlayFor } from '../src/questions/compose';

const lijst = [
  'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen',
  'B1;Hoe breed is de stof?;How wide is the fabric?;base;;kritiek;rolbreedte_cm',
  'B2;Krimpt hij na wassen?;Does it shrink?;base;;hoog;krimp_pct',
  'G1;Hoe dik is dit garen?;How thick is this thread?;overlay;Universele naaigarens;kritiek;garendikte_tex',
  'O1;Welke stoffen mag ik ermee reinigen?;Which fabrics can I clean with it?;overlay;Onderhoudsprodukten;kritiek;geschikte_stoffen',
].join('\n');

const bank = () => {
  const read = importQuestionList([{ name: 'woontextiel.csv', text: lijst }]);
  assert.ok(read.bank, 'de testlijst hoort in te lezen');
  return read.bank;
};

const idVan = (naam: string) => {
  const overlay = ownOverlayFor(bank(), naam);
  assert.ok(overlay, `${naam} hoort een overlay te hebben`);
  return overlay.id;
};

test('zonder instellingen verandert er niets', () => {
  const origineel = bank();
  assert.equal(applyOverlaySettings(origineel, {}), origineel);
});

test('een losstaande categorie krijgt alleen haar eigen vragen', () => {
  const garen = idVan('Universele naaigarens');
  const toegepast = applyOverlaySettings(bank(), { standalone: [garen] });
  const overlay = toegepast.overlays.find((one) => one.id === garen);

  const vragen = composeQuestions(toegepast, overlay).map((question) => question.id);
  assert.deepEqual(vragen, ['G1']);

  // Een gewone categorie houdt de algemene vragen.
  const onderhoud = toegepast.overlays.find((one) => one.id === idVan('Onderhoudsprodukten'));
  assert.deepEqual(composeQuestions(toegepast, onderhoud).map((question) => question.id), ['B1', 'B2', 'O1']);
});

test('een gecorrigeerd label sluit aan op de nieuwe én de oude naam', () => {
  const onderhoud = idVan('Onderhoudsprodukten');
  const toegepast = applyOverlaySettings(bank(), {
    labels: { [onderhoud]: { nl: 'Onderhoudsproducten', en: 'Care products' } },
  });

  const overlay = toegepast.overlays.find((one) => one.id === onderhoud);
  assert.equal(overlay?.label.nl, 'Onderhoudsproducten');
  // De catalogus van de merchant heet nog steeds zoals hij heette.
  assert.equal(ownOverlayFor(toegepast, 'Onderhoudsprodukten')?.id, onderhoud);
  assert.equal(ownOverlayFor(toegepast, 'Onderhoudsproducten')?.id, onderhoud);
  assert.equal(ownOverlayFor(toegepast, 'Care products')?.id, onderhoud);
});

test('een losstaande subcategorie staat als eigen categorie, op het scherm en in het rapport', async () => {
  const { ingest } = await import('../src/intake/index');
  const { generateQuestionSets } = await import('../src/questions/generate');
  const { placeProduct } = await import('../src/engine/join');

  const catalogus = ingest('c.csv', [
    'sku;categorie',
    '1;Meubelstoffen',
    '2;Gordijnstoffen',
    '3;Meubelstoffen/Universele naaigarens',
    '4;Meubelstoffen/Onderhoudsprodukten',
  ].join('\n'));
  const garen = idVan('Universele naaigarens');
  const toegepast = applyOverlaySettings(bank(), { standalone: [garen] });
  const state = generateQuestionSets(catalogus, [toegepast]);

  const garenSet = state.sets.find((set) => set.category === 'Universele naaigarens');
  const onderhoudSet = state.sets.find((set) => set.category === 'Onderhoudsprodukten');
  assert.ok(garenSet && onderhoudSet, 'beide subcategorieën hebben een eigen set');
  // Losstaand hangt nergens onder; een gewone subcategorie blijft onder haar tak.
  assert.equal(garenSet.parent, undefined);
  assert.equal(onderhoudSet.parent, 'Meubelstoffen');
  assert.deepEqual(garenSet.questions.map((question) => question.id), ['G1']);

  const level = state.segmentLevel ?? 0;
  const plekGaren = placeProduct(catalogus.products[2], state.sets, level);
  assert.equal(plekGaren.category, 'Universele naaigarens');
  assert.equal(plekGaren.subcategory, undefined);

  const plekOnderhoud = placeProduct(catalogus.products[3], state.sets, level);
  assert.equal(plekOnderhoud.category, 'Meubelstoffen');
  assert.equal(plekOnderhoud.subcategory, 'Onderhoudsprodukten');
});
