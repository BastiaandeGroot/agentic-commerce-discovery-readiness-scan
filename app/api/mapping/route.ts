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
import { PROPOSALS_SCHEMA, SYSTEM, SYSTEM_CATEGORIES, SYSTEM_FACETS, SYSTEM_MARKET, prompt, type Payload } from '../../../src/semantic/prompt';

/** Categorieën, facetten en de markt: een vertaalklus over namen. */
const MODEL = 'claude-haiku-4-5';

/**
 * Kenmerken op kolommen is wél redeneerwerk, en daar is een sterker model voor.
 *
 * De vraag is niet of twee namen op elkaar lijken, maar of een waarde in de
 * kolom de vraag van de consument beantwoordt. Gemeten op De Groot met de
 * woontextielbank (16 september 2026): Haiku 4.5 hing `martindale` aan
 * weefdichtheid en `roll_length` aan voorraad, en kopieerde als bewijs de hele
 * waardenrij; Opus 5 wees bij elk voorstel één waarde aan die klopte en vond
 * `machine_washable` en `sustainable`, die Haiku miste. Ongeveer $0,20 per
 * honderd kenmerken, één keer per catalogus.
 */
const ATTRIBUTE_MODEL = 'claude-opus-5';

/** Ruim genoeg voor honderd koppelregels. */
const MAX_TOKENS = 4096;
/** Honderd koppelingen met bewijs en een zin uitleg, plus het denkwerk. */
const ATTRIBUTE_MAX_TOKENS = 16000;

const LIMITS = {
  attributes: 200,
  columns: 300,
  /** Per tekst; genoeg voor een naam met een vraag of wat waarden erachter. */
  text: 400,
};

/** Weiger wat niet klopt vóór het geld kost, en zeg waarom. */
function validate(body: unknown): Payload | string {
  if (typeof body !== 'object' || body === null) return 'Geen geldig verzoek.';
  const { attributes, columns } = body as Partial<Payload>;
  if (!Array.isArray(attributes) || !Array.isArray(columns)) {
    return 'Verwacht een lijst kenmerken en een lijst kolommen.';
  }
  const kindEarly = (body as Partial<Payload>).kind;
  // Bij een facetoordeel is de tweede lijst context en mag hij leeg zijn: een
  // winkel zonder zichtbare filters is geen fout, alleen minder houvast.
  if (attributes.length === 0 || (columns.length === 0 && kindEarly !== 'facets' && kindEarly !== 'market')) {
    return 'Er is niets te koppelen.';
  }
  if (attributes.length > LIMITS.attributes || columns.length > LIMITS.columns) {
    return `Te groot: hoogstens ${LIMITS.attributes} kenmerken en ${LIMITS.columns} kolommen per aanvraag.`;
  }
  const kind = (body as Partial<Payload>).kind;
  if (kind !== undefined && kind !== 'attributes' && kind !== 'categories' && kind !== 'facets' && kind !== 'market') {
    return 'Onbekend soort koppeling.';
  }
  const clean = (list: { key: string; text: string }[]) => list.every((entry) =>
    entry
    && typeof entry.key === 'string' && entry.key.length > 0 && entry.key.length <= LIMITS.text
    && typeof entry.text === 'string' && entry.text.length <= LIMITS.text);
  if (!clean(attributes) || !clean(columns)) return 'Een naam of omschrijving is leeg of te lang.';
  return { attributes, columns, kind: kind ?? 'attributes' };
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
    const response = payload.kind === 'attributes'
      // Een vaste vorm met een bewijs per koppeling, zodat de client kan nagaan
      // of die waarde echt in de kolom staat. Zie `readProposals`.
      ? await client.messages.create({
        model: ATTRIBUTE_MODEL,
        max_tokens: ATTRIBUTE_MAX_TOKENS,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt(payload) }],
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: PROPOSALS_SCHEMA as unknown as Record<string, unknown> },
        },
      })
      : await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: payload.kind === 'market'
          ? SYSTEM_MARKET
          : payload.kind === 'facets'
            ? SYSTEM_FACETS
            : SYSTEM_CATEGORIES,
        messages: [{ role: 'user', content: prompt(payload) }],
      });

    // Een afgebroken antwoord is geen lege koppeling maar een storing; anders
    // lijkt "niets gevonden" op een uitkomst.
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      console.error('mapping route: gestopt met', response.stop_reason);
      return NextResponse.json({ error: 'Het model gaf geen volledig antwoord.' }, { status: 502 });
    }

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
