// Welke pagina's van een winkel productpagina's zijn.
//
// Drie wegen, van betrouwbaar naar rommelig, want geen twee winkels doen het
// hetzelfde: de sitemap uit `robots.txt`, de sitemap op het standaardpad, en
// anders de links op de pagina zelf. Bij De Groot Stoffen ontbreekt
// `sitemap.xml` — dat is geen uitzondering maar het normale geval bij Magento,
// dus de derde weg is niet optioneel.
//
// Puur: hier wordt niets opgehaald. De aanroeper haalt op en geeft de tekst mee.

/**
 * De productadressen die een categoriepagina zelf opsomt.
 *
 * Dit is de betrouwbaarste weg en hij was me bijna ontgaan: moderne winkels
 * zetten een `ItemList` in JSON-LD op elke categoriepagina, met de adressen van
 * de producten erin. Dat is geen gok op een padpatroon maar de winkel die zelf
 * zegt wat zijn producten zijn — en het is precies de lijst die een agent ook
 * te zien krijgt.
 */
export function productUrlsFromItemList(blocks: unknown[]): string[] {
  const out: string[] = [];
  const walk = (value: unknown, depth = 0): void => {
    if (depth > 6 || value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) { for (const one of value) walk(one, depth + 1); return; }

    const node = value as Record<string, unknown>;
    const type = node['@type'];
    const types = typeof type === 'string' ? [type] : Array.isArray(type) ? type : [];

    if (types.includes('ListItem')) {
      const url = node.url ?? (node.item as Record<string, unknown> | undefined)?.['@id'] ?? node.item;
      if (typeof url === 'string' && url.startsWith('http')) out.push(url);
    }
    for (const key of ['@graph', 'itemListElement', 'mainEntity']) {
      if (key in node) walk(node[key], depth + 1);
    }
  };
  for (const block of blocks) walk(block);
  return out;
}

/** De sitemaps die `robots.txt` aanwijst. */
export function sitemapsFromRobots(robots: string): string[] {
  return [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((match) => match[1].trim());
}

/** Adressen uit een sitemap, of uit een sitemap-index. */
export function urlsFromSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

/** Wijst deze sitemap naar andere sitemaps in plaats van naar pagina's? */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

const SKIP = /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|css|js|ico)(\?|$)/i;

/**
 * Alle links op een pagina, absoluut gemaakt en binnen hetzelfde domein.
 *
 * Alleen dit domein: we meten één winkel, en een crawler die op een uitgaande
 * link doorloopt is geen meting meer maar een sleepnet.
 */
export function linksFrom(html: string, base: string): string[] {
  const origin = safeOrigin(base);
  if (origin === null) return [];

  const out = new Set<string>();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    const href = match[1].trim();
    if (href === '' || href.startsWith('mailto:') || href.startsWith('tel:') || SKIP.test(href)) continue;
    try {
      const url = new URL(href, base);
      if (url.origin !== origin) continue;
      url.hash = '';
      out.add(url.toString());
    } catch {
      // Een href die geen adres is. Overslaan.
    }
  }
  return [...out];
}

function safeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * De adressen die er het meest uitzien als productpagina.
 *
 * Zonder de pagina op te halen valt dat niet zeker te weten, dus dit is een
 * volgorde en geen oordeel: de aanroeper haalt ze op tot hij er genoeg heeft die
 * werkelijk een product bleken te dragen. Wat afvalt kost één verzoek, en dat is
 * goedkoper dan een filter dat te streng is en de halve winkel mist.
 */
export function rankProductLikely(urls: string[]): string[] {
  const seen = new Set<string>();
  const scored = urls
    .filter((url) => {
      if (seen.has(url) || SKIP.test(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url) => ({ url, score: productScore(url) }))
    .filter((entry) => entry.score > 0);

  // Aflopend op score, en bij gelijke score op adres, zodat dezelfde winkel
  // twee keer dezelfde steekproef geeft. Een meting die per keer een andere
  // dertig pakt, is niet met zichzelf te vergelijken.
  scored.sort((a, b) => (b.score - a.score) || a.url.localeCompare(b.url));
  return scored.map((entry) => entry.url);
}

/** Hoe waarschijnlijk dit een productpagina is, op het adres alleen. */
function productScore(url: string): number {
  const path = url.replace(/^https?:\/\/[^/]+/i, '').toLowerCase();
  const depth = path.split('/').filter(Boolean).length;

  // Duidelijke niet-producten. Nul betekent: niet ophalen.
  if (/\/(cart|winkelwagen|checkout|account|inloggen|login|zoeken|search|blog|nieuws|contact|klantenservice|algemene-voorwaarden|privacy|cookie)(\/|$)/.test(path)) return 0;
  if (path === '' || path === '/') return 0;

  let score = 1;
  // Platformen die hun productpaden verklappen.
  if (/\/(product|products|producten|p)\//.test(path)) score += 4;
  if (/\.html$/.test(path)) score += 2;
  // Een diep pad met een lange laatste kruimel is vaker een product dan een
  // categorie; categorieën staan ondiep en dragen korte namen.
  if (depth >= 2) score += 1;
  const last = path.split('/').filter(Boolean).pop() ?? '';
  if (last.length > 18) score += 1;
  if (/\d/.test(last)) score += 1;
  return score;
}

/**
 * Een steekproef die de winkel eerlijk vertegenwoordigt.
 *
 * Niet de eerste dertig: die komen vaak uit één categorie en dan meet je één
 * hoek van het assortiment. Gespreid over de eerste padsegmenten, zodat elke
 * afdeling meetelt — hetzelfde principe als het sitepanel bij de vragenbank.
 */
export function spread(urls: string[], limit: number): string[] {
  if (urls.length <= limit) return [...urls];

  const buckets = new Map<string, string[]>();
  for (const url of urls) {
    const segment = url.replace(/^https?:\/\/[^/]+/i, '').split('/').filter(Boolean)[0] ?? '';
    const bucket = buckets.get(segment) ?? [];
    bucket.push(url);
    buckets.set(segment, bucket);
  }

  // Alles onder één segment — bij De Groot staat elk product onder `/product/`,
  // en dat is bij de meeste winkels zo. Dan zegt het pad niets over de afdeling
  // en pakken we gelijkmatig verspreid over de hele lijst. De sitemap staat
  // vrijwel altijd op categorievolgorde, dus dat spreidt alsnog over het
  // assortiment — en de eerste dertig zouden allemaal uit één hoek komen.
  if (buckets.size === 1) {
    const step = urls.length / limit;
    const out: string[] = [];
    for (let index = 0; index < limit; index++) out.push(urls[Math.floor(index * step)]);
    return out;
  }

  const out: string[] = [];
  const lists = [...buckets.values()];
  for (let round = 0; out.length < limit; round++) {
    let added = false;
    for (const list of lists) {
      if (round >= list.length) continue;
      out.push(list[round]);
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
  }
  return out;
}
