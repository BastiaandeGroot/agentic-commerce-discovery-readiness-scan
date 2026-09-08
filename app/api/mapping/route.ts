// De enige serverroute in deze app, en de enige plek waar iets van de merchant
// het apparaat verlaat.
//
// Wat hier gebeurt: de kenmerken uit zijn vragenlijst en de kolommen van zijn
// catalogus gaan naar Claude, die zegt welk kenmerk in welke kolom staat. Wat
// terugkomt is een tabel die de merchant op het koppelscherm ziet staan en
// bevestigt. De scan zelf raakt dit niet aan en blijft deterministisch:
// dezelfde catalogus plus dezelfde koppeling geeft hetzelfde rapport.
//
// Wat er de deur uit gaat, en wat niet:
//
//   - **Wel**: kenmerknamen, de vragen die erop leunen, kolomnamen, en per kolom
//     een handvol voorbeeldwaarden. Die waarden zijn nodig — een kolom
//     `gordijn_dichtheid` met "dicht, transparant" eronder is te plaatsen, de
//     naam alleen niet — maar het ís productdata, en het scherm zegt dat ook.
//   - **Niet**: het bestand, de productrijen, de aantallen, prijzen, of wat dan
//     ook per product. Er gaat geen catalogus naar een server; er gaat een
//     woordenlijst naartoe.
//
// De grenzen hieronder zijn er niet voor de netheid. Deze route kost geld per
// aanroep, dus een verzoek dat te groot of te vaak is hoort geweigerd te worden
// vóórdat het bij het model komt.

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

/** Klein en snel: dit is een vertaalklus over namen, geen redeneerwerk. */
const MODEL = 'claude-haiku-4-5';

/** Ruim genoeg voor honderd koppelregels; het antwoord is bewust kort. */
const MAX_TOKENS = 4096;

const LIMITS = {
  attributes: 200,
  columns: 300,
  /** Per tekst; genoeg voor een naam met een vraag of wat waarden erachter. */
  text: 400,
};

interface Payload {
  attributes: { key: string; text: string }[];
  columns: { key: string; text: string }[];
  /**
   * Twee soorten koppeling, dezelfde vorm. Kenmerken op kolommen, of de
   * vragensets uit de lijst op de eigen categorieën van de merchant. Dat tweede
   * is precies hetzelfde probleem — Engelse vaktaal tegen Nederlandse data — en
   * het verdient geen tweede route, alleen een andere opdracht.
   */
  kind?: 'attributes' | 'categories';
}

/** Weiger wat niet klopt vóór het geld kost, en zeg waarom. */
function validate(body: unknown): Payload | string {
  if (typeof body !== 'object' || body === null) return 'Geen geldig verzoek.';
  const { attributes, columns } = body as Partial<Payload>;
  if (!Array.isArray(attributes) || !Array.isArray(columns)) {
    return 'Verwacht een lijst kenmerken en een lijst kolommen.';
  }
  if (attributes.length === 0 || columns.length === 0) {
    return 'Er is niets te koppelen.';
  }
  if (attributes.length > LIMITS.attributes || columns.length > LIMITS.columns) {
    return `Te groot: hoogstens ${LIMITS.attributes} kenmerken en ${LIMITS.columns} kolommen per aanvraag.`;
  }
  const kind = (body as Partial<Payload>).kind;
  if (kind !== undefined && kind !== 'attributes' && kind !== 'categories') {
    return 'Onbekend soort koppeling.';
  }
  const clean = (list: { key: string; text: string }[]) => list.every((entry) =>
    entry
    && typeof entry.key === 'string' && entry.key.length > 0 && entry.key.length <= LIMITS.text
    && typeof entry.text === 'string' && entry.text.length <= LIMITS.text);
  if (!clean(attributes) || !clean(columns)) return 'Een naam of omschrijving is leeg of te lang.';
  return { attributes, columns, kind: kind ?? 'attributes' };
}

const SYSTEM_CATEGORIES = [
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

const SYSTEM = [
  'Je legt kenmerken uit een vragenlijst op kolommen uit een productcatalogus.',
  '',
  'Regels:',
  '- Koppel alleen wat je zeker weet. Een verkeerde koppeling laat een gat verdwijnen dat de merchant wél heeft, en dat is erger dan geen koppeling: die toont hooguit een gat dat er niet is.',
  '- Laat een kenmerk weg als geen enkele kolom het draagt. Niets is een geldig antwoord, en vaak het juiste.',
  '- Gebruik uitsluitend kolomnamen die letterlijk in de lijst staan. Verzin er nooit een bij.',
  '- Een kolom draagt hoogstens één kenmerk.',
  '- Let op omgekeerde begrippen: een kolom die dichtheid meet, beantwoordt een vraag over doorlatendheid. Die mag je koppelen.',
  '- Let op vaktaal en op twee talen door elkaar: `rapport` en `patroon` zijn in textiel hetzelfde, `rolbreedte` en `roll width` ook.',
  '',
  'Antwoord met één regel per koppeling, in de vorm `kenmerk: kolom`. Geen inleiding, geen uitleg, geen opsommingstekens.',
].join('\n');

function prompt({ attributes, columns, kind }: Payload): string {
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

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Geen sleutel is geen storing maar een configuratie die ontbreekt. Het
    // scherm valt dan terug op het model in de browser, en dat hoort het te
    // kunnen zien aan de code.
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }

  const payload = validate(body);
  if (typeof payload === 'string') {
    return NextResponse.json({ error: payload }, { status: 400 });
  }

  try {
    // Een sleutel die niet aan een workspace hangt, moet die workspace in een
    // header meesturen. Beide soorten sleutels horen te werken, dus sturen we
    // hem mee als hij er is en laten we hem weg als hij er niet is.
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
    const client = new Anthropic(
      workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {},
    );
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: payload.kind === 'categories' ? SYSTEM_CATEGORIES : SYSTEM,
      messages: [{ role: 'user', content: prompt(payload) }],
    });

    // De inhoud is een unie; alleen de tekstblokken zeggen hier iets.
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Ruw terug, en niet als koppeling: de client controleert elke kolomnaam
    // tegen zijn eigen catalogus voordat er iets mee gebeurt. Een verzonnen
    // kolom hoort een fout te zijn en niet een koppeling die nooit iets vindt.
    return NextResponse.json({ text, model: response.model });
  } catch (caught) {
    if (caught instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'not-configured' }, { status: 503 });
    }
    if (caught instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Even te druk; probeer het zo nog eens.' }, { status: 429 });
    }
    if (caught instanceof Anthropic.APIError) {
      // Serverzijdig loggen: de merchant krijgt een leesbare zin, maar zonder
      // de echte melding is een 400 op een sleutel of een model niet te vinden.
      console.error('mapping route:', caught.status, caught.message);
      return NextResponse.json({ error: `Het model gaf een fout (${caught.status}).` }, { status: 502 });
    }
    return NextResponse.json({ error: 'De aanvraag is niet gelukt.' }, { status: 502 });
  }
}
