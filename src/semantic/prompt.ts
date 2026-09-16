// De opdrachten van de koppelroute, los van de route zelf.
//
// Puur: tekst in, tekst uit. Zo draait de meetopstelling in `scripts/` precies
// dezelfde opdracht als de app, en meet een verbetering niet iets anders dan
// wat er straks live staat.

export interface Payload {
  attributes: { key: string; text: string }[];
  columns: { key: string; text: string }[];
  /**
   * Twee soorten koppeling, dezelfde vorm. Kenmerken op kolommen, of de
   * vragensets uit de lijst op de eigen categorieën van de merchant. Dat tweede
   * is precies hetzelfde probleem — Engelse vaktaal tegen Nederlandse data — en
   * het verdient geen tweede route, alleen een andere opdracht.
   */
  kind?: 'attributes' | 'categories' | 'facets' | 'market';
}

export const SYSTEM_CATEGORIES = [
  'Je legt de categorieën van een vragenlijst op de categorieën van een productcatalogus.',
  '',
  'Regels:',
  '- Koppel alleen wat je zeker weet. Een verkeerde koppeling zet de verkeerde vragen op een categorie, en dan meet de scan iets anders dan er verkocht wordt.',
  '- Laat een categorie weg als er geen goede tegenhanger is. Die krijgt dan alleen de algemene vragen, en dat is een geldig antwoord.',
  '- Gebruik uitsluitend namen die letterlijk in de lijst staan. Verzin er nooit een bij.',
  '- De twee lijsten staan vaak in verschillende talen: "upholstery fabrics" en "Meubelstoffen" zijn hetzelfde, "curtain fabrics" en "Gordijnstoffen" ook.',
  '',
  'Antwoord met één regel per koppeling, in de vorm `vragenlijstcategorie: catalogus­categorie`. Geen inleiding, geen uitleg, geen opsommingstekens.',
].join('\n');

export const SYSTEM_MARKET = [
  'Je benoemt in welke markt een webshop handelt, op basis van zijn categorienamen.',
  '',
  'Regels:',
  '- Antwoord met één korte naam voor de markt als geheel, niet voor een onderdeel ervan. "woontextiel", niet "gordijnstoffen".',
  '- Gebruik de taal van de categorienamen zelf.',
  '- Twee tot vier woorden, kleine letters. Geen merknaam en geen winkelnaam.',
  '- Weet je het niet zeker, antwoord dan `onbekend`. Een verkeerde markt zet de verkeerde vragenlijst op de hele winkel.',
  '',
  'Antwoord met alleen die naam. Geen inleiding, geen uitleg, geen punt erachter.',
].join('\n');

export const SYSTEM_FACETS = [
  'Je bepaalt of een pad uit een categorieboom een productsoort is of een eigenschap.',
  '',
  'De test is talig: kun je zeggen "ik zoek een ..."?',
  '- "Ik zoek een lampenkapstof" loopt. Dat is een categorie: het ding dat verkocht wordt, een zelfstandig naamwoord.',
  '- "Ik zoek een effen" loopt niet; je zegt "een effen meubelstof". Dat is een kenmerk: een bijvoeglijk naamwoord dat iets zegt over het ding.',
  '',
  'Regels:',
  '- Twijfel je, antwoord dan `onbekend`. Een verkeerd oordeel laat een gat verdwijnen dat er wél is, en dat is erger dan geen oordeel.',
  '- Kwaliteits- en prijsniveaus (Premium, Essential, Basic) zijn kenmerken, geen productsoorten.',
  '- Eigenschappen van het materiaal of de uitvoering (effen, gestreept, gemeleerd, vlamvertragend, waterafstotend, duurzaam, gerecycled) zijn kenmerken.',
  '- Toepassingen en productsoorten (banken, stoelen, lampenkapstoffen, tassenstoffen, naaigaren) zijn categorieën.',
  '- Ga af op het laatste deel van het pad; het deel ervoor is de context.',
  '',
  'Antwoord met één regel per pad, in de vorm `pad: categorie` of `pad: kenmerk` of `pad: onbekend`. Neem het pad letterlijk over. Geen inleiding, geen uitleg.',
].join('\n');

export const SYSTEM = [
  'Je legt kenmerken uit een vragenlijst op kolommen uit een productcatalogus.',
  '',
  'Bij elk kenmerk staat de vraag van een consument die erop leunt. Bij elke kolom staan de waarden die erin staan. De toets is niet of de namen op elkaar lijken, maar of een waarde uit de kolom die vraag beantwoordt.',
  '',
  'Werkwijze per kenmerk:',
  '1. Zoek een kolom waarvan een getoonde waarde het antwoord op de vraag is, voor dit kenmerk.',
  '2. Neem die waarde letterlijk over als bewijs, precies zoals hij achter de kolom staat.',
  '3. Zeg in één zin waarom die waarde de vraag beantwoordt.',
  '4. Vind je zo\'n waarde niet, laat het kenmerk dan weg.',
  '',
  'Regels:',
  '- Een verkeerde koppeling laat een gat verdwijnen dat de merchant wél heeft, en dat is erger dan geen koppeling. Weglaten is vaak het juiste antwoord.',
  '- Een kolom die over iets náást het kenmerk gaat, telt niet. Herkomstland zegt niets over vochtgedrag, een schuurwaarde niets over het gebruiksdoel, gewicht niets over weefdichtheid, een interne opmerking niets over voorraad.',
  '- Een kolom mag meer dan één kenmerk dragen als zijn waarden dat echt doen, zoals een wassymbolenlijst met temperatuur én drogen.',
  '- Gebruik uitsluitend kolomnamen die letterlijk in de lijst staan.',
  '- Let op omgekeerde begrippen (dichtheid beantwoordt doorlatendheid) en op vaktaal in twee talen (`rapport` is `pattern repeat`).',
].join('\n');

