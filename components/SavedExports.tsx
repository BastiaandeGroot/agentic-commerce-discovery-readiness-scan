'use client';

// De pdf en het Excel-bestand bij een bewaarde analyse.
//
// De pdf kan uit de analyse zelf: per product staat erin welke velden een
// antwoord misten, dus de acties en hun winst zijn dezelfde als na de scan.
// Het Excel-bestand noemt producten bij SKU en titel, en die bewaart een analyse
// bewust niet. Daarvoor is de catalogus weer nodig. Staat hij nog in deze
// browser (`src/storage/catalogFile.ts`), dan draait dezelfde scan opnieuw op de
// vragensets van de analyse; anders vraagt het scherm om het bestand. Met de
// catalogus erbij krijgt ook de pdf de waarden die bij jou in de kolommen staan.
//
// Alles gebeurt in de browser. Het bestand gaat nergens heen.

import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { Locale, ScanReport } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import type { ScanSnapshot, SnapshotDetail } from '../src/engine/snapshot';
import type { SiteCheck } from '../src/collect/answers';
import { applyWork, type QuestionWork } from '../src/questions/work';
import { recallCatalogFile, rememberCatalogFile, type CatalogFile } from '../src/storage/catalogFile';
import { LOCAL_ACCOUNT } from '../src/storage/snapshots';
import { ScanClient } from '../src/worker/client';
import { useAuth } from './auth/AuthProvider';
import { Button, Card, ErrorState, FileDropzone } from './ui';

/** Alleen de bestandsnaam, zonder map: zo staat hij ook in de analyse. */
const baseName = (name: string) => name.split(/[\\/]/).pop() ?? name;

export function SavedExports({ s, locale, snapshot, detail, work, report, siteCheck }: {
  s: Strings;
  locale: Locale;
  snapshot: ScanSnapshot;
  detail?: SnapshotDetail;
  work?: QuestionWork;
  /** De analyse opnieuw opgeteld, zonder producten; genoeg voor de pdf. */
  report?: ScanReport;
  siteCheck?: SiteCheck;
}) {
  const { accountId } = useAuth();
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | 'scan'>();
  const [failed, setFailed] = useState<'pdf' | 'xlsx'>();
  /** De catalogus staat niet in deze browser: het scherm vraagt erom. */
  const [needFile, setNeedFile] = useState(false);
  /** De volledige scan, één keer per geopende analyse. */
  const full = useRef<{ id: string; report: ScanReport }>(undefined);
  const support = snapshot.support;

  /** De scan opnieuw draaien op de catalogus, met de vragensets van deze analyse. */
  async function rescan(file: CatalogFile): Promise<ScanReport | undefined> {
    if (!detail) return undefined;
    setBusy('scan');
    const client = new ScanClient();
    try {
      await client.ingestCatalog({ name: file.name, text: file.text });
      const { state } = applyWork(detail.pristine, work);
      const scanned = await client.scan(state, snapshot.scannedAt ?? snapshot.savedAt);
      full.current = { id: snapshot.id, report: scanned };
      return scanned;
    } finally {
      client.dispose();
      setBusy(undefined);
    }
  }

  /** De volledige scan als de catalogus van deze analyse nog in de browser staat. */
  async function fullReport(): Promise<ScanReport | undefined> {
    if (full.current?.id === snapshot.id) return full.current.report;
    const file = await recallCatalogFile(accountId ?? LOCAL_ACCOUNT);
    if (!file || baseName(file.name) !== baseName(snapshot.catalogName)) return undefined;
    return rescan(file);
  }

  async function savePdf() {
    setFailed(undefined);
    try {
      const source = (await fullReport()) ?? report;
      if (!source) throw new Error('geen rapport');
      setBusy('pdf');
      const { saveReportPdf } = await import('./reportPdf');
      await saveReportPdf(source, s, locale, siteCheck, support);
    } catch {
      setFailed('pdf');
    } finally {
      setBusy(undefined);
    }
  }

  async function saveXlsx(chosen?: CatalogFile) {
    setFailed(undefined);
    try {
      const source = chosen ? await rescan(chosen) : await fullReport();
      if (!source) {
        setNeedFile(true);
        return;
      }
      setNeedFile(false);
      setBusy('xlsx');
      const { saveProductXlsx } = await import('./productXlsx');
      await saveProductXlsx(source, s, locale, siteCheck, support);
    } catch {
      setFailed('xlsx');
    } finally {
      setBusy(undefined);
    }
  }

  async function choose(file: File) {
    const chosen = { name: file.name, text: await file.text() };
    void rememberCatalogFile(accountId ?? LOCAL_ACCOUNT, chosen);
    await saveXlsx(chosen);
  }

  return (
    <Card>
      <p className="text-sm leading-relaxed text-muted">{s.report.savedExportsIntro}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => void savePdf()} loading={busy === 'pdf'} disabled={busy !== undefined || (!report && !detail)}>
          <Download className="size-4" aria-hidden />
          {busy === 'pdf' ? s.report.savingPdf : s.report.savePdf}
        </Button>
        <Button variant="secondary" onClick={() => void saveXlsx()} loading={busy === 'xlsx' || busy === 'scan'} disabled={busy !== undefined || !detail}>
          <Download className="size-4" aria-hidden />
          {busy === 'scan' ? s.report.savedExportsReading : busy === 'xlsx' ? s.report.savingXlsx : s.report.saveXlsx}
        </Button>
      </div>
      {!detail ? <p className="mt-2 text-xs leading-relaxed text-muted">{s.report.savedExportsOld}</p> : null}
      {needFile && detail ? (
        <div className="mt-3 rounded-lg border border-line p-3">
          <p className="text-sm font-medium">{s.report.savedExportsNeedFile}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {s.report.savedExportsNeedFileBody.replace('{bestand}', baseName(snapshot.catalogName))}
          </p>
          <div className="mt-2">
            <FileDropzone
              id="export-catalogus"
              label={s.upload.choose}
              hint={s.upload.drop}
              accept=".csv,.tsv,.txt,.json,.ndjson,.xml,.rss"
              disabled={busy !== undefined}
              onFile={(files) => void choose(files[0])}
            />
          </div>
        </div>
      ) : null}
      {failed === 'pdf' ? (
        <div className="mt-3"><ErrorState title={s.report.pdfFailed} body={s.report.pdfFailedBody} next={s.report.pdfFailedNext} /></div>
      ) : null}
      {failed === 'xlsx' ? (
        <div className="mt-3"><ErrorState title={s.report.xlsxFailed} body={s.report.xlsxFailedBody} next={s.report.xlsxFailedNext} /></div>
      ) : null}
    </Card>
  );
}
