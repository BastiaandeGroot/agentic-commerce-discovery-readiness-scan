'use client';

// Stap 1: data aanleveren.
//
// De feed is verplicht en is de analysebron — dat is wat de agent ziet. De
// catalogus is optioneel maar bepaalt of gap-attributie mogelijk is; dat zeggen
// we hier al, zodat de merchant de keuze bewust maakt en niet pas in het rapport
// hoort dat de helft van het antwoord ontbrak.
//
// Hier haakt een merchant af of raakt hij overtuigd. Een bestand klopt bijna
// nooit meteen, dus alles draait om laten zien wat wij lezen en hem laten
// corrigeren voordat er iets beoordeeld wordt.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset, DatasetRole } from '../src/domain/types';
import { FIELDS } from '../src/spec/fields';
import type { Locale, Strings } from '../src/i18n/strings';
import { ScanClient, type Progress } from '../src/worker/client';
import { Badge, Button, Card, CardTitle, ErrorState, FileDropzone, Select } from './ui';

/** Boven deze grens wordt een scan in de browser onprettig traag. */
const LARGE_FILE_MB = 20;

interface Props {
  s: Strings;
  locale: Locale;
  onReady: (client: ScanClient, feed: Dataset, catalog?: Dataset) => void;
}

interface Source {
  name: string;
  text: string;
  /** Correcties van de merchant, per bronkolom. */
  overrides: Record<string, string | null>;
}

function bytesToMb(text: string): number {
  // Ruwe maat: één teken is in de praktijk ongeveer één byte voor deze feeds.
  return text.length / (1024 * 1024);
}

