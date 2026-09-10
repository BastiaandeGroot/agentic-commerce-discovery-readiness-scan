'use client';

// Een winkel doormeten zonder dat iemand iets aanlevert.
//
// Twee schermen in één: bovenin het formulier, daaronder de uitkomst als
// rapport. Dat tweede is bewust geen beheerderspaneel maar iets wat je aan een
// webshop-eigenaar geeft — afdrukken naar pdf is de deelweg, net als bij het
// gewone rapport. Vandaar de volgorde: eerst het getal dat hem raakt, dan de
// vragen die erachter zitten, en helemaal onderaan wat de meting niet zegt.
//
// De knoppen verdwijnen bij het afdrukken; dat regelt `globals.css` al voor de
// hele app.

import { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import {
  Badge, Button, Card, CardTitle, EmptyState, ErrorState, Input, Select, SkeletonLines,
} from '../../../../components/ui';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { authHeader } from '../../../../src/auth/client';

interface BankOption { id: string; vertical: string; version: number; status: string }

interface Bilingual { nl: string; en: string }

interface QuestionLine {
  id: string;
  label: Bilingual;
  importance: string;
  answered: number;
  applicable: number;
  evidence: Bilingual[];
}

interface Result {
  origin: string;
  empty?: boolean;
  scannedAt?: string;
  bank?: string;
  sample?: number;
  candidates: number;
  requests: number;
  blockedBots: string[];
  notes: string[];
  attributes?: string[];
  categories?: { name: string; products: number }[];
  funnel?: { total: number; avgAnswered: number; avgApplicable: number };
  questions?: QuestionLine[];
}

type State =
  | { kind: 'idle' }
  | { kind: 'denied' }
  | { kind: 'running' }
  | { kind: 'failed'; message: string }
  | { kind: 'done'; result: Result };

export default function Page() {
  const [locale] = useLocale();
  const s = STRINGS[locale].shopScan;

  const [banks, setBanks] = useState<BankOption[]>([]);
  const [bankId, setBankId] = useState('');
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  // De banken komen van het beheerscherm; daar staan ze al. Een eigen route
  // ernaast zou hetzelfde tweemaal zeggen.
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/queue', { headers: await authHeader() });
      if (response.status === 403) { setState({ kind: 'denied' }); return; }
      if (!response.ok) return;
      const data = await response.json();
      setBanks((data.banks ?? []) as BankOption[]);
    } catch {
      // Geen banken is geen blokkade: meten kan ook op de voorlopige vragen.
    }
  }, []);

  useEffect(() => {
    void (async () => { await Promise.resolve(); await load(); })();
  }, [load]);

  async function measure() {
    setState({ kind: 'running' });
    try {
      const response = await fetch('/api/public-scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ url, bankId: bankId || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setState({ kind: 'failed', message: data.error ?? s.failed });
        return;
      }
      setState({ kind: 'done', result: data as Result });
    } catch {
      setState({ kind: 'failed', message: s.failed });
    }
  }

  if (state.kind === 'denied') {
    return <Card><ErrorState title={STRINGS[locale].admin.denied} body={STRINGS[locale].admin.deniedBody} /></Card>;
  }

  const date = (raw?: string) =>
    raw ? new Date(raw).toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }) : '';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{s.heading}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{s.intro}</p>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id="winkel-url"
              label={s.url}
              hint={s.urlHint}
              value={url}
              onChange={setUrl}
              placeholder="winkel.nl"
            />
          </div>
          <div className="sm:w-72">
            <Select
              label={s.bank}
              value={bankId}
              onChange={setBankId}
              options={[
                { value: '', label: s.bankNone },
                ...banks.map((bank) => ({
                  value: bank.id,
                  label: `${bank.vertical} v${bank.version}${bank.status === 'review' ? ' (review)' : ''}`,
                })),
              ]}
            />
          </div>
          <Button onClick={() => void measure()} disabled={url.trim() === ''} loading={state.kind === 'running'}>
            {s.start}
          </Button>
        </div>
      </Card>

      {state.kind === 'running' ? (
        <Card>
          <CardTitle sub={s.runningBody}>{s.running}</CardTitle>
          <SkeletonLines lines={5} />
        </Card>
      ) : null}

      {state.kind === 'failed' ? (
        <Card><ErrorState title={s.failed} body={state.message} /></Card>
      ) : null}

      {state.kind === 'done' && state.result.empty ? (
        <Card>
          <EmptyState title={s.emptyTitle} body={s.emptyBody} />
          <p className="mt-3 text-xs text-muted">
            {state.result.origin} · {state.result.requests} verzoeken · {state.result.candidates} adressen
          </p>
        </Card>
      ) : null}

      {state.kind === 'done' && !state.result.empty ? (
        <Report result={state.result} s={s} locale={locale} date={date} onAgain={() => setState({ kind: 'idle' })} />
      ) : null}
    </div>
  );
}

