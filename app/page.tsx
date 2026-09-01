'use client';

// De app is een reeks van drie stappen: data aanleveren, vragensets valideren,
// rapport. Die volgorde is niet cosmetisch — de sets kunnen pas bestaan als de
// data er is, want ze gaan over de eigen categorieen van de merchant (S6).

import { useState } from 'react';
import Link from 'next/link';
import type { Dataset, QuestionSetState, ScanReport } from '../src/domain/types';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { STRINGS } from '../src/i18n/strings';
import { useLocale } from '../src/i18n/useLocale';
import { LanguageToggle } from '../components/LanguageToggle';
import { UploadStep } from '../components/UploadStep';
import { QuestionSetStep } from '../components/QuestionSetStep';
import { ReportView } from '../components/ReportView';

type Step = 'upload' | 'questions' | 'report';

export default function Home() {
  const [locale, setLocale] = useLocale();
  const [step, setStep] = useState<Step>('upload');
  const [feed, setFeed] = useState<Dataset>();
  const [catalog, setCatalog] = useState<Dataset>();
  const [questionState, setQuestionState] = useState<QuestionSetState>();
  const [report, setReport] = useState<ScanReport>();

  const s = STRINGS[locale];
  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: s.steps.upload },
    { id: 'questions', label: s.steps.questions },
    { id: 'report', label: s.steps.report },
  ];

  function handleReady(nextFeed: Dataset, nextCatalog?: Dataset) {
    setFeed(nextFeed);
    setCatalog(nextCatalog);
    setQuestionState(generateQuestionSets(nextFeed, nextCatalog));
    setStep('questions');
  }

  function handleRun() {
    if (!feed || !questionState) return;
    setReport(runScan(feed, catalog, questionState));
    setStep('report');
  }

  function restart() {
    setFeed(undefined); setCatalog(undefined);
    setQuestionState(undefined); setReport(undefined);
    setStep('upload');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{s.appName}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{s.tagline}</p>
          </div>

          {/* Taalwissel en uitleg. Beide talen zijn volwaardig; er is geen "hoofdtaal". */}
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/methode" className="text-sm text-accent underline underline-offset-2">
              {locale === 'nl' ? 'Wat we controleren' : 'What we check'}
            </Link>
            <LanguageToggle locale={locale} onChange={setLocale} label={s.language} />
          </div>
        </div>

        <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {steps.map((entry, index) => {
            const done = steps.findIndex((x) => x.id === step) > index;
            const current = entry.id === step;
            return (
              <li key={entry.id} className="flex items-center gap-2">
                {index > 0 ? <span className="text-muted">→</span> : null}
                <span
                  className={
                    current ? 'font-medium text-ink'
                      : done ? 'text-accent'
                      : 'text-muted'
                  }
                >
                  {done ? '✓ ' : ''}{entry.label}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <main>
        {step === 'upload' ? <UploadStep s={s} onReady={handleReady} /> : null}

        {step === 'questions' && feed && questionState ? (
          <QuestionSetStep
            s={s}
            locale={locale}
            feed={feed}
            state={questionState}
            onChange={setQuestionState}
            onRun={handleRun}
          />
        ) : null}

        {step === 'report' && report ? (
          <ReportView s={s} locale={locale} report={report} onRestart={restart} />
        ) : null}
      </main>
    </div>
  );
}
