// Beantwoordt de website de vragen die een catalogus niet kan dragen?
//
// De scan meet de catalogus. Een deel van wat een koper vraagt — retour, een
// staal, hoeveel stof voor een gordijn — staat daar nooit in: dat is beleid of
// advies, en dat staat op de site. Deze module toetst of het er staat op een
// plek waar een AI-agent bij kan, en levert per vraag het bewijs.
//
// Gelezen wordt zoals een agent leest, niet zoals een bezoeker:
//
//   - de kale pagina, zonder JavaScript. Wat pas na een klik geladen wordt,
//     bestaat niet; wat dichtgeklapt in de pagina staat, wél;
//   - als platte tekst, van boven naar beneden. Hoe ver een antwoord in die
//     tekst staat is een gegeven: sommige agents lezen alleen het begin.
//
// Het koppelen van vraag en passage doet een model, en dat mag hier om dezelfde
// drie redenen als op het koppelscherm: het raakt geen product, het draait één
// keer per winkel, en de uitkomst is een tabel die een mens naloopt. De regel
// die het betrouwbaar maakt staat in `readSiteAnswers`: een antwoord telt alleen
// als het citaat letterlijk op de genoemde pagina staat. Een model dat een
// antwoord verzint, levert dus "niet gevonden" op en geen vinkje.
//
// Puur: de html en het modelantwoord komen binnen als argument.

/** Omhoog als het lezen, de opdracht of de zeef verandert. */
export const SITE_CHECK_VERSION = '1';

export type SiteAnswerStatus = 'answered' | 'partial' | 'not-found' | 'not-checked';

export interface SiteQuestion {
  id: string;
  label: string;
}

/** Eén pagina zoals een agent hem leest. */
export interface SitePage {
  url: string;
  /** De platte tekst van de hele pagina, in leesvolgorde. */
  text: string;
  /**
   * De stukken tekst die voor een bezoeker dichtgeklapt staan, als [begin, eind)
   * in `text`, met de regel waarop hij moet klikken om ze te zien.
   */
  collapsed: { start: number; end: number; opener: string }[];
}

export interface SiteAnswer {
  questionId: string;
  status: SiteAnswerStatus;
  /** De zin op de site die het antwoord geeft, letterlijk. */
  quote?: string;
  url?: string;
  /** Hoe ver in de tekst van de pagina het citaat begint, 0 tot 100. */
  position?: number;
  /**
   * Staat het citaat in een uitklapblok? Dan de regel waarop een bezoeker klikt,
   * of een lege tekst als die niet te bepalen was. `undefined`: niet dichtgeklapt.
   */
  opener?: string;
  /** Wat er half aan is, bij `partial`; of waarom niet gecontroleerd. */
  note?: string;
  /** Waarom een vraag buiten de toets viel. */
  skipped?: 'stock';
}

export interface SiteCheck {
  version: string;
  site: string;
  checkedAt: string;
  model: string;
  /** De gelezen pagina's, met hoeveel tekens tekst een agent er ziet. */
  pages: { url: string; chars: number }[];
  /** AI-agents die deze winkel bij naam noemt in robots.txt. */
  namedBots: string[];
  answers: SiteAnswer[];
  /** Wat er onderweg opviel: geen sitemap, pagina's die niet gelezen mochten worden. */
  notes: string[];
}

// --- Lezen zoals een agent --------------------------------------------------

const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'template', 'head']);
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);
const BLOCK = new Set([
  'p', 'div', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'tr', 'table', 'section', 'article', 'header', 'footer', 'nav',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'summary', 'details', 'blockquote', 'main', 'aside', 'form', 'button',
]);
const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', eacute: 'é', egrave: 'è', euml: 'ë',
  iuml: 'ï', ouml: 'ö', uuml: 'ü', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…',
};

function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : ' ';
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/** Het einde van een tag, met aanhalingstekens meegerekend: `x-show="a > b"` is één tag. */
function tagEnd(html: string, from: number): number {
  let quote = '';
  for (let at = from; at < html.length; at++) {
    const char = html[at];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return at;
    }
  }
  return html.length - 1;
}

