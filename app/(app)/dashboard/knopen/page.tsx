'use client';

// De opdracht voor Cowork: welke categorieknopen er onderzocht moeten worden.
//
// Dit scherm bestaat omdat de route via Cowork anders op overtypen leunt. De
// merchant scheidt op zijn categoriescherm de kenmerken van de categorieën; wat
// op `categorie` staat is de opdracht, en bij dertig knopen wil je die kunnen
// kopiëren en niet overnemen.
//
// Alleen categorieën. Een kenmerkknoop komt hier niet op en wordt dus nooit
// onderzocht — dat is de regel uit `ONTWERP-vragenbank-keten.md` paragraaf 5, en
// dit scherm is de plek waar je hem kunt zien werken.
//
// Geen aantallen erbij, en dat is geen omissie: productaantallen staan in de
// catalogus en die verlaat het apparaat van de merchant niet. Wat hier staat zijn
// categorienamen en verder niets.

import { useCallback, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  Badge, Button, Card, CardTitle, EmptyState, ErrorState, SkeletonLines,
} from '../../../../components/ui';
import { STRINGS } from '../../../../src/i18n/strings';
import { useLocale } from '../../../../src/i18n/useLocale';
import { authHeader } from '../../../../src/auth/client';
import { useAuth } from '../../../../components/auth/AuthProvider';

interface Node {
  path: string;
  segments: string[];
  depth: number;
  decidedAt: string | null;
}

interface Account {
  accountId: string;
  verticals: string[];
  nodes: Node[];
}

type State =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'failed'; message?: string }
  | { kind: 'ready'; accounts: Account[] };

export default function CategoryNodesPage() {
  const [locale] = useLocale();
  const s = STRINGS[locale].nodes;
  const { user } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [copied, setCopied] = useState<string>();

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const response = await fetch('/api/admin/category-nodes', { headers: await authHeader() });
      if (response.status === 403) { setState({ kind: 'denied' }); return; }
      const body = await response.json();
      if (!response.ok) { setState({ kind: 'failed', message: body?.error }); return; }
      if (body?.error) { setState({ kind: 'failed', message: body.error }); return; }
      setState({ kind: 'ready', accounts: body.accounts ?? [] });
    } catch (caught) {
      setState({ kind: 'failed', message: (caught as Error).message });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // De render eerst laten aflopen: een setState in het lichaam van een effect
    // lokt een extra render uit voordat deze klaar is.
    void (async () => { await Promise.resolve(); await load(); })();
  }, [user, load]);

  /** De lijst zoals je hem in Cowork plakt: één pad per regel, verder niets. */
  function copy(account: Account) {
    const text = account.nodes.map((node) => node.path).join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(account.accountId);
      window.setTimeout(() => setCopied(undefined), 2000);
    });
  }

  if (!user || state.kind === 'loading') {
    return <Card><SkeletonLines /></Card>;
  }
  if (state.kind === 'denied') {
    return (
      <Card>
        <ErrorState title={STRINGS[locale].admin.denied} body={STRINGS[locale].admin.deniedBody} />
      </Card>
    );
  }
  if (state.kind === 'failed') {
    return (
      <Card>
        <ErrorState
          title={STRINGS[locale].admin.failed}
          body={state.message ?? STRINGS[locale].admin.failedBody}
          next={s.failedNext}
          action={{ label: s.retry, onClick: () => void load() }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.intro}>{s.heading}</CardTitle>
        <p className="text-sm leading-relaxed text-muted">{s.rule}</p>
      </Card>

      {state.accounts.length === 0 ? (
        <EmptyState title={s.emptyTitle} body={s.emptyBody} />
      ) : (
        state.accounts.map((account) => (
          <Card key={account.accountId}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted">{account.accountId}</p>
                <p className="mt-1 text-sm">
                  <span className="tnum font-semibold">{account.nodes.length}</span>{' '}
                  <span className="text-muted">{s.nodeCount}</span>
                </p>
                {account.verticals.length > 0 ? (
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {account.verticals.map((vertical) => (
                      <Badge key={vertical} tone="neutral">{vertical}</Badge>
                    ))}
                  </p>
                ) : null}
              </div>
              <Button variant="secondary" onClick={() => copy(account)}>
                {copied === account.accountId
                  ? <><Check className="size-4" aria-hidden />{s.copied}</>
                  : <><Copy className="size-4" aria-hidden />{s.copy}</>}
              </Button>
            </div>

            {/* Als boom en niet als platte lijst: een subcategorie hoort onder
                zijn hoofdcategorie, anders is niet te zien wat waarbij hoort. */}
            <ul className="mt-3">
              {account.nodes.map((node) => (
                <li
                  key={node.path}
                  className="flex flex-wrap items-baseline gap-x-2 border-t border-line py-1.5 text-sm first:border-t-0"
                >
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ paddingLeft: `${(node.depth - 1) * 1.25}rem` }}
                  >
                    {node.segments.length > 0
                      ? node.segments[node.segments.length - 1]
                      : node.path}
                  </span>
                  <span className="min-w-0 truncate font-mono text-xs text-muted">{node.path}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
