// Wat er van een productpagina te halen valt.
//
// Dit is de openbare meting: niet wat de merchant in zijn PIM heeft, maar wat
// hij naar buiten brengt. Dat onderscheid is het hele punt. Een agent — of die
// nu een pagina leest of straks een feed krijgt — ziet alleen dit, en het
// verschil met de export is precies de winst die nu onbenut blijft.
//
// De uitkomst is een rij zoals `src/intake/` die uit een catalogusbestand haalt.
// Daardoor hoeft er aan de motor niets te veranderen: dertig opgehaalde
// pagina's gaan als JSON door `ingest` en de scan loopt er ongewijzigd op.
//
// Puur: HTML komt binnen als tekst, er wordt niets opgehaald. Wie dat wél doet
// staat in `scripts/public-scan.ts`.

/** Eén productpagina, uitgepakt tot losse kenmerken. */
export type ProductRow = Record<string, string>;

/**
 * De JSON-LD-blokken uit een pagina.
 *
 * Zonder DOM, met een regex, om dezelfde reden als in `src/intake/parse.ts`: dit
 * moet zowel in de browser als serverzijdig draaien. Een blok dat niet parseert
 * wordt overgeslagen — één kapot script mag de rest van de pagina niet kosten.
 */
export function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      out.push(JSON.parse(match[1].trim()));
    } catch {
      // Een enkele winkel zet er commentaar of een trailing komma in. Overslaan.
    }
  }
  return out;
}

/** Alles wat in een JSON-LD-document een knoop kan zijn, plat. */
function flatten(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 6 || value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((one) => flatten(one, depth + 1));

  const node = value as Record<string, unknown>;
  const nested = ['@graph', 'itemListElement', 'mainEntity', 'hasVariant'].flatMap((key) =>
    key in node ? flatten(node[key], depth + 1) : [],
  );
  return [node, ...nested];
}

const typeOf = (node: Record<string, unknown>): string[] => {
  const raw = node['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((one): one is string => typeof one === 'string');
  return [];
};

const isType = (node: Record<string, unknown>, type: string) =>
  typeOf(node).some((one) => one.toLowerCase() === type.toLowerCase());

const text = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>;
    return text(node.name ?? node['@id'] ?? node.value ?? '');
  }
  return '';
};

/** Kenmerknamen vergelijkbaar maken, zonder ze onherkenbaar te maken. */
export function slugKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

const HTML_TAG = /<[^>]*>/g;
const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

/** Tekst uit een stukje HTML, leesbaar en zonder opmaak. */
export function plainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(HTML_TAG, ' ')
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * De specificatietabel van een productpagina.
 *
 * Dit is waar de vaktaal staat — schuurweerstand, baanbreedte, samenstelling —
 * en juist dat zijn de kenmerken waar de vragen op leunen. `schema.org` draagt
 * ze zelden; een tabel op de pagina wel.
 *
 * Twee cellen per rij: de eerste is de naam, de tweede de waarde. Rijen met meer
 * of minder cellen zijn geen specificatie maar opmaak of een prijstabel.
 */
export function specTable(html: string): ProductRow {
  const out: ProductRow = {};

  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => plainText(cell[1]));
    if (cells.length !== 2) continue;
    const [name, value] = cells;
    if (name === '' || value === '' || name.length > 60) continue;
    const key = slugKey(name);
    if (key !== '' && !(key in out)) out[key] = value;
  }

  // Definitielijsten worden voor hetzelfde gebruikt en komen even vaak voor.
  const terms = [...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)];
  for (const [, term, definition] of terms) {
    const key = slugKey(plainText(term));
    const value = plainText(definition);
    if (key !== '' && value !== '' && !(key in out)) out[key] = value;
  }

  return out;
}

/** De categoriepaden uit de kruimelbaan; de motor kiest daarop zijn vragenset. */
export function breadcrumb(blocks: unknown[]): string {
  for (const block of blocks) {
    for (const node of flatten(block)) {
      if (!isType(node, 'BreadcrumbList')) continue;
      const items = Array.isArray(node.itemListElement) ? node.itemListElement : [];
      const names = items
        .map((item) => {
          const entry = item as Record<string, unknown>;
          return text(entry.name ?? entry.item);
        })
        .filter((one) => one !== '');
      // De eerste kruimel is bijna altijd "Home" en de laatste het product zelf.
      const path = names.slice(1, -1);
      if (path.length > 0) return path.join(' > ');
    }
  }
  return '';
}

/**
 * Eén productpagina als rij.
 *
 * Geeft `null` als er geen product op staat. Dat is geen fout maar het antwoord
 * op de vraag of dit een productpagina is — een categoriepagina of een blog
 * levert hier niets op, en dat hoort zo.
 */
export function extractProduct(html: string, url: string): ProductRow | null {
  const blocks = jsonLdBlocks(html);
  const product = blocks.flatMap((block) => flatten(block)).find((node) => isType(node, 'Product'));

  // Is dit werkelijk een productpagina?
  //
  // Deze vraag moet vóór het uitpakken beantwoord worden, en dat had ik eerst
  // niet: de eerste echte meting haalde een FAQ-pagina op en leverde zeventien
  // "kenmerken" op die in werkelijkheid veelgestelde vragen waren. Een tabel of
  // een definitielijst zegt niets — die staan overal. Een `Product` in de
  // gestructureerde data, een prijs, of `og:type=product` zegt het wel.
  const marked = /<meta[^>]+property=["']og:type["'][^>]+content=["']product["']/i.test(html);
  const priced = /itemprop=["']price["']|"@type"\s*:\s*"Offer"/i.test(html);
  if (!product && !marked && !priced) return null;

  const row: ProductRow = { url };
  let found = false;

  if (product) {
    found = true;
    const offers = flatten(product.offers).find((node) => isType(node, 'Offer'))
      ?? (product.offers as Record<string, unknown> | undefined);

    const fields: [string, unknown][] = [
      ['titel', product.name],
      ['omschrijving', product.description],
      ['merk', product.brand],
      ['sku', product.sku],
      ['gtin', product.gtin13 ?? product.gtin ?? product.gtin8 ?? product.mpn],
      ['kleur', product.color],
      ['materiaal', product.material],
      ['categorie', product.category],
      ['afbeelding', product.image],
      ['prijs', offers?.price],
      ['valuta', offers?.priceCurrency],
      ['beschikbaarheid', offers?.availability],
    ];
    for (const [key, value] of fields) {
      const clean = text(value);
      if (clean !== '') row[key] = clean;
    }

    // `additionalProperty` is de plek waar schema.org vaktaal toelaat. Weinig
    // winkels vullen hem, en dat is zelf een bevinding: wie hem wél vult, geeft
    // een agent precies wat hij nodig heeft.
    for (const extra of flatten(product.additionalProperty)) {
      if (!isType(extra, 'PropertyValue')) continue;
      const key = slugKey(text(extra.name));
      const value = text(extra.value);
      if (key !== '' && value !== '' && !(key in row)) row[key] = value;
    }
  }

  // De tabel op de pagina, ook als er geen JSON-LD is: veel Magento- en
  // WooCommerce-winkels tonen hun specificaties alleen daar. Dat dit een
  // productpagina is, staat hierboven al vast.
  for (const [key, value] of Object.entries(specTable(html))) {
    if (!(key in row)) { row[key] = value; found = true; }
  }

  if (!row.categorie) {
    const path = breadcrumb(blocks);
    if (path !== '') row.categorie = path;
  }

  if (!row.titel) {
    const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (title) { row.titel = plainText(title[1]); found = true; }
  }

  return found ? row : null;
}
