// De uitvoerder van één fase: hier praat de generatie werkelijk met een model.
//
// Alles wat de uitkomst bepaalt staat in `src/generation/` en is puur. Dit
// bestand doet er drie dingen bij die geen van alle over de inhoud gaan: het
// kiest het model, het zet de webgereedschappen aan, en het haalt het JSON-object
// uit het antwoord. Zo blijft de reeks na te spelen zonder netwerk.
//
// Alleen serverzijdig. Nooit importeren vanuit een component.

import Anthropic from '@anthropic-ai/sdk';
import type { Ask, AskReply, AskTask } from '../generation/pipeline';
import { extractJson } from '../generation/json';

/**
 * Twee modellen, en dat is de grootste kostenknop die deze pijplijn heeft.
 *
 * `reader` leest panelsites: FAQ's uitlezen, specificatietabellen overnemen,
 * beslisregels letterlijk overschrijven. Dat is leeswerk, en het is verreweg het
 * grootste deel van de tokens — vijf sites tegen één basislaag.
 *
 * `judge` weegt en schrijft: de basislaag, de overlays, de groepering. Daar hangt
 * de kwaliteit van de hele bank aan, en daar staat het zware model. Dit is de
 * enige plek waar die keuze valt; wil je hem anders, dan is dit de tabel.
 */
const MODELS: Record<'reader' | 'judge', string> = {
  reader: 'claude-sonnet-5',
  judge: 'claude-opus-5',
};

/**
 * Hoe diep het model per soort werk mag nadenken.
 *
 * Lezen is geen denkwerk: daar kost hoge effort tokens zonder dat het antwoord
 * beter wordt. Wegen is dat wél, en daar is bezuinigen op effort de duurste
 * besparing die je kunt doen — die betaal je terug in een bank die een mens moet
 * herstellen.
 */
const EFFORT: Record<'reader' | 'judge', 'low' | 'high'> = {
  reader: 'low',
  judge: 'high',
};

/** Hoe vaak een fase mag doorlopen als het model tussendoor pauzeert. */
const MAX_CONTINUATIONS = 8;

/**
 * Een fase die strandt, met wat hij tot dat moment verbruikt heeft.
 *
 * Die tokens zijn wél betaald. Ze weglaten maakt de kostenkolom onwaar op precies
 * het moment dat je hem nodig hebt: een markt die drie keer struikelt is duur, en
 * dat hoort te zien te zijn.
 */
export class PhaseFailure extends Error {
  constructor(message: string, readonly usage: { input: number; output: number; cached: number }) {
    super(message);
    this.name = 'PhaseFailure';
  }
}

/** De gereedschappen waarmee een fase het web op mag. */
function webTools(): Anthropic.Messages.ToolUnion[] {
  return [
    // Zoeken om de panelsites te vinden, ophalen om ze te lezen. Web fetch haalt
    // alleen URL's op die al in het gesprek staan, en dat is precies goed: de
    // panelsites staan in de prompt en er komt niets bij dat wij niet kozen.
    { type: 'web_search_20260209', name: 'web_search', max_uses: 12 } as unknown as Anthropic.Messages.ToolUnion,
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 20 } as unknown as Anthropic.Messages.ToolUnion,
  ];
}

function usageOf(usage: Anthropic.Messages.Usage | undefined) {
  return {
    input: usage?.input_tokens ?? 0,
    output: usage?.output_tokens ?? 0,
    cached: usage?.cache_read_input_tokens ?? 0,
  };
}

// Het uitpakken van het antwoord staat in `src/generation/json.ts` en is puur;
// hier alleen doorgegeven, zodat er één plek is waar dat gebeurt.
export { extractJson };

/**
 * Eén fase uitvoeren.
 *
 * Het systeemdeel draagt een cachemarkering en is voor élke fase gelijk. Een
 * generatie doet twaalf tot vijftien aanroepen op diezelfde regels; zonder die
 * markering betaal je ze vijftien keer vol.
 */
/** Een sleutel die niet aan een workspace hangt moet die in een header meesturen. */
function makeClient(): Anthropic {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic(
    workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {},
  );
}

export function makeAsk(): Ask {
  const client = makeClient();

  return async function ask(task: AskTask): Promise<AskReply> {
    const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: task.prompt }];
    let usage = { input: 0, output: 0, cached: 0 };
    let text = '';

    for (let round = 0; round < MAX_CONTINUATIONS; round++) {
      const stream = client.messages.stream({
        model: MODELS[task.model],
        max_tokens: task.maxTokens,
        system: [{ type: 'text', text: task.system, cache_control: { type: 'ephemeral' } }],
        thinking: { type: 'adaptive' },
        output_config: { effort: EFFORT[task.model] },
        ...(task.web ? { tools: webTools() } : {}),
        messages,
      });

      const response = await stream.finalMessage();
      const round_usage = usageOf(response.usage);
      usage = {
        input: usage.input + round_usage.input,
        output: usage.output + round_usage.output,
        cached: usage.cached + round_usage.cached,
      };

      text = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      // Een fase die vijf sites afloopt komt terug met `pause_turn`: het model is
      // nog niet klaar maar de beurt is op. Doorgaan is dan geen herkansing maar
      // hetzelfde werk voortzetten, dus de tokens tellen door en de inhoud gaat
      // ongewijzigd terug.
      if (response.stop_reason !== 'pause_turn') {
        if (response.stop_reason === 'refusal') {
          throw new PhaseFailure(
            `Het model weigerde deze stap (${response.stop_details?.category ?? 'zonder reden'}).`,
            usage,
          );
        }
        if (response.stop_reason === 'max_tokens') {
          throw new PhaseFailure('Het antwoord liep tegen de tokenlimiet aan en is daarmee afgekapt.', usage);
        }
        try {
          return { json: extractJson(text), usage };
        } catch (caught) {
          throw new PhaseFailure(caught instanceof Error ? caught.message : 'Onleesbaar antwoord.', usage);
        }
      }

      messages.push({ role: 'assistant', content: response.content });
    }

    // Op is op. Verder laten lopen zou een fase zijn die zichzelf niet afmaakt
    // en wel doorbetaalt; dan is drie keer stuk en een mens ernaar laten kijken
    // het goedkopere einde.
    throw new PhaseFailure(`De stap ${task.phase} was na ${MAX_CONTINUATIONS} beurten nog niet klaar.`, usage);
  };
}

