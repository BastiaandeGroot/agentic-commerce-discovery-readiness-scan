// Een bewaarde analyse herberekenen, zonder de catalogus.
//
// De fout die hier bewaakt wordt: een merchant zet na de scan een vraag uit, en
// het herberekende rapport zegt iets anders dan een nieuwe scan op dezelfde
// vragen zou zeggen. Dan zijn er twee waarheden, en dat is erger dan een rapport
// dat pas na een nieuwe scan bijwerkt.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ingest } from '../src/intake/index';
import { importQuestionList } from '../src/questions/list';
import { generateQuestionSets } from '../src/questions/generate';
import { toggleBaseQuestion, toggleQuestion } from '../src/questions/mutate';
import { runScan } from '../src/engine/report';
import { captureOutcomes, rescoreOutcomes } from '../src/engine/rescore';
import { modelFromReport } from '../src/report/model';
import type { ScanReport } from '../src/domain/types';

const BANK = [
  'id,vraag,laag,categorie,belang,benodigde_attributen',
  'BAS-01,Hoe breed is de stof?,basis,,hoog,baanbreedte',
  'BAS-02,Waar is hij van gemaakt?,basis,,kritiek,materiaal',
  'GOR-01,Hoeveel licht laat het door?,overlay,Gordijnstoffen,kritiek,lichtdoorlatendheid',
  'MEU-01,Hoe slijtvast is hij?,overlay,Meubelstoffen,kritiek,martindale',
].join('\n');

const CATALOG = [
  'sku;title;categories;baanbreedte;materiaal;lichtdoorlatendheid;martindale',
  '1;Geheime velours Bordeaux;Gordijnstoffen;140;katoen;verduisterend;',
  '2;Stof B;Gordijnstoffen;;katoen;;',
  '3;Stof C;Meubelstoffen;140;;;40000',
  '4;Stof D;Meubelstoffen | Gordijnstoffen;140;linnen;;',
  '5;Stof E;;140;;;',
].join('\n');

const vast = { scannedAt: '2026-09-16T00:00:00Z' };

function opzet() {
  const read = importQuestionList([{ name: 'woontextiel.csv', text: BANK }]);
  assert.ok(read.bank, read.errors.join('; '));
  const catalog = ingest('catalogus.csv', CATALOG);
  const state = generateQuestionSets(catalog, [read.bank]);
  return { catalog, state };
}

/** Wat het rapport laat zien; de producten zelf vergelijken we niet, die heeft de snapshot niet. */
function uitkomst(report: ScanReport) {
  const { funnel, distance, questionCoverage, advisory, gaps, categories, productCount, unmatchedCount } = report;
  return { funnel, distance, questionCoverage, advisory, gaps, categories, productCount, unmatchedCount };
}

test('zonder wijziging geeft herberekenen precies het rapport van de scan', () => {
  const { catalog, state } = opzet();
  const report = runScan(catalog, state, vast);
  const { report: opnieuw, unmeasured } = rescoreOutcomes(captureOutcomes(report), state, { filename: 'catalogus.csv', ...vast });
  assert.deepEqual(uitkomst(opnieuw), uitkomst(report));
  assert.deepEqual(unmeasured, []);
});

test('een vraag uitzetten na de scan geeft hetzelfde als opnieuw scannen zonder die vraag', () => {
  const { catalog, state } = opzet();
  const report = runScan(catalog, state, vast);
  const gordijn = state.sets.find((set) => set.category === 'Gordijnstoffen');
  assert.ok(gordijn);
  const minder = toggleBaseQuestion(toggleQuestion(state, vast.scannedAt, gordijn.id, 'GOR-01'), vast.scannedAt, 'BAS-02');

  const { report: opnieuw } = rescoreOutcomes(captureOutcomes(report), minder, { filename: 'catalogus.csv', ...vast });
  assert.deepEqual(uitkomst(opnieuw), uitkomst(runScan(catalog, minder, vast)));
});

test('een vraag die bij de scan uitstond wordt niet verzonnen, maar als niet gemeten gemeld', () => {
  const { catalog, state } = opzet();
  const uit = toggleBaseQuestion(state, vast.scannedAt, 'BAS-01');
  const report = runScan(catalog, uit, vast);
  const { report: opnieuw, unmeasured } = rescoreOutcomes(captureOutcomes(report), state, { filename: 'catalogus.csv', ...vast });
  assert.deepEqual(uitkomst(opnieuw), uitkomst(report));
  assert.ok(unmeasured.some((entry) => entry.questionId === 'BAS-01'));
});

test('een bewaarde analyse weet waarmee beantwoord is, maar niet welke producten', () => {
  const { catalog, state } = opzet();
  const report = runScan(catalog, state, vast);
  const { report: opnieuw } = rescoreOutcomes(captureOutcomes(report), state, { filename: 'catalogus.csv', ...vast });
  const vers = modelFromReport(report, 'nl', 'Alle').questions ?? [];
  const bewaard = modelFromReport(opnieuw, 'nl', 'Alle').questions ?? [];
  assert.ok(vers.some((row) => (row.answeredBy ?? []).length > 0));
  assert.deepEqual(bewaard.map((row) => row.answeredBy), vers.map((row) => row.answeredBy));
  assert.ok(vers.some((row) => (row.answeredProducts ?? []).length > 0));
  assert.ok(bewaard.every((row) => row.answeredProducts === undefined));
});

test('de bewaarde metingen dragen geen productdata', () => {
  const { catalog, state } = opzet();
  const tekst = JSON.stringify(captureOutcomes(runScan(catalog, state, vast)));
  assert.doesNotMatch(tekst, /Geheime velours/);
  assert.doesNotMatch(tekst, /verduisterend|katoen|40000/);
});
