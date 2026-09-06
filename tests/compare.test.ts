// Vergelijken over tijd. De kern is niet het rekenwerk maar de waarschuwing:
// verschoof de meetlat, dan is een verschil geen vooruitgang.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { toSnapshot } from '../src/engine/snapshot';
import { compareSnapshots } from '../src/engine/compare';

const KOP = 'sku,name,brand,category,description,image,color';
const RIJ = (id: string, kleur: string, materiaal = '') =>
  `${id},Meubelstof ${id},DeGroot,Meubelstoffen,Een stevige meubelstof met een gestreept dessin in ${kleur},https://x/${id}.jpg,${kleur}${materiaal}`;

function snapshot(text: string, id: string, savedAt: string) {
  const catalog = ingest('catalogus.csv', text);
  const report = runScan(catalog, generateQuestionSets(catalog), {
    scannedAt: '2026-01-01T00:00:00.000Z',
  });
  return toSnapshot(report, { id, accountId: 'lokaal', savedAt, label: id });
}

const VOOR = [KOP, RIJ('1', 'blauw'), RIJ('2', 'groen')].join('\n');
const NA = [KOP + ',materiaal', RIJ('1', 'blauw', ',katoen'), RIJ('2', 'groen', ',linnen')].join('\n');

test('een snapshot draagt de uitkomst maar niet de producten', () => {
  const s = snapshot(VOOR, 'a', '2026-01-01T00:00:00.000Z');
  assert.equal(s.productCount, 2);
  assert.equal(s.accountId, 'lokaal');
  assert.ok(s.categories.length > 0);
  // Wat er niet in zit is net zo belangrijk: geen productdata, geen bronbestand.
  assert.equal((s as unknown as Record<string, unknown>).products, undefined);
  assert.equal((s as unknown as Record<string, unknown>).sources, undefined);
  assert.ok(JSON.stringify(s).length < 8000, 'een snapshot moet klein blijven');
});

test('gelijke scans geven overal nul verschil', () => {
  const a = snapshot(VOOR, 'a', '2026-01-01T00:00:00.000Z');
  const b = snapshot(VOOR, 'b', '2026-02-01T00:00:00.000Z');
  const c = compareSnapshots(a, b);
  assert.equal(c.comparable, true);
  assert.equal(c.findable.change, 0);
  assert.equal(c.avgAnswered.change, 0);
  for (const gap of c.gaps) assert.equal(gap.affected.change, 0);
});

test('een aangevuld veld laat het gemiddelde stijgen en een gat verdwijnen', () => {
  const a = snapshot(VOOR, 'a', '2026-01-01T00:00:00.000Z');
  const b = snapshot(NA, 'b', '2026-02-01T00:00:00.000Z');
  const c = compareSnapshots(a, b);
  assert.ok(c.avgAnswered.change > 0, 'meer vragen beantwoord');
  assert.ok(c.avgEarned.change > 0, 'en meer gewichtspunten gehaald');
  assert.ok(c.gaps.some((g) => g.status === 'resolved'), 'een gat is opgelost');
});

test('een verschoven meetlat maakt de vergelijking onbetrouwbaar en zegt waarom', () => {
  const a = snapshot(VOOR, 'a', '2026-01-01T00:00:00.000Z');
  const b = { ...snapshot(VOOR, 'b', '2026-02-01T00:00:00.000Z'), scanVersion: '9.9.9' };
  const c = compareSnapshots(a, b);
  assert.equal(c.comparable, false);
  assert.equal(c.scaleChanged.scanVersion, true);
  assert.equal(c.scaleChanged.fieldRegister, false);
  assert.equal(c.scaleChanged.questionSet, false);
});

test('een vragenset die veranderde telt ook als verschoven meetlat', () => {
  const a = snapshot(VOOR, 'a', '2026-01-01T00:00:00.000Z');
  const b = { ...snapshot(VOOR, 'b', '2026-02-01T00:00:00.000Z'), questionSetVersion: 4 };
  const c = compareSnapshots(a, b);
  assert.equal(c.comparable, false);
  assert.equal(c.scaleChanged.questionSet, true);
});

test('een vragenbank die vernieuwde telt ook als verschoven meetlat', () => {
  const a = snapshot(VOOR, 'a', '2026-01-01T00:00:00.000Z');
  const basis = snapshot(VOOR, 'b', '2026-02-01T00:00:00.000Z');
  const b = { ...basis, banks: basis.banks.map((bank) => ({ ...bank, version: '2.0.0' })) };
  const c = compareSnapshots(a, b);
  // Een bank die onder de merchant vernieuwt beweegt zijn cijfer zonder dat hij
  // iets deed. Dat mag nooit op vooruitgang lijken.
  assert.equal(c.comparable, false);
  assert.equal(c.scaleChanged.bank, true);
});

test('een categorie die alleen in de nieuwe scan zit wordt als zodanig gemarkeerd', () => {
  const a = snapshot(VOOR, 'a', '2026-01-01T00:00:00.000Z');
  const extra = [KOP, RIJ('1', 'blauw'), RIJ('2', 'groen'),
    '3,Gordijnstof Effen,DeGroot,Gordijnstoffen,Een lichte gordijnstof die veel daglicht doorlaat overdag,https://x/3.jpg,wit'].join('\n');
  const b = snapshot(extra, 'b', '2026-02-01T00:00:00.000Z');
  const c = compareSnapshots(a, b);
  const nieuw = c.categories.find((cat) => cat.presence === 'only-after');
  assert.ok(nieuw, 'de nieuwe categorie moet herkenbaar zijn');
  assert.equal(nieuw?.total.before, 0);
});
