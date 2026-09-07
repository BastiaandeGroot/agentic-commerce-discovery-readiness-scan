'use client';

// Stap 2: de vragenlijst.
//
// Dit scherm bestaat omdat de vragen niet uit de data van de merchant komen maar
// uit een lijst die op marktniveau is opgebouwd. Zonder dit scherm is dat een
// verborgen aanname: een merchant zou een cijfer krijgen zonder te zien waarlangs
// hij gemeten is.
//
// Eén handeling, en niet meer: kies je vragenlijst. Alles wat daarnaast op dit
// scherm zou kunnen staan — het sitepanel, de beslisregels, de open punten, de
// aanvraag om een bank te laten bouwen — is uitleg over de lijst en geen keuze
// die de merchant hier maakt. Dat hoort niet in de weg te staan van de enige
// stap die hij wél moet zetten.
//
// Wat er ná het kiezen bij komt is alleen wat hij nodig heeft om te beslissen of
// hij hierop verder wil: wat er gelezen is, wat er stukloopt, en waar hij op
// moet letten voordat hij op de uitkomst vertrouwt.

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Locale } from '../src/domain/types';
import { importQuestionList } from '../src/questions/list';
import type { ImportResult } from '../src/questions/import';
import type { StoredBank } from '../src/storage/banks';
import type { Strings } from '../src/i18n/strings';
import { Button, Card, CardTitle, ErrorState, FileDropzone } from './ui';

interface Props {
  s: Strings;
  locale: Locale;
  stored: StoredBank[];
  onImport: (entry: StoredBank) => void;
  onRemove: (vertical: string) => void;
  onContinue: () => void;
}

/** Eén getal met zijn eenheid ernaast; de vier tellingen delen deze vorm. */
function Count({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <span className="tnum text-lg font-semibold">{value}</span>{' '}
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function BankStep({ s, locale, stored, onImport, onRemove, onContinue }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult>();
  const [sources, setSources] = useState<string[]>([]);
  const [readError, setReadError] = useState<string>();

  async function read(files: File[]) {
    setBusy(true);
    setReadError(undefined);
    setResult(undefined);
    try {
      const read = await Promise.all(
        files.map(async (file) => ({ name: file.name, text: await file.text() })),
      );
      setSources(read.map((file) => file.name));
      setResult(importQuestionList(read));
    } catch {
      setReadError(s.errors.readFailed);
    } finally {
      setBusy(false);
    }
  }

  const bank = result?.bank;
  // De tellingen zijn de enige samenvatting die iets zegt: herkent de merchant
  // zijn eigen lijst hierin niet terug, dan is er een kolom verkeerd gelezen.
  const categoryQuestions = bank?.overlays.reduce((sum, o) => sum + (o.questions?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.bank.intro}>{s.bank.heading}</CardTitle>

        <FileDropzone
          id="vragenlijst"
          label={busy ? s.bank.reading : s.bank.choose}
          hint={s.bank.drop}
          accept=".csv,.tsv,.txt,.yaml,.yml,.json"
          multiple
          disabled={busy}
          onFile={(files) => void read(files)}
        />

        {readError ? (
          <div className="mt-4">
            <ErrorState title={readError} body={s.errors.wrongType} next={s.errors.wrongTypeNext} />
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 space-y-3">
            {/* Fouten blokkeren, waarschuwingen niet. Het verschil is dat een fout
                betekent dat de lijst niet te lezen is, en dan zou het rapport over
                iets anders gaan dan de merchant denkt. */}
            {result.errors.length > 0 ? (
              <ErrorState
                title={s.bank.importErrors}
                body={s.bank.importErrorsBody}
                next={
                  <ul className="list-disc space-y-1 pl-4">
                    {result.errors.map((error, i) => <li key={i}>{error}</li>)}
                  </ul>
                }
              />
            ) : null}

            {/* Eerst wat er gelezen is, dan pas waar je op moet letten. Herkent
                de merchant zijn eigen lijst niet terug in deze vier getallen, dan
                is er een kolom verkeerd gelezen en heeft de rest geen zin. */}
            {bank ? (
              <div className="rounded-lg border border-line bg-surface-2 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {s.bank.readAs}
                </p>
                <p className="mt-1 text-sm font-medium">{bank.meta.label[locale]}</p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  <Count value={bank.questions.length} label={s.bank.countBase} />
                  <Count value={bank.overlays.length} label={s.bank.countCategories} />
                  <Count value={categoryQuestions} label={s.bank.countCategoryQuestions} />
                  <Count value={bank.attributes.length} label={s.bank.countAttributes} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{s.bank.baseExplain}</p>
                <div className="mt-3">
                  <Button
                    onClick={() => {
                      onImport({
                        accountId: 'lokaal',
                        // De klok komt van de pagina; de motor en de opslagvorm
                        // hebben er zelf geen.
                        savedAt: new Date().toISOString(),
                        source: sources.join(', '),
                        bank,
                      });
                      setResult(undefined); setSources([]);
                    }}
                  >
                    {s.bank.accept}
                  </Button>
                </div>
              </div>
            ) : null}

            {result.warnings.length > 0 ? (
              <div className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-2.5">
                <p className="text-sm font-medium text-warn">{s.bank.importWarnings}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">{s.bank.importWarningsBody}</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink">
                  {result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.bank.inUseHeading}</p>
        {stored.length === 0 ? (
          <>
            <p className="mt-1 text-sm text-muted">{s.bank.empty}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.bank.fallback}</p>
          </>
        ) : (
          <ul className="mt-1.5">
            {stored.map((entry) => (
              <li
                key={entry.bank.meta.vertical}
                className="flex flex-wrap items-center gap-2 border-t border-line py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{entry.bank.meta.label[locale]}</span>
                <span className="min-w-0 truncate text-xs text-muted">{entry.source}</span>
                <Button variant="quiet" onClick={() => onRemove(entry.bank.meta.vertical)}>
                  <Trash2 className="size-4" aria-hidden />
                  {s.bank.remove}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">{s.bank.storedNote}</p>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onContinue}>
          {stored.length > 0 ? s.bank.continue : s.bank.skip}
        </Button>
      </div>
    </div>
  );
}
