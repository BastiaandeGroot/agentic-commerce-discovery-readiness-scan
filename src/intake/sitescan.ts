// Uit de HTML van een categoriepagina halen wat de winkel een categorie noemt
// en wat een filter.
//
// Generiek en niet op één winkel afgesteld. De winkel waarop dit gemeten is,
// is één voorbeeld; alles hieronder leunt op conventies die webshopplatformen
// delen, en elke aanname staat erbij met wat hem draagt.
//
// Drie van die conventies, in volgorde van hoe hard ze zijn:
//
// 1. **Filteren gebeurt via de querystring.** Magento (`?color=Grijs`), Shopify
//    (`?filter.v.option.color=`), WooCommerce (`?filter_kleur=`) — allemaal.
//    Een link met een `?` erin verfijnt een lijst; een link zonder navigeert
//    ergens heen. Dit is het enige signaal dat geen enkele uitzondering kent
//    die ik ken, en het draagt daarom het meeste gewicht.
// 2. **Filterpanelen dragen hun aard in hun attributen.** `filter-options` in
//    Magento, `facets` in Shopify-thema's, `widget_layered_nav` in WooCommerce.
//    Een attribuut dat `filter`, `facet` of `refine` bevat is daarmee een
//    bruikbare aanwijzing — geen bewijs, want een thema mag het anders noemen.
// 3. **Categorieën zijn paden.** Zonder querystring, op hetzelfde domein.
//    Zwakker dan de andere twee: een winkel mag een eigenschap ook als pad
//    aanbieden, en dat gebeurt in de praktijk volop. Vandaar dat het
//    filtersignaal hierboven wint — zie `classifyPaths` in `facets.ts`.
//
// Puur: geen fetch, geen DOM, geen klok. De HTML komt binnen als tekst; het
// ophalen hoort in een serverroute.

import type { SiteEvidence } from './facets';

/** Eén link zoals hij in de HTML stond. */
interface Link {
  href: string;
  text: string;
  /** Of de link uit een blok kwam dat zich als filter aandient. */
  inFilterBlock: boolean;
}

/**
 * Woorden die een filterlabel over zichzelf zegt in plaats van over het product.
 *
 * Een toegankelijk filterpaneel labelt zijn knoppen "Vlekwerend filter", zodat
 * een schermlezer weet wat er gebeurt bij klikken. Dat woord hoort bij de knop
 * en niet bij het kenmerk, en zonder het eraf te halen matcht "Vlekwerend" uit
 * de categorieboom nergens op. Beide talen, want beide komen voor.
 */
const LABEL_NOISE = /\b(filter(s|en|ing)?|refine|facet|opties?|options?)\b/gi;

/** Ziet dit eruit als tekst, of als een stuk opmaak dat is meegelekt? */
function looksLikeText(value: string): boolean {
  // Sjabloonmotoren zetten hun expressies in attributen; die vist elke regex
  // vroeg of laat mee. Een echt label draagt geen < = " of ; en geen accolades.
  return !/[<>={}"|]|:\s|;/.test(value) && /[a-zA-Z\u00C0-\u024F]/.test(value);
}

/** Een label uit een filterpaneel terugbrengen tot het kenmerk zelf. */
export function cleanFilterLabel(raw: string): string | undefined {
  const value = raw.replace(LABEL_NOISE, ' ').replace(/\s+/g, ' ').trim();
  if (value.length < 2 || value.length > 60) return undefined;
  if (!looksLikeText(value)) return undefined;
  return value;
}

/** Tekst uit HTML halen: tags eruit, entiteiten terug, witruimte samengevouwen. */
export function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * De stukken HTML die zich als filterpaneel aandienen.
 *
 * Geen echte parser: we zoeken een openingstag met een filter-attribuut en
 * tellen daarna gelijknamige tags op en af tot de bijbehorende sluittag. Dat is
 * ruim voldoende voor "welke woorden staan hierbinnen" en het valt niet om op
 * HTML die een strikte parser zou afkeuren — en dat is de HTML die je in het
 * wild aantreft.
 */
export function filterBlocks(html: string): string[] {
  const out: string[] = [];
  const opener = /<(div|nav|aside|section|ul|form|details)\b[^>]*(?:class|id|role|aria-label|data-role|data-testid)\s*=\s*"[^"]*(?:filter|facet|refine)[^"]*"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const start = match.index;
    let depth = 1;
    const scan = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    scan.lastIndex = opener.lastIndex;
    let end = html.length;
    let step: RegExpExecArray | null;
    while ((step = scan.exec(html)) !== null) {
      depth += step[1] === '/' ? -1 : 1;
      if (depth === 0) { end = scan.lastIndex; break; }
    }
    out.push(html.slice(start, end));
    // Doorzoeken ná dit blok: geneste filterblokken leveren dezelfde woorden op.
    opener.lastIndex = end;
  }
  return out;
}

