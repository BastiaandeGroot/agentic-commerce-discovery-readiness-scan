// De koppelingen die andere accounts van dezelfde webshop eerder maakten.
//
// Een collega die zich registreert krijgt een eigen account. Scant hij dezelfde
// webshop, dan hoort hij niet opnieuw te beginnen met koppelen. Deze route zoekt
// de koppelingen op die bij dat adres bewaard staan, over accounts heen.
//
// Twee grenzen, omdat iedereen elk adres kan invullen:
//
//   - alleen voor wie is ingelogd;
//   - van een ander account komt alleen terug wat wijst naar een kolom die de
//     vrager zelf noemt (`visibleMapping`). Wie de catalogus niet heeft, leert
//     er geen kolomnaam uit.
//
// Lezen en niet schrijven: elk account houdt zijn eigen rij, dus niemand
// overschrijft het werk van een ander.

import { NextResponse } from 'next/server';
import { callerEmail } from '../../../src/server/admin';
import { isRefusal, serviceClient } from '../../../src/server/executor';
import { siteKey } from '../../../src/collect/answers';
import { visibleMapping, type Mapping } from '../../../src/questions/mapping';

const MAX_COLUMNS = 2000;
const MAX_ROWS = 20;

export async function POST(request: Request) {
  if (!(await callerEmail(request))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: { site?: unknown; columns?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }
  const site = typeof body.site === 'string' ? siteKey(body.site) : '';
  const columns = Array.isArray(body.columns)
    ? body.columns.filter((one): one is string => typeof one === 'string').slice(0, MAX_COLUMNS)
    : [];
  if (site === '' || columns.length === 0) return NextResponse.json({ mappings: [] });

  const client = serviceClient();
  // Niet ingericht is geen fout voor de retailer: dan is er niets te delen.
  if (isRefusal(client)) return NextResponse.json({ mappings: [] });

  const { data, error } = await client
    .from('merchant_bank_settings')
    .select('mapping, updated_at')
    .eq('site', site)
    .order('updated_at', { ascending: false })
    .limit(MAX_ROWS);
  // Zonder migratie 0015 bestaat de kolom niet; ook dan valt er niets te delen.
  if (error) return NextResponse.json({ mappings: [] });

  const mappings = (data ?? [])
    .map((row) => visibleMapping((row.mapping ?? {}) as Mapping, columns))
    .filter((mapping) => Object.keys(mapping).length > 0);
  return NextResponse.json({ mappings });
}
