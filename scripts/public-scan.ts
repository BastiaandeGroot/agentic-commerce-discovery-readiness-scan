// De openbare meting vanaf de opdrachtregel.
//
// Zelfde meting als het beheerscherm — letterlijk dezelfde code, uit
// `src/server/collect.ts`. Twee kopieën zouden na één wijziging andere getallen
// geven, en dan is een meting van vorige week niets meer waard.
//
// Handig om winkels door te meten zonder in te loggen, en om te zien wat er
// onderweg gebeurt.
//
// Draaien:
//   npx esbuild scripts/public-scan.ts --bundle --platform=node --format=esm --outfile=/tmp/public-scan.mjs
//   node /tmp/public-scan.mjs https://voorbeeld.nl [vragenlijst.csv]

import { readFileSync } from 'node:fs';
import { ingest } from '../src/intake/index';
import { generateQuestionSets, deriveCategories } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { importQuestionList } from '../src/questions/list';
import type { QuestionBank } from '../src/questions/bank';
import { collectShop, CollectError, DEFAULTS } from '../src/server/collect';

const [target, bankPath] = process.argv.slice(2);
if (!target) {
  console.error('Gebruik: node public-scan.mjs https://winkel.nl [vragenlijst.csv]');
  process.exit(1);
}

// Op de opdrachtregel mag het ruimer dan in een scherm: hier wacht niemand op
// een antwoord binnen een minuut.
let collected;
try {
  collected = await collectShop(target, { ...DEFAULTS, sample: 30, tries: 90, budgetMs: 300_000 });
} catch (caught) {
  console.error(caught instanceof CollectError ? caught.message : String(caught));
  process.exit(1);
}

console.log(`WINKEL     ${collected.origin}`);
if (collected.blockedBots.length > 0) {
  console.log(`LET OP     robots.txt sluit ${collected.blockedBots.length} AI-crawler(s) uit: ${collected.blockedBots.join(', ')}`);
}
for (const note of collected.notes) console.log(`NOTITIE    ${note}`);
console.log(`ADRESSEN   ${collected.candidates} gevonden`);
console.log(`STEEKPROEF ${collected.rows.length} productpagina's, ${collected.requests} verzoeken`);

if (collected.rows.length === 0) {
  console.error("Geen productpagina's herkend. Dit is zelf een bevinding: er staat geen gestructureerde productdata op de pagina.");
  process.exit(1);
}

const columns = new Set<string>();
for (const row of collected.rows) for (const key of Object.keys(row)) columns.add(key);
console.log(`KENMERKEN  ${columns.size}: ${[...columns].slice(0, 18).join(', ')}${columns.size > 18 ? ' …' : ''}`);

// --- de gewone scan, ongewijzigd --------------------------------------------
const catalog = ingest('openbaar.json', JSON.stringify(collected.rows));

let banks: QuestionBank[] = [];
if (bankPath) {
  const read = importQuestionList([{ name: bankPath, text: readFileSync(bankPath, 'utf8') }]);
  if (read.errors.length > 0) {
    console.error(`BANK GEWEIGERD: ${read.errors.join(' ')}`);
    process.exit(1);
  }
  banks = read.bank ? [read.bank] : [];
}

const categories = deriveCategories(catalog);
console.log(`\nCATEGORIEEN (${categories.length}) — top 6:`);
for (const category of categories.slice(0, 6)) {
  console.log(`  ${String(category.count).padStart(4)}  ${category.name}`);
}

const questions = generateQuestionSets(catalog, banks);
const report = runScan(catalog, questions, { scannedAt: new Date().toISOString() });

console.log(`\nUITKOMST`);
console.log(`  gemiddeld ${report.funnel.avgAnswered.toFixed(1)} van de ${report.funnel.avgApplicable.toFixed(0)} vragen beantwoordbaar`);

console.log(`\nPER VRAAG`);
for (const question of report.questionCoverage.filter((one) => one.scored)) {
  const ok = question.answered >= question.applicable ? '✓' : ' ';
  console.log(`  ${ok} ${String(question.answered).padStart(3)}/${String(question.applicable).padEnd(4)} ${question.label.nl}`);
}

console.log(`\nDit is wat de winkel publiceert, niet wat er in zijn systeem staat.`);
