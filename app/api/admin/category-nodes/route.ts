// Welke categorieknopen er onderzocht moeten worden voor een vragenbank.
//
// Dit is de brug tussen het categoriescherm van de merchant en de route via
// Cowork (`ONTWERP-vragenbank-keten.md`, paragraaf 3c). De merchant scheidt daar
// zijn kenmerken van zijn categorieën; wat overblijft is de opdracht. Zonder dit
// eindpunt is die opdracht overtypen van een scherm, en bij dertig knopen doet
// niemand dat twee keer.
//
// Alleen wat op `category` staat. Een kenmerkknoop krijgt nooit een vragenset —
// dat is een vastliggende beslissing, en hier is de plek waar hij zichtbaar
// wordt gehandhaafd: een pad dat de merchant kenmerk noemde komt deze lijst niet
// op en wordt dus nooit onderzocht.
//
// Leest over accounts heen, dus dezelfde volgorde als de andere beheerroutes:
// eerst weten wie belt, dan pas de sleutel gebruiken die alles mag.

import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../src/server/admin';
import { isRefusal, serviceClient } from '../../../../src/server/executor';

/** Eén knoop zoals het scherm hem toont. */
interface Node {
  /** Het volledige pad, zoals de merchant het in zijn catalogus heeft staan. */
  path: string;
  segments: string[];
  /** Op welk niveau hij hangt; 1 is een hoofdcategorie. */
  depth: number;
  decidedAt: string | null;
}

interface Account {
  accountId: string;
  /** De markt waarvoor deze merchant een bank aanvroeg, als hij dat deed. */
  verticals: string[];
  nodes: Node[];
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Geen beheerder.' }, { status: 403 });
  }
  const supabase = serviceClient();
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  const verdicts = await supabase
    .from('category_verdicts')
    .select('account_id, path_key, segments, kind, decided_at')
    .eq('kind', 'category');

  if (verdicts.error) {
    // Zonder de migratie bestaat de tabel niet. Dat is geen storing van dit
    // scherm maar een stand van de database, en dat hoort het te zeggen.
    return NextResponse.json({ error: verdicts.error.message, accounts: [] }, { status: 200 });
  }

  // De markt erbij, zodat je ziet welke bank deze knopen zouden voeden. Mislukt
  // dit, dan blijft de lijst bruikbaar; hij is alleen minder goed te plaatsen.
  const requests = await supabase
    .from('bank_requests')
    .select('account_id, vertical');
  const byAccount = new Map<string, Set<string>>();
  for (const row of requests.data ?? []) {
    const set = byAccount.get(row.account_id as string) ?? new Set<string>();
    set.add(row.vertical as string);
    byAccount.set(row.account_id as string, set);
  }

  const accounts = new Map<string, Account>();
  for (const row of verdicts.data ?? []) {
    const accountId = row.account_id as string;
    const segments = (row.segments as string[] | null) ?? [];
    const entry = accounts.get(accountId) ?? {
      accountId,
      verticals: [...(byAccount.get(accountId) ?? [])].sort(),
      nodes: [],
    };
    entry.nodes.push({
      path: segments.length > 0 ? segments.join(' / ') : (row.path_key as string),
      segments,
      depth: Math.max(segments.length, 1),
      decidedAt: (row.decided_at as string | null) ?? null,
    });
    accounts.set(accountId, entry);
  }

  // Op pad en niet op beslismoment: je leest deze lijst als een boom, en dan
  // hoort een subcategorie onder zijn hoofdcategorie te staan.
  for (const account of accounts.values()) {
    account.nodes.sort((a, b) => a.path.localeCompare(b.path));
  }

  return NextResponse.json({
    accounts: [...accounts.values()].sort((a, b) => b.nodes.length - a.nodes.length),
  });
}
