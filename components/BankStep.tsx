'use client';

// Stap 2: de vragenbank.
//
// Dit scherm bestaat omdat de vragen niet uit de data van de merchant komen maar
// uit een bank die op marktniveau is opgebouwd. Zonder dit scherm is dat een
// verborgen aanname: een merchant zou een cijfer krijgen zonder te zien waarlangs
// hij gemeten is, en zonder te weten dat die lat voorlopig kan zijn.
//
// Twee handelingen staan hier, en ze horen bij elkaar. De ene levert een aanvraag
// af — alles wat nodig is om de methode te draaien, zonder één productrij erin.
// De andere leest het resultaat weer in en controleert het voordat het meetelt.

import { useMemo, useState } from 'react';
import { Download, FileUp, Trash2 } from 'lucide-react';
import type { Locale, QuestionSetState } from '../src/domain/types';
import type { QuestionBank } from '../src/questions/bank';
import { bankFor, resolveBanks } from '../src/questions/banks';
import { importBank, type ImportResult } from '../src/questions/import';
import { buildBankRequest, needsBank, renderBankRequest } from '../src/questions/request';
import type { CategoryStat } from '../src/questions/generate';
import type { StoredBank } from '../src/storage/banks';
import type { Strings } from '../src/i18n/strings';
import { Badge, Button, Card, CardTitle, ErrorState, InfoButton, InfoPanel } from './ui';

interface Props {
  s: Strings;
  locale: Locale;
  state: QuestionSetState;
  categories: CategoryStat[];
  /** Adres van de webshop; wordt één panelsite in de aanvraag. */
  merchantSite?: string;
  stored: StoredBank[];
  onImport: (entry: StoredBank) => void;
  onRemove: (vertical: string) => void;
  onContinue: () => void;
}

const TONE_BY_STATUS = {
  provisional: 'warn',
  'in-review': 'accent',
  frozen: 'ok',
} as const;

/** De bank achter een status, opgezocht in wat er nu geladen is. */
function banksInPlay(stored: StoredBank[], categories: CategoryStat[]): QuestionBank[] {
  const banks = resolveBanks(stored.map((entry) => entry.bank));
  const used = new Map<string, QuestionBank>();
  for (const category of categories) {
    const bank = bankFor(category.name, banks);
    used.set(bank.meta.vertical, bank);
  }
  return [...used.values()];
}

