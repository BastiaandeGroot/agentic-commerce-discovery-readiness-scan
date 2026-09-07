// De rekenkant van de semantische koppeling.
//
// Het model zelf staat hier niet in: dat kost netwerk en tijd, en wat het
// oplevert zijn vectoren. Wat wél getest hoort te worden is wat we mét die
// vectoren doen — want dáár zitten de regels die voorkomen dat een voorstel een
// gat laat verdwijnen dat de merchant wél heeft.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centre, cosine, suggestMappings } from '../src/semantic/suggest';
import { describeAttribute, describeColumn } from '../src/semantic/describe';
import { ingest } from '../src/intake/index';

/** Een vector die op `richting` lijkt, met een beetje ruis erbij. */
const v = (...values: number[]) => values;

test('een kolom gaat naar het kenmerk dat er het best op past, en naar geen ander', () => {
  // Zonder die concurrentie grijpen beide kenmerken naar dezelfde kolom en
  // wordt "heeft deze stof een rapport" beantwoord met de baanbreedte.
  const attributes = [
    { key: 'rolbreedte_cm', vector: v(1, 0, 0) },
    { key: 'rapport_breedte_cm', vector: v(0.9, 0.2, 0) },
  ];
  const columns = [
    { key: 'rol_breedte', vector: v(1, 0, 0) },
    { key: 'patroon_breedte', vector: v(0.85, 0.3, 0) },
  ];
  const found = suggestMappings(attributes, columns, [], { minMargin: 0, centred: true });
  assert.deepEqual(
    found.map((f) => [f.key, f.column]),
    [['rolbreedte_cm', 'rol_breedte'], ['rapport_breedte_cm', 'patroon_breedte']],
  );
});

test('twijfel levert geen voorstel op', () => {
  // Twee kolommen die even goed passen betekent dat het model het niet weet.
  // Dan is zwijgen het juiste antwoord: een verkeerde koppeling laat een gat
  // verdwijnen dat er wél is, en dat ziet niemand meer terug.
  const attributes = [{ key: 'kleur', vector: v(1, 0) }];
  const columns = [
    { key: 'kleur_a', vector: v(1, 0.02) },
    { key: 'kleur_b', vector: v(1, 0.021) },
  ];
  assert.deepEqual(suggestMappings(attributes, columns, [], { minMargin: 0.05, centred: true }), []);
});

test('centreren haalt de gedeelde richting eruit', () => {
  // Zonder dit lijken alle namen in een stoffencatalogus op elkaar en wint een
  // algemene kolom van de juiste. Gemeten op echte data: vier op zes goed
  // zonder centreren, vijf op vijf ermee.
  const [a, b] = centre([v(1, 1), v(1, 3)]);
  assert.deepEqual(a, [0, -1]);
  assert.deepEqual(b, [0, 1]);
  assert.deepEqual(centre([]), []);

  // De winst is niet synthetisch na te bootsen — hij hangt aan hoe dit model
  // echte namen verdeelt. Gemeten op de catalogus van de testmerchant:
  // `vezelsamenstelling` koos ongecentreerd `main_purpose` boven `material`,
  // en gecentreerd het juiste. Zie de meting in NOTES.md.
});

test('een kolom die al gekoppeld is wordt niet weggekaapt', () => {
  const found = suggestMappings(
    [{ key: 'gewicht_gm2', vector: v(1, 0) }],
    [{ key: 'weight', vector: v(1, 0) }],
    ['weight'], { minMargin: 0, centred: true },
  );
  assert.deepEqual(found, []);
});

test('dezelfde vectoren geven dezelfde voorstellen, ongeacht volgorde', () => {
  const attributes = [
    { key: 'a', vector: v(1, 0, 0) },
    { key: 'b', vector: v(0, 1, 0) },
  ];
  const columns = [
    { key: 'x', vector: v(1, 0, 0) },
    { key: 'y', vector: v(0, 1, 0) },
  ];
  const heen = suggestMappings(attributes, columns, [], { minMargin: 0, centred: true });
  const terug = suggestMappings([...attributes].reverse(), [...columns].reverse(), [], { minMargin: 0, centred: true });
  const sleutel = (list: typeof heen) => [...list].map((f) => `${f.key}:${f.column}`).sort();
  assert.deepEqual(sleutel(heen), sleutel(terug));
});

test('cosinus is 1 bij gelijke richting en 0 bij loodrecht', () => {
  assert.equal(cosine(v(1, 0), v(2, 0)), 1);
  assert.equal(cosine(v(1, 0), v(0, 1)), 0);
  assert.equal(cosine(v(0, 0), v(1, 1)), 0);
});

test('een kolom wordt beschreven met zijn waarden erbij, niet alleen zijn naam', () => {
  // Dit is het verschil met een zoekpatroon: een agent die `gordijn_dichtheid`
  // ziet met "dicht, transparant" eronder weet waar de kolom over gaat.
  const catalogus = ingest('c.csv', [
    'sku;gordijn_dichtheid',
    '1;dicht',
    '2;transparant',
    '3;dicht',
  ].join('\n'));
  const beschrijving = describeColumn('gordijn_dichtheid', catalogus);
  assert.match(beschrijving, /gordijn dichtheid/);
  assert.match(beschrijving, /dicht, transparant/);
  // Ontdubbeld en in vaste volgorde: dezelfde catalogus geeft dezelfde tekst.
  assert.equal(beschrijving, describeColumn('gordijn_dichtheid', catalogus));
});

test('een lege kolom levert alleen zijn naam op', () => {
  const catalogus = ingest('c.csv', 'sku;leeg\n1;');
  assert.equal(describeColumn('leeg', catalogus), 'leeg');
});

test('een kenmerk wordt beschreven met de vraag die erop leunt', () => {
  assert.equal(
    describeAttribute({ key: 'rapport_hoogte_cm', questions: ['Heeft deze stof een rapport?'] }),
    'rapport hoogte cm: Heeft deze stof een rapport?',
  );
  assert.equal(describeAttribute({ key: 'rolbreedte_cm', questions: [] }), 'rolbreedte cm');
});

test('een voorstel vraagt dat ze elkaars beste zijn', () => {
  // Zonder die eis krijgt élk kenmerk een voorstel, ook de tientallen waar geen
  // enkele kolom bij past. Gemeten op echte data: 4 goed / 7 fout zonder,
  // 4 goed / 1 fout mét, zonder een juiste te verliezen.
  const attributes = [
    { key: 'kleur', vector: v(1, 0, 0) },
    // Leunt ook het meest op dezelfde kolom, maar is daar niet de beste voor.
    { key: 'rafelgevoelig', vector: v(0.6, 0.5, 0) },
  ];
  const columns = [
    { key: 'kleur_code', vector: v(1, 0, 0) },
    { key: 'sku', vector: v(0, 0, 1) },
  ];
  const found = suggestMappings(attributes, columns, [], { minMargin: 0, centred: true });
  assert.deepEqual(found.map((f) => [f.key, f.column]), [['kleur', 'kleur_code']]);
});