/**
 * Kan deze stap via de batch-API?
 *
 * Alleen de fasen die niet het web op gaan. Niet omdat de batch-API dat niet
 * zou kunnen — dat weet ik niet — maar omdat ik het niet op een echte markt wil
 * uitproberen: een oogstfase die stil faalt kost een herkansing van tien
 * minuten. De besparing zit toch waar de dure fasen zitten: elf van de achttien
 * stappen, allemaal op Opus, samen het leeuwendeel van de rekening.
 */
export function batchable(task: AskTask): boolean {
  return !task.web;
}

/** De vraag zoals de API hem wil, voor beide wegen dezelfde. */
function paramsFor(task: AskTask) {
  return {
    model: MODELS[task.model],
    max_tokens: task.maxTokens,
    system: [{ type: 'text' as const, text: task.system }],
    thinking: { type: 'adaptive' as const },
    output_config: { effort: EFFORT[task.model] },
    messages: [{ role: 'user' as const, content: task.prompt }],
  };
}

/**
 * De fase als label op de batch.
 *
 * Een batchantwoord draagt geen herkenbare inhoud: een basislaag met nul vragen
 * en een antwoord dat voor een andere fase bedoeld was zien er voor de lezer
 * hetzelfde uit. Het label maakt dat verschil controleerbaar. De API staat
 * alleen letters, cijfers, `_` en `-` toe, dus `overlay:3` wordt `overlay_3`.
 */
const labelOf = (phase: string) => phase.replace(/[^a-zA-Z0-9_-]/g, '_');

/** Eén fase indienen ter verwerking. Geeft het batch-id terug. */
export async function submitBatch(task: AskTask): Promise<string> {
  const client = makeClient();
  const batch = await client.messages.batches.create({
    requests: [{
      custom_id: labelOf(task.phase),
      // De typering van de batch-API kent `output_config` en `thinking` niet in
      // deze combinatie; de API zelf wel. Eén cast op één plek, met de reden
      // erbij, is beter dan de vorm hier uitschrijven en laten verlopen.
      params: paramsFor(task) as unknown as Anthropic.Messages.BatchCreateParams.Request['params'],
    }],
  });
  return batch.id;
}

/**
 * Het antwoord ophalen, als het er is.
 *
 * `null` betekent: nog bezig. Dat is geen fout maar de normale toestand van een
 * batch die net is ingediend, en de beller hoort er niets anders mee te doen
 * dan later terugkomen.
 */
export async function collectBatch(batchId: string, phase: string): Promise<AskReply | null> {
  const client = makeClient();
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== 'ended') return null;

  for await (const entry of await client.messages.batches.results(batchId)) {
    // Een antwoord voor een andere fase is geen antwoord. Stil opnemen levert
    // een fase op die er gewoon uitziet en niets bevat.
    if (entry.custom_id !== labelOf(phase)) {
      throw new PhaseFailure(
        `De batch hoort bij ${entry.custom_id} en niet bij ${phase}.`,
        { input: 0, output: 0, cached: 0 },
      );
    }
    if (entry.result.type === 'succeeded') {
      const message = entry.result.message;
      const text = message.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
      const usage = usageOf(message.usage);
      if (message.stop_reason === 'max_tokens') {
        throw new PhaseFailure('Het antwoord liep tegen de tokenlimiet aan en is daarmee afgekapt.', usage);
      }
      try {
        return { json: extractJson(text), usage };
      } catch (caught) {
        throw new PhaseFailure(caught instanceof Error ? caught.message : 'Onleesbaar antwoord.', usage);
      }
    }
    if (entry.result.type === 'expired') {
      throw new PhaseFailure('De batch is verlopen zonder antwoord.', { input: 0, output: 0, cached: 0 });
    }
    throw new PhaseFailure('De batch kwam terug met een fout.', { input: 0, output: 0, cached: 0 });
  }

  throw new PhaseFailure('De batch leverde geen uitkomst op.', { input: 0, output: 0, cached: 0 });
}

/** Wat een stap ongeveer kostte, in dollarcenten. Voor het beheerscherm. */
export function estimateCents(model: 'reader' | 'judge', usage: { input: number; output: number; cached: number }): number {
  // Prijzen per miljoen tokens, uit de tarieventabel van de API. Ze staan hier
  // als schatting voor het scherm en nergens als afrekening: de rekening komt
  // van Anthropic en niet van dit bestand.
  const price = model === 'judge' ? { input: 5, output: 25 } : { input: 2, output: 10 };
  const dollars = (usage.input * price.input + usage.output * price.output) / 1_000_000;
  return Math.round(dollars * 100);
}
