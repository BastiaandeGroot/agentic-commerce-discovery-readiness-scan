'use client';

// De kant van de pagina naar de serverroute.
//
// Twee dingen die deze module dragend maken.
//
// **Hij geeft geen koppeling terug maar tekst.** Wat het model zegt gaat door
// `parseMappingAnswer`, en die controleert elke kolomnaam tegen de catalogus van
// deze merchant. Een verzonnen kolom is daar een fout en geen koppeling: zou hij
// doorglippen, dan telt het kenmerk als gekoppeld terwijl het nooit iets vindt,
// en blijft het gat staan zonder dat iemand nog ziet waarom.
//
// **Hij weet het verschil tussen "kan niet" en "is niet ingesteld".** Zonder
// sleutel op de server is er niets stuk; dan hoort het scherm terug te vallen op
// het model in de browser en dat te zeggen. Een echte storing is iets anders en
// mag niet als hetzelfde langskomen.

import { parseMappingAnswer, type MappingPair } from '../spec/mapping';

export class MappingNotConfigured extends Error {}
export class MappingFailed extends Error {}

export interface RemoteInput {
  attributes: { key: string; text: string }[];
  columns: { key: string; text: string }[];
  /** Kenmerken op kolommen, of vragensets op categorieën. Zelfde vorm. */
  kind?: 'attributes' | 'categories';
}

export interface RemoteResult {
  pairs: MappingPair[];
  /** Welk model het voorstel deed; hoort in beeld en in het versiestempel. */
  model: string;
  /** Kolommen die het model noemde maar die niet bestaan. Zichtbaar, niet stil. */
  rejected: string[];
  /**
   * Wat er aan het antwoord opvalt zonder dat het fout is — bijvoorbeeld één
   * kolom die aan vier kenmerken hangt. Dat kán kloppen bij een vrij
   * onderhoudsveld, maar het is ook de manier waarop een cijfer omhoog kruipt
   * zonder dat er een vraag meer beantwoord wordt.
   */
  notes: string[];
}

/**
 * Vraag de serverroute om een koppeling.
 *
 * `knownColumns` is de lijst waartegen het antwoord gecontroleerd wordt, en dat
 * is met opzet de catalogus van de merchant en niet wat we net opstuurden: zo
 * kan een antwoord nooit iets koppelen dat hier niet bestaat.
 */
export async function requestMapping(
  input: RemoteInput,
  knownColumns: string[],
): Promise<RemoteResult> {
  let response: Response;
  try {
    response = await fetch('/api/mapping', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (cause) {
    throw new MappingFailed((cause as Error).message);
  }

  if (response.status === 503) throw new MappingNotConfigured();
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new MappingFailed(String(body.error ?? response.statusText));
  }

  const body = await response.json() as { text?: string; model?: string };
  const parsed = parseMappingAnswer(
    body.text ?? '',
    input.attributes.map((attribute) => attribute.key),
    knownColumns,
  );

  return {
    pairs: parsed.pairs,
    model: body.model ?? 'onbekend',
    // De fouten van de parser zijn hier geen blokkade maar een waarneming: het
    // model noemde een kolom die niet bestaat, de rest blijft bruikbaar.
    rejected: parsed.errors,
    notes: parsed.warnings,
  };
}
