'use client';

// Buiten de score: de vragen die een catalogus niet kan dragen, en of de
// website ze beantwoordt.
//
// De lijst zelf is advies en staat er altijd. De sitetoets komt erbij als hij
// gedaan is: per vraag het citaat van de site, waar het staat, en of een
// bezoeker het zonder klikken ziet. De toets leest zoals een AI-agent leest;
// zie `src/collect/answers.ts`.
//
// De uitleg "zo lees je dit" staat bij de uitkomst en niet in een tooltip: een
// percentage en een woord als "uitklapblok" zeggen een retailer zonder die
// uitleg niets, en dan is de toets een lijst vinkjes die hij moet geloven.

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Locale } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import type { ReportModel } from '../src/report/model';
import { categoryLabel } from '../src/report/derive';
import { quoteLink, siteCheckTotals, type SiteAnswer, type SiteAnswerStatus, type SiteCheck } from '../src/collect/answers';
import { SiteCheckRefused, requestSiteCheck } from '../src/sitecheck/remote';
import { useAuth } from './auth/AuthProvider';
import { Badge, Button, Card, CardTitle, ErrorState, Input, Select } from './ui';

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

/** Wat werk is eerst: niet gevonden, dan deels, dan wat er staat. */
const STATUS_ORDER: Record<SiteAnswerStatus, number> = { 'not-found': 0, partial: 1, answered: 2, 'not-checked': 3 };
const STATUS_TONE = { answered: 'ok', partial: 'warn', 'not-found': 'danger', 'not-checked': 'neutral' } as const;

