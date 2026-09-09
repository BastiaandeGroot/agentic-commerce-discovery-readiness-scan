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
import { ArrowDown, ArrowUp, BookOpen, Globe, HelpCircle, Sparkles, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, CardTitle, EmptyState, ErrorState, Input, TableWrap, Td, Th } from './ui';
import {
  applyProposals, applyVerdicts, classifyPaths, facetDebt, pathKey,
  type CategoryPath, type ClassifiedPath, type PathKind, type PathReason,
  type SiteEvidence, type Verdicts,
} from '../src/intake/facets';
import type { Strings } from '../src/i18n/strings';

type SiteState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; evidence: SiteEvidence; pages: number; clientRendered: boolean }
  | { kind: 'failed' };


/** Waarop het oordeel steunt, in de taal van de merchant. */
function why(s: Strings, reason: PathReason): string {
  switch (reason) {
    case 'in-filters': return s.segments.whyFilter;
    case 'in-both': return s.segments.whyBoth;
    case 'many-parents': return s.segments.whyManyParents;
    case 'top-level': return s.segments.whyTop;
    case 'model': return s.segments.whyModel;
    case 'merchant': return s.segments.settledBody;
    default: return s.segments.whyUnknown;
  }
}

type SortKey = 'name' | 'count';
type Filter = 'all' | 'proposed' | 'open';

/**
 * Eén regel: de stand links, de keuze rechts.
 *
 * De keuze is een schakelaar met twee standen en geen badge naast een knop. Dat
 * onderscheid bleek nodig: met een badge én een losse knop ernaast is niet te
 * zien wat de stand is en wat de handeling, zeker niet als de knop op smalle
 * schermen onder de badge terechtkomt.
 */