function BankCard({ s, locale, bank }: { s: Strings; locale: Locale; bank: QuestionBank }) {
  const [open, setOpen] = useState(false);
  const rules = [...bank.rules, ...bank.overlays.flatMap((overlay) => overlay.rules ?? [])];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{bank.meta.label[locale]}</p>
          <p className="mt-0.5 text-xs text-muted">
            {s.bank.version} {bank.meta.version} ·{' '}
            {bank.meta.panel.length > 0
              ? <>
                  <span className="tnum">{bank.meta.panel.length}</span> {s.bank.panelSites}
                </>
              : s.bank.panelNone}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={TONE_BY_STATUS[bank.meta.status]}>{s.bank.status[bank.meta.status]}</Badge>
          <InfoButton label={s.report.infoLabel} open={open} onToggle={() => setOpen(!open)} />
        </div>
      </div>

      {open ? <InfoPanel>{s.bank.statusExplain[bank.meta.status]}</InfoPanel> : null}

      {/* De onomkeerbare fout staat vooraan en niet onderaan: het is de vraag
          waar de hele weging aan hangt, en zonder die zin is "kritiek" een
          mening die niemand kan narekenen. */}
      <div className="mt-3 rounded-lg bg-surface-2 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.bank.irreversible}</p>
        <p className="mt-1 text-sm leading-relaxed">{bank.context.irreversibleMistake[locale]}</p>
        {bank.context.consequence ? (
          <p className="mt-1 text-xs text-muted">{bank.context.consequence[locale]}</p>
        ) : null}
      </div>

      {bank.meta.panel.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.bank.panel}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted">
            {bank.meta.panel.map((site) => (
              <li key={site.id}>
                {site.name} · {site.type}
                {site.consultedAt ? ` · ${site.consultedAt}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.bank.rulesHeading}</p>
        {rules.length === 0 ? (
          <p className="mt-1 text-xs leading-relaxed text-muted">{s.bank.rulesNone}</p>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {rules.map((rule) => (
              <li key={rule.id} className="border-t border-line pt-1.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{rule.label[locale]}</span>
                  {/* Gepubliceerd of beredeneerd is het hele punt van dit veld:
                      een ongemarkeerd eigen getal kost het vertrouwen van de
                      domeinexpert, en daarmee de bank. */}
                  <Badge tone={rule.source.kind === 'published' ? 'ok' : 'warn'}>
                    {rule.source.kind === 'published' ? s.bank.rulePublished : s.bank.ruleReasoned}
                  </Badge>
                  {rule.source.site ? <span className="text-muted">{rule.source.site}</span> : null}
                </div>
                {rule.rules.map((line, i) => (
                  <p key={i} className="mt-0.5 text-muted">{line[locale]}</p>
                ))}
                {rule.source.rationale ? (
                  <p className="mt-0.5 text-muted">{rule.source.rationale[locale]}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {bank.openPoints && bank.openPoints.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.bank.openPoints}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{s.bank.openPointsIntro}</p>
          <ul className="mt-1.5 space-y-1">
            {bank.openPoints.map((point) => (
              <li key={point.id} className="flex flex-wrap items-start gap-2 border-t border-line pt-1.5 text-xs">
                {point.weight ? (
                  <Badge tone={point.weight === 'critical' ? 'danger' : 'neutral'}>
                    {s.questions.importance[point.weight]}
                  </Badge>
                ) : null}
                <span className="min-w-0 flex-1 leading-relaxed text-muted">{point.question[locale]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {bank.transparencyNotes?.map((note, i) => (
        <p key={i} className="mt-3 text-xs leading-relaxed text-muted">{note[locale]}</p>
      ))}
    </Card>
  );
}

export function BankStep({
  s, locale, state, categories, merchantSite, stored, onImport, onRemove, onContinue,
}: Props) {
  const [draft, setDraft] = useState('');
  const [source, setSource] = useState('');
  const [result, setResult] = useState<ImportResult>();
  const [copied, setCopied] = useState(false);
  const [readError, setReadError] = useState<string>();

  const banks = useMemo(() => banksInPlay(stored, categories), [stored, categories]);
  const request = useMemo(
    // Het tijdstip komt van hier: de aanvraagmodule heeft zelf geen klok, zodat
    // dezelfde catalogus twee keer dezelfde aanvraag geeft.
    () => buildBankRequest(state, categories, { createdAt: new Date().toISOString(), merchantSite }),
    [state, categories, merchantSite],
  );
  const briefing = useMemo(() => renderBankRequest(request, locale), [request, locale]);
  const provisional = needsBank(state);

  async function readFile(file: File) {
    setReadError(undefined);
    try {
      const text = await file.text();
      setDraft(text);
      setSource(file.name);
      setResult(importBank(text));
    } catch {
      setReadError(s.errors.readFailed);
    }
  }

  function download() {
    const blob = new Blob([briefing], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${request.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.bank.intro}>{s.bank.heading}</CardTitle>
        <p className="text-sm leading-relaxed text-muted">{s.bank.marketNotShop}</p>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium">{s.bank.usedHeading}</h2>
        <div className="space-y-3">
          {banks.map((bank) => (
            <BankCard key={bank.meta.vertical} s={s} locale={locale} bank={bank} />
          ))}
        </div>
      </div>

      <Card>
        <CardTitle sub={provisional ? s.bank.requestIntro : s.bank.requestNotNeeded}>
          {s.bank.requestHeading}
        </CardTitle>

        {provisional ? (
          <>
            <p className="text-xs leading-relaxed text-muted">{s.bank.requestPrivacy}</p>
            <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed">
              {briefing}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(briefing).then(() => setCopied(true));
                }}
              >
                {copied ? s.bank.requestCopied : s.bank.requestCopy}
              </Button>
              <Button variant="secondary" onClick={download}>
                <Download className="size-4" aria-hidden />
                {s.bank.requestDownload}
              </Button>
            </div>
          </>
        ) : null}
      </Card>

      <Card>
        <CardTitle sub={s.bank.importIntro}>{s.bank.importHeading}</CardTitle>

        <label className="block text-xs text-muted">
          {s.bank.importPaste}
          <textarea
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setResult(undefined); }}
            rows={6}
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            disabled={draft.trim() === ''}
            onClick={() => { setSource(source || 'geplakt'); setResult(importBank(draft)); }}
          >
            {s.bank.importCheck}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-2">
            <FileUp className="size-4" aria-hidden />
            {s.bank.importFile}
            <input
              type="file"
              accept=".yaml,.yml,.json,.txt"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </label>
        </div>

        {readError ? (
          <div className="mt-3">
            <ErrorState title={readError} body={s.errors.readFailed} next={s.errors.wrongTypeNext} />
          </div>
        ) : null}

        {result ? (
          <div className="mt-3 space-y-3">
            {/* Fouten blokkeren, waarschuwingen niet. Het verschil is dat een
                fout betekent dat de bank zijn herkomst niet kan tonen, en dan
                oogt het rapport overtuigender dan het is. */}
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

            {result.warnings.length > 0 ? (
              <div className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-2.5">
                <p className="text-sm font-medium text-warn">{s.bank.importWarnings}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">{s.bank.importWarningsBody}</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-ink">
                  {result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                </ul>
              </div>
            ) : null}

            {result.bank ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    if (!result.bank) return;
                    onImport({
                      accountId: 'lokaal',
                      savedAt: new Date().toISOString(),
                      source: source || 'geplakt',
                      bank: result.bank,
                    });
                    setDraft(''); setSource(''); setResult(undefined);
                  }}
                >
                  {s.bank.importAccept}
                </Button>
                <span className="text-sm text-muted">{s.bank.importOk}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.bank.storedHeading}</p>
          {stored.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{s.bank.importEmpty}</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {stored.map((entry) => (
                <li key={entry.bank.meta.vertical} className="flex flex-wrap items-center gap-2 border-t border-line py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{entry.bank.meta.label[locale]}</span>
                  <span className="text-xs text-muted">{entry.bank.meta.version} · {entry.source}</span>
                  <Badge tone={TONE_BY_STATUS[entry.bank.meta.status]}>
                    {s.bank.status[entry.bank.meta.status]}
                  </Badge>
                  <Button variant="quiet" onClick={() => onRemove(entry.bank.meta.vertical)}>
                    <Trash2 className="size-4" aria-hidden />
                    {s.bank.importRemove}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">{s.bank.storedNote}</p>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onContinue}>
          {provisional ? s.bank.skip : s.bank.continue}
        </Button>
      </div>
    </div>
  );
}