/**
 * Staat dit element dicht voor een bezoeker?
 *
 * `<details>` zonder `open`, het attribuut `hidden`, een inline `display:none`,
 * en `x-show`/`x-cloak` — het laatste is hoe veel winkels hun uitklapvragen
 * bouwen. Het is een vermoeden en geen zekerheid: of `x-show` open of dicht
 * begint hangt af van script dat hier niet draait. Daarom zegt het rapport
 * "staat in een uitklapblok" en niet "is onzichtbaar".
 */
function closedFor(name: string, attributes: string): boolean {
  if (name === 'details') return !/\sopen(\s|=|$)/i.test(attributes);
  return /\s(hidden|x-cloak)(\s|=|$)/i.test(attributes)
    || /\sx-show\s*=/i.test(attributes)
    || /style\s*=\s*["'][^"']*display\s*:\s*none/i.test(attributes);
}

/**
 * De tekst van een pagina zoals een agent hem te zien krijgt.
 *
 * Geen script, geen stijl, geen opmaak; wel alles wat in de html staat, ook wat
 * dichtgeklapt is. Blokken worden regels, zodat een citaat een zin blijft.
 */
export function agentText(html: string, url: string): SitePage {
  const stack: { name: string; closed: boolean; summary: boolean }[] = [];
  const pieces: string[] = [];
  const collapsed: SitePage['collapsed'] = [];
  let length = 0;
  let open: { start: number; opener: string } | undefined;
  /** De laatste zichtbare regel: daar klikt een bezoeker op om het blok te openen. */
  let lastVisibleLine = '';
  let currentLine = '';

  const hidden = () => {
    // Zichtbaar is wat in de `<summary>` van het dichte blok zelf staat.
    for (let at = stack.length - 1; at >= 0; at--) {
      if (stack[at].summary) return false;
      if (stack[at].closed) return true;
    }
    return false;
  };
  const push = (text: string) => {
    if (text === '') return;
    pieces.push(text);
    length += text.length;
  };
  const sync = () => {
    const now = hidden();
    if (now && !open) open = { start: length, opener: lastVisibleLine };
    if (!now && open) {
      if (length > open.start) collapsed.push({ start: open.start, end: length, opener: open.opener });
      open = undefined;
    }
  };
  const newline = () => {
    if (!hidden() && currentLine.trim() !== '') lastVisibleLine = currentLine.trim().slice(0, 160);
    currentLine = '';
    if (pieces.length > 0 && !pieces[pieces.length - 1].endsWith('\n')) push('\n');
  };

  let at = 0;
  while (at < html.length) {
    const lt = html.indexOf('<', at);
    const textEnd = lt === -1 ? html.length : lt;
    if (textEnd > at) {
      const raw = decode(html.slice(at, textEnd)).replace(/\s+/g, ' ');
      if (raw.trim() !== '') {
        sync();
        const lead = pieces.length > 0 && !/\s$/.test(pieces[pieces.length - 1]) && /^\s/.test(raw) ? ' ' : '';
        const text = lead + raw.replace(/^\s+/, '');
        push(text);
        currentLine += text;
      }
    }
    if (lt === -1) break;

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      at = end === -1 ? html.length : end + 3;
      continue;
    }
    const end = tagEnd(html, lt + 1);
    const inner = html.slice(lt + 1, end);
    at = end + 1;

    const closing = inner.startsWith('/');
    const name = (inner.match(/^\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/)?.[1] ?? '').toLowerCase();
    if (name === '') continue;

    if (!closing && SKIP.has(name)) {
      // Tot en met de sluitende tag overslaan: wat hierin staat is geen tekst.
      const close = html.toLowerCase().indexOf(`</${name}`, at);
      at = close === -1 ? html.length : tagEnd(html, close + 1) + 1;
      continue;
    }

    if (closing) {
      for (let depth = stack.length - 1; depth >= 0; depth--) {
        if (stack[depth].name === name) {
          if (BLOCK.has(name)) newline();
          stack.length = depth;
          sync();
          break;
        }
      }
      continue;
    }

    if (name === 'br' || BLOCK.has(name)) newline();
    if (VOID.has(name) || inner.endsWith('/')) continue;
    stack.push({ name, closed: closedFor(name, inner.slice(name.length)), summary: name === 'summary' });
    sync();
  }
  newline();
  if (open && length > open.start) collapsed.push({ start: open.start, end: length, opener: open.opener });

  return { url, text: pieces.join(''), collapsed };
}

