// De sitetoets uitvoeren: ophalen, lezen zoals een agent, het model laten
// koppelen, en elk citaat nalopen.
//
// Dit is de onzuivere kant van `src/collect/answers.ts`. Alleen serverzijdig;
// nooit importeren vanuit een component.
//
// Wat hier de deur uit gaat naar het model: de vragen uit de vragenbank en de
// tekst van openbare pagina's van de winkel. Geen catalogus, geen productrij,
// niets wat de merchant aanleverde.

import Anthropic from '@anthropic-ai/sdk';
import { isSitemapIndex, linksFrom, sitemapsFromRobots, urlsFromSitemap } from '../collect/discover';
import {
  SITE_CHECK_VERSION, SITE_SCHEMA, SITE_SYSTEM,
  agentText, choosePages, isStockQuestion, pathAllowed, readSiteAnswers, sitePrompt, withoutSharedLines,
  type SiteCheck, type SitePage, type SiteQuestion,
} from '../collect/answers';
import { AGENT, AI_BOTS, CollectError, allowed } from './collect';

/**
 * Hetzelfde model als het koppelscherm, om dezelfde reden: het oordeel "deze zin
 * beantwoordt deze vraag" is het hele werk, en de handmeting waar deze toets op
 * rust is met dit model gedaan.
 */
const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16000;
/** Per pagina; een pagina die langer is, leest ook een agent zelden uit. */
const PAGE_CHARS = 40_000;
const DELAY_MS = 350;
const BUDGET_MS = 90_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class SiteCheckFailed extends Error {}

export async function checkSite(
  target: string,
  questions: SiteQuestion[],
  /** De datum van de toets; de aanroeper geeft hem mee. */
  checkedAt: string,
  /** De categorienamen van de merchant; hun pagina's worden als eerste gelezen. */
  preferred: string[] = [],
): Promise<SiteCheck> {
  let base: URL;
  try {
    base = new URL(target.startsWith('http') ? target : `https://${target}`);
  } catch {
    throw new CollectError('Dat is geen geldig webadres.');
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') throw new CollectError('Alleen http en https.');

  const started = Date.now();
  const notes: string[] = [];

  async function get(url: string): Promise<string | null> {
    if (Date.now() - started > BUDGET_MS) return null;
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': AGENT, accept: 'text/html,application/xhtml+xml,application/xml,text/plain' },
        signal: AbortSignal.timeout(15_000),
        redirect: 'follow',
      });
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    } finally {
      await sleep(DELAY_MS);
    }
  }

  // --- Toegang ---------------------------------------------------------------
  const robots = (await get(new URL('/robots.txt', base).toString())) ?? '';
  if (robots !== '' && !allowed(robots)) {
    throw new CollectError('Deze winkel sluit alle bezoekers uit in robots.txt. We lezen hem niet.');
  }
  if (robots === '') notes.push('robots.txt was niet op te halen; mogelijk weert deze site geautomatiseerd verkeer.');
  const namedBots = [...new Set([...robots.matchAll(/^\s*user-agent:\s*(\S+)/gim)].map((match) => match[1]).filter((name) => AI_BOTS.test(name)))];

  // --- Welke pagina's --------------------------------------------------------
  const sitemaps: { name: string; urls: string[] }[] = [];
  const roots = [...new Set([...sitemapsFromRobots(robots), new URL('/sitemap.xml', base).toString()])];
  for (const root of roots.slice(0, 5)) {
    const xml = await get(root);
    if (!xml) continue;
    if (isSitemapIndex(xml)) {
      for (const child of urlsFromSitemap(xml).slice(0, 6)) {
        const inner = await get(child);
        if (inner) sitemaps.push({ name: child, urls: urlsFromSitemap(inner).slice(0, 3000) });
      }
    } else {
      sitemaps.push({ name: root, urls: urlsFromSitemap(xml).slice(0, 3000) });
    }
  }
  if (sitemaps.length === 0) notes.push('Geen sitemap gevonden; de pagina\'s komen uit het menu van de homepage.');

  const home = await get(base.toString());
  const choice = choosePages({ origin: base.origin, sitemaps, links: home ? linksFrom(home, base.toString()) : [], preferred });
  const wanted = [...choice.service, ...choice.categories, ...choice.blogs, ...choice.products];

  // --- Lezen -----------------------------------------------------------------
  const pages: SitePage[] = [];
  let refused = 0;
  for (const url of wanted) {
    if (!pathAllowed(robots, new URL(url).pathname)) {
      refused += 1;
      continue;
    }
    const html = await get(url);
    if (!html) continue;
    const page = agentText(html, url);
    // Een adres dat stil naar de homepage doorstuurt, is geen pagina.
    if (page.text.length > 200) pages.push(page);
  }
  if (refused > 0) notes.push(`${refused} pagina's niet gelezen: robots.txt sluit ze af.`);
  if (Date.now() - started > BUDGET_MS) notes.push('De leestijd was op voordat alle gekozen pagina\'s gelezen waren.');
  if (pages.length === 0) throw new SiteCheckFailed('Er was geen enkele pagina te lezen.');

  // --- Koppelen --------------------------------------------------------------
  const asked = questions.filter((question) => !isStockQuestion(question.label));
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new Anthropic(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {});
  const reading = withoutSharedLines(pages).map((page) => ({ url: page.url, text: page.text.slice(0, PAGE_CHARS) }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SITE_SYSTEM,
    messages: [{ role: 'user', content: sitePrompt(asked, reading) }],
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SITE_SCHEMA as unknown as Record<string, unknown> },
    },
  });
  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
    throw new SiteCheckFailed('Het model gaf geen volledig antwoord.');
  }
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SiteCheckFailed('Het antwoord van het model was niet te lezen.');
  }

  const read = readSiteAnswers(raw, questions, pages);
  if (read.dropped > 0) {
    notes.push(`${read.dropped} antwoord${read.dropped === 1 ? '' : 'en'} van het model verviel${read.dropped === 1 ? '' : 'en'}: het citaat stond niet letterlijk op een gelezen pagina.`);
  }

  return {
    version: SITE_CHECK_VERSION,
    site: base.origin,
    checkedAt,
    model: response.model,
    pages: pages.map((page) => ({ url: page.url, chars: page.text.length })),
    namedBots,
    answers: read.answers,
    notes,
  };
}