/**
 * De vorm van het antwoord bij kenmerken, als JSON-schema voor het model.
 *
 * Het bewijs staat erin zodat het na te rekenen is: een waarde die niet in de
 * kolom staat, is een koppeling die het model verzon. Zie `readProposals`.
 */
export const PROPOSALS_SCHEMA = {
  type: 'object',
  properties: {
    koppelingen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kenmerk: { type: 'string' },
          kolom: { type: 'string' },
          bewijs: { type: 'string' },
          waarom: { type: 'string' },
        },
        required: ['kenmerk', 'kolom', 'bewijs', 'waarom'],
        additionalProperties: false,
      },
    },
  },
  required: ['koppelingen'],
  additionalProperties: false,
} as const;

export interface Proposal {
  key: string;
  column: string;
  evidence: string;
  reason: string;
}

export interface ReadProposals {
  proposals: Proposal[];
  /** Wat afviel, in woorden voor het scherm. */
  rejected: string[];
}

/** De waarden in een kolombeschrijving: alles na de naam en de vorm. */
function valuesOf(description: string): string {
  const afterShape = description.indexOf(']: ');
  if (afterShape !== -1) return description.slice(afterShape + 3);
  const colon = description.indexOf(': ');
  return colon === -1 ? '' : description.slice(colon + 2);
}

/**
 * Lees het antwoord van het model, en houd alleen wat na te rekenen is.
 *
 * Drie poorten, alle drie zonder model: het kenmerk moet gevraagd zijn, de kolom
 * moet bestaan, en het bewijs moet een waarde zijn die werkelijk in die kolom
 * staat. Die laatste is de belangrijkste. Een model dat een kolom kiest omdat de
 * naam ergens op lijkt, kan geen waarde aanwijzen die de vraag beantwoordt — en
 * een verzonnen waarde valt hier af.
 */
export function readProposals(
  text: string,
  attributes: { key: string }[],
  columns: { key: string; text: string }[],
): ReadProposals {
  const asked = new Set(attributes.map((attribute) => attribute.key));
  const byName = new Map(columns.map((column) => [column.key.toLowerCase(), column]));
  const proposals: Proposal[] = [];
  const rejected: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { proposals, rejected: ['Het antwoord van het model was geen leesbare lijst.'] };
  }
  const list = (parsed as { koppelingen?: unknown }).koppelingen;
  if (!Array.isArray(list)) return { proposals, rejected: ['Het antwoord van het model bevatte geen koppelingen.'] };

  const seen = new Set<string>();
  for (const item of list) {
    const entry = item as Record<string, unknown>;
    const key = typeof entry.kenmerk === 'string' ? entry.kenmerk.trim() : '';
    const name = typeof entry.kolom === 'string' ? entry.kolom.trim() : '';
    const evidence = typeof entry.bewijs === 'string' ? entry.bewijs.trim() : '';
    const reason = typeof entry.waarom === 'string' ? entry.waarom.trim() : '';
    if (!asked.has(key) || seen.has(key)) continue;
    const column = byName.get(name.toLowerCase());
    if (!column) {
      rejected.push(`"${key}" wees naar kolom "${name}", en die staat niet in je catalogus.`);
      continue;
    }
    // Eén waarde, niet de hele rij: wie "5, 4, 6, 3, 8" overschrijft, heeft
    // niets aangewezen.
    const needle = evidence.toLowerCase();
    const values = valuesOf(column.text).toLowerCase().split(', ');
    if (needle === '' || !values.some((value) => value.includes(needle))) {
      rejected.push(`"${key}" in "${column.key}" is niet voorgesteld: het model kon geen waarde uit die kolom aanwijzen die de vraag beantwoordt.`);
      continue;
    }
    seen.add(key);
    proposals.push({ key, column: column.key, evidence, reason });
  }
  return { proposals, rejected };
}

export function prompt({ attributes, columns, kind }: Payload): string {
  if (kind === 'market') {
    return [
      'CATEGORIEËN VAN DEZE WINKEL (naam, en het aantal producten):',
      ...attributes.map((entry) => `- ${entry.key} — ${entry.text}`),
    ].join('\n');
  }
  if (kind === 'facets') {
    return [
      'PADEN (pad, en het aantal producten erin):',
      ...attributes.map((entry) => `- ${entry.key} — ${entry.text}`),
      '',
      // De filternamen van de site als context. Staat een woord daartussen, dan
      // is het bijna zeker een eigenschap — maar dat is bewijs dat de app al
      // gebruikt; hier helpt het alleen om de rest beter te plaatsen.
      ...(columns.length > 0
        ? ['FILTERS DIE DEZE WINKEL AANBIEDT (context):', ...columns.map((entry) => `- ${entry.key}`)]
        : []),
    ].join('\n');
  }
  const [links, rechts] = kind === 'categories'
    ? ['CATEGORIEËN UIT DE VRAGENLIJST:', 'CATEGORIEËN UIT DE CATALOGUS (met het aantal producten):']
    : ['KENMERKEN (naam, en de vraag die erop leunt):', 'KOLOMMEN (naam, en een paar waarden die erin staan):'];
  return [
    links,
    ...attributes.map((entry) => `- ${entry.key} — ${entry.text}`),
    '',
    rechts,
    ...columns.map((entry) => `- ${entry.key} — ${entry.text}`),
  ].join('\n');
}

