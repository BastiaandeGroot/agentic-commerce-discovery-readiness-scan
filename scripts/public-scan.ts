// De openbare meting: wat een agent van een winkel kan zien, zonder dat er iets
// aangeleverd wordt.
//
// Haalt een steekproef productpagina's op, pakt ze uit tot rijen, en draait daar
// de gewone scan overheen. De motor verandert niet: de rijen gaan als JSON door
// `ingest`, precies zoals een catalogusexport dat doet. Wat eruit komt is een
// ondergrens — wat de winkel publiceert, niet wat hij in zijn PIM heeft — en
// juist dat verschil is wat er in het gesprek te bespreken valt.
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
import { extractProduct, jsonLdBlocks, type ProductRow } from '../src/collect/extract';
import {
  isSitemapIndex,
  linksFrom,
  productUrlsFromItemList,
  rankProductLikely,
  sitemapsFromRobots,
  spread,
  urlsFromSitemap,
} from '../src/collect/discover';

/** Hoeveel productpagina's de steekproef telt. Genoeg om iets te zeggen, weinig
 *  genoeg om niemand tot last te zijn. */
const SAMPLE = 30;

/** Hoeveel adressen we hoogstens proberen om die steekproef vol te krijgen. */
const MAX_TRIES = 90;

/** Rustig aan: één verzoek tegelijk, met een pauze ertussen. */
const DELAY_MS = 600;

const AGENT = 'readiness-scan/0.1 (+openbare meting; contact via de site)';

const [target, bankPath] = process.argv.slice(2);
if (!target) {
  console.error('Gebruik: node public-scan.mjs https://winkel.nl [vragenlijst.csv]');
  process.exit(1);
}
const base = new URL(target.startsWith('http') ? target : `https://${target}`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let requests = 0;
async function get(url: string): Promise<string | null> {
  requests++;
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': AGENT, accept: 'text/html,application/xhtml+xml,application/xml' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    await sleep(DELAY_MS);
  }
}

/**
 * Mogen wij hier rondkijken?
 *
 * Alleen de regels voor `*` tellen: wij zijn geen van de bots die winkels bij
 * naam uitsluiten. Staat er een verbod op de hele site, dan stoppen we — ook al
 * is de data publiek. Dat is geen juridische verplichting maar een houding, en
 * die past bij het bedrijf dat zegt dat data van de merchant blijft.
 */
function allowed(robots: string): boolean {
  const blocks = robots.split(/^\s*user-agent:\s*/im).slice(1);
  for (const block of blocks) {
    const [name, ...rest] = block.split('\n');
    if (name.trim() !== '*') continue;
    for (const line of rest) {
      if (/^\s*user-agent:/i.test(line)) break;
      const rule = line.match(/^\s*disallow:\s*(\S*)/i);
      if (rule && rule[1].trim() === '/') return false;
    }
  }
  return true;
}

console.log(`WINKEL     ${base.origin}`);

// --- 1. robots.txt: mag het, en waar staat de sitemap? -----------------------
const robots = (await get(new URL('/robots.txt', base).toString())) ?? '';
if (robots !== '' && !allowed(robots)) {
  console.error('Deze winkel sluit alle bezoekers uit in robots.txt. Gestopt.');
  process.exit(1);
}

const blockedBots = [...robots.matchAll(/^\s*user-agent:\s*(\S+)/gim)]
  .map((match) => match[1])
  .filter((name) => /gptbot|claudebot|perplexity|google-extended|applebot|ccbot|bytespider|amazonbot|meta-external|oai-search/i.test(name));
if (blockedBots.length > 0) {
  console.log(`LET OP     robots.txt noemt ${blockedBots.length} AI-crawler(s) apart: ${blockedBots.join(', ')}`);
}

// --- 2. adressen verzamelen --------------------------------------------------
let candidates: string[] = [];

// Een winkel wijst er vaak meer dan één aan, en dan is er meestal een aparte
// voor producten, categorieën en statische pagina's. Die met producten eerst —
// bij De Groot stond `sitemap_paginas.xml` vooraan, en wie daar stopt meet de
// algemene voorwaarden in plaats van het assortiment.
const sitemaps = [...sitemapsFromRobots(robots), new URL('/sitemap.xml', base).toString()]
  .sort((a, b) => Number(/produc/i.test(b)) - Number(/produc/i.test(a)));

