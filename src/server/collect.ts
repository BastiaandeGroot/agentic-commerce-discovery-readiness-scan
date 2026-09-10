// De openbare meting uitvoeren: ophalen, uitpakken, scannen.
//
// Dit is de onzuivere kant van `src/collect/` — hier wordt werkelijk opgehaald.
// Eén plek, want er zijn twee aanroepers: het beheerscherm en het testscript in
// `scripts/`. Twee kopieën van deze volgorde zouden na één wijziging andere
// getallen geven, en dan is een meting van vorige week niets meer waard.
//
// Alleen serverzijdig. Nooit importeren vanuit een component.

import {
  isSitemapIndex,
  linksFrom,
  productUrlsFromItemList,
  rankProductLikely,
  sitemapsFromRobots,
  spread,
  urlsFromSitemap,
} from '../collect/discover';
import { extractProduct, jsonLdBlocks, type ProductRow } from '../collect/extract';

export interface CollectOptions {
  /** Hoeveel productpagina's de steekproef telt. */
  sample: number;
  /** Hoeveel adressen we hoogstens proberen om die steekproef vol te krijgen. */
  tries: number;
  /** Pauze tussen twee verzoeken. Rustig aan is geen beleefdheid maar beleid. */
  delayMs: number;
  /** Harde bovengrens op de looptijd, zodat een trage winkel geen scherm ophangt. */
  budgetMs: number;
}

export const DEFAULTS: CollectOptions = {
  sample: 24,
  tries: 60,
  delayMs: 350,
  budgetMs: 55_000,
};

export interface Collected {
  origin: string;
  rows: ProductRow[];
  /** Hoeveel adressen er in totaal gevonden zijn om uit te kiezen. */
  candidates: number;
  requests: number;
  /** AI-crawlers die deze winkel bij naam noemt in robots.txt. */
  blockedBots: string[];
  /** Wat er onderweg opviel: geen sitemap, tijd op, niets herkend. */
  notes: string[];
}

export class CollectError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const AI_BOTS = /gptbot|claudebot|perplexity|google-extended|applebot|ccbot|bytespider|amazonbot|meta-external|oai-search/i;

/**
 * Mogen wij hier rondkijken?
 *
 * Alleen de regels voor `*` tellen: wij zijn geen van de bots die winkels bij
 * naam uitsluiten. Staat er een verbod op de hele site, dan stoppen we — ook al
 * is de data publiek. Dat is geen juridische verplichting maar een houding, en
 * die past bij het bedrijf dat zegt dat data van de merchant blijft.
 */
