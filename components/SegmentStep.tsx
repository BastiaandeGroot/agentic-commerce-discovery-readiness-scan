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

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Globe, HelpCircle, TriangleAlert } from 'lucide-react';
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

export function SegmentStep({ s, paths, verdicts, onDecide, onSegments, onSite, onContinue }: {
  s: Strings;
  paths: CategoryPath[];
  verdicts: Verdicts;
  /** Eén keuze; de pagina bewaart hem, want dit scherm kent geen opslag. */
  onDecide: (segments: string[], kind: PathKind) => void;
  /**
   * Wat er na alles overblijft als marktsegment.
   *
   * Omhoog gegeven en niet elders opnieuw berekend: het bewijs van de site en de
   * voorstellen van het model leven in dít scherm. Zou de pagina het zelf
   * uitrekenen, dan kent zij alleen de handmatige keuzes en belanden "Effen" en
   * "Premium" als marktsegment in de aanvraag — precies wat de merchant hier net
   * had weggezet.
   */
  onSegments: (segments: { name: string; count: number }[]) => void;
  /**
   * Het adres van zijn eigen winkel, zodra hij het invulde.
   *
   * Gaat mee in de aanvraag omdat zijn winkel één van de panelsites wordt —
   * nooit de enige, maar wel altijd één. Zonder dit zou hij hem hierboven
   * invullen en zou er verderop niets mee gebeuren.
   */
  onSite: (url: string) => void;
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

  /**
   * De twee namen die in de uitleg belanden.
   *
   * De grootste eigenschap die nu een categorie is, en de grootste echte
   * categorie. Grootste en niet de eerste: een voorbeeld dat over drie producten
   * gaat overtuigt niemand. Zijn ze er niet, dan staan er algemene woorden en
   * blijft de zin lopen.
   */
  const example = useMemo(() => {
    const biggest = (kind: PathKind) => rows
      .filter((row) => row.kind === kind)
      .sort((a, b) => b.productCount - a.productCount)[0]
      ?.segments.slice(-1)[0];
    return {
      kenmerk: biggest('facet') ?? s.segments.kinds.facet.toLowerCase(),
      categorie: biggest('category') ?? s.segments.kinds.category.toLowerCase(),
    };
  }, [rows, s]);


  // Doorgeven wat er overblijft, zodra dat verandert. Een facet is geen markt,
  // en een pad waar we niet uit kwamen ook niet.
  useEffect(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.kind !== 'category') continue;
      const name = row.segments[row.segments.length - 1];
      counts.set(name, (counts.get(name) ?? 0) + row.productCount);
    }
    onSegments([...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);


  /**
   * Eén handeling van de merchant, drie stappen van ons.
   *
   * Site lezen, dan beoordelen wat daarna nog onbeslist is, dan de uitleg
   * samenstellen. Achter elkaar en niet als drie knoppen: hij hoeft niet te
   * weten dat het drie dingen zijn, en de tussenstanden zijn niets waard zonder
   * de volgende stap.
   */
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
      // Wat hij invulde en wat werkte: pas ná een geslaagde lezing weten we dat
      // dit adres klopt, en dan is het de moeite waard om mee te dragen.
      onSite(site.trim());
      const evidence = { navigation: result.navigation ?? [], filters: result.filters ?? [] };
      setState({
        kind: 'done',
        evidence,
        pages: (result.read ?? []).length,
        clientRendered: result.likelyClientRendered === true,
      });
      await judge(evidence);
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
  async function judge(evidenceNow?: SiteEvidence) {
    const base = applyVerdicts(classifyPaths(paths, evidenceNow ?? evidence), verdicts);
    const open = base.filter((row) => row.kind === 'unclear');
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
          columns: ((evidenceNow ?? evidence)?.filters ?? []).slice(0, 60).map((name) => ({ key: name, text: '' })),
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
    onDecide(path.segments, kind);
  }

  if (paths.length === 0) {
    return (
      <Card>
        <EmptyState title={s.segments.empty} body={s.segments.emptyNext} />
      </Card>
    );
  }

  const doubts = rows.filter((row) => row.kind === 'unclear').length;
  const busy = state.kind === 'busy' || judging;
  const started = state.kind !== 'idle';

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Het adres. Eén handeling; wat erna gebeurt is onze zaak. */}
      {/* Alleen het adres. Uitleg hoort bij wat er ú komt, en dat is er nog
          niet: het oordeel en de tabel verderop dragen hun eigen kop. */}
      <Card>
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
          <Button onClick={() => void read()} loading={busy} disabled={site.trim() === ''}>
            <Globe className="size-4" aria-hidden />
            {s.segments.readShop}
          </Button>
        </div>

        {/* 2. Wat we op de achtergrond doen, zodat wachten geen stilte is. */}
        {busy ? (
          <p className="mt-3 text-sm text-muted">
            {state.kind === 'busy' ? s.segments.stepSite : s.segments.stepJudge}
          </p>
        ) : null}

        {state.kind === 'failed' ? (
          <div className="mt-3">
            <ErrorState title={s.segments.siteFailed} body={s.segments.siteFailedNext} />
          </div>
        ) : null}

        {state.kind === 'done' && state.clientRendered ? (
          <div className="mt-3">
            <ErrorState title={s.segments.siteEmpty} body={s.segments.siteEmptyNext} />
          </div>
        ) : null}

        {state.kind === 'done' && !state.clientRendered && !busy ? (
          <p className="mt-3 text-sm text-muted">{state.pages} {s.segments.siteDone}</p>
        ) : null}

        {judgeFailed ? (
          <div className="mt-3">
            <ErrorState title={s.segments.judgeFailed} body={s.segments.judgeFailedNext} />
          </div>
        ) : null}
      </Card>

      {/* 3. Wat we ervan vinden. Alleen als er iets te zeggen valt: "we konden
          alles bepalen" is een mededeling over niets, en de teller Onbeslist
          zegt het al. */}
      {started && !busy && (doubts > 0 || debt.facets > 0) ? (
        <Card>
          {doubts > 0 ? (
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{s.segments.doubtsHeading}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  <span className="font-medium text-ink">{doubts}</span> {s.segments.doubtsCount}. {s.segments.doubtsBody}
                </p>
              </div>
            </div>
          ) : null}

          {debt.facets > 0 ? (
            <div className={`flex items-start gap-3 ${doubts > 0 ? 'mt-4 border-t border-line pt-4' : ''}`}>
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{s.segments.debtHeading}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  <span className="font-medium text-ink">{debt.facets} {s.segments.of} {rows.length}</span>{' '}
                  {s.segments.debtBody}
                </p>
                {/* De enige uitleg op dit scherm, met twee namen uit zijn
                    eigen data erin. Vaste tekst: een gegenereerde versie beweerde
                    twee keer overtuigend het tegenovergestelde, en schermtekst
                    die per merchant anders luidt is niet na te lopen. */}
                <div className="mt-3 rounded-lg bg-surface-2 p-3">
                  {[s.segments.why1, s.segments.why2, s.segments.why3].map((line, index) => (
                    <p key={index} className="mt-1.5 text-sm leading-relaxed text-ink first:mt-0">
                      {line.replace('{kenmerk}', example.kenmerk).replace('{categorie}', example.categorie)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* 4. De tabel, met sorteren en filteren. */}
      {started && !busy ? (
        <Card>
          <CardTitle sub={`${s.segments.rule} ${s.segments.ruleBody}`}>
            {s.segments.tableHeading}
          </CardTitle>
          <Rows s={s} rows={rows} onDecide={decide} />
        </Card>
      ) : null}

      <Button onClick={onContinue}>{s.segments.continue}</Button>
    </div>
  );
}
