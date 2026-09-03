'use client';

// Uitlegpagina voor de merchant.
//
// De teksten staan in i18n/methode.ts, maar de feiten komen hier rechtstreeks uit
// de code: de checklists, de woorddrempels en de veldtellingen worden uitgelezen,
// niet overgetypt. Verandert de scan, dan verandert deze pagina mee — een uitleg
// die stilletjes uit de pas gaat lopen is erger dan geen uitleg.

import Link from 'next/link';
import { SELECTION_CHECKLIST, OUT_CHECKS } from '../../../src/engine/checklists';
import { MIN_WORDS } from '../../../src/engine/evaluate';
import { FIELD_BY_KEY } from '../../../src/spec/fields';
import { SPEC_SNAPSHOT_ID, SPEC_SOURCES, tierCounts } from '../../../src/spec/snapshot';
import { METHODE } from '../../../src/i18n/methode';
import { STRINGS } from '../../../src/i18n/strings';
import { useLocale } from '../../../src/i18n/useLocale';
import { Badge, Card, CardTitle } from '../../../components/ui';
import type { Protocol } from '../../../src/domain/types';

const PROTOCOLS: Protocol[] = ['acp', 'ucp'];

export default function MethodePage() {
  const [locale] = useLocale();
  const m = METHODE[locale];
  const s = STRINGS[locale];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
        <Link href="/scan" className="mt-2 inline-block text-sm text-accent underline underline-offset-2">
          {m.backToScan}
        </Link>
      </header>

      <div className="space-y-4">
        <Card>
          <p className="leading-relaxed">{m.intro}</p>
        </Card>

        <Card className="border-accent/30 bg-accent-soft">
          <CardTitle>{m.exampleTitle}</CardTitle>
          <p className="leading-relaxed">{m.exampleBody}</p>
          <p className="mt-3 font-medium leading-relaxed">{m.exampleClose}</p>
        </Card>

        <Card>
          <CardTitle>{m.scopeTitle}</CardTitle>
          <p className="leading-relaxed">{m.scopeBody}</p>
          <p className="mt-3 leading-relaxed">{m.scopeOut}</p>
          <p className="mt-3 leading-relaxed text-muted">{m.scopeOwn}</p>

          {/* De concrete checkout-controles, uitgelezen uit de code. */}
          <div className="mt-4 space-y-2">
            {PROTOCOLS.map((protocol) =>
              OUT_CHECKS[protocol].map((check) => (
                <div key={`${protocol}-${check.id}`} className="rounded-lg bg-surface-2 p-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Badge tone="warn">{s.report.protocolNames[protocol]}</Badge>
                    <span className="text-sm font-medium">{check.label[locale]}</span>
                  </div>
                  {check.note ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted">{check.note[locale]}</p>
                  ) : null}
                </div>
              )),
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>{m.promiseTitle}</CardTitle>
          <p className="leading-relaxed">{m.promiseBody}</p>
          <p className="mt-3 leading-relaxed">{m.promiseWhat}</p>
          <p className="mt-3 leading-relaxed text-muted">{m.promiseCaveat}</p>
        </Card>

        <Card>
          <CardTitle>{m.tiersTitle}</CardTitle>
          <p className="leading-relaxed">{m.tiersBody}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-2 p-3">
              <Badge tone="accent">{s.report.tiers.core}</Badge>
              <p className="mt-2 text-sm leading-relaxed">{m.tiersCore}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-3">
              <Badge tone="ok">{s.report.tiers.selection}</Badge>
              <p className="mt-2 text-sm leading-relaxed">{m.tiersSelection}</p>
            </div>
          </div>
          <p className="mt-4 leading-relaxed">{m.tiersWhy}</p>
        </Card>

        <Card>
          <CardTitle>{m.funnelTitle}</CardTitle>
          <p className="leading-relaxed">{m.funnelBody}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="rounded-lg bg-surface-2 p-3">
              <dt className="font-medium">{s.report.findable}</dt>
              <dd className="mt-0.5 leading-relaxed text-muted">{m.funnelFindable}</dd>
            </div>
            <div className="rounded-lg bg-surface-2 p-3">
              <dt className="font-medium">{s.report.competitive}</dt>
              <dd className="mt-0.5 leading-relaxed text-muted">{m.funnelCompetitive}</dd>
            </div>
          </dl>
          <p className="mt-3 leading-relaxed">{m.funnelNoThreshold}</p>
          <p className="mt-3 leading-relaxed">{m.funnelPerProtocol}</p>

          {/* De Selection-checklist zoals hij echt gedraaid wordt, per protocol. */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PROTOCOLS.map((protocol) => (
              <div key={protocol} className="rounded-lg border border-line p-3">
                <h3 className="text-sm font-medium">
                  {s.report.selectionHeading} — {s.report.protocolNames[protocol]}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {SELECTION_CHECKLIST[protocol].map((item) => (
                    <li key={item.id}>· {item.label[locale]}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{m.questionsTitle}</CardTitle>
          <p className="leading-relaxed">{m.questionsBody}</p>
          <p className="mt-3 leading-relaxed">{m.questionsSources}</p>
          <p className="mt-3 leading-relaxed font-medium">{m.questionsValidation}</p>
          <p className="mt-3 leading-relaxed">{m.questionsLog}</p>
          <p className="mt-3 leading-relaxed text-muted">{m.questionsFuture}</p>
        </Card>

        <Card>
          <CardTitle>{m.qualityTitle}</CardTitle>
          <p className="leading-relaxed">{m.qualityBody}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(MIN_WORDS).map(([field, words]) => (
              <li key={field} className="flex items-baseline gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <span className="font-medium">{FIELD_BY_KEY[field]?.label[locale] ?? field}</span>
                <span className="tnum text-muted">— {words} {m.qualityWords}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{m.gapsTitle}</CardTitle>
          <p className="leading-relaxed">{m.gapsBody}</p>
          <div className="mt-4 space-y-2">
            {([
              ['mapping', m.gapMapping],
              ['enrichment', m.gapEnrichment],
              ['no-source', m.gapNoSource],
            ] as const).map(([cause, body]) => (
              <div key={cause} className="rounded-lg bg-surface-2 p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Badge tone={cause === 'mapping' ? 'accent' : cause === 'no-source' ? 'danger' : 'warn'}>
                    {s.report.causes[cause]}
                  </Badge>
                  <span className="text-xs text-muted">{s.report.causeEffort[cause]}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 leading-relaxed">{m.gapsWhy}</p>
          <p className="mt-3 leading-relaxed text-muted">{m.gapsJoin}</p>
          <p className="mt-3 leading-relaxed text-muted">{m.gapsNoCatalog}</p>
        </Card>

        <Card>
          <CardTitle>{m.fieldsTitle}</CardTitle>
          <p className="leading-relaxed">{m.fieldsBody}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium" />
                  {(['core', 'selection', 'out'] as const).map((tier) => (
                    <th key={tier} className="py-2 pr-3 text-right font-medium">
                      {s.report.tiers[tier]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROTOCOLS.map((protocol) => {
                  const counts = tierCounts(protocol);
                  return (
                    <tr key={protocol} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium">{s.report.protocolNames[protocol]}</td>
                      {(['core', 'selection', 'out'] as const).map((tier) => (
                        <td key={tier} className="tnum py-2 pr-3 text-right">{counts[tier]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            {s.report.specSnapshot}: <span className="tnum">{SPEC_SNAPSHOT_ID}</span>
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {SPEC_SOURCES.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{m.driftTitle}</CardTitle>
          <p className="leading-relaxed">{m.driftBody}</p>
          <p className="mt-3 leading-relaxed">{m.driftStamp}</p>
        </Card>

        <Card>
          <CardTitle>{m.privacyTitle}</CardTitle>
          <p className="leading-relaxed">{m.privacyBody}</p>
        </Card>

        <Link href="/" className="inline-block text-sm text-accent underline underline-offset-2">
          ← {m.backToScan}
        </Link>
      </div>
    </div>
  );
}
