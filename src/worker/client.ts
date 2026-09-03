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
  /** Terugval: zonder worker houden we de datasets hier vast. */
  private feed?: Dataset;
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

  async ingestAll(
    files: IngestFile[],
    onProgress?: (progress: Progress) => void,
  ): Promise<{ feed: Dataset; catalog?: Dataset }> {
    if (this.worker) {
      const result = await this.send<Extract<WorkerResponse, { type: 'ingested' }>>(
        { type: 'ingest', files },
        onProgress,
      );
      return { feed: result.feed, catalog: result.catalog };
    }

    // Terugval op de hoofddraad.
    let feed: Dataset | undefined;
    let catalog: Dataset | undefined;
    files.forEach((file, index) => {
      onProgress?.({ step: file.name, done: index, total: files.length });
      const dataset = ingest(file.name, file.text, file.role, file.overrides ?? {});
      if (file.role === 'feed') feed = dataset;
      else catalog = dataset;
    });
    if (!feed) throw new Error('Geen feed aangeleverd.');
    this.feed = feed;
    this.catalog = catalog;
    return { feed, catalog };
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
    if (!this.feed) throw new Error('Er is nog geen feed ingelezen.');
    onProgress?.({ step: 'scan', done: 0, total: 1 });
    return runScan(this.feed, this.catalog, questionState, { scannedAt });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
  }
}
