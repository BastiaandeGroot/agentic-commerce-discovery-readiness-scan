// De YAML-lezer. Klein genoeg om zelf te schrijven, groot genoeg om te testen —
// en de randgevallen zijn precies die waar een vragenbank uit bestaat.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml, YamlError } from '../src/questions/yaml';

test('geneste mappings en lijsten van mappings', () => {
  const value = parseYaml([
    'meta:',
    '  vertical: stoffen',
    '  panelomvang: 6',
    'vragen:',
    '  - id: BAS-01',
    '    vraag: Hoeveel meter heb ik nodig?',
    '    dekking: 6',
    '  - id: BAS-02',
    '    vraag: Waarvoor is het geschikt?',
  ].join('\n')) as Record<string, unknown>;

  assert.deepEqual(value.meta, { vertical: 'stoffen', panelomvang: 6 });
  assert.deepEqual(value.vragen, [
    { id: 'BAS-01', vraag: 'Hoeveel meter heb ik nodig?', dekking: 6 },
    { id: 'BAS-02', vraag: 'Waarvoor is het geschikt?' },
  ]);
});

test('een dubbele punt in een tekst breekt de sleutel niet', () => {
  // "Let op: dit is een tekst" is een geldige waarde en geen tweede sleutel.
  const value = parseYaml('vraag: "Let op: dit is een tekst"') as Record<string, unknown>;
  assert.equal(value.vraag, 'Let op: dit is een tekst');
});

test('een hekje binnen aanhalingstekens is geen commentaar', () => {
  const value = parseYaml([
    'kleur: "#hashtag"   # dit wel',
    'nummer: 3',
  ].join('\n')) as Record<string, unknown>;
  assert.equal(value.kleur, '#hashtag');
  assert.equal(value.nummer, 3);
});

test('inline lijsten en mappings', () => {
  const value = parseYaml([
    'bron: [faq, review, vakkennis]',
    'weging: {kritiek: 5, hoog: 3}',
    'leeg: []',
  ].join('\n')) as Record<string, unknown>;
  assert.deepEqual(value.bron, ['faq', 'review', 'vakkennis']);
  assert.deepEqual(value.weging, { kritiek: 5, hoog: 3 });
  assert.deepEqual(value.leeg, []);
});

test('blokteksten met | en >', () => {
  const value = parseYaml([
    'letterlijk: |',
    '  eerste regel',
    '  tweede regel',
    'gevouwen: >-',
    '  een lange zin',
    '  die doorloopt',
    'daarna: true',
    'nederlands: ja',
  ].join('\n')) as Record<string, unknown>;
  assert.equal(value.letterlijk, 'eerste regel\ntweede regel\n');
  assert.equal(value.gevouwen, 'een lange zin die doorloopt');
  // De bloktekst eindigt waar de inspringing terugvalt, en niet één regel later.
  assert.equal(value.daarna, true);
  // "ja" is geen YAML-boolean en wordt dus tekst. Bewust: wie in een Nederlandse
  // bank `ja` schrijft krijgt de tekst terug, niet stilzwijgend een andere waarde.
  assert.equal(value.nederlands, 'ja');
});

test('null, booleans en getallen worden herkend, de rest blijft tekst', () => {
  const value = parseYaml([
    'dekking: 0',
    'niet_onderzocht: null',
    'af: true',
    'versie: "1.0.0"',
    'los: 1.0.0',
  ].join('\n')) as Record<string, unknown>;
  // Nul en niet-onderzocht zijn tegengestelde uitspraken en mogen nooit
  // samenvallen — dat begint hier, bij het lezen.
  assert.equal(value.dekking, 0);
  assert.equal(value.niet_onderzocht, null);
  assert.equal(value.af, true);
  assert.equal(value.versie, '1.0.0');
  assert.equal(value.los, '1.0.0');
});

test('wat de lezer niet aankan, zegt hij met een regelnummer', () => {
  assert.throws(() => parseYaml('basis: &anker\n  x: 1'), YamlError);
  assert.throws(() => parseYaml('geen dubbele punt hier'), (error: Error) => {
    assert.ok(error instanceof YamlError);
    assert.match(error.message, /regel 1/);
    return true;
  });
});
