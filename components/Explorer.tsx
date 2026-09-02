'use client';

// Verkenner: hetzelfde rapport op twee fijnere niveaus.
//
// Een feed-breed getal vertelt een merchant dat er werk is. Pas de categorie
// zegt waar het zit, en pas het product zegt wat er precies mist — en dat is het
// niveau waarop iemand er maandagochtend iets aan kan doen.

import { useMemo, useState } from 'react';
import type { Locale, ProductResult, Protocol, ScanReport } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import { Badge, Bar, Button, Card, CardTitle, TrafficLight, statusOf } from './ui';

const PAGE_SIZE = 25;
type Filter = 'all' | 'not-findable' | 'not-competitive' | 'unmatched';

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

function CategoryTable({ s, report, protocol, locale }: {
  s: Strings; report: ScanReport; protocol: Protocol; locale: Locale;
}) {
  const rows = report.protocols[protocol].categories;
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardTitle>{s.explorer.categoryHeading}</CardTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">{s.explorer.category}</th>
              <th className="py-2 pr-3 text-right font-medium">{s.explorer.products}</th>
              <th className="py-2 pr-3 font-medium">{s.explorer.avgAnswered}</th>
              <th className="py-2 pr-3 text-right font-medium">{s.explorer.findableCol}</th>
              <th className="py-2 pr-3 text-right font-medium">{s.explorer.competitiveCol}</th>
              <th className="py-2 font-medium">{s.explorer.topGaps}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.setId} className="border-b border-line/60 align-top">
                <td className="py-2.5 pr-3 font-medium">{row.category}</td>
                <td className="tnum py-2.5 pr-3 text-right">{n(row.total)}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <TrafficLight status={statusOf(row.avgAnswered, row.avgApplicable)} size="sm" />
                    <span className="tnum text-xs text-muted">
                      {row.avgAnswered.toFixed(1)} / {row.avgApplicable.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="tnum py-2.5 pr-3 text-right">{n(row.findable)}</td>
                <td className="tnum py-2.5 pr-3 text-right">{n(row.competitive)}</td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {row.topGaps.map((gap) => (
                      <Badge
                        key={gap.field}
                        tone={gap.cause === 'mapping' ? 'accent' : gap.cause === 'no-source' ? 'danger' : 'warn'}
                      >
                        {gap.label[locale]}
                      </Badge>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Productminiatuur, rechtstreeks van de mediaserver van de merchant.
 *
 * Geen next/image: de domeinen verschillen per merchant en zijn vooraf niet
 * bekend, dus een vaste remotePatterns-lijst werkt hier niet. Blokkeert een shop
 * hotlinken, dan vangt onError dat op — de rij blijft dan gewoon leesbaar.
 */
function Thumb({ s, product }: { s: Strings; product: ProductResult }) {
  const [failed, setFailed] = useState(false);

  if (!product.image || failed) {
    return (
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-[10px] leading-tight text-muted"
        title={s.explorer.noImage}
      >
        —
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image}
      alt={product.title ?? product.key}
      // Geen loading="lazy": in een ingebedde weergave slaat de lazy-observer
      // soms nooit aan en blijft de miniatuur leeg. Er staan er maar 25 per
      // pagina, dus uitstellen levert niets op.
      decoding="async"
      onError={() => setFailed(true)}
      className="size-11 shrink-0 rounded-md border border-line bg-surface-2 object-cover"
    />
  );
}

function ProductRow({ s, product, protocol, locale }: {
  s: Strings; product: ProductResult; protocol: Protocol; locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const result = product.perProtocol[protocol];
  const answered = result.questions.filter((q) => q.answered).length;
  const unanswered = result.questions.filter((q) => !q.answered);

  return (
    <li className="border-b border-line/60 py-3">
      <div className="flex items-start gap-3">
        <Thumb s={s} product={product} />
        <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted">{product.key}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{product.title ?? '—'}</span>
          {product.unmatched ? (
            <Badge tone="warn">{s.explorer.unmatchedBadge}</Badge>
          ) : (
            <>
              <span className="tnum text-xs text-muted">
                {answered}/{result.questions.length} {s.explorer.answered}
              </span>
              <Badge tone={result.findable ? 'ok' : 'neutral'}>
                {result.findable ? s.explorer.findableYes : s.explorer.findableNo}
              </Badge>
              <Badge tone={result.competitive ? 'ok' : 'neutral'}>
                {result.competitive ? s.explorer.competitiveYes : s.explorer.competitiveNo}
              </Badge>
            </>
          )}
          <Button variant="quiet" onClick={() => setOpen(!open)}>
            {open ? s.explorer.closeDetail : s.explorer.openDetail}
          </Button>
        </div>

        {product.category ? (
          <p className="mt-0.5 text-xs text-muted">{product.category}</p>
        ) : null}
        </div>
      </div>

      {open ? (
        <div className="mt-3 grid gap-4 rounded-lg bg-surface-2 p-3 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-medium text-muted">{s.explorer.unanswered}</h4>
            {unanswered.length === 0 ? (
              <p className="mt-1 text-sm text-ok">✓</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {unanswered.map((q) => (
                  <li key={q.questionId}>· {q.label[locale]}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted">{s.explorer.productGaps}</h4>
            <ul className="mt-1 space-y-1.5 text-sm">
              {product.gaps.slice(0, 12).map((gap) => (
                <li key={`${gap.field}-${gap.cause}`} className="flex flex-wrap items-baseline gap-1.5">
                  <Badge
                    tone={gap.cause === 'mapping' ? 'accent' : gap.cause === 'no-source' ? 'danger' : 'warn'}
                  >
                    {s.report.causes[gap.cause]}
                  </Badge>
                  <span>{gap.label[locale]}</span>
                  <span className="text-xs text-muted">— {s.report.owners[gap.owner]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function Explorer({ s, locale, report }: {
  s: Strings; locale: Locale; report: ScanReport;
}) {
  const [protocol, setProtocol] = useState<Protocol>('acp');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return report.products.filter((product) => {
      if (filter === 'unmatched' && !product.unmatched) return false;
      if (filter === 'not-findable' && (product.unmatched || product.perProtocol[protocol].findable)) return false;
      if (filter === 'not-competitive' && (product.unmatched || product.perProtocol[protocol].competitive)) return false;
      if (q === '') return true;
      return (
        product.key.toLowerCase().includes(q) ||
        (product.title ?? '').toLowerCase().includes(q) ||
        (product.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [report.products, filter, query, protocol]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: s.explorer.filterAll },
    { id: 'not-findable', label: s.explorer.filterNotFindable },
    { id: 'not-competitive', label: s.explorer.filterNotCompetitive },
    { id: 'unmatched', label: s.explorer.filterUnmatched },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.explorer.intro}>{s.explorer.heading}</CardTitle>
        {/* Protocolkeuze geldt voor alles hieronder: de uitkomsten verschillen
            per protocol, dus ze door elkaar tonen zou misleiden. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{s.explorer.protocol}</span>
          <div className="flex rounded-lg border border-line bg-surface p-0.5">
            {(['acp', 'ucp'] as Protocol[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setProtocol(code)}
                aria-pressed={protocol === code}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  protocol === code ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {s.report.protocolNames[code]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <CategoryTable s={s} report={report} protocol={protocol} locale={locale} />

      <Card>
        <CardTitle>{s.explorer.productHeading}</CardTitle>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder={s.explorer.search}
            className="min-w-56 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {filters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => { setFilter(entry.id); setPage(0); }}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                  filter === entry.id
                    ? 'border-transparent bg-accent text-white'
                    : 'border-line text-muted hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="text-sm text-muted">{s.explorer.noResults}</p>
        ) : (
          <ul>
            {shown.map((product) => (
              <ProductRow key={product.key} s={s} product={product} protocol={protocol} locale={locale} />
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="tnum text-xs text-muted">
            {s.explorer.showing} {n(safePage * PAGE_SIZE + 1)}–
            {n(Math.min((safePage + 1) * PAGE_SIZE, filtered.length))} {s.explorer.of} {n(filtered.length)}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPage(safePage - 1)} disabled={safePage === 0}>
              {s.explorer.prev}
            </Button>
            <Button variant="secondary" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1}>
              {s.explorer.next}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
