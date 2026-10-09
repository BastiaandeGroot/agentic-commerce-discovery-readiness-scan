// Een voorbeeld bij een attribuut is altijd een echte waarde.
//
// De fout die hier bewaakt wordt: een retailer vult zijn kenmerk naar een
// voorbeeld dat nergens bestaat. Daarom telt een voorbeeld uit de vragenbank
// alleen met het adres van de pagina waar het staat, en gaan de voorbeelden uit
// zijn eigen catalogus nooit mee de opslag in.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { importQuestionList } from '../src/questions/list';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { toSnapshot } from '../src/engine/snapshot';
import { modelFromReport } from '../src/report/model';

const lijst = () => importQuestionList([{
  name: 'woontextiel.csv',
  text: [
    'id;vraag_nl;vraag_en;laag;categorie;belang;benodigde_attributen;antwoordtype;voorbeeld;voorbeeld_bron',
    'B1;Hoe breed is de rol?;How wide?;base;;hoog;rolbreedte_cm;getal;rolbreedte_cm: 140 cm;rolbreedte_cm: https://winkel.nl/p/1',
    'B2;Hoe slijtvast is hij?;How durable?;base;;hoog;martindale;getal;martindale: 50.000;',
    'B3;Waar is hij van?;Made of?;base;;hoog;vezelmix;tekst;vezelmix: 90% wol, 10% nylon;vezelmix: https://winkel.nl/p/1',
    'B4;Welke maat en vorm?;Size and shape?;base;;laag;maat, vorm;getal;;',
  ].join('\n'),
}]);

test('een voorbeeld telt alleen met de pagina waar het staat', () => {
  const read = lijst();
  assert.ok(read.bank);
  const by = new Map(read.bank.attributes.map((attribute) => [attribute.key, attribute]));
  assert.deepEqual(by.get('rolbreedte_cm')?.examples, [{ value: '140 cm', url: 'https://winkel.nl/p/1' }]);
  // Een komma in de waarde splitst niet.
  assert.deepEqual(by.get('vezelmix')?.examples, [{ value: '90% wol, 10% nylon', url: 'https://winkel.nl/p/1' }]);
  // Zonder bron geen voorbeeld, en dat staat in de uitkomst.
  assert.equal(by.get('martindale')?.examples, undefined);
  assert.ok(read.warnings.some((warning) => /voorbeeld zonder bron/.test(warning) && warning.includes('martindale')));
});

test('het soort antwoord volgt de vraag, maar alleen bij één kenmerk', () => {
  const by = new Map(lijst().bank!.attributes.map((attribute) => [attribute.key, attribute]));
  assert.equal(by.get('rolbreedte_cm')?.type, 'number');
  assert.equal(by.get('vezelmix')?.type, 'text');
  // Bij twee kenmerken is niet te zeggen welk van de twee het getal is.
  assert.equal(by.get('maat')?.type, 'text');
  assert.equal(by.get('vorm')?.type, 'text');
});

test('het rapport toont bij een gat de verwachting, het voorbeeld en de eigen invulling', () => {
  const catalog = ingest('c.csv', [
    // Een eigen kolom, geen standaardveld: daar zoekt een kenmerk uit de bank.
    'sku;categorie;vezelmix',
    '1;Stoffen;100% katoen',
    '2;Stoffen;100% katoen',
    '3;Stoffen;80% katoen, 20% polyester',
    '4;Stoffen;',
  ].join('\n'));
  const state = generateQuestionSets(catalog, [lijst().bank!]);
  const report = runScan(catalog, state, { scannedAt: '2026-10-09T00:00:00Z' });
  const model = modelFromReport(report, 'nl', 'Alle');

  const breedte = model.gaps.find((gap) => gap.expect?.examples?.[0]?.value === '140 cm');
  assert.equal(breedte?.cause, 'unmodelled');
  assert.equal(breedte?.expect?.answerType, 'number');

  // Invulwerk: de eigen waarden, de meest voorkomende eerst.
  const vezelmix = model.gaps.find((gap) => gap.cause === 'unfilled');
  assert.deepEqual(vezelmix?.ownExamples, ['100% katoen', '80% katoen, 20% polyester']);

  // En die eigen waarden gaan niet mee de opslag in.
  const bewaard = JSON.stringify(toSnapshot(report, { id: 'x', accountId: 'a', savedAt: '2026-10-09T00:00:00Z', label: 'x' }));
  assert.ok(!bewaard.includes('100% katoen'));
  // Het voorbeeld van de andere winkel wél: dat is een openbare waarde uit de bank.
  assert.ok(bewaard.includes('140 cm'));
});