/** De uitkomst zoals een webshop-eigenaar hem krijgt. */
function Report({
  result, s, locale, date, onAgain,
}: {
  result: Result;
  s: typeof STRINGS['nl']['shopScan'];
  locale: 'nl' | 'en';
  date: (raw?: string) => string;
  onAgain: () => void;
}) {
  const funnel = result.funnel;
  const shop = result.origin.replace(/^https?:\/\//, '');
  const unanswered = (result.questions ?? []).filter((one) => one.answered < one.applicable);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => window.print()}>
          <span className="inline-flex items-center gap-2"><Printer className="size-4" aria-hidden />{s.print}</span>
        </Button>
        <Button variant="quiet" onClick={onAgain}>{s.again}</Button>
      </div>

      <Card>
        <p className="text-sm text-muted">{shop}</p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">{s.reportTitle}</h2>

        {/* Het getal waar het om gaat, groot en zonder omhaal. Alles eronder
            legt uit waar het vandaan komt. */}
        {funnel ? (
          <p className="mt-5 text-3xl font-semibold tracking-tight">
            {funnel.avgAnswered.toFixed(1)}{' '}
            <span className="text-muted">{s.answerable}</span>{' '}
            {funnel.avgApplicable.toFixed(0)}{' '}
            <span className="text-muted">{s.answerableSuffix}</span>
          </p>
        ) : null}

        <p className="mt-3 text-sm leading-relaxed text-muted">
          {result.bank ? `${s.marketNote} ${result.bank}.` : s.noBankNote}
        </p>
        <p className="mt-1 text-sm text-muted">
          {s.measured} {date(result.scannedAt)} · {result.sample} {s.sample}
          {result.candidates > 0 ? `, ${s.sampleOf} ${result.candidates.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')}` : ''}
        </p>

        {result.categories && result.categories.length > 0 ? (
          <p className="mt-3 flex flex-wrap gap-2">
            {result.categories.map((one) => (
              <Badge key={one.name} tone="neutral">{one.name} · {one.products}</Badge>
            ))}
          </p>
        ) : null}
      </Card>

      {unanswered.length > 0 ? (
        <Card>
          <CardTitle>{s.questionsTitle}</CardTitle>
          <ul className="flex flex-col">
            {(result.questions ?? []).map((one) => {
              const ok = one.answered >= one.applicable && one.applicable > 0;
              return (
                <li key={one.id} className="border-t border-line py-2.5 first:border-t-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {/* Vorm én tekst naast de kleur: kleur draagt hier nooit
                        alleen de betekenis, en dit rapport wordt afgedrukt. */}
                    <Badge tone={ok ? 'ok' : 'warn'}>{ok ? '✓' : '—'}</Badge>
                    <span className="flex-1 text-sm">{one.label[locale]}</span>
                    <span className="text-sm tabular-nums text-muted">
                      {one.answered}/{one.applicable}
                    </span>
                  </div>
                  {!ok && one.evidence.length > 0 ? (
                    <p className="mt-1 pl-1 text-xs leading-relaxed text-muted">
                      {s.needs}: {one.evidence.map((entry) => entry[locale]).join(', ')}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {result.attributes && result.attributes.length > 0 ? (
        <Card>
          <CardTitle>{s.published}</CardTitle>
          <p className="flex flex-wrap gap-1.5">
            {result.attributes.map((key) => (
              <Badge key={key} tone="neutral">{key}</Badge>
            ))}
          </p>
        </Card>
      ) : null}

      {result.blockedBots.length > 0 ? (
        <Card>
          <CardTitle sub={s.botsBody}>{s.botsTitle}</CardTitle>
          <p className="flex flex-wrap gap-1.5">
            {result.blockedBots.map((bot) => (
              <Badge key={bot} tone="warn">{bot}</Badge>
            ))}
          </p>
        </Card>
      ) : null}

      <Card>
        <CardTitle>{s.limitTitle}</CardTitle>
        <p className="text-sm leading-relaxed text-muted">{s.limitBody}</p>
        {result.notes.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {result.notes.map((note) => (
              <li key={note} className="text-xs leading-relaxed text-muted">{note}</li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}