// --- Welke pagina's ---------------------------------------------------------

/**
 * Pagina's waar een winkel zijn beleid en zijn uitleg neerzet.
 *
 * Generieke woorden in drie talen, zoals in `lexicon.ts`: zo noemt elke winkel
 * ze. Geen lijst per winkel en geen lijst per branche.
 */
const SERVICE = /faq|veelgesteld|vragen|klantenservice|customer-service|service|retour|return|verzend|shipping|versand|lever|delivery|liefer|betal|payment|zahlung|zakelijk|business|b2b|showroom|winkel|store|contact|garantie|warranty|voorwaarden|terms|agb|over-ons|about|maatwerk|stalen|staal|sample|muster/i;
const BLOG = /\/(blog|blogs|nieuws|news|inspiratie|inspiration|advies|advice|kennis|magazine|ratgeber)\//i;
const NOT_CONTENT = /privacy|cookie|login|account|cart|winkelwagen|checkout|wishlist|sitemap|\.(jpg|jpeg|png|webp|gif|pdf|xml|css|js)(\?|$)/i;

export interface PageChoice {
  service: string[];
  categories: string[];
  blogs: string[];
  products: string[];
}

export const PAGE_LIMITS = { service: 8, categories: 16, blogs: 6, products: 2 } as const;

const depth = (url: string) => {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).length;
  } catch {
    return 99;
  }
};

/** Gelijkmatig over de lijst, zodat niet alleen de eerste tak van de boom gelezen wordt. */
function spreadOver(urls: string[], limit: number): string[] {
  if (urls.length <= limit) return urls;
  const step = urls.length / limit;
  return Array.from({ length: limit }, (_, index) => urls[Math.floor(index * step)]);
}

/**
 * Kies wat er gelezen wordt, uit wat de winkel zelf aanwijst.
 *
 * Breed en niet alleen de servicepagina's: bij de eerste meting stonden dertien
 * van de tweeëntwintig antwoorden alleen in een blog, onder een categoriepagina
 * of op een productpagina. Begrensd, omdat we andermans site ophalen.
 *
 * `sitemaps` draagt per sitemap zijn adressen; de naam van de sitemap zegt vaak
 * wat erin staat (categorieën, producten, pagina's) en dat is betrouwbaarder dan
 * raden aan een pad.
 */
export function choosePages(input: {
  origin: string;
  sitemaps: { name: string; urls: string[] }[];
  /** Links uit het menu en de voet van de homepage. */
  links: string[];
  /**
   * De categorienamen van de merchant zelf. De vragen horen bij zijn
   * categorieën, dus hun pagina's gaan voor: daar staat het antwoord op "hoeveel
   * stof voor een tas" als het ergens staat.
   */
  preferred?: string[];
}): PageChoice {
  const same = (url: string) => {
    try {
      return new URL(url).origin === input.origin;
    } catch {
      return false;
    }
  };
  const clean = (urls: string[]) => [...new Set(urls.map((url) => url.split('#')[0]))]
    .filter((url) => same(url) && !NOT_CONTENT.test(url) && !url.includes('?'));

  const named = (pattern: RegExp) => clean(input.sitemaps.filter((map) => pattern.test(map.name)).flatMap((map) => map.urls));
  const everything = clean([...input.sitemaps.flatMap((map) => map.urls), ...input.links]);
  // Niet `item`: dat staat in elk woord "sitemap", en dan is alles een product.
  const productLike = new Set(named(/produ[ck]t|artikel/i));
  const categoryLike = named(/categor|collect|kategor/i);

  const service = everything.filter((url) => depth(url) <= 2 && !BLOG.test(url) && SERVICE.test(new URL(url).pathname) && !productLike.has(url));
  const blogs = everything.filter((url) => BLOG.test(url) && depth(url) >= 2);
  const taken = new Set([...service, ...blogs]);

  // Categorieën: wat de winkel zo noemt, en anders ondiepe pagina's die geen
  // product, geen service en geen blog zijn.
  const categories = (categoryLike.length > 0 ? categoryLike : everything.filter((url) => depth(url) >= 1 && depth(url) <= 2))
    .filter((url) => !taken.has(url) && !productLike.has(url) && depth(url) >= 1);

  // Eerst de pagina's die naar een categorie van de merchant heten, dan de
  // ondiepe, en de rest gelijkmatig over de boom.
  const stems = (input.preferred ?? [])
    .map((name) => name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 6))
    .filter((stem) => stem.length >= 4);
  const named_ = (url: string) => {
    const slug = new URL(url).pathname.toLowerCase().replace(/[^a-z/]/g, '');
    return stems.some((stem) => slug.includes(stem));
  };
  const wanted = categories.filter(named_).sort((a, b) => depth(a) - depth(b));
  const rest = categories.filter((url) => !named_(url)).sort((a, b) => depth(a) - depth(b));
  const chosen = [...wanted.slice(0, PAGE_LIMITS.categories)];
  chosen.push(...spreadOver(rest, Math.max(0, PAGE_LIMITS.categories - chosen.length)));

  return {
    service: service.slice(0, PAGE_LIMITS.service),
    categories: chosen,
    blogs: spreadOver(blogs, PAGE_LIMITS.blogs),
    products: spreadOver([...productLike], PAGE_LIMITS.products),
  };
}