function Choice({ s, row, onDecide }: {
  s: Strings;
  row: ClassifiedPath;
  onDecide: (path: CategoryPath, kind: PathKind) => void;
}) {
  return (
    <div
      role="group"
      aria-label={row.segments.join(' > ')}
      className="inline-flex shrink-0 overflow-hidden rounded-lg border border-line"
    >
      {(['category', 'facet'] as const).map((kind) => {
        const active = row.kind === kind;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            title={kind === 'category' ? s.segments.isCategory : s.segments.isFacet}
            onClick={() => onDecide(row, kind)}
            className={`px-2.5 py-1 text-xs font-medium transition ${
              active
                ? kind === 'category'
                  ? 'bg-ok-soft text-ok'
                  : 'bg-warn-soft text-warn'
                : 'bg-surface text-muted hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {s.segments.kinds[kind]}
          </button>
        );
      })}
    </div>
  );
}

function Rows({ s, rows, onDecide }: {
  s: Strings;
  rows: ClassifiedPath[];
  onDecide: (path: CategoryPath, kind: PathKind) => void;
}) {
  const [sort, setSort] = useState<SortKey>('name');
  const [descending, setDescending] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const shown = useMemo(() => {
    const kept = rows.filter((row) => {
      if (filter === 'proposed') return row.reason === 'model';
      if (filter === 'open') return row.kind === 'unclear';
      return true;
    });
    const sorted = [...kept].sort((a, b) => (
      sort === 'count'
        ? b.productCount - a.productCount
        : a.segments.join(' > ').localeCompare(b.segments.join(' > '), undefined, { numeric: true })
    ));
    return descending ? sorted.reverse() : sorted;
  }, [rows, sort, descending, filter]);

  /** Op dezelfde kop klikken draait de volgorde om; op een andere sorteert erop. */
  function head(key: SortKey) {
    if (sort === key) setDescending(!descending);
    else { setSort(key); setDescending(key === 'count'); }
  }

  const Arrow = descending ? ArrowDown : ArrowUp;
  const counts = {
    all: rows.length,
    proposed: rows.filter((row) => row.reason === 'model').length,
    open: rows.filter((row) => row.kind === 'unclear').length,
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['all', 'proposed', 'open'] as const).map((key) => (
          <Button
            key={key}
            variant={filter === key ? 'secondary' : 'quiet'}
            onClick={() => setFilter(key)}
          >
            {key === 'all' ? s.segments.filterAll : key === 'proposed' ? s.segments.filterProposed : s.segments.filterOpen}
            <span className="text-muted">{counts[key]}</span>
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title={s.segments.noRows} body={s.segments.noRowsBody} />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>
                <button type="button" onClick={() => head('name')} className="inline-flex items-center gap-1 hover:text-ink">
                  {s.segments.sortName}
                  {sort === 'name' ? <Arrow className="size-3" aria-hidden /> : null}
                </button>
              </Th>
              <Th>
                <button type="button" onClick={() => head('count')} className="inline-flex items-center gap-1 hover:text-ink">
                  {s.segments.sortCount}
                  {sort === 'count' ? <Arrow className="size-3" aria-hidden /> : null}
                </button>
              </Th>
              <Th>{s.segments.kinds.category}</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={pathKey(row.segments)} className="border-t border-line align-top">
                <Td>
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{row.segments.join(' \u203a ')}</span>
                    {/* Een voorstel is geen koppeling tot de merchant het laat
                        staan; dat hoort hij te kunnen zien. */}
                    {row.reason === 'model' ? <Badge tone="accent">{s.segments.proposed}</Badge> : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{why(s, row.reason)}</span>
                </Td>
                <Td>{row.productCount}</Td>
                <Td><Choice s={s} row={row} onDecide={onDecide} /></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
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
  /** Wat het model voorstelde. Los van `verdicts`: een voorstel is geen keuze. */
  const [proposals, setProposals] = useState<Verdicts>({});
  const [judging, setJudging] = useState(false);
  const [judgeFailed, setJudgeFailed] = useState(false);

  const evidence = state.kind === 'done' ? state.evidence : undefined;
  // Volgorde van gezag: de merchant wint van het model, het model vult aan waar
  // het bewijs zweeg, en hard bewijs uit de site blijft daaronder overeind.
  const rows = useMemo(
    () => applyVerdicts(applyProposals(classifyPaths(paths, evidence), proposals), verdicts),
    [paths, evidence, proposals, verdicts],
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

  /**
   * Het model laten kijken naar wat we zelf niet konden bepalen.
   *
   * Alleen de twijfelgevallen, en dat is geen zuinigheid: waar de site zegt dat
   * iets een filter is, is dat een feit dat een voorstel niet hoort te
   * overschrijven. Het scheelt bovendien tokens en het houdt zichtbaar wat
   * gemeten is en wat geraden.
   */
  async function judge() {
    const open = rows.filter((row) => row.kind === 'unclear');
    if (open.length === 0) return;
    setJudging(true);
    setJudgeFailed(false);
    try {
      const response = await fetch('/api/mapping', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'facets',
          attributes: open.map((row) => ({
            key: row.segments.join(' > '),
            text: `${row.productCount} producten`,
          })),
          // De filternamen van de site als context; leeg mag.
          columns: (evidence?.filters ?? []).slice(0, 60).map((name) => ({ key: name, text: '' })),
        }),
      });
      if (!response.ok) throw new Error('mislukt');
      const { text } = await response.json();
      const found: Verdicts = {};
      for (const line of String(text ?? '').split('\n')) {
        const at = line.lastIndexOf(':');
        if (at === -1) continue;
        const path = line.slice(0, at).trim().replace(/^[-*]\s*/, '');
        const answer = line.slice(at + 1).trim().toLowerCase();
        const match = open.find((row) => row.segments.join(' > ') === path);
        if (!match) continue;
        if (answer.startsWith('kenmerk') || answer.startsWith('facet')) {
          found[pathKey(match.segments)] = 'facet';
        } else if (answer.startsWith('categorie') || answer.startsWith('category')) {
          found[pathKey(match.segments)] = 'category';
        }
      }
      setProposals((current) => ({ ...current, ...found }));
    } catch {
      setJudgeFailed(true);
    } finally {
      setJudging(false);
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
      {/* Eerst waarom, dan pas wat. Zonder de reden is dit een lijst met een
          vraag die niemand kan beantwoorden — en het antwoord kost de merchant
          moeite, dus hij hoort te weten waarvoor. */}
      <Card>
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">{s.segments.whyHeading}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.segments.whyBody1}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.segments.whyBody2}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{s.segments.whyBody3}</p>
          </div>
        </div>
      </Card>

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
          <div className="mb-4">
            <Button onClick={() => void judge()} loading={judging} variant="secondary">
              <Sparkles className="size-4" aria-hidden />
              {judging ? s.segments.judgeBusy : s.segments.judge}
            </Button>
            <p className="mt-2 text-xs leading-relaxed text-muted">{s.segments.judgeNote}</p>
            {judgeFailed ? (
              <div className="mt-3">
                <ErrorState title={s.segments.judgeFailed} body={s.segments.judgeFailedNext} />
              </div>
            ) : null}
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
