/// <reference lib="webworker" />

// De zware kant van de scan, weg van de hoofddraad.
//
// Een catalogus van een paar duizend producten parsen en beoordelen kost een
// seconde of meer. Op de hoofddraad betekent dat een bevroren pagina: geen
// scrollen, geen knop die reageert, geen voortgang. Hier kan de pagina intussen
// gewoon tekenen.
//
// De worker houdt de datasets zelf vast. Ze gaan één keer naar de pagina voor de
// vragensets en het rapport; ze terugsturen om te kunnen scannen zou dezelfde
// paar duizend producten nog een keer door de structured clone duwen.

import { ingest } from '../intake/index';
import { runScan } from '../engine/report';
import type { Dataset } from '../domain/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

const scope = self as unknown as DedicatedWorkerGlobalScope;

let feed: Dataset | undefined;
let catalog: Dataset | undefined;

function post(message: WorkerResponse) {
  scope.postMessage(message);
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'ingest') {
      feed = undefined;
      catalog = undefined;
      const total = request.files.length;
      request.files.forEach((file, index) => {
        post({ id: request.id, type: 'progress', step: file.name, done: index, total });
        const dataset = ingest(file.name, file.text, file.role, file.overrides ?? {});
        if (file.role === 'feed') feed = dataset;
        else catalog = dataset;
      });
      if (!feed) throw new Error('Geen feed aangeleverd.');
      post({ id: request.id, type: 'ingested', feed, catalog });
      return;
    }

    if (request.type === 'scan') {
      if (!feed) throw new Error('Er is nog geen feed ingelezen.');
      post({ id: request.id, type: 'progress', step: 'scan', done: 0, total: 1 });
      const report = runScan(feed, catalog, request.questionState, {
        scannedAt: request.scannedAt,
      });
      post({ id: request.id, type: 'scanned', report });
    }
  } catch (error) {
    post({ id: request.id, type: 'failed', message: (error as Error).message });
  }
};
