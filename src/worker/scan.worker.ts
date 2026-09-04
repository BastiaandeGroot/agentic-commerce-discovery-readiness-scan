/// <reference lib="webworker" />

// De zware kant van de scan, weg van de hoofddraad.
//
// Een catalogus van een paar duizend producten parsen en beoordelen kost een
// seconde of meer. Op de hoofddraad betekent dat een bevroren pagina: geen
// scrollen, geen knop die reageert, geen voortgang. Hier kan de pagina intussen
// gewoon tekenen.
//
// De worker houdt de catalogus zelf vast. Hij gaat één keer naar de pagina voor
// de vragensets en het rapport; hem terugsturen om te kunnen scannen zou dezelfde
// paar duizend producten nog een keer door de structured clone duwen.

import { ingest } from '../intake/index';
import { runScan } from '../engine/report';
import type { Dataset } from '../domain/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

const scope = self as unknown as DedicatedWorkerGlobalScope;

let catalog: Dataset | undefined;

function post(message: WorkerResponse) {
  scope.postMessage(message);
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'ingest') {
      catalog = undefined;
      post({ id: request.id, type: 'progress', step: request.file.name, done: 0, total: 1 });
      catalog = ingest(request.file.name, request.file.text, request.file.overrides ?? {});
      post({ id: request.id, type: 'ingested', catalog });
      return;
    }

    if (request.type === 'scan') {
      if (!catalog) throw new Error('Er is nog geen catalogus ingelezen.');
      post({ id: request.id, type: 'progress', step: 'scan', done: 0, total: 1 });
      post({
        id: request.id,
        type: 'scanned',
        report: runScan(catalog, request.questionState, { scannedAt: request.scannedAt }),
      });
    }
  } catch (error) {
    post({ id: request.id, type: 'failed', message: (error as Error).message });
  }
};
