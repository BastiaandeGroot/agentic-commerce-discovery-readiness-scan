'use client';

// Het taalmodel dat de betekenis van namen en waarden vergelijkt.
//
// Dit is de enige plek in de app waar een model draait, en het draait in de
// browser van de merchant. Wat dat betekent, en waarom het mag:
//
//   - **Er gaat geen productdata de deur uit.** Het model komt naar de data toe,
//     niet andersom. Wat over het netwerk gaat zijn de modelgewichten, één keer,
//     en die kant staat los van je catalogus.
//   - **Het raakt geen enkele score.** Het levert vóórstellen op die de merchant
//     ziet en bevestigt. Daarna draait de scan zoals altijd: dezelfde catalogus
//     plus dezelfde koppeling geeft hetzelfde rapport.
//   - **Het kost niets per scan.** Geen sleutel, geen serverroute, geen tikker.
//
// Bewust een embeddingmodel en geen genererend model. De vraag is "welke van
// deze kolommen betekent hetzelfde als dit kenmerk", en dat is naaste-buur
// zoeken in betekenisruimte — precies waar embeddings voor zijn. Een klein
// genererend model is vier keer zo groot en juist zwak in tweetalige vaktaal.
//
// Deze module hoort daarom NIET in de motor: hij doet netwerk en is async. De
// motor blijft puur en ziet alleen het resultaat, als gewone koppeling.

/**
 * Meertalig, want de vragenlijst is Engels en de kolommen van een Nederlandse
 * merchant zijn dat niet. Klein: dit is een eenmalige download die een merchant
 * moet willen doorstaan.
 */
export const MODEL_ID = 'Xenova/multilingual-e5-small';

/** Waar de bibliotheek vandaan komt. Vastgezet, zodat een update bewust gebeurt. */
const LIBRARY = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';

/** In het versiestempel: welk model deze koppeling voorstelde. */
export const MODEL_VERSION = `${MODEL_ID}@3.0.2`;

export interface LoadProgress {
  /** 0–1, of undefined zolang de omvang niet bekend is. */
  ratio?: number;
  step: 'library' | 'model' | 'embedding';
}

type Extractor = (texts: string[], options: Record<string, unknown>) =>
  Promise<{ tolist(): number[][] }>;

let extractor: Promise<Extractor> | undefined;

/**
 * Laad de bibliotheek en het model, één keer per sessie.
 *
 * De import staat als letterlijke URL en met `webpackIgnore`, zodat de bundel
 * van de app er niets van meekrijgt: wie nooit op dit scherm komt, downloadt
 * niets. De browser cachet het model daarna zelf.
 */
async function load(onProgress?: (progress: LoadProgress) => void): Promise<Extractor> {
  onProgress?.({ step: 'library' });
  // Beide commentaren zijn nodig: de een voor webpack, de ander voor turbopack.
  // Zonder die twee probeert de bundelaar de bibliotheek mee te bakken, en dan
  // downloadt iedereen hem — ook wie nooit op dit scherm komt.
  const url = `${LIBRARY}/dist/transformers.min.js`;
  const transformers = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);

  // WASM en niet WebGPU. Trager, maar dezelfde rekenkernels op elke machine —
  // en een voorstel hoort niet af te hangen van iemands videokaart.
  const wasm = transformers.env?.backends?.onnx?.wasm;
  if (wasm) wasm.numThreads = 1;

  onProgress?.({ step: 'model' });
  return transformers.pipeline('feature-extraction', MODEL_ID, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (event: { status: string; progress?: number }) => {
      if (event.status === 'progress' && typeof event.progress === 'number') {
        onProgress?.({ step: 'model', ratio: event.progress / 100 });
      }
    },
  }) as Promise<Extractor>;
}

export class ModelUnavailable extends Error {}

/**
 * Zet teksten om in genormaliseerde vectoren.
 *
 * `e5` verwacht een voorvoegsel dat zegt wat voor tekst het is; voor het
 * vergelijken van twee gelijksoortige teksten is `query:` aan beide kanten de
 * gangbare keuze.
 */
export async function embed(
  texts: string[],
  onProgress?: (progress: LoadProgress) => void,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    extractor ??= load(onProgress);
    const run = await extractor;
    onProgress?.({ step: 'embedding' });
    const output = await run(texts.map((text) => `query: ${text}`), {
      pooling: 'mean',
      normalize: true,
    });
    return output.tolist();
  } catch (cause) {
    // Opnieuw kunnen proberen: een mislukte download mag de knop niet voorgoed
    // stukmaken, want de merchant kan intussen weer verbinding hebben.
    extractor = undefined;
    throw new ModelUnavailable((cause as Error).message);
  }
}