export function AdvisoryCard({ s, locale, model, siteCheck, onSiteCheck, defaultSite, saveHint }: {
  s: Strings;
  locale: Locale;
  model: ReportModel;
  /** De sitetoets die bij dit rapport hoort, als die gedaan is. */
  siteCheck?: SiteCheck;
  /** Bewaar een nieuwe uitkomst; gooit als dat mislukt. Zonder: de toets is hier niet te starten. */
  onSiteCheck?: (check: SiteCheck) => void | Promise<void>;
  /** Het adres van de winkel, als dat al bekend is. */
  defaultSite?: string;
  /** De uitkomst is nog niet bewaard; zeg dat erbij. */
  saveHint?: boolean;
}) {
  const { user } = useAuth();
  const [setId, setSetId] = useState('all');
  const [site, setSite] = useState(siteCheck?.site ?? defaultSite ?? '');
  const [phase, setPhase] = useState<'idle' | 'busy'>('idle');
  const [failure, setFailure] = useState<{ title: string; next: string }>();
  const [saveFailed, setSaveFailed] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showPages, setShowPages] = useState(false);

  if (model.advisory.length === 0) return null;

  const answerOf = new Map((siteCheck?.answers ?? []).map((answer) => [answer.questionId, answer]));
  const items = (setId === 'all' ? model.advisory : model.advisory.filter((entry) => entry.setIds.includes(setId)))
    .map((entry) => ({ entry, answer: answerOf.get(entry.id) }))
    // Zonder toets de volgorde van de bank; met toets wat werk is bovenaan.
    .sort((a, b) => (siteCheck
      ? (STATUS_ORDER[a.answer?.status ?? 'not-checked'] - STATUS_ORDER[b.answer?.status ?? 'not-checked'])
      : 0));
  const totals = siteCheck ? siteCheckTotals(siteCheck) : undefined;

  async function run() {
    setPhase('busy');
    setFailure(undefined);
    setSaveFailed(false);
    try {
      const check = await requestSiteCheck(
        site.trim(),
        model.advisory.map((entry) => ({ id: entry.id, label: entry.label })),
        // De namen van zijn eigen categorieën, zodat hun pagina's als eerste gelezen worden.
        [...new Set(model.categories.flatMap((c) => [c.category, c.subcategory ?? '']).filter(Boolean))],
      );
      try {
        await onSiteCheck?.(check);
      } catch {
        setSaveFailed(true);
      }
    } catch (caught) {
      const reason = caught instanceof SiteCheckRefused ? caught.reason : 'failed';
      setFailure(
        reason === 'forbidden' ? { title: s.report.siteForbidden, next: '' }
          : reason === 'not-configured' ? { title: s.report.siteNotConfigured, next: '' }
            : { title: caught instanceof SiteCheckRefused && caught.message !== 'failed' ? caught.message : s.report.siteFailed, next: s.report.siteFailedNext },
      );
    } finally {
      setPhase('idle');
    }
  }

  return (
    <Card>
      <CardTitle sub={s.report.advisoryIntro}>{s.report.advisoryHeading}</CardTitle>

      {/* De toets: starten, en wat eruit kwam. Alleen te starten door wie
          ingelogd is; de server beslist of hij het mag. */}
      {onSiteCheck && user ? (
        <div className="mb-4 rounded-lg bg-surface-2 p-3">
          <p className="text-sm font-medium">{s.report.siteHeading}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.report.siteIntro}</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Input
                id="site-check-url"
                label={s.report.siteUrlLabel}
                value={site}
                onChange={setSite}
                placeholder={s.report.siteUrlPlaceholder}
              />
            </div>
            <Button variant="secondary" onClick={() => void run()} loading={phase === 'busy'} disabled={site.trim() === ''}>
              {siteCheck ? s.report.siteRerun : s.report.siteRun}
            </Button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {phase === 'busy' ? s.report.siteBusy : s.report.siteSent}
          </p>
          {failure ? (
            <div className="mt-2">
              <ErrorState title={failure.title} body="" next={failure.next} />
            </div>
          ) : null}
        </div>
      ) : null}

      {siteCheck && totals ? (
        <div className="mb-4">
          <p className="text-sm">
            {s.report.siteSummary
              .replace('{datum}', new Date(siteCheck.checkedAt).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', { dateStyle: 'long' }))
              .replace('{site}', siteCheck.site.replace(/^https?:\/\//, ''))
              .replace('{paginas}', n(siteCheck.pages.length))}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {(['answered', 'partial', 'not-found', 'not-checked'] as const)
              .filter((status) => totals[status] > 0)
              .map((status) => (
                <span key={status} className="tnum">
                  <span className="font-semibold text-ink">{n(totals[status])}</span> {s.report.siteCount[status]}
                </span>
              ))}
            <button
              type="button"
              aria-expanded={showHow}
              onClick={() => setShowHow(!showHow)}
              className="underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              {showHow ? s.report.siteHowHide : s.report.siteHowShow}
            </button>
            <button
              type="button"
              aria-expanded={showPages}
              onClick={() => setShowPages(!showPages)}
              className="underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              {showPages ? s.report.sitePagesHide : s.report.sitePagesShow}
            </button>
          </p>
          {saveFailed ? <p className="mt-1 text-xs text-warn">{s.report.siteSaveFailed}</p> : null}
          {saveHint && !saveFailed ? <p className="mt-1 text-xs text-muted">{s.report.siteSaveHint}</p> : null}
          {siteCheck.namedBots.length > 0 ? (
            <p className="mt-1 text-xs text-warn">{s.report.siteNamedBots.replace('{bots}', siteCheck.namedBots.join(', '))}</p>
          ) : null}
          {siteCheck.notes.map((note) => <p key={note} className="mt-1 text-xs text-muted">{note}</p>)}
          {showHow ? (
            <ul className="mt-2 space-y-1.5 rounded-lg border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
              {s.report.siteHow.map((line) => <li key={line}>{line}</li>)}
            </ul>
          ) : null}
          {showPages ? (
            <ul className="mt-2 space-y-0.5 rounded-lg border border-line bg-surface-2 p-3 text-xs text-muted">
              {siteCheck.pages.map((page) => (
                <li key={page.url} className="flex flex-wrap justify-between gap-x-3">
                  <a href={page.url} target="_blank" rel="noreferrer" className="min-w-0 truncate underline decoration-dotted underline-offset-2 hover:text-ink">
                    {page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Hetzelfde filter als boven de vragenlijst en de attributen. */}
      {model.categories.length > 1 ? (
        <div className="mb-3">
          <Select
            label={s.report.filterCategory}
            value={setId}
            onChange={setSetId}
            options={[
              { value: 'all', label: s.report.allCategories },
              ...model.categories.map((c) => ({ value: c.setId, label: `${categoryLabel(c)} (${n(c.total)})` })),
            ]}
          />
        </div>
      ) : null}
      {items.length === 0 ? <p className="text-sm text-muted">{s.report.advisoryNone}</p> : null}
      <ul className="space-y-2">
        {items.map(({ entry, answer }) => (
          <li key={entry.id} className="border-t border-line pt-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Badge tone="neutral">{s.questions.importance[entry.importance as keyof typeof s.questions.importance] ?? entry.importance}</Badge>
              <span className="min-w-0 flex-1 text-sm">{entry.label}</span>
              {answer ? <Badge tone={STATUS_TONE[answer.status]}>{s.report.siteStatus[answer.status]}</Badge> : null}
              {/* Met één categorie gekozen zegt de lijst ernaast niets meer. */}
              {setId === 'all' && !answer ? <span className="text-xs text-muted">{entry.categories.join(', ')}</span> : null}
            </div>
            {answer ? <AnswerDetail s={s} answer={answer} /> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Het bewijs onder een vraag: het citaat, waar het staat, en wat eraan schort. */
function AnswerDetail({ s, answer }: { s: Strings; answer: SiteAnswer }) {
  if (answer.status === 'not-checked') {
    return answer.skipped === 'stock'
      ? <p className="mt-1 text-xs leading-relaxed text-muted">{s.report.siteSkippedStock}</p>
      : null;
  }
  if (!answer.quote) return null;
  const link = quoteLink(answer);
  return (
    <div className="mt-1 text-xs leading-relaxed text-muted">
      <p className="text-ink">&ldquo;{answer.quote}&rdquo;</p>
      {answer.note ? <p className="mt-0.5 text-warn">{answer.note}</p> : null}
      <p className="mt-0.5 flex flex-wrap gap-x-3">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-ink">
            {s.report.siteOpenPage}
            <ArrowUpRight className="size-3" aria-hidden />
          </a>
        ) : null}
        {answer.url ? <span className="min-w-0 truncate">{answer.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</span> : null}
        {answer.position !== undefined ? (
          <span className="tnum">{s.report.sitePosition.replace('{pct}', String(answer.position))}</span>
        ) : null}
      </p>
      {answer.opener !== undefined ? (
        <p className="mt-0.5">
          {answer.opener === '' ? s.report.siteCollapsedUnknown : s.report.siteCollapsed.replace('{regel}', answer.opener)}
        </p>
      ) : null}
    </div>
  );
}
