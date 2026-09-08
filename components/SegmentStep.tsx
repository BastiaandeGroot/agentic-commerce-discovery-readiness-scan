'use client';

// Welk pad in de catalogus is een productsoort, en welk een eigenschap?
//
// Dit scherm is een bevinding en geen grendel. De motor bouwt zijn vragensets al
// op het eerste segment van een pad, dus "Outdoorstoffen > Gestreept" krijgt
// sowieso geen eigen set. Wat hier gebeurt is iets anders: elk pad dat eigenlijk
// een kenmerk is, is een attribuut dat de catalogus niet vastlegt terwijl de
// koper erop wil filteren. Dat getal is over merchants heen vergelijkbaar en het
// bepaalt straks voor welke marktsegmenten een vragenbank gemaakt moet worden.
//
// De volgorde van gezag: de merchant wint van de site, de site wint van de
// structuur. Hij weet wat hij verkoopt; wij leiden af.

import { useMemo, useState } from 'react';
import { Globe, HelpCircle, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, CardTitle, EmptyState, ErrorState, Input, TableWrap, Td, Th } from './ui';
import {
  applyVerdicts, classifyPaths, facetDebt, pathKey,
  type CategoryPath, type ClassifiedPath, type PathKind, type PathReason,
  type SiteEvidence, type Verdicts,
} from '../src/intake/facets';
import type { Strings } from '../src/i18n/strings';

type SiteState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; evidence: SiteEvidence; pages: number; clientRendered: boolean }
  | { kind: 'failed' };

const TONE: Record<PathKind, 'ok' | 'warn' | 'neutral'> = {
  category: 'ok', facet: 'warn', unclear: 'neutral',
};

/** Waarop het oordeel steunt, in de taal van de merchant. */
function why(s: Strings, reason: PathReason): string {
  switch (reason) {
    case 'in-filters': return s.segments.whyFilter;
    case 'in-both': return s.segments.whyBoth;
    case 'many-parents': return s.segments.whyManyParents;
    case 'top-level': return s.segments.whyTop;
    case 'merchant': return s.segments.settledBody;
    default: return s.segments.whyUnknown;
  }
}

function Rows({ s, rows, onDecide }: {
  s: Strings;
  rows: ClassifiedPath[];
  onDecide: (path: CategoryPath, kind: PathKind) => void;
}) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>{s.segments.heading}</Th>
          <Th>{s.segments.products}</Th>
          <Th>{s.segments.kinds.category}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={pathKey(row.segments)} className="border-t border-line align-top">
            <Td>
              <span className="block">{row.segments.join(' \u203a ')}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">{why(s, row.reason)}</span>
            </Td>
            <Td>{row.productCount}</Td>
            <Td>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={TONE[row.kind]}>{s.segments.kinds[row.kind]}</Badge>
                {/* De keuze staat naast het oordeel en niet in de plaats ervan:
                    zo blijft zichtbaar waar de app op uitkwam. */}
                {(['category', 'facet'] as const)
                  .filter((kind) => kind !== row.kind)
                  .map((kind) => (
                    <Button key={kind} variant="quiet" onClick={() => onDecide(row, kind)}>
                      {s.segments.kinds[kind]}
                    </Button>
                  ))}
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

export function SegmentStep({ s, paths, verdicts, onChange, onContinue }: {
  s: Strings;
  paths: CategoryPath[];
  verdicts: Verdicts;
  onChange: (next: Verdicts) => void;
  onContinue: () => void;
}) {
  const [site, setSite] = useState('');
  const [state, setState] = useState<SiteState>({ kind: 'idle' });

  const evidence = state.kind === 'done' ? state.evidence : undefined;
  const rows = useMemo(
    () => applyVerdicts(classifyPaths(paths, evidence), verdicts),
    [paths, evidence, verdicts],
  );
  const debt = facetDebt(rows);

  async function read() {
    setState({ kind: 'busy' });
    try {
      const response = await fetch('/api/site', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // De categorie-URL's kennen we niet in dit scherm; de homepage draagt
        // het hoofdmenu en dat is waar de filters staan.
        body: JSON.stringify({ site }),
      });
      if (!response.ok) throw new Error('mislukt');
      const result = await response.json();
      setState({
        kind: 'done',
        evidence: { navigation: result.navigation ?? [], filters: result.filters ?? [] },
        pages: (result.read ?? []).length,
        clientRendered: result.likelyClientRendered === true,
      });
    } catch {
      setState({ kind: 'failed' });
    }
  }

  function decide(path: CategoryPath, kind: PathKind) {
    onChange({ ...verdicts, [pathKey(path.segments)]: kind });
  }

  if (paths.length === 0) {
    return (
      <Card>
        <EmptyState title={s.segments.empty} body={s.segments.emptyNext} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle sub={s.segments.intro}>{s.segments.heading}</CardTitle>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Input
              id="segments-site"
              label={s.segments.siteLabel}
              hint={s.segments.siteHint}
              value={site}
              onChange={setSite}
              placeholder="https://"
            />
          </div>
          <Button onClick={() => void read()} loading={state.kind === 'busy'} disabled={site.trim() === ''}>
            <Globe className="size-4" aria-hidden />
            {state.kind === 'busy' ? s.segments.siteBusy : s.segments.siteRead}
          </Button>
        </div>

        {state.kind === 'failed' ? (
          <div className="mt-3">
            <ErrorState title={s.segments.siteFailed} body={s.segments.siteFailedNext} />
          </div>
        ) : null}

        {/* Lege HTML is niet hetzelfde als "geen categorieën". Wie zijn menu in
            de browser opbouwt levert een pagina zonder links, en dan hebben we
            niet gekeken in plaats van niets gevonden. */}
        {state.kind === 'done' && state.clientRendered ? (
          <div className="mt-3">
            <ErrorState title={s.segments.siteEmpty} body={s.segments.siteEmptyNext} />
          </div>
        ) : null}

        {state.kind === 'done' && !state.clientRendered ? (
          <p className="mt-3 text-sm text-muted">
            {state.pages} {s.segments.siteDone}
          </p>
        ) : null}
      </Card>

      {debt.facets > 0 ? (
        <Card>
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
            <div>
              <p className="font-medium">{s.segments.debtHeading}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                <span className="font-medium text-ink">
                  {debt.facets} van de {rows.length}
                </span>{' '}
                {s.segments.debtBody}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Wat we niet zeker weten is een vraag; de rest is een uitkomst. Alles
          op één hoop zetten maakt van tien mededelingen vierentwintig vragen, en
          dan legt het scherm zijn werk bij de merchant neer. */}
      {rows.some((row) => row.kind === 'unclear') ? (
        <Card>
          <CardTitle sub={s.segments.askBody}>{s.segments.askHeading}</CardTitle>
          <div className="mb-4 rounded-lg bg-surface-2 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <HelpCircle className="size-4 shrink-0 text-accent" aria-hidden />
              {s.segments.rule}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{s.segments.ruleBody}</p>
          </div>
          <Rows s={s} rows={rows.filter((row) => row.kind === 'unclear')} onDecide={decide} />
        </Card>
      ) : null}

      {rows.some((row) => row.kind !== 'unclear') ? (
        <Card>
          <CardTitle sub={s.segments.settledBody}>{s.segments.settled}</CardTitle>
          <Rows s={s} rows={rows.filter((row) => row.kind !== 'unclear')} onDecide={decide} />
        </Card>
      ) : null}

      <Button onClick={onContinue}>{s.segments.continue}</Button>
    </div>
  );
}
