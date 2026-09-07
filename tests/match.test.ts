// De koppeling van bankattribuut naar catalogus­kolom.
//
// Wat hier bewaakt wordt is vooral wat de matcher *niet* doet. Een gemiste
// koppeling toont een gat dat er niet is: vervelend, zichtbaar, te herstellen.
// Een verkeerde koppeling laat een gat verdwijnen dat er wél is, en dat is de
// enige fout waaraan dit product zijn bestaansrecht verliest. De helft van deze
// tests gaat daarom over treffers die niet mogen vallen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchAttributes } from '../src/spec/match';
import { glued, meaningfulWords } from '../src/spec/lexicon';

/** Alleen de kolommen van dit attribuut; leeg als er niets gekoppeld is. */
function columnsFor(key: string, attributes: string[], columns: string[]): string[] {
  const match = matchAttributes(attributes.map((k) => ({ key: k })), columns)
    .find((entry) => entry.key === key);
  return match?.columns ?? [];
}

test('schrijfwijze draagt geen betekenis', () => {
  // Dit is de meest voorkomende vorm van het probleem in echte data: de bank
  // schrijft het aan elkaar met een eenheid, het systeem los zonder.
  assert.equal(glued('rolbreedte_cm'), 'rolbreedte');
  assert.equal(glued('rol_breedte'), 'rolbreedte');
  assert.equal(glued('fabricWidth'), 'fabricwidth');
  assert.deepEqual(columnsFor('rolbreedte_cm', ['rolbreedte_cm'], ['rol_breedte', 'color']), ['rol_breedte']);
  assert.deepEqual(columnsFor('stofhoogte_cm', ['stofhoogte_cm'], ['stof_hoogte']), ['stof_hoogte']);
});

test('dezelfde betekenis in twee talen', () => {
  assert.deepEqual(meaningfulWords('gewicht_gm2'), ['weight']);
  assert.deepEqual(meaningfulWords('weight'), ['weight']);
  assert.deepEqual(columnsFor('gewicht_gm2', ['gewicht_gm2'], ['weight', 'sku']), ['weight']);
});

test('een gedeelde kern is niet genoeg', () => {
  // Alle drie deelden hun laatste woord met een kolom en gaan over iets heel
  // anders. Zonder de eis dat élk woord terugkomt, koppelden ze alle drie fout —
  // en dan verdwijnt er een gat dat de merchant wél heeft.
  assert.deepEqual(columnsFor('staal_beschikbaar', ['staal_beschikbaar'], ['availability']), []);
  assert.deepEqual(columnsFor('kwaliteit_id', ['kwaliteit_id'], ['id', 'sku']), []);
  assert.deepEqual(columnsFor('kleurcode_leverancier', ['kleurcode_leverancier'], ['supplier']), []);
});

test('een halve naam is een andere naam', () => {
  // `status` zit in `collectiestatus`, maar het weggelaten deel is juist het
  // deel dat het kenmerk onderscheidt: een collectiestatus zegt of je over een
  // jaar nog kunt nabestellen, een productstatus of het item online staat.
  assert.deepEqual(columnsFor('collectiestatus', ['collectiestatus'], ['status']), []);
  // Wel als het weggelaten deel klein is ten opzichte van het geheel.
  assert.deepEqual(columnsFor('rolbreedte', ['rolbreedte'], ['stof_rolbreedte']), ['stof_rolbreedte']);
});

test('kolommen concurreren; de beste past krijgt hem', () => {
  // Zonder die concurrentie grijpen ze allebei naar `rol_breedte`, en wordt
  // "heeft deze stof een rapport" beantwoord met de baanbreedte.
  const attributes = ['rolbreedte_cm', 'rapport_breedte_cm'];
  const columns = ['rol_breedte', 'rapport_breedte'];
  assert.deepEqual(columnsFor('rolbreedte_cm', attributes, columns), ['rol_breedte']);
  assert.deepEqual(columnsFor('rapport_breedte_cm', attributes, columns), ['rapport_breedte']);

  // En als de betere kandidaat ontbreekt, gaat de kolom niet alsnog naar de
  // zwakkere: liever geen koppeling dan de verkeerde.
  assert.deepEqual(columnsFor('rapport_breedte_cm', attributes, ['rol_breedte']), []);
});

test('vakwoorden uit de lijst zelf tellen als naam', () => {
  // Generieke taal kan de motor aan, vaktaal niet: `rapport` is hier een
  // patroonherhaling en dat weet alleen de vragenlijst. Daarom mag hij het
  // zeggen, in plaats van dat wij het per markt in code zetten.
  assert.deepEqual(
    matchAttributes([{ key: 'rapport_hoogte_cm', namedAs: ['patroon_hoogte'] }], ['patroon_hoogte'])
      .map((match) => match.columns),
    [['patroon_hoogte']],
  );
  assert.deepEqual(columnsFor('rapport_hoogte_cm', ['rapport_hoogte_cm'], ['patroon_hoogte']), []);
});

test('de uitkomst hangt niet van de volgorde af', () => {
  const attributes = ['rolbreedte_cm', 'gewicht_gm2', 'stofhoogte_cm'];
  const columns = ['stof_hoogte', 'weight', 'rol_breedte', 'sku'];
  const forward = matchAttributes(attributes.map((key) => ({ key })), columns);
  const backward = matchAttributes([...attributes].reverse().map((key) => ({ key })), [...columns].reverse());
  const asSet = (list: typeof forward) =>
    [...list].map((m) => `${m.key}:${[...m.columns].sort().join(',')}`).sort();
  assert.deepEqual(asSet(forward), asSet(backward));
});

test('de basis van een koppeling reist mee, zodat hij te controleren is', () => {
  const matches = matchAttributes(
    [{ key: 'rolbreedte_cm' }, { key: 'gewicht_gm2' }],
    ['rol_breedte', 'weight'],
  );
  assert.deepEqual(matches.map((match) => match.basis), ['identiek', 'woorden']);
});

test('zonder betekenisvol woord wordt er niets gekoppeld', () => {
  // Een naam die alleen uit eenheden en vulwoorden bestaat kan nergens op slaan.
  assert.deepEqual(meaningfulWords('info_value_cm'), []);
  assert.deepEqual(columnsFor('info_value_cm', ['info_value_cm'], ['info', 'value']), []);
});