export function allowed(robots: string): boolean {
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

/** Wat we zijn, voor wie zijn logboek leest. */
const AGENT = 'readiness-scan/0.1 (openbare meting)';

export async function collectShop(target: string, options: CollectOptions = DEFAULTS): Promise<Collected> {
  let base: URL;
  try {
    base = new URL(target.startsWith('http') ? target : `https://${target}`);
  } catch {
    throw new CollectError('Dat is geen geldig webadres.');
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new CollectError('Alleen http en https.');
  }

  const started = Date.now();
  const notes: string[] = [];
  let requests = 0;

  const outOfTime = () => Date.now() - started > options.budgetMs;

  async function get(url: string): Promise<string | null> {
    if (outOfTime()) return null;
    requests++;
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': AGENT, accept: 'text/html,application/xhtml+xml,application/xml' },
        signal: AbortSignal.timeout(12_000),
        redirect: 'follow',
      });
      if (!response.ok) return null;
      const type = response.headers.get('content-type') ?? '';
      if (!/html|xml/i.test(type)) return null;
      return await response.text();
    } catch {
      return null;
    } finally {
      await sleep(options.delayMs);
    }
  }

  // --- robots.txt: mag het, en waar staat de sitemap? ------------------------
  const robots = (await get(new URL('/robots.txt', base).toString())) ?? '';
  if (robots !== '' && !allowed(robots)) {
    throw new CollectError('Deze winkel sluit alle bezoekers uit in robots.txt. We meten hem niet.');
  }
  if (robots === '') {
    // Geen robots.txt kan twee dingen betekenen, en het verschil doet ertoe: de
    // winkel heeft er geen, of hij weert geautomatiseerd verkeer. Dat tweede
    // gebeurt echt — bij herhaald meten van dezelfde site begint een CDN te
    // knijpen, en dan valt de meting stil terug op een andere weg. Zonder deze
    // notitie ziet die uitkomst er hetzelfde uit als een geslaagde meting, en
    // dat is precies het soort stille afwijking waar dit product niet tegen kan.
    notes.push('robots.txt was niet op te halen. Mogelijk weert deze site geautomatiseerd verkeer; de steekproef kan daardoor kleiner of eenzijdiger zijn.');
  }

  const blockedBots = [...robots.matchAll(/^\s*user-agent:\s*(\S+)/gim)]
    .map((match) => match[1])
    .filter((name) => AI_BOTS.test(name));

  // --- adressen verzamelen ---------------------------------------------------
  const candidates: string[] = [];

  // Een winkel wijst er vaak meer dan één aan, en dan is er meestal een aparte
  // voor producten, categorieën en statische pagina's. Die met producten eerst —
  // bij de eerste echte meting stond de sitemap met algemene voorwaarden vooraan,
  // en wie daar stopt meet de kleine lettertjes in plaats van het assortiment.
  const sitemaps = [...sitemapsFromRobots(robots), new URL('/sitemap.xml', base).toString()]
    .sort((a, b) => Number(/produc/i.test(b)) - Number(/produc/i.test(a)));

  for (const sitemap of sitemaps.slice(0, 4)) {
    const xml = await get(sitemap);
    if (!xml) continue;
    if (isSitemapIndex(xml)) {
      for (const child of urlsFromSitemap(xml).slice(0, 2)) {
        const inner = await get(child);
        if (inner) candidates.push(...urlsFromSitemap(inner));
      }
    } else {
      candidates.push(...urlsFromSitemap(xml));
    }
    if (candidates.length >= 200) break;
  }

  if (candidates.length === 0) {
    notes.push('Geen bruikbare sitemap gevonden; de adressen komen van de site zelf.');

    // De navigatie is bij moderne winkels vaak door JavaScript opgebouwd en staat
    // dus niet in de opgehaalde HTML. `sitemap.html` is de menselijke sitemap en
    // draagt de categorieboom wél als gewone links.
    const seeds = new Set<string>();
    for (const path of ['/sitemap.html', '/']) {
      const page = await get(new URL(path, base).toString());
      if (page) for (const link of linksFrom(page, base.toString())) seeds.add(link);
    }

    // En dan het stuk dat de winkel zelf aanwijst: elke categoriepagina draagt
    // een `ItemList` met de adressen van zijn producten. Geen gok op een
    // padpatroon, maar de lijst die een agent ook te zien krijgt.
    const categories = [...seeds]
      .filter((url) => {
        try {
          return new URL(url).pathname.split('/').filter(Boolean).length <= 2;
        } catch {
          return false;
        }
      })
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

  // --- pagina's ophalen en uitpakken ----------------------------------------
  const shortlist = spread(rankProductLikely(candidates), options.tries);
  const rows: ProductRow[] = [];
  for (const url of shortlist) {
    if (rows.length >= options.sample || outOfTime()) break;
    const html = await get(url);
    if (!html) continue;
    const row = extractProduct(html, url);
    if (row) rows.push(row);
  }

  if (outOfTime() && rows.length < options.sample) {
    notes.push(`De tijd was op na ${rows.length} pagina's; de steekproef is kleiner dan bedoeld.`);
  }

  return { origin: base.origin, rows, candidates: candidates.length, requests, blockedBots, notes };
}
