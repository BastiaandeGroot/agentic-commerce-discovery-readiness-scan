// Headless testharnas: draait de volledige keten op een echte catalogusexport.
// Niet onderdeel van de app; handig om de motor te controleren zonder browser.

import { readFileSync } from 'node:fs';
import { ingest } from '../src/intake/index';
import { generateQuestionSets, deriveCategories } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { importBank } from '../src/questions/import';
import type { QuestionBank } from '../src/questions/bank';

const [catalogPath, bankPath] = process.argv.slice(2);
const t0 = Date.now();

const catalog = ingest(catalogPath, readFileSync(catalogPath, 'utf8'));

// Optioneel een onderzochte vragenbank meegeven; zonder valt hij terug op de
// meegeleverde voorlopige banken, net als in de app.
let banks: QuestionBank[] = [];
if (bankPath) {
  const result = importBank(readFileSync(bankPath, 'utf8'));
  if (result.errors.length > 0) {
    console.error(`BANK GEWEIGERD (${bankPath}):`);
    for (const error of result.errors) console.error(`  ${error}`);
    process.exit(1);
  }
  banks = result.bank ? [result.bank] : [];
  for (const warning of result.warnings) console.log(`BANK LET OP  ${warning}`);
}

console.log(`CATALOGUS  ${catalog.format} — ${catalog.products.length} producten`);
console.log(`           ${Object.keys(catalog.mapping).length} kolommen herkend, ${catalog.unmappedColumns.length} niet geplaatst`);

const categories = deriveCategories(catalog);
console.log(`\nCATEGORIEEN (${categories.length}) — top 8:`);
for (const c of categories.slice(0, 8)) console.log(`  ${String(c.count).padStart(6)}  ${c.name}`);

const questions = generateQuestionSets(catalog, banks);
console.log(`\nVRAGENSETS: ${questions.sets.length}, versie ${questions.version}`);
for (const set of questions.sets) {
  console.log(`  ${set.label.nl} (bank ${set.bankId ?? '—'} ${set.bankVersion ?? ''}, ${set.questions.length} vragen)`);
}

const report = runScan(catalog, questions, { scannedAt: new Date().toISOString() });
const f = report.funnel;
console.log(`\nTRECHTER`);
console.log(`  ${f.total} -> ${f.qualified} basisgeschikt -> ${f.findable} volledig`);
console.log(`  gemiddeld ${f.avgAnswered.toFixed(1)}/${f.avgApplicable.toFixed(0)} vragen, ${f.avgEarned.toFixed(1)}/${f.avgWeight.toFixed(0)} punten`);
console.log(`  zonder categorie: ${report.unmatchedCount}`);

console.log(`\nGROOTSTE GATEN`);
console.log(`  ${'aantal'.padStart(6)}  ${'veld'.padEnd(30)} ${'oorzaak'.padEnd(11)} ${'eigenaar'.padEnd(10)} vragen`);
for (const g of report.gaps.slice(0, 12)) {
  console.log(`  ${String(g.affected).padStart(6)}  ${g.field.slice(0, 30).padEnd(30)} ${g.cause.padEnd(11)} ${g.owner.padEnd(10)} ${g.questions.join(', ')}`);
}

console.log(`\nONBEANTWOORDE VRAGEN (top 10)`);
console.log(`  ${'belang'.padEnd(9)} ${'goed'.padStart(6)} ${'leeg'.padStart(6)} ${'mager'.padStart(6)} ${'deels'.padStart(6)} ${'geen veld'.padStart(10)} ${'totaal'.padStart(7)}  vraag`);
for (const q of report.questionCoverage.slice(0, 10)) {
  console.log(`  ${q.importance.padEnd(9)} ${String(q.answered).padStart(6)} ${String(q.empty).padStart(6)} ${String(q.unusable).padStart(6)} ${String(q.incomplete).padStart(6)} ${String(q.absent).padStart(10)} ${String(q.applicable).padStart(7)}  ${q.label.nl}`);
}

if (report.advisory.length > 0) {
  console.log(`\nBUITEN DE SCORE (advies)`);
  for (const a of report.advisory) console.log(`  ${a.importance.padEnd(9)} ${a.label.nl}`);
}

console.log(`\nPER CATEGORIE`);
for (const c of report.categories.slice(0, 8)) {
  console.log(`  ${String(c.total).padStart(5)}  ${c.category.padEnd(18)} basis ${String(c.qualified).padStart(5)}  volledig ${String(c.findable).padStart(4)}  gem. ${c.avgAnswered.toFixed(1)}/${c.avgApplicable.toFixed(0)} vragen, ${c.avgEarned.toFixed(1)}/${c.avgWeight.toFixed(0)} punten`);
}

console.log(`\nVOORBEELDPRODUCTEN`);
for (const pr of report.products.slice(0, 5)) {
  const ok = pr.questions.filter((q) => q.answered).length;
  console.log(`  ${pr.key.padEnd(12)} ${(pr.title ?? '').slice(0, 34).padEnd(36)} ${ok}/${pr.questions.length} vragen  ${pr.findable ? 'volledig' : 'niet volledig'}`);
}

console.log(`\nklaar in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
