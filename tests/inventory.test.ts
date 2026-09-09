// Wat het koppelscherm laat zien over vragen die meer dan één kenmerk vragen.
//
// De fout die hier bewaakt wordt is stil: een merchant koppelt de rolbreedte,
// ziet een gekoppeld kenmerk, en denkt dat "hoeveel meter heb ik nodig" nu
// beantwoord is. Dat is niet zo zolang de rapporthoogte nergens op uitkomt — een
// som heeft al zijn termen — en zonder waarschuwing ontdekt hij dat pas in het
// rapport, zonder te weten waar het gat vandaan kwam.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attributeInventory } from '../src/questions/mapping';
import type { Bilingual, Question, QuestionSetState, RequirementGroup } from '../src/domain/types';

const two = (nl: string): Bilingual => ({ nl, en: nl });

function group(key: string, fields: string[]): RequirementGroup {
  return { attributeKey: key, label: two(key), fields, mode: 'any' };
}

function question(id: string, mode: 'any' | 'all', evidence: RequirementGroup[]): Question {
  return {
    id,
    label: two(`vraag ${id}`),
    intent: 'quantity',
    importance: 'critical',
    scored: true,
    mode,
    evidence,
  } as unknown as Question;
}

function stateWith(q: Question): QuestionSetState {
  return {
    sets: [{ category: 'Stoffen', productCount: 10, questions: [q] }],
    overlays: [],
    version: 1,
  } as unknown as QuestionSetState;
}

test('een som meldt de term die nog ontbreekt', () => {
  const state = stateWith(question('h13', 'all', [
    group('rolbreedte', ['dimensions']),
    group('rapporthoogte', []),
  ]));

  const rows = attributeInventory(state);
  const width = rows.find((row) => row.key === 'rolbreedte');

  assert.equal(width?.blocked.length, 1);
  assert.deepEqual(width?.blocked[0]?.missing.map((one) => one.key), ['rapporthoogte']);
});

test('bewijs dat stapelt blokkeert niets', () => {
  // Bij `any` volstaat één attribuut: een agent antwoordt met wat hij heeft.
  const state = stateWith(question('h20', 'any', [
    group('uv-bestendigheid', ['attr:^uv$']),
    group('toepassing', []),
  ]));

  const rows = attributeInventory(state);
  assert.deepEqual(rows.map((row) => row.blocked.length), [0, 0]);
});

test('de keuze van nu telt mee, ook voordat hij toegepast is', () => {
  const state = stateWith(question('h13', 'all', [
    group('rolbreedte', ['dimensions']),
    group('rapporthoogte', []),
  ]));

  // Zonder dit zou de waarschuwing blijven staan bij een kenmerk dat de
  // merchant zojuist in het scherm gekoppeld heeft.
  const rows = attributeInventory(state, { rapporthoogte: ['patroon_hoogte'] });
  assert.equal(rows.find((row) => row.key === 'rolbreedte')?.blocked.length, 0);

  // En andersom: "geen kolom" is een geldig antwoord, en dan blijft het gat.
  const cleared = attributeInventory(state, { rapporthoogte: [] });
  assert.equal(cleared.find((row) => row.key === 'rolbreedte')?.blocked.length, 1);
});