for (const sitemap of sitemaps.slice(0, 4)) {
  const xml = await get(sitemap);
  if (!xml) continue;
  if (isSitemapIndex(xml)) {
    // Een index wijst naar andere sitemaps; twee daarvan is genoeg voor een
    // steekproef en scheelt tientallen verzoeken.
    for (const child of urlsFromSitemap(xml).slice(0, 2)) {
      const inner = await get(child);
      if (inner) candidates.push(...urlsFromSitemap(inner));
    }
  } else {
    candidates.push(...urlsFromSitemap(xml));
  }
  // Genoeg om uit te putten. Doorgaan zou de statische pagina's erbij halen
  // zonder dat de steekproef er beter van wordt.
  if (candidates.length >= 200) break;
}

if (candidates.length === 0) {
  // Geen sitemap — bij Magento eerder regel dan uitzondering. Twee wegen dan,
  // en de tweede is verreweg de beste.
  console.log('SITEMAP    niet gevonden; via de site zelf');

  // De navigatie is bij moderne winkels vaak door JavaScript opgebouwd en staat
  // dus niet in de opgehaalde HTML. `sitemap.html` is de menselijke sitemap en
  // draagt de hele categorieboom wél als gewone links.
  const seeds = new Set<string>();
  for (const path of ['/sitemap.html', '/']) {
    const page = await get(new URL(path, base).toString());
    if (page) for (const link of linksFrom(page, base.toString())) seeds.add(link);
  }

  // En dan het stuk dat de winkel zelf aanwijst: elke categoriepagina draagt een
  // `ItemList` met de adressen van zijn producten. Geen gok op een padpatroon,
  // maar de lijst die een agent ook te zien krijgt.
  const categories = [...seeds]
    .filter((url) => new URL(url).pathname.split('/').filter(Boolean).length <= 2)
    .slice(0, 10);

  for (const category of categories) {
    const page = await get(category);
    if (!page) continue;
    const listed = productUrlsFromItemList(jsonLdBlocks(page));
    candidates.push(...listed);
    if (listed.length === 0) candidates.push(...linksFrom(page, category));
  }
  if (candidates.length === 0) candidates.push(...seeds);
}

const ranked = rankProductLikely(candidates);
// Gespreid over het hele assortiment; zie `spread`.
const shortlist = spread(ranked, MAX_TRIES);
console.log(`ADRESSEN   ${candidates.length} gevonden, ${ranked.length} kandidaten`);

// --- 3. pagina's ophalen en uitpakken ---------------------------------------
const rows: ProductRow[] = [];
for (const url of shortlist) {
  if (rows.length >= SAMPLE) break;
  const html = await get(url);
  if (!html) continue;
  const row = extractProduct(html, url);
  if (row) rows.push(row);
}

console.log(`STEEKPROEF ${rows.length} productpagina's, ${requests} verzoeken`);
if (rows.length === 0) {
  console.error('Geen productpagina\'s herkend. Dit is zelf een bevinding: er staat geen gestructureerde productdata op de pagina.');
  process.exit(1);
}

const columns = new Set<string>();
for (const row of rows) for (const key of Object.keys(row)) columns.add(key);
console.log(`KENMERKEN  ${columns.size} verschillende: ${[...columns].slice(0, 18).join(', ')}${columns.size > 18 ? ' …' : ''}`);

// --- 4. de gewone scan, ongewijzigd -----------------------------------------
const catalog = ingest('openbaar.json', JSON.stringify(rows));

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
const funnel = report.funnel;

console.log(`\nUITKOMST`);
console.log(`  gemiddeld ${funnel.avgAnswered.toFixed(1)} van de ${funnel.avgApplicable.toFixed(0)} vragen beantwoordbaar`);
console.log(`  ${funnel.total} pagina's → ${funnel.qualified} basisgeschikt → ${funnel.findable} volledig`);

console.log(`\nWAT ONTBREEKT`);
for (const gap of report.gaps.slice(0, 12)) {
  console.log(`  ${String(gap.affected).padStart(4)}  ${gap.field.slice(0, 28).padEnd(28)} ${gap.cause.padEnd(11)} ${gap.questions.join(', ')}`);
}

console.log(`\nDit is wat de winkel publiceert, niet wat er in zijn systeem staat.`);
