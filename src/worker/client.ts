'use client';

// Toegang tot de worker vanaf de pagina, met een terugval.
//
// Workers zijn niet overal beschikbaar: een oude browser, een strak
// contentbeleid, of een ingebedde weergave kan er een blokkeren. Dan draait de
// scan gewoon op de hoofddraad — trager en even bevroren, maar wel een uitkomst.
// Stilletjes falen zou hier het slechtste van twee werelden zijn.

import { ingest } from '../intake/index';
import { runScan } from '../engine/report';
import type { Dataset, QuestionSetState, ScanReport } from '../domain/types';
import type { IngestFile, WorkerRequest, WorkerResponse } from './protocol';

/** Omit over een union verliest de varianten; dit houdt ze uit elkaar. */
type RequestBody = WorkerRequest extends infer T
  ? T extends { id: number } ? Omit<T, 'id'> : never
  : never;

export interface Progress {
  step: string;
  done: number;
  total: number;
}

export class ScanClient {
  private worker?: Worker;
  private nextId = 1;
  /** Terugval: zonder worker houden we de catalogus hier vast. */
  private catalog?: Dataset;

  /** Draait het werk echt buiten de hoofddraad? De UI mag dat zeggen. */
  get offMainThread(): boolean {
    return this.worker !== undefined;
  }

  constructor() {
    try {
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('./scan.worker.ts', import.meta.url), {
          type: 'module',
        });
      }
    } catch {
      this.worker = undefined;
    }
  }

  private send<T extends WorkerResponse>(
    request: RequestBody,
    onProgress?: (progress: Progress) => void,
  ): Promise<T> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error('no-worker'));

    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const handle = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.id !== id) return;
        if (message.type === 'progress') {
          onProgress?.({ step: message.step, done: message.done, total: message.total });
          return;
        }
        worker.removeEventListener('message', handle);
        if (message.type === 'failed') reject(new Error(message.message));
        else resolve(message as T);
      };
      worker.addEventListener('message', handle);
      worker.postMessage({ ...request, id } as WorkerRequest);
    });
  }

  async ingestCatalog(
    file: IngestFile,
    onProgress?: (progress: Progress) => void,
  ): Promise<Dataset> {
    if (this.worker) {
      const result = await this.send<Extract<WorkerResponse, { type: 'ingested' }>>(
        { type: 'ingest', file },
        onProgress,
      );
      return result.catalog;
    }

    // Terugval op de hoofddraad.
    onProgress?.({ step: file.name, done: 0, total: 1 });
    this.catalog = ingest(file.name, file.text, file.overrides ?? {});
    return this.catalog;
  }

  async scan(
    questionState: QuestionSetState,
    scannedAt: string,
    onProgress?: (progress: Progress) => void,
  ): Promise<ScanReport> {
    if (this.worker) {
      const result = await this.send<Extract<WorkerResponse, { type: 'scanned' }>>(
        { type: 'scan', questionState, scannedAt },
        onProgress,
      );
      return result.report;
    }
    if (!this.catalog) throw new Error('Er is nog geen catalogus ingelezen.');
    onProgress?.({ step: 'scan', done: 0, total: 1 });
    return runScan(this.catalog, questionState, { scannedAt });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
  }
}
