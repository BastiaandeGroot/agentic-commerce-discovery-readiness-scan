// De kritiek-toets: kritiek is de poort voor basisgeschikt, en die blijft smal.
//
// De fout die hier bewaakt wordt: een bank maakte "kan ik retourneren" en "kan
// ik later bijbestellen" kritiek, en dan hangt of een product basisgeschikt is
// af van het retourbeleid van een winkel in plaats van van zijn productdata.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importQuestionList } from '../src/questions/list';
import { applyImportanceCorrections } from '../src/questions/critical';
import { reviewBank } from '../src/questions/review';

const LIJST = [
  'id,vraag_nl,vraag_en,laag,categorie,intentie,belang,benodigde_attributen,antwoordtype,beantwoordbaar_uit_attributen,herweging,kritiek_toets',
  'BAS-01,Hoeveel meter heb ik nodig?,How many metres?,basis,,hoeveelheid,kritiek,rolbreedte_cm,getal,true,,"beslissend: te weinig | onherstelbaar: geknipt | product: breedte"',
  'BAS-02,Kan ik retourneren?,Can I return it?,basis,,koopzekerheid,kritiek,op_maat_gesneden,boolean,gedeeltelijk,,',
  'BAS-03,Waar is het van gemaakt?,What is it made of?,basis,,materiaal,kritiek,samenstelling,tekst,true,"Gordijnstoffen: kritiek [beslissend: x | onherstelbaar: y | product: z]; Meubelstoffen: kritiek",',
  'BAS-04,Kan ik een staal krijgen?,Can I get a swatch?,basis,,koopzekerheid,hoog,,proces,false,Gordijnstoffen: kritiek,',
  'GOR-01,Hoeveel licht?,How much light?,overlay,Gordijnstoffen,functie,kritiek,lichtdoorlatendheid,enum,true,,',
  'GOR-04,Hoeveel meter voor mijn rail?,How many metres for my rail?,overlay,Gordijnstoffen,hoeveelheid,kritiek,"plooifactor, rolbreedte_cm",afgeleid_meters,true,,"beslissend: a | onherstelbaar: b | product: c | uit de catalogus: d"',
  'BAS-05,Hoeveel meter heb ik nodig?,How many metres do I need?,basis,,hoeveelheid,hoog,"rolbreedte_cm, rapport_cm",afgeleid,true,Meubelstoffen: kritiek,',
].join('\n');

function bank() {
  const read = importQuestionList([{ name: 'woontextiel.csv', text: LIJST }]);
  assert.ok(read.bank, read.errors.join('; '));
  return read;
}

test('een kritieke vraag over beleid of voorraad telt als hoog, en dat staat als waarschuwing', () => {
  const read = bank();
  const importance = Object.fromEntries(read.bank!.questions.map((q) => [q.id, q.importance]));
  assert.equal(importance['BAS-01'], 'critical');
  assert.equal(importance['BAS-02'], 'high');
  const gordijn = read.bank!.overlays.find((overlay) => overlay.label.nl === 'Gordijnstoffen');
  // De staalvraag herwogen tot kritiek blijft geen poort.
  assert.equal(gordijn?.reweight?.['BAS-04']?.importance, 'high');
  assert.ok(read.warnings.some((warning) => /BAS-02/.test(warning)));
});

test('een berekening met maten van de koper is nooit een poort, ook niet met toets of herweging', () => {
  const read = bank();
  const gordijn = read.bank!.overlays.find((overlay) => overlay.label.nl === 'Gordijnstoffen');
  const meubel = read.bank!.overlays.find((overlay) => overlay.label.nl === 'Meubelstoffen');
  assert.equal(gordijn?.questions?.find((q) => q.id === 'GOR-04')?.importance, 'high');
  assert.equal(meubel?.reweight?.['BAS-05']?.importance, 'high');
  assert.ok(read.warnings.some((warning) => /berekening/.test(warning) && /GOR-04/.test(warning)));
  // En een beheerder kan hem ook niet tot poort maken.
  const gecorrigeerd = applyImportanceCorrections(read.bank!, { 'GOR-04': 'critical' });
  const gordijn2 = gecorrigeerd.overlays.find((overlay) => overlay.label.nl === 'Gordijnstoffen');
  assert.equal(gordijn2?.questions?.find((q) => q.id === 'GOR-04')?.importance, 'high');
});

test('de toets reist mee door de tabel, ook bij een herweging', () => {
  const read = bank();
  assert.match(read.bank!.questions.find((q) => q.id === 'BAS-01')?.criticalTest ?? '', /onherstelbaar: geknipt/);
  const gordijn = read.bank!.overlays.find((overlay) => overlay.label.nl === 'Gordijnstoffen');
  assert.match(gordijn?.reweight?.['BAS-03']?.why?.nl ?? '', /beslissend: x/);
});

test('het beoordeelscherm vraagt om de toets, en een correctie van de beheerder telt als oordeel', () => {
  const read = bank();
  const zonder = reviewBank(read.bank!);
  const issues = (id: string) => zonder.find((q) => q.id === id)?.issues ?? [];
  assert.deepEqual(issues('BAS-01').includes('critical-without-test'), false);
  assert.ok(issues('BAS-03').includes('critical-without-test'));
  assert.ok(issues('GOR-01').includes('critical-without-test'));
  const meubel = read.bank!.overlays.find((overlay) => overlay.label.nl === 'Meubelstoffen');
  assert.ok(issues(`${meubel!.id}/BAS-03`).includes('critical-without-test'));
  // De herweging mét toets is geen bezwaar.
  const gordijn = read.bank!.overlays.find((overlay) => overlay.label.nl === 'Gordijnstoffen');
  assert.deepEqual(issues(`${gordijn!.id}/BAS-03`), []);

  const corrections = { 'BAS-03': 'high' as const, 'GOR-01': 'critical' as const, [`${meubel!.id}/BAS-03`]: 'high' as const };
  const gecorrigeerd = reviewBank(applyImportanceCorrections(read.bank!, corrections), { 'BAS-03': 'critical', 'GOR-01': 'critical', [`${meubel!.id}/BAS-03`]: 'critical' });
  const row = (id: string) => gecorrigeerd.find((q) => q.id === id);
  assert.equal(row('BAS-03')?.importance, 'high');
  assert.equal(row('BAS-03')?.correctedFrom, 'critical');
  assert.deepEqual(row('GOR-01')?.issues.includes('critical-without-test'), false);
  assert.equal(row(`${meubel!.id}/BAS-03`)?.importance, 'high');
});

test('ook een correctie maakt van een vraag over beleid geen poort', () => {
  const read = bank();
  const bank2 = applyImportanceCorrections(read.bank!, { 'BAS-02': 'critical' });
  assert.equal(bank2.questions.find((q) => q.id === 'BAS-02')?.importance, 'high');
});
