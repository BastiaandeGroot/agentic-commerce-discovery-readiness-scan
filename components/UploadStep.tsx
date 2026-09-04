'use client';

// Stap 1: je catalogus aanleveren.
//
// Eén bron, en met opzet de export uit het systeem waar de merchant zijn
// productkennis werkelijk onderhoudt: zijn PIM of MDM, of anders Magento of
// Shopify. Daar staat wat hij wéét van zijn producten, en dat is wat de scan
// meet. Een kanaalfeed is een afgeleide en zou een dunner beeld geven van
// dezelfde catalogus.
//
// Hier haakt een merchant af of raakt hij overtuigd. Een bestand klopt bijna
// nooit meteen, dus alles draait om laten zien wat wij lezen en hem laten
// corrigeren voordat er iets beoordeeld wordt.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '../src/domain/types';
import { FIELDS } from '../src/spec/fields';
import type { Locale, Strings } from '../src/i18n/strings';
import { ScanClient, type Progress } from '../src/worker/client';
import { Badge, Button, Card, CardTitle, ErrorState, FileDropzone, Select } from './ui';

/** Boven deze grens wordt een scan in de browser onprettig traag. */
const LARGE_FILE_MB = 20;

interface Props {
  s: Strings;
  locale: Locale;
  onReady: (client: ScanClient, catalog: Dataset, site?: string) => void;
}

interface Source {
  name: string;
  text: string;
  /** Correcties van de merchant, per bronkolom. */
  overrides: Record<string, string | null>;
}

function bytesToMb(text: string): number {
  // Ruwe maat: één teken is in de praktijk ongeveer één byte voor deze exports.
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
 * heeft aangewezen: de volledige lijst is bij een PIM-export honderd rijen
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

  const [source, setSource] = useState<Source>();
  const [dataset, setDataset] = useState<Dataset>();
  const [error, setError] = useState<{ title: string; body: string; next?: string }>();
  const [progress, setProgress] = useState<Progress>();
  const [busy, setBusy] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [site, setSite] = useState('');
  const [acceptedLarge, setAcceptedLarge] = useState(false);

  const largeMb = source ? bytesToMb(source.text) : 0;
  const tooLarge = largeMb > LARGE_FILE_MB && !acceptedLarge;

  /** Lees opnieuw in; dat is ook de weg terug na een correctie. */
  async function reingest(next: Source | undefined) {
    if (!next) { setDataset(undefined); return; }

    setBusy(true);
    setError(undefined);
    try {
      const result = await client.ingestCatalog(
        { name: next.name, text: next.text, overrides: next.overrides },
        setProgress,
      );
      setDataset(result);

      if (Object.keys(result.mapping).length === 0) {
        setError({ title: s.errors.noColumns, body: s.errors.noColumnsNext });
      }
    } catch (caught) {
      setDataset(undefined);
      setError({ title: s.errors.readFailed, body: (caught as Error).message });
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  }

  async function handleFile(file: File) {
    if (!/\.(csv|tsv|txt|json|ndjson|xml|rss)$/i.test(file.name)) {
      setError({ title: s.errors.wrongType, body: s.errors.wrongTypeNext });
      return;
    }
    const next = { name: file.name, text: await file.text(), overrides: {} };
    setSource(next);
    setAcceptedLarge(false);
    await reingest(next);
  }

  function clear() {
    setSource(undefined);
    void reingest(undefined);
  }

  function correct(column: string, key: string | null | undefined) {
    if (!source) return;
    const overrides = { ...source.overrides };
    if (key === undefined) delete overrides[column];
    else overrides[column] = key;
    const next = { ...source, overrides };
    setSource(next);
    void reingest(next);
  }

  async function loadSample() {
    setBusy(true);
    try {
      const text = await fetch('/sample-catalog.csv').then((r) => r.text());
      const next = { name: 'sample-catalog.csv', text, overrides: {} };
      setSource(next);
      await reingest(next);
    } catch (caught) {
      setError({ title: s.errors.readFailed, body: (caught as Error).message });
    } finally {
      setBusy(false);
    }
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

      <div className="rounded-lg border border-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-medium">{s.upload.catalogLabel}</h3>
          <span className="text-xs text-muted">{s.upload.formats}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{s.upload.catalogHint}</p>

        {dataset && source ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ok">{dataset.filename}</Badge>
              <span className="tnum text-xs text-muted">
                {s.upload.recognised} {dataset.format} — {dataset.products.length.toLocaleString('nl-NL')}{' '}
                {s.upload.products}, {Object.keys(dataset.mapping).length} {s.upload.mappedColumns},{' '}
                {dataset.unmappedColumns.length} {s.upload.unmappedColumns}
              </span>
              <Button variant="quiet" onClick={clear}>{s.upload.remove}</Button>
            </div>
            <Preview s={s} dataset={dataset} />
            {showMapping ? (
              <MappingEditor
                s={s}
                locale={locale}
                dataset={dataset}
                overrides={source.overrides}
                onChange={correct}
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <FileDropzone
              id="catalogus"
              label={s.upload.choose}
              hint={s.upload.drop}
              accept=".csv,.tsv,.txt,.json,.ndjson,.xml,.rss"
              disabled={busy}
              onFile={(file) => void handleFile(file)}
            />
          </div>
        )}
      </div>

      {/* Alleen het adres, en bewust géén bestand. Het dient om de markt te
          herkennen en om als één panelsite mee te gaan als er voor die markt nog
          een vragenbank gebouwd moet worden. De productdata gaat nooit mee. */}
      <div className="mt-4 rounded-lg border border-line p-4">
        <label className="block">
          <span className="font-medium">{s.upload.siteLabel}</span>
          <p className="mt-1 text-sm leading-relaxed text-muted">{s.upload.siteHint}</p>
          <input
            type="url"
            inputMode="url"
            value={site}
            onChange={(event) => setSite(event.target.value)}
            placeholder={s.upload.sitePlaceholder}
            className="mt-2 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
          />
        </label>
      </div>

      {dataset ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setShowMapping(!showMapping)}>
            {showMapping ? s.upload.mappingHide : s.upload.mappingShow}
          </Button>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => dataset && onReady(client, dataset, site.trim() || undefined)}
          disabled={!dataset || busy || tooLarge}
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
