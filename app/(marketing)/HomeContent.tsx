'use client';

// De landingspagina.
//
// Wat hier staat moet waar zijn en blijven. Daarom geen nagemaakte cijfers en
// geen illustratie van een rapport: het fragment hieronder draait de echte scan
// op een voorbeeldwinkel. Zou de motor iets anders gaan zeggen, dan zegt deze
// pagina het meteen mee.

import Link from 'next/link';
import { ArrowRight, FileUp, Laptop, FileText } from 'lucide-react';
import { STRINGS } from '../../src/i18n/strings';
import { useLocale } from '../../src/i18n/useLocale';
import { Card, CardTitle, SkeletonLines, TrafficLight, statusOf } from '../../components/ui';
import { useSampleScan } from '../../components/useSampleScan';

const STAP_ICONEN = [FileUp, Laptop, FileText];

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

/** Een echt stuk uitkomst, klein gehouden: de trechter en waar je zou beginnen. */
function SampleFragment() {
  const [locale] = useLocale();
  const s = STRINGS[locale];
  const { report, error } = useSampleScan();

  if (error) return null; // Een landingspagina hoort niet te struikelen over een voorbeeld.

  const acp = report?.protocols.acp;
  const nearest = acp?.distance.find((bucket) => bucket.open > 0);

  return (
    <Card>
      <CardTitle sub={s.pages.home.sampleIntro}>{s.pages.home.sampleHeading}</CardTitle>

      {!acp ? (
        <SkeletonLines lines={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: s.report.total, value: acp.funnel.total },
              { label: s.report.findable, value: acp.funnel.findable },
              { label: s.report.competitive, value: acp.funnel.competitive },
            ].map((row) => (
              <div key={row.label}>
                <p className="tnum text-2xl font-semibold">{n(row.value)}</p>
                <p className="text-sm text-muted">{row.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
            <TrafficLight status={statusOf(acp.funnel.avgAnswered, acp.funnel.avgApplicable)} />
            <p className="tnum text-sm text-muted">
              {acp.funnel.avgAnswered.toFixed(1)} {s.report.statusScale}{' '}
              {acp.funnel.avgApplicable.toFixed(0)} {s.report.statusAnswered}
            </p>
          </div>

          {nearest ? (
            <p className="mt-3 text-sm leading-relaxed">
              {s.report.startNearest}{' '}
              <span className="tnum font-semibold">{n(nearest.products)}</span>{' '}
              {s.report.startNearestProducts}{' '}
              <span className="tnum font-semibold">{nearest.open}</span>{' '}
              {s.report.startNearestQuestions}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-4">
        <Link href="/demo" className="text-sm text-accent underline underline-offset-2">
          {s.pages.home.sampleFull}
        </Link>
      </div>
    </Card>
  );
}

export function HomeContent() {
  const [locale] = useLocale();
  const s = STRINGS[locale];

  return (
    <div className="space-y-12">
      <section className="max-w-2xl py-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
          {s.pages.home.title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{s.pages.home.intro}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-base font-medium text-white transition hover:opacity-90"
          >
            {s.shell.primaryAction}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/scan"
            className="rounded-lg border border-line bg-surface px-5 py-2.5 text-base font-medium transition hover:bg-surface-2"
          >
            {s.shell.nav.scan}
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">{s.pages.home.secondary}</p>
      </section>

      <SampleFragment />

      <section>
        <h2 className="font-display text-xl font-semibold tracking-tight">{s.pages.home.stepsHeading}</h2>
        <ol className="mt-5 grid gap-5 md:grid-cols-3">
          {s.pages.home.steps.map((step, index) => {
            const Icon = STAP_ICONEN[index];
            return (
              <li key={step.title}>
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-accent" aria-hidden />
                  <h3 className="font-medium">{step.title}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Prominent, want een merchant die zijn bedrijfsdata uploadt wil dit
          weten voordat hij klikt — niet in de kleine lettertjes achteraf. */}
      <Card className="border-accent/30 bg-accent-soft">
        <CardTitle sub={s.pages.home.privacyLead}>{s.pages.home.privacyHeading}</CardTitle>
        <ul className="space-y-2.5">
          {s.pages.home.privacyPoints.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Card>

      <section>
        <h2 className="font-display text-xl font-semibold tracking-tight">{s.pages.home.faqHeading}</h2>
        <dl className="mt-5 divide-y divide-line border-y border-line">
          {s.pages.home.faq.map((item) => (
            <div key={item.q} className="py-4">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">{s.pages.home.closingHeading}</h2>
        <p className="mt-2 text-base leading-relaxed text-muted">{s.pages.home.closingBody}</p>
        <div className="mt-5">
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-base font-medium text-white transition hover:opacity-90"
          >
            {s.shell.nav.scan}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