/**
 * Mag dit pad gelezen worden volgens de regels voor alle bezoekers?
 *
 * Alleen de groep `*`, met de twee tekens die robots.txt kent: `*` voor
 * willekeurig en `$` voor het einde. Bij twijfel niet lezen.
 */
export function pathAllowed(robots: string, path: string): boolean {
  const groups = robots.split(/^\s*user-agent:\s*/im).slice(1);
  for (const group of groups) {
    const [name, ...rest] = group.split('\n');
    if (name.trim() !== '*') continue;
    for (const line of rest) {
      if (/^\s*user-agent:/i.test(line)) break;
      const rule = line.match(/^\s*disallow:\s*(\S+)/i)?.[1];
      if (!rule) continue;
      const end = rule.endsWith('$');
      const body = (end ? rule.slice(0, -1) : rule).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const pattern = body + (end ? '$' : '');
      try {
        if (new RegExp(`^${pattern}`).test(path)) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

// --- De opdracht aan het model ----------------------------------------------

/**
 * Vragen over voorraad worden niet getoetst.
 *
 * Voorraad wisselt per dag en komt uit een ander systeem; een tekst op de site
 * zegt er niets betrouwbaars over. De vraag blijft in de lijst staan, met de
 * reden erbij.
 */
export function isStockQuestion(label: string): boolean {
  return /\bvoorraad\b|\bop voorraad\b|\bin stock\b|\bstock\b|\bleverbaar\b|\bavailability\b/i.test(label);
}

/**
 * Wat op bijna elke pagina terugkomt, is menu en voet.
 *
 * Het model hoeft het niet twintig keer te lezen, en een antwoord dat alleen in
 * de voet staat ("Retourneren") is een link en geen antwoord. De posities in het
 * rapport blijven die van de hele pagina; dit is alleen wat het model leest.
 */
export function withoutSharedLines(pages: SitePage[]): { url: string; text: string }[] {
  if (pages.length < 4) return pages.map((page) => ({ url: page.url, text: page.text }));
  const seenOn = new Map<string, number>();
  for (const page of pages) {
    for (const line of new Set(page.text.split('\n').map((one) => one.trim()).filter(Boolean))) {
      seenOn.set(line, (seenOn.get(line) ?? 0) + 1);
    }
  }
  const shared = (line: string) => (seenOn.get(line.trim()) ?? 0) >= pages.length * 0.6;
  return pages.map((page) => ({
    url: page.url,
    text: page.text.split('\n').filter((line) => line.trim() !== '' && !shared(line)).join('\n'),
  }));
}

export const SITE_SYSTEM = `Je toetst of een webwinkel op zijn eigen site antwoord geeft op vragen die kopers stellen.

Je krijgt een lijst vragen en de tekst van een aantal pagina's van één winkel, zoals een AI-agent die leest: platte tekst, zonder opmaak.

Per vraag bepaal je één van drie uitkomsten:
- "answered": er staat een passage die de vraag beantwoordt.
- "partial": er staat iets over, maar de vraag wordt maar half beantwoord. Zeg in "note" in één korte zin wat er ontbreekt.
- "not-found": op deze pagina's staat geen antwoord.

Regels die altijd gelden:
1. Bij "answered" en "partial" geef je in "quote" één zin of een paar zinnen die LETTERLIJK in de tekst van die pagina staan, teken voor teken, en in "url" het adres van die pagina. Niet samenvatten, niet verbeteren, geen weglatingstekens. Een citaat dat niet letterlijk terug te vinden is, telt niet.
2. Kies het citaat dat het antwoord het best draagt, en houd het kort: liever één zin dan een alinea.
3. Staat het antwoord op meer pagina's, kies dan de pagina die voor dit soort vraag bedoeld is (een pagina met veelgestelde vragen of over retourneren boven een blog).
4. Een link of een menu-item is geen antwoord. "Retourneren" in een voettekst beantwoordt niet of geknipte stof terug mag.
5. Bij twijfel: "not-found". Een gemist antwoord ziet de winkel meteen en is zo hersteld; een antwoord dat er niet staat, laat een gat verdwijnen.
6. Gebruik alleen wat in de tekst staat. Vul niets aan uit eigen kennis.`;

export function sitePrompt(questions: SiteQuestion[], pages: { url: string; text: string }[]): string {
  return [
    'De vragen:',
    ...questions.map((question) => `- [${question.id}] ${question.label}`),
    '',
    'De pagina\'s:',
    ...pages.map((page) => `\n===== ${page.url} =====\n${page.text}`),
    '',
    'Geef voor élke vraag één uitkomst.',
  ].join('\n');
}

export const SITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answers'],
  properties: {
    answers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status'],
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['answered', 'partial', 'not-found'] },
          quote: { type: 'string' },
          url: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
  },
} as const;

// --- Het antwoord van het model nalopen -------------------------------------

/** Witruimte en soorten aanhalingstekens dragen geen betekenis. */
function loose(text: string): string {
  return text.replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

/** Waar in `text` begint dit citaat, witruimte daargelaten? -1 als het er niet staat. */
function locate(text: string, quote: string): number {
  const needle = loose(quote);
  if (needle.length < 12) return -1;
  // Posities in de genormaliseerde tekst terugrekenen naar de echte.
  const map: number[] = [];
  let flat = '';
  let space = true;
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (/\s/.test(char)) {
      if (!space) {
        flat += ' ';
        map.push(at);
      }
      space = true;
    } else {
      flat += /[‘’`´]/.test(char) ? "'" : /[“”]/.test(char) ? '"' : char;
      map.push(at);
      space = false;
    }
  }
  const found = flat.indexOf(needle);
  return found === -1 ? -1 : map[found];
}

/**
 * Van modelantwoord naar uitkomst per vraag.
 *
 * De zeef: een antwoord telt alleen als het citaat letterlijk op een gelezen
 * pagina staat. Staat het op een andere pagina dan het model noemde, dan geldt
 * de pagina waar het wél staat. Staat het nergens, dan is de uitkomst "niet
 * gevonden" — het model krijgt het voordeel van de twijfel niet.
 *
 * Een vraag waar het model niets over zei, is ook "niet gevonden": zwijgen is
 * geen vinkje.
 */
export function readSiteAnswers(raw: unknown, questions: SiteQuestion[], pages: SitePage[]): {
  answers: SiteAnswer[];
  /** Hoeveel antwoorden vervielen omdat het citaat nergens stond. */
  dropped: number;
} {
  const list = Array.isArray((raw as { answers?: unknown })?.answers) ? (raw as { answers: unknown[] }).answers : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const one of list) {
    if (one && typeof one === 'object' && typeof (one as { id?: unknown }).id === 'string') {
      byId.set((one as { id: string }).id, one as Record<string, unknown>);
    }
  }

  let dropped = 0;
  const answers = questions.map((question): SiteAnswer => {
    if (isStockQuestion(question.label)) return { questionId: question.id, status: 'not-checked', skipped: 'stock' };

    const given = byId.get(question.id);
    const status = given?.status === 'answered' || given?.status === 'partial' ? given.status : 'not-found';
    if (status === 'not-found') return { questionId: question.id, status };

    const quote = typeof given?.quote === 'string' ? given.quote.trim() : '';
    const named = typeof given?.url === 'string' ? given.url : '';
    // Eerst de genoemde pagina, dan de rest: het citaat beslist, niet het adres.
    const ordered = [...pages].sort((a, b) => Number(b.url === named) - Number(a.url === named));
    for (const page of ordered) {
      const at = quote === '' ? -1 : locate(page.text, quote);
      if (at === -1) continue;
      const block = page.collapsed.find((range) => at >= range.start && at < range.end);
      return {
        questionId: question.id,
        status,
        quote: loose(quote),
        url: page.url,
        position: page.text.length === 0 ? 0 : Math.round((at / page.text.length) * 100),
        // Een lege tekst betekent: dichtgeklapt, maar waarop je klikt is niet te zeggen.
        opener: block ? block.opener : undefined,
        note: typeof given?.note === 'string' && given.note.trim() !== '' ? given.note.trim() : undefined,
      };
    }
    dropped += 1;
    return { questionId: question.id, status: 'not-found' };
  });

  return { answers, dropped };
}

/**
 * Het adres waar een mens het citaat naleest.
 *
 * Een tekstfragment in het adres laat de browser naar de zin springen. Voor een
 * citaat in een uitklapblok werkt dat niet — verborgen tekst is geen doel — dus
 * daar is het gewoon de pagina, en zegt het rapport waarop je klikt.
 */
export function quoteLink(answer: SiteAnswer): string | undefined {
  if (!answer.url) return undefined;
  if (!answer.quote || answer.opener !== undefined) return answer.url;
  const start = answer.quote.split(' ').slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '');
  return `${answer.url.split('#')[0]}#:~:text=${encodeURIComponent(start)}`;
}

/** De telling voor boven de lijst. */
export function siteCheckTotals(check: SiteCheck): Record<SiteAnswerStatus, number> {
  const totals: Record<SiteAnswerStatus, number> = { answered: 0, partial: 0, 'not-found': 0, 'not-checked': 0 };
  for (const answer of check.answers) totals[answer.status] += 1;
  return totals;
}

/** Hoe lang een uitkomst geldt voordat de site opnieuw gelezen wordt. */
export const SITE_CHECK_DAYS = 30;

/**
 * Het adres van een webshop als sleutel: de hostnaam, zonder protocol, `www.` of
 * pad, in kleine letters. Leeg als er geen hostnaam in staat.
 */
export function siteKey(value: string): string {
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : '';
}

/** Dezelfde winkel, met of zonder protocol, `www.` of een schuine streep erachter. */
export function sameSite(a: string, b: string): boolean {
  return siteKey(a) !== '' && siteKey(a) === siteKey(b);
}

/**
 * Een eerdere toets die nog bruikbaar is, of niets.
 *
 * De site opnieuw lezen kost een à twee minuten en een modelaanroep; een winkel
 * die twee keer per week scant hoeft dat niet elke keer te betalen. Bruikbaar is
 * een toets van dezelfde winkel, gelezen met dezelfde regels, niet ouder dan
 * `SITE_CHECK_DAYS`, die élke vraag van nu al beoordeelde — een vraag die er
 * toen niet was, mag niet stil op "niet gevonden" uitkomen.
 *
 * `now` komt binnen als argument: deze module heeft geen klok.
 */
export function reusableSiteCheck(
  earlier: SiteCheck[],
  site: string,
  questionIds: string[],
  now: string,
): SiteCheck | undefined {
  const limit = Date.parse(now) - SITE_CHECK_DAYS * 24 * 60 * 60 * 1000;
  return earlier
    .filter((check) => check.version === SITE_CHECK_VERSION && sameSite(check.site, site))
    .filter((check) => Date.parse(check.checkedAt) >= limit)
    .filter((check) => {
      const judged = new Set(check.answers.map((answer) => answer.questionId));
      return questionIds.every((id) => judged.has(id));
    })
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
}
