'use client';

// De scan op de voorbeeldcatalogus, voor de landingspagina en /demo.
//
// Geen nagemaakte schermafbeelding en geen vastgezette cijfers: dit is dezelfde
// motor op dezelfde weg als bij een echte merchant. Zo kan wat een bezoeker ziet
// niet uit de pas gaan lopen met wat de scan werkelijk doet — en dat is precies
// de belofte die de rest van het rapport ook maakt.

import { useEffect, useState } from 'react';
import type { ScanReport } from '../src/domain/types';
import { generateQuestionSets } from '../src/questions/generate';
import { ScanClient } from '../src/worker/client';

/** Vast tijdstip: de voorbeeldscan hoort er morgen hetzelfde uit te zien. */
const SAMPLE_SCANNED_AT = '2026-01-01T09:00:00.000Z';

export function useSampleScan(): { report?: ScanReport; error?: string } {
  const [report, setReport] = useState<ScanReport>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const client = new ScanClient();

    (async () => {
      try {
        const text = await fetch('/sample-catalog.csv').then((r) => r.text());
        const catalog = await client.ingestCatalog({ name: 'sample-catalog.csv', text });
        // De sets worden meteen als bevestigd doorgegeven: op een voorbeeld is er
        // geen merchant om ze na te kijken, en de validatiestap hoort bij hem.
        const questions = generateQuestionSets(catalog);
        const validated = {
          ...questions,
          sets: questions.sets.map((set) => ({ ...set, validated: true })),
        };
        const result = await client.scan(validated, SAMPLE_SCANNED_AT);
        if (!cancelled) setReport(result);
      } catch (caught) {
        if (!cancelled) setError((caught as Error).message);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { report, error };
}