/** Alle links met hun tekst, en of ze in een filterblok stonden. */
function links(html: string, blocks: string[]): Link[] {
  const inBlock = (index: number) => blocks.some((block) => {
    const at = html.indexOf(block);
    return at !== -1 && index >= at && index < at + block.length;
  });

  const out: Link[] = [];
  const re = /<a\b[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    out.push({ href: match[1], text: textOf(match[2]), inFilterBlock: inBlock(match.index) });
  }
  return out;
}

/**
 * De namen van filterassen, afgeleid uit de querystring.
 *
 * `?fabric_suitablilty=Intensief+gebruik` verklapt dat deze winkel een kenmerk
 * "fabric suitablilty" bijhoudt. De naam van de parameter is daarmee gratis
 * marktkennis, ook als het filterpaneel dichtgeklapt is en de waarden niet in
 * de HTML staan. Technische parameters die niets over het product zeggen laten
 * we vallen.
 */
const NOT_A_FACET = new Set([
  'p', 'page', 'q', 'search', 'sort', 'order', 'dir', 'limit', 'mode', 'view',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'ref', 'redirect', 'return', 'sid', 'id', 'lang', 'currency',
  'price', 'min', 'max', 'per_page', 'product_list_limit', 'product_list_order',
]);

function paramNames(href: string): string[] {
  const at = href.indexOf('?');
  if (at === -1) return [];
  return href
    .slice(at + 1)
    .split('&')
    .map((pair) => decodeURIComponent(pair.split('=')[0] ?? '').trim().toLowerCase())
    // Shopify zet zijn as in de naam: filter.v.option.color -> color.
    .map((name) => name.split('.').filter(Boolean).pop() ?? name)
    .filter((name) => name !== '' && !NOT_A_FACET.has(name))
    .map((name) => name.replace(/[_-]+/g, ' '));
}

/** Hetzelfde domein? Externe links zeggen niets over deze winkel. */
function sameSite(href: string, origin: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (/^[a-z]+:/i.test(href)) {
    try {
      return new URL(href).hostname.replace(/^www\./, '') === origin.replace(/^www\./, '');
    } catch {
      return false;
    }
  }
  return !href.startsWith('#');
}

/**
 * Wat deze pagina zegt over categorieën en filters.
 *
 * `origin` is de hostnaam van de winkel, zodat links naar buiten wegvallen.
 * Wat eruit komt zijn námen, geen URL's: `classifyPaths` legt ze naast de
 * categorienamen uit de export, en die staan los van hoe de site linkt.
 */
export function readSiteEvidence(html: string, origin: string): SiteEvidence {
  const blocks = filterBlocks(html);
  const all = links(html, blocks);

  const filters = new Set<string>();
  const navigation = new Set<string>();

  for (const block of blocks) {
    // Alle woorden in een filterpaneel die als kopje of label dienstdoen. Een
    // dichtgeklapte groep draagt zijn naam wél en zijn waarden niet, en juist
    // die naam is vaak het kenmerk dat we zoeken.
    for (const label of block.matchAll(/<(?:h[1-6]|legend|summary|button|label|span)\b[^>]*>([\s\S]{0,200}?)<\/(?:h[1-6]|legend|summary|button|label|span)>/gi)) {
      const text = cleanFilterLabel(textOf(label[1]));
      if (text) filters.add(text);
    }
  }

  for (const link of all) {
    if (!sameSite(link.href, origin)) continue;
    const params = paramNames(link.href);
    if (params.length > 0) {
      // De as én de waarde: `?color=Grijs` levert "color" en "Grijs".
      for (const name of params) filters.add(name);
      const value = cleanFilterLabel(link.text);
      if (value) filters.add(value);
      continue;
    }
    if (link.inFilterBlock) {
      const value = cleanFilterLabel(link.text);
      if (value) filters.add(value);
      continue;
    }
    if (looksLikeText(link.text) && link.text.length <= 60) navigation.add(link.text);
  }

  return { navigation: [...navigation], filters: [...filters] };
}
