// Headless testharnas: draait de volledige keten op echte bestanden.
// Niet onderdeel van de app; handig om de motor te controleren zonder browser.

import { readFileSync } from 'node:fs';
import { ingest } from '../src/intake/index';
import { generateQuestionSets, deriveCategories } from '../src/questions/generate';
import { runScan } from '../src/engine/report';

const [feedPath, catalogPath] = process.argv.slice(2);
const t0 = Date.now();

const feed = ingest(feedPath, readFileSync(feedPath, 'utf8'), 'feed');
const catalog = catalogPath
  ? ingest(catalogPath, readFileSync(catalogPath, 'utf8'), 'catalog')
  : undefined;

console.log(`FEED     ${feed.format} — ${feed.products.length} producten`);
console.log(`         ${Object.keys(feed.mapping).length} kolommen herkend, ${feed.unmappedColumns.length} niet geplaatst`);
if (catalog) {
  console.log(`CATALOG  ${catalog.format} — ${catalog.products.length} producten`);
  console.log(`         ${Object.keys(catalog.mapping).length} kolommen herkend, ${catalog.unmappedColumns.length} niet geplaatst`);
}

const categories = deriveCategories(feed, catalog);
console.log(`\nCATEGORIEEN (${categories.length}) — top 8:`);
for (const c of categories.slice(0, 8)) console.log(`  ${String(c.count).padStart(6)}  ${c.name}`);

const questions = generateQuestionSets(feed, catalog);
console.log(`\nVRAGENSETS: ${questions.sets.length}, versie ${questions.version}`);
for (const set of questions.sets) {
  console.log(`  ${set.label.nl} (archetype ${set.archetypeId}, ${set.questions.length} vragen)`);
}

const report = runScan(feed, catalog, questions, { scannedAt: new Date().toISOString() });
console.log(`\nTRECHTER`);
for (const p of ['acp', 'ucp'] as const) {
  const f = report.protocols[p].funnel;
  console.log(`  ${p.toUpperCase()}  ${f.total} -> ${f.findable} vindbaar -> ${f.competitive} concurrerend`);
}
console.log(`  zonder categorie: ${report.unmatchedCount}`);

console.log(`\nOUT-TIER`);
for (const p of ['acp', 'ucp'] as const) {
  for (const w of report.protocols[p].outWarnings) {
    console.log(`  ${p.toUpperCase()}  ${w.affected} x ${w.label.nl}`);
  }
}

console.log(`\nTOP GAPS (ACP)`);
for (const g of report.protocols.acp.gaps.slice(0, 10)) {
  console.log(`  ${String(g.affected).padStart(6)}  ${g.field.padEnd(26)} ${g.tier.padEnd(10)} ${g.cause.padEnd(12)} ${g.owner}`);
}

console.log(`\nONBEANTWOORDE VRAGEN (ACP, top 10)`);
console.log(`  ${'uit feed'.padStart(9)} ${'verrijkbaar'.padStart(12)} ${'totaal'.padStart(7)}  vraag`);
for (const q of report.protocols.acp.questionCoverage.slice(0, 10)) {
  console.log(`  ${String(q.answered).padStart(9)} ${String(q.enrichable).padStart(12)} ${String(q.applicable).padStart(7)}  ${q.label.nl}`);
}

console.log(`\nPER CATEGORIE (ACP)`);
for (const c of report.protocols.acp.categories.slice(0, 8)) {
  console.log(`  ${String(c.total).padStart(5)}  ${c.category.padEnd(18)} vindbaar ${String(c.findable).padStart(4)}  concurrerend ${String(c.competitive).padStart(4)}  gem. ${c.avgAnswered.toFixed(1)}/${c.avgApplicable.toFixed(0)} vragen`);
}

console.log(`\nVOORBEELDPRODUCTEN (ACP)`);
for (const pr of report.products.slice(0, 5)) {
  const r = pr.perProtocol.acp;
  const ok = r.questions.filter((q) => q.answered).length;
  console.log(`  ${pr.key.padEnd(12)} ${(pr.title ?? '').slice(0, 34).padEnd(36)} ${ok}/${r.questions.length} vragen  ${r.findable ? 'vindbaar' : 'niet vindbaar'}`);
}

console.log(`\nklaar in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
