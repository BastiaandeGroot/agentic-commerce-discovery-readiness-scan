'use client';

// Stap 1: data aanleveren.
//
// De feed is verplicht en is de analysebron — dat is wat de agent ziet. De
// catalogus is optioneel maar bepaalt of gap-attributie mogelijk is; dat zeggen
// we hier al, zodat de merchant de keuze bewust maakt en niet pas in het rapport
// hoort dat de helft van het antwoord ontbrak.

import { useState } from 'react';
import type { Dataset } from '../src/domain/types';
import { ingest } from '../src/intake/index';
import type { Strings } from '../src/i18n/strings';
import { Badge, Button, Card, CardTitle } from './ui';

interface Props {
  s: Strings;
  onReady: (feed: Dataset, catalog?: Dataset) => void;
}

interface Slot {
  dataset?: Dataset;
  error?: string;
}

function DatasetSummary({ s, dataset }: { s: Strings; dataset: Dataset }) {
  const [open, setOpen] = useState(false);
  const mapped = Object.entries(dataset.mapping);

  return (
    <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="ok">{dataset.filename}</Badge>
        <span className="text-muted">
          {s.upload.recognised} <strong className="text-ink">{dataset.format}</strong> —{' '}
          <span className="tnum">{dataset.products.length.toLocaleString('nl-NL')}</span> {s.upload.products},{' '}
          <span className="tnum">{mapped.length}</span> {s.upload.mappedColumns},{' '}
          <span className="tnum">{dataset.unmappedColumns.length}</span> {s.upload.unmappedColumns}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 text-xs font-medium text-accent underline underline-offset-2"
      >
        {open ? s.upload.hideMapping : s.upload.showMapping}
      </button>

      {open ? (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-line bg-surface">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-2 text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{s.upload.sourceColumn}</th>
                <th className="px-3 py-2 font-medium">{s.upload.mappedTo}</th>
              </tr>
            </thead>
            <tbody>
              {mapped.map(([column, key]) => (
                <tr key={column} className="border-t border-line">
                  <td className="px-3 py-1.5 font-mono">{column}</td>
                  <td className="px-3 py-1.5 text-accent">{key}</td>
                </tr>
              ))}
              {dataset.unmappedColumns.map((column) => (
                <tr key={column} className="border-t border-line">
                  <td className="px-3 py-1.5 font-mono text-muted">{column}</td>
                  <td className="px-3 py-1.5 text-muted">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {dataset.unmappedColumns.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">{s.upload.unmappedNote}</p>
      ) : null}
    </div>
  );
}

export function UploadStep({ s, onReady }: Props) {
  const [feed, setFeed] = useState<Slot>({});
  const [catalog, setCatalog] = useState<Slot>({});
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined, role: 'feed' | 'catalog') {
    const setSlot = role === 'feed' ? setFeed : setCatalog;
    if (!file) { setSlot({}); return; }

    setBusy(true);
    try {
      const text = await file.text();
      setSlot({ dataset: ingest(file.name, text, role) });
    } catch (error) {
      setSlot({ error: `${s.errors.readFailed}: ${(error as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function loadSample() {
    setBusy(true);
    try {
      const [feedText, catalogText] = await Promise.all([
        fetch('/sample-feed.csv').then((r) => r.text()),
        fetch('/sample-catalog.json').then((r) => r.text()),
      ]);
      setFeed({ dataset: ingest('sample-feed.csv', feedText, 'feed') });
      setCatalog({ dataset: ingest('sample-catalog.json', catalogText, 'catalog') });
    } catch (error) {
      setFeed({ error: `${s.errors.readFailed}: ${(error as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  function FilePicker({ role, slot, label, hint }: {
    role: 'feed' | 'catalog'; slot: Slot; label: string; hint: string;
  }) {
    return (
      <div className="rounded-lg border border-dashed border-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-medium">{label}</h3>
          <span className="text-xs text-muted">{s.upload.formats}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{hint}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-2">
            {s.upload.choose}
            <input
              type="file"
              className="sr-only"
              accept=".csv,.tsv,.txt,.json,.ndjson,.xml,.rss"
              onChange={(e) => handleFile(e.target.files?.[0], role)}
            />
          </label>
          {slot.dataset ? (
            <Button variant="quiet" onClick={() => (role === 'feed' ? setFeed({}) : setCatalog({}))}>
              {s.upload.remove}
            </Button>
          ) : null}
        </div>

        {slot.error ? (
          <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{slot.error}</p>
        ) : null}
        {slot.dataset ? <DatasetSummary s={s} dataset={slot.dataset} /> : null}
      </div>
    );
  }

  return (
    <Card>
      <CardTitle sub={s.upload.intro}>{s.upload.heading}</CardTitle>

      <div className="grid gap-4 lg:grid-cols-2">
        <FilePicker role="feed" slot={feed} label={s.upload.feedLabel} hint={s.upload.feedHint} />
        <FilePicker role="catalog" slot={catalog} label={s.upload.catalogLabel} hint={s.upload.catalogHint} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => feed.dataset && onReady(feed.dataset, catalog.dataset)}
          disabled={!feed.dataset || busy}
        >
          {busy ? s.upload.reading : s.upload.analyse}
        </Button>
        <Button variant="secondary" onClick={loadSample} disabled={busy}>
          {s.upload.sample}
        </Button>
        <span className="text-xs text-muted">{s.upload.privacy}</span>
      </div>
    </Card>
  );
}
