// Berichten tussen de pagina en de worker. Apart bestand zodat beide kanten
// dezelfde vorm gebruiken en een wijziging aan één kant niet stilletjes langs
// de andere glipt.

import type { Dataset, DatasetRole, QuestionSetState, ScanReport } from '../domain/types';

export interface IngestFile {
  role: DatasetRole;
  name: string;
  text: string;
  /** Correcties van de merchant op de kolomherkenning. */
  overrides?: Record<string, string | null>;
}

export type WorkerRequest =
  | { id: number; type: 'ingest'; files: IngestFile[] }
  | { id: number; type: 'scan'; questionState: QuestionSetState; scannedAt: string };

export type WorkerResponse =
  | { id: number; type: 'progress'; step: string; done: number; total: number }
  | { id: number; type: 'ingested'; feed: Dataset; catalog?: Dataset }
  | { id: number; type: 'scanned'; report: ScanReport }
  | { id: number; type: 'failed'; message: string };
