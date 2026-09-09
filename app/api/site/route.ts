// De tweede serverroute: lezen wat een webshop zelf een categorie noemt.
//
// Waarom dit niet in de browser kan: een pagina van een ander domein ophalen
// blokkeert elke browser. En waarom het geen model raakt: dit is lezen en
// vergelijken, geen oordeel. Wat eruit komt zijn woorden van de site zelf.
//
// Wat er de deur uit gaat: de URL van de winkel van de merchant, en die is
// openbaar. Er gaat geen productdata naartoe — de catalogus blijft waar hij is.
// Wat terugkomt zijn namen: wat op de site een categorie is, en wat een filter.
//
// Generiek gebouwd. De winkel waarop dit gemeten is, is één voorbeeld; de regels
// staan in `src/intake/sitescan.ts` en leunen op conventies die platformen
// delen, niet op het thema van één winkel.

import { NextResponse } from 'next/server';
import { readSiteEvidence } from '../../../src/intake/sitescan';
import type { SiteEvidence } from '../../../src/intake/facets';

/** Grenzen. Wij zijn te gast op andermans server en gedragen ons daarnaar. */
const LIMITS = {
  /** Genoeg voor de hoofdcategorieën; de rest voegt dezelfde woorden toe. */
  pages: 8,
  /** Per pagina. Een categoriepagina die groter is, is geen categoriepagina. */
  bytes: 3_000_000,
  /** Per verzoek, in milliseconden. */
  timeout: 10_000,
  /** Tussen twee verzoeken naar dezelfde host. */
  delay: 400,
};

const AGENT = 'AgenticCommerceReadinessScan/1.0 (+catalogusscan; respecteert robots.txt)';

interface Payload {
  /** De winkel zelf, bijvoorbeeld https://voorbeeld.nl */
  site: string;
  /**
   * De categoriepagina's om te lezen. Komen uit de export van de merchant, die
   * per categorie vaak al een URL draagt — dan hoeven we niet te zoeken. Zijn ze
   * er niet, dan volstaat de homepage: het menu staat daar ook.
   */
  urls?: string[];
}

export interface SiteScanResult extends SiteEvidence {
  /** Welke pagina's echt gelezen zijn; herkomst hoort navolgbaar te zijn. */
  read: string[];
  /** Wat er misging, per pagina, in mensentaal. */
  skipped: { url: string; reason: string }[];
  /**
   * Of de pagina's leeg leken.
   *
   * Een webshop die zijn menu met JavaScript opbouwt levert HTML zonder links.
   * Dan is "geen categorieën gevonden" een verkeerde conclusie: we hebben niet
   * gekeken, we konden niet kijken. Dat verschil hoort in beeld.
   */
  likelyClientRendered: boolean;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url: string): Promise<{ ok: true; body: string } | { ok: false; reason: string }> {
  const stop = AbortSignal.timeout(LIMITS.timeout);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': AGENT, accept: 'text/html' },
      signal: stop,
      redirect: 'follow',
    });
    if (!response.ok) return { ok: false, reason: `de server antwoordde met ${response.status}` };
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('html')) return { ok: false, reason: 'dit is geen webpagina' };
    const body = await response.text();
    if (body.length > LIMITS.bytes) return { ok: false, reason: 'de pagina is te groot om te lezen' };
    return { ok: true, body };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { ok: false, reason: timedOut ? 'de pagina reageerde niet op tijd' : 'de pagina was niet bereikbaar' };
  }
}

/**
 * `robots.txt` lezen en volgen.
 *
 * Niet omdat het moet maar omdat het hoort: we lezen andermans site zonder dat
 * iemand daar op dat moment achter een scherm zit. Alleen de regels voor `*`
 * en voor onszelf tellen, en een `Disallow:` zonder pad betekent niets
 * verbieden — dat staat zo in de standaard en wordt vaak verkeerd gelezen.
 */
async function disallowedPaths(origin: string): Promise<string[]> {
  const result = await get(`${origin}/robots.txt`).catch(() => ({ ok: false as const, reason: '' }));
  // Geen robots.txt is geen verbod; dan gelden er geen regels.
  if (!result.ok) return [];
  const lines = result.body.split(/\r?\n/).map((line) => line.replace(/#.*/, '').trim());
  const paths: string[] = [];
  let listening = false;
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') listening = value === '*' || AGENT.toLowerCase().startsWith(value.toLowerCase());
    else if (listening && key === 'disallow' && value !== '') paths.push(value);
  }
  return paths;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Het verzoek was geen geldige JSON.' }, { status: 400 });
  }

  let base: URL;
  try {
    base = new URL(payload.site);
    if (base.protocol !== 'https:' && base.protocol !== 'http:') throw new Error('protocol');
  } catch {
    return NextResponse.json(
      { error: 'Dit is geen geldig webadres. Vul het adres van je webshop in, bijvoorbeeld https://jouwwinkel.nl' },
      { status: 400 },
    );
  }

  const origin = base.origin;
  const host = base.hostname.replace(/^www\./, '');

  // Alleen pagina's op de winkel zelf, en nooit meer dan de grens. De homepage
  // staat vooraan: die draagt het hoofdmenu, ook als er geen categorie-URL's
  // meegegeven zijn.
  const wanted = [base.toString(), ...(payload.urls ?? [])]
    .map((url) => { try { return new URL(url, origin); } catch { return undefined; } })
    .filter((url): url is URL => url !== undefined)
    .filter((url) => url.hostname.replace(/^www\./, '') === host);

  const unique: URL[] = [];
  const seen = new Set<string>();
  for (const url of wanted) {
    const key = url.pathname;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(url);
    if (unique.length >= LIMITS.pages) break;
  }

  const blocked = await disallowedPaths(origin);
  const navigation = new Set<string>();
  const filters = new Set<string>();
  const read: string[] = [];
  const skipped: SiteScanResult['skipped'] = [];
  let sawLinks = false;

  for (const [index, url] of unique.entries()) {
    if (blocked.some((path) => url.pathname.startsWith(path))) {
      skipped.push({ url: url.toString(), reason: 'de robots.txt van de site verbiedt deze pagina' });
      continue;
    }
    // Rustig aan tussen twee verzoeken; de eerste hoeft niet te wachten.
    if (index > 0) await wait(LIMITS.delay);

    const page = await get(url.toString());
    if (!page.ok) {
      skipped.push({ url: url.toString(), reason: page.reason });
      continue;
    }
    const evidence = readSiteEvidence(page.body, host);
    for (const name of evidence.navigation) navigation.add(name);
    for (const name of evidence.filters) filters.add(name);
    if (evidence.navigation.length + evidence.filters.length > 0) sawLinks = true;
    read.push(url.toString());
  }

  const result: SiteScanResult = {
    navigation: [...navigation],
    filters: [...filters],
    read,
    skipped,
    likelyClientRendered: read.length > 0 && !sawLinks,
  };
  return NextResponse.json(result);
}
