// Het beheerscherm: wie er wacht, wat er op review staat, en vrijgeven.
//
// Leest over accounts heen en schrijft een bank vrij, dus draait op de
// servicesleutel — maar pas nadat het token van de beller is nagekeken tegen de
// beheerderslijst. Twee stappen, en de volgorde is niet omkeerbaar: eerst weten
// wie belt, dan pas de sleutel gebruiken die alles mag.

import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../src/server/admin';
import { isRefusal, serviceClient } from '../../../../src/server/executor';
import { importQuestionList } from '../../../../src/questions/list';
import { reviewBank, summariseBank } from '../../../../src/questions/review';

/** Na hoeveel uur een openstaande aanvraag te lang duurt. Eén werkdag. */
const OVERDUE_HOURS = 24;

export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Geen beheerder.' }, { status: 403 });
  }
  const supabase = serviceClient();
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  const requests = await supabase
    .from('bank_requests')
    .select('id, vertical, status, site_url, suggested_sites, panel, segments, requested_at, started_at, finished_at, failure, bank_id')
    .order('requested_at', { ascending: true });

  const banks = await supabase
    .from('question_banks')
    .select('id, vertical, version, status, findings, panel, csv, created_at, released_at')
    .order('created_at', { ascending: false });

  const now = Date.now();
  return NextResponse.json({
    requests: (requests.data ?? []).map((one) => ({
      ...one,
      // Hoe lang iemand al wacht is wat een beheerder wil weten; de app rekent
      // dat hier uit zodat het scherm geen klok hoeft te hebben.
      waitingHours: Math.floor((now - new Date(one.requested_at as string).getTime()) / 3600_000),
      overdue: one.status !== 'ready'
        && (now - new Date(one.requested_at as string).getTime()) / 3600_000 > OVERDUE_HOURS,
    })),
    // De bank vraag voor vraag, met het ergste bovenaan. Een lijst tellingen —
    // "26 beslisregels zonder bron" — is niet te beoordelen: je weet niet wélke
    // vragen het betreft. Een beheerder beoordeelt vragen.
    banks: (banks.data ?? []).map((bank) => {
      const read = importQuestionList([{ name: `${bank.vertical}.csv`, text: String(bank.csv ?? '') }]);
      const { csv, ...rest } = bank;
      void csv;
      return {
        ...rest,
        questions: read.bank ? reviewBank(read.bank) : [],
        summary: read.bank ? summariseBank(read.bank) : undefined,
      };
    }),
  });
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Geen beheerder.' }, { status: 403 });
  }
  const supabase = serviceClient();
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  let body: { bankId?: string };
  try {
    body = (await request.json()) as { bankId?: string };
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }
  if (!body.bankId) return NextResponse.json({ error: 'Welke bank?' }, { status: 400 });

  const bank = await supabase
    .from('question_banks')
    .update({ status: 'ready', released_at: new Date().toISOString() })
    .eq('id', body.bankId)
    .eq('status', 'review')
    .select('id, vertical, version')
    .maybeSingle();

  if (!bank.data) {
    return NextResponse.json(
      { error: 'Deze bank staat niet op review; misschien is hij al vrijgegeven.' },
      { status: 409 },
    );
  }

  // Iedereen die op deze markt wachtte hoort nu bericht te krijgen. De mail zelf
  // bestaat nog niet; dit zet de aanvragen op klaar zodat het scherm de stand
  // toont en de mail er straks op kan aanhaken.
  await supabase
    .from('bank_requests')
    .update({ status: 'ready' })
    .eq('vertical', bank.data.vertical)
    .in('status', ['review', 'running', 'queued']);

  return NextResponse.json({ released: bank.data });
}
