'use client';

// Stap 1: je catalogus aanleveren.
//
// Eén bron, en met opzet de export uit het systeem waar de merchant zijn
// productkennis werkelijk onderhoudt: zijn PIM of MDM, of anders Magento of
// Shopify. Daar staat wat hij wéét van zijn producten, en dat is wat de scan
// meet. Een kanaalfeed is een afgeleide en zou een dunner beeld geven van
// dezelfde catalogus.
//
// Hier haakt een merchant af of raakt hij overtuigd, dus draait alles om laten
// zien wat wij lezen voordat er iets beoordeeld wordt.
//
// Bewust géén scherm meer om onze kolomherkenning te corrigeren. Dat koppelde
// een kolom aan een canoniek veld, en dat is motor-plumbing: voor het antwoord
// van de merchant maakt het niets meer uit sinds hij in stap 3 zijn kenmerken
// rechtstreeks aan een kolom wijst. Twee koppelschermen met een net iets ander
// model is er één te veel.

import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import { ScanClient, type Progress } from '../src/worker/client';
import { Badge, Button, Card, CardTitle, ErrorState, FileDropzone } from './ui';

/**
 * Boven deze grens waarschuwen we voordat de scan in de browser draait.
 *
 * De grens stond op 20 toen de invoer een kanaalfeed was. Een catalogusexport is
 * structureel groter: die draagt élke kolom die het PIM kent, ook de honderden
 * die een feed weglaat. Bij de testmerchant is de Magento-export 20 MB en de
 * samengevoegde catalogus 27 MB — beide zouden dus de normale situatie blokkeren
 * in plaats van de uitzondering, en een grens die het normale geval tegenhoudt
 * is erger dan geen grens.
 *
 * 27 MB met 160.000 producten is gemeten en gaat goed in de worker (zie NOTES).
 * Daarboven is het niet gemeten; vandaar dat de waarschuwing blijft staan, met
 * de uitweg ernaast.
 */
const LARGE_FILE_MB = 50;

interface Props {
  s: Strings;
  onReady: (client: ScanClient, catalog: Dataset) => void;
}

interface Source {
  name: string;
  text: string;
  /** Correcties van de merchant, per bronkolom. */
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

export function UploadStep({ s, onReady }: Props) {
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
        { name: next.name, text: next.text },
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
    const next = { name: file.name, text: await file.text() };
    setSource(next);
    setAcceptedLarge(false);
    await reingest(next);
  }

  function clear() {
    setSource(undefined);
    void reingest(undefined);
  }

  async function loadSample() {
    setBusy(true);
    try {
      const text = await fetch('/sample-catalog.csv').then((r) => r.text());
      const next = { name: 'sample-catalog.csv', text };
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
          </div>
        ) : (
          <div className="mt-3">
            <FileDropzone
              id="catalogus"
              label={s.upload.choose}
              hint={s.upload.drop}
              accept=".csv,.tsv,.txt,.json,.ndjson,.xml,.rss"
              disabled={busy}
              onFile={(files) => void handleFile(files[0])}
            />
          </div>
        )}
      </div>


      {/* De waarschuwing staat hier en niet bovenaan de kaart: hij blokkeert de
          knop hieronder, en met de voorbeeldtabel ertussen was hij uit beeld —
          dan zie je een grijze knop zonder te weten waarom. Een blokkade hoort
          te staan waar hij bijt. */}
      {tooLarge ? (
        <div className="mt-5 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <p className="font-medium text-warn">
            {s.upload.tooLarge} — <span className="tnum">{Math.round(largeMb)} MB</span>
          </p>
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => dataset && onReady(client, dataset)}
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