/** Wat wij van je bestand maken, voordat er iets beoordeeld wordt. */
function Preview({ s, dataset }: { s: Strings; dataset: Dataset }) {
  const columns = dataset.columns.slice(0, 8);
  const rest = dataset.columns.length - columns.length;

  return (
    <div>
      <h4 className="text-sm font-medium">{s.upload.previewHeading}</h4>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.upload.previewIntro}</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-2 text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-2.5 py-1.5 font-medium">
                  {column}
                </th>
              ))}
              {rest > 0 ? <th className="px-2.5 py-1.5 font-medium">+{rest}</th> : null}
            </tr>
          </thead>
          <tbody>
            {dataset.preview.slice(0, 5).map((row, index) => (
              <tr key={index} className="border-t border-line/60">
                {columns.map((column) => (
                  <td key={column} className="max-w-48 truncate px-2.5 py-1.5">
                    {row[column] ?? ''}
                  </td>
                ))}
                {rest > 0 ? <td className="px-2.5 py-1.5 text-muted">…</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 tnum text-xs text-muted">
        {s.upload.previewMore} {(dataset.products.length - dataset.preview.slice(0, 5).length).toLocaleString('nl-NL')}{' '}
        {s.upload.previewRows}
      </p>
    </div>
  );
}

/**
 * Kolommen koppelen.
 *
 * Alleen de kolommen die wij ergens op hebben gelegd plus die de merchant zelf
 * heeft aangewezen: de volledige lijst is bij een Channable-feed honderd rijen
 * lang en dan kijkt niemand er meer naar. De rest blijft bereikbaar, want een
 * niet-geplaatste kolom is hier ook te koppelen.
 */
function MappingEditor({ s, locale, dataset, overrides, onChange }: {
  s: Strings;
  locale: Locale;
  dataset: Dataset;
  overrides: Record<string, string | null>;
  onChange: (column: string, key: string | null | undefined) => void;
}) {
  const options = useMemo(() => [
    { value: '', label: s.upload.mappingNone },
    ...FIELDS.map((field) => ({ value: field.key, label: `${field.label[locale]} (${field.key})` })),
  ], [s, locale]);

  const rows = dataset.columns.filter(
    (column) => dataset.mapping[column] !== undefined || overrides[column] !== undefined,
  );

  return (
    <div>
      <h4 className="text-sm font-medium">{s.upload.mappingHeading}</h4>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.upload.mappingIntro}</p>
      <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
        {rows.map((column) => {
          const corrected = overrides[column] !== undefined;
          const value = dataset.mapping[column] ?? '';
          const sample = dataset.preview.find((row) => (row[column] ?? '') !== '')?.[column];
          return (
            <li key={column} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2.5 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs">{column}</span>
                {sample ? (
                  <span className="block truncate text-xs text-muted">{sample}</span>
                ) : null}
              </span>
              <Badge tone={corrected ? 'accent' : 'neutral'}>
                {corrected ? s.upload.mappingCorrected : s.upload.mappingGuessed}
              </Badge>
              <Select
                label={s.upload.mappingField}
                value={value}
                onChange={(next) => onChange(column, next === '' ? null : next)}
                options={options}
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-muted">{s.upload.mappingUnmappedNote}</p>
    </div>
  );
}

export function UploadStep({ s, locale, onReady }: Props) {
  // Eén client voor de hele stap; hij houdt de worker en de datasets vast.
  const clientRef = useRef<ScanClient>(undefined);
  if (!clientRef.current) clientRef.current = new ScanClient();
  const client = clientRef.current;
  // Bewust géén dispose in een effect-cleanup: React draait effecten in
  // ontwikkelmodus dubbel (aankoppelen, opruimen, aankoppelen), en dan is de
  // worker beëindigd voordat hij ooit iets gedaan heeft. De scan valt dan
  // stilletjes terug op de hoofddraad. Een worker sterft met de pagina; hier
  // opruimen levert niets op en kost de hele winst. Bij "nieuwe scan" wordt hij
  // wél expliciet opgeruimd.

  // Of er een worker is, weet alleen de browser. Meteen renderen zou de server
  // "geen worker" laten zeggen en de client "wel", en dat is een hydratiefout.
  const [offMainThread, setOffMainThread] = useState<boolean>();
  useEffect(() => setOffMainThread(client.offMainThread), [client]);

  const [sources, setSources] = useState<Partial<Record<DatasetRole, Source>>>({});
  const [datasets, setDatasets] = useState<{ feed?: Dataset; catalog?: Dataset }>({});
  const [error, setError] = useState<{ title: string; body: string; next?: string }>();
  const [progress, setProgress] = useState<Progress>();
  const [busy, setBusy] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [acceptedLarge, setAcceptedLarge] = useState(false);

  const feedSource = sources.feed;
  const largeMb = feedSource ? bytesToMb(feedSource.text) : 0;
  const tooLarge = largeMb > LARGE_FILE_MB && !acceptedLarge;

  /** Lees alles opnieuw in; dat is ook de weg terug na een correctie. */
  async function reingest(next: Partial<Record<DatasetRole, Source>>) {
    const feed = next.feed;
    if (!feed) { setDatasets({}); return; }

    setBusy(true);
    setError(undefined);
    try {
      const files = [
        { role: 'feed' as const, name: feed.name, text: feed.text, overrides: feed.overrides },
        ...(next.catalog
          ? [{ role: 'catalog' as const, name: next.catalog.name, text: next.catalog.text, overrides: next.catalog.overrides }]
          : []),
      ];
      const result = await client.ingestAll(files, setProgress);
      setDatasets(result);

      if (Object.keys(result.feed.mapping).length === 0) {
        setError({ title: s.errors.noColumns, body: s.errors.noColumnsNext });
      }
    } catch (caught) {
      setDatasets({});
      setError({ title: s.errors.readFailed, body: (caught as Error).message });
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  }

  async function handleFile(file: File, role: DatasetRole) {
    if (!/\.(csv|tsv|txt|json|ndjson|xml|rss)$/i.test(file.name)) {
      setError({ title: s.errors.wrongType, body: s.errors.wrongTypeNext });
      return;
    }
    const text = await file.text();
    const next = { ...sources, [role]: { name: file.name, text, overrides: {} } };
    setSources(next);
    setAcceptedLarge(false);
    await reingest(next);
  }

  function clear(role: DatasetRole) {
    const next = { ...sources };
    delete next[role];
    setSources(next);
    void reingest(next);
  }

  function correct(role: DatasetRole, column: string, key: string | null | undefined) {
    const source = sources[role];
    if (!source) return;
    const overrides = { ...source.overrides };
    if (key === undefined) delete overrides[column];
    else overrides[column] = key;
    const next = { ...sources, [role]: { ...source, overrides } };
    setSources(next);
    void reingest(next);
  }

  async function loadSample() {
    setBusy(true);
    try {
      const [feedText, catalogText] = await Promise.all([
        fetch('/sample-feed.csv').then((r) => r.text()),
        fetch('/sample-catalog.json').then((r) => r.text()),
      ]);
      const next = {
        feed: { name: 'sample-feed.csv', text: feedText, overrides: {} },
        catalog: { name: 'sample-catalog.json', text: catalogText, overrides: {} },
      };
      setSources(next);
      await reingest(next);
    } catch (caught) {
      setError({ title: s.errors.readFailed, body: (caught as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function Slot({ role, label, hint }: { role: DatasetRole; label: string; hint: string }) {
    const dataset = datasets[role];
    const source = sources[role];

    return (
      <div className="rounded-lg border border-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-medium">{label}</h3>
          <span className="text-xs text-muted">{s.upload.formats}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{hint}</p>

        {dataset && source ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ok">{dataset.filename}</Badge>
              <span className="tnum text-xs text-muted">
                {s.upload.recognised} {dataset.format} — {dataset.products.length.toLocaleString('nl-NL')}{' '}
                {s.upload.products}, {Object.keys(dataset.mapping).length} {s.upload.mappedColumns},{' '}
                {dataset.unmappedColumns.length} {s.upload.unmappedColumns}
              </span>
              <Button variant="quiet" onClick={() => clear(role)}>{s.upload.remove}</Button>
            </div>
            <Preview s={s} dataset={dataset} />
            {showMapping ? (
              <MappingEditor
                s={s}
                locale={locale}
                dataset={dataset}
                overrides={source.overrides}
                onChange={(column, key) => correct(role, column, key)}
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <FileDropzone
              id={`bestand-${role}`}
              label={s.upload.choose}
              hint={s.upload.drop}
              accept=".csv,.tsv,.txt,.json,.ndjson,.xml,.rss"
              disabled={busy}
              onFile={(file) => void handleFile(file, role)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardTitle sub={s.upload.intro}>{s.upload.heading}</CardTitle>

      {error ? (
        <div className="mb-4">
          <ErrorState title={error.title} body={error.body} next={error.next} />
        </div>
      ) : null}

      {tooLarge ? (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <p className="font-medium text-warn">{s.upload.tooLarge}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {s.upload.tooLargeBody.replace('{limit}', String(LARGE_FILE_MB))}
          </p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => setAcceptedLarge(true)}>
              {s.upload.tryAnyway}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Slot role="feed" label={s.upload.feedLabel} hint={s.upload.feedHint} />
        <Slot role="catalog" label={s.upload.catalogLabel} hint={s.upload.catalogHint} />
      </div>

      {datasets.feed ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setShowMapping(!showMapping)}>
            {showMapping ? s.upload.mappingHide : s.upload.mappingShow}
          </Button>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => datasets.feed && onReady(client, datasets.feed, datasets.catalog)}
          disabled={!datasets.feed || busy || tooLarge}
          loading={busy}
        >
          {busy ? s.upload.reading : s.upload.analyse}
        </Button>
        <Button variant="secondary" onClick={loadSample} disabled={busy}>
          {s.upload.sample}
        </Button>
      </div>

      {progress ? (
        <p className="mt-2 tnum text-xs text-muted">
          {s.upload.progressReading}: {progress.step} ({progress.done + 1}/{progress.total})
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {s.upload.privacy}{' '}
        {offMainThread === undefined ? null : offMainThread ? s.upload.workerOn : s.upload.workerOff}
      </p>
    </Card>
  );
}
