// De openbare meting van één winkel, op één vragenbank.
//
// Wat een agent van deze winkel kan zien, gemeten tegen de vragen die kopers in
// zijn markt stellen. Geen upload, geen toestemming, alleen wat hij publiceert —
// en juist dat maakt hem bruikbaar als opening van een gesprek dat er nog niet
// is.
//
// Alleen voor de beheerder. Dit haalt andermans site op, en dat hoort geen knop
// te zijn die het hele internet kan indrukken.

import { NextResponse } from 'next/server';
import { isAdmin } from '../../../src/server/admin';
import { isRefusal, serviceClient } from '../../../src/server/executor';
import { collectShop, CollectError, DEFAULTS } from '../../../src/server/collect';
import { importQuestionList } from '../../../src/questions/list';
import { ingest } from '../../../src/intake/index';
import { generateQuestionSets } from '../../../src/questions/generate';
import { runScan } from '../../../src/engine/report';
import type { QuestionBank } from '../../../src/questions/bank';

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Geen beheerder.' }, { status: 403 });
  }

  let body: { url?: string; bankId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }
  if (!body.url) return NextResponse.json({ error: 'Welk webadres?' }, { status: 400 });

  // De bank is optioneel: zonder valt de scan terug op de meegeleverde
  // voorlopige banken, net als in de app. Dat is bruikbaar om te kijken, maar
  // het rapport zegt er dan bij dat er niet op de markt gemeten is.
  let banks: QuestionBank[] = [];
  let bankLabel: string | undefined;

  if (body.bankId) {
    const supabase = serviceClient();
    if (isRefusal(supabase)) {
      return NextResponse.json({ error: supabase.error }, { status: supabase.status });
    }
    const found = await supabase
      .from('question_banks')
      .select('vertical, version, csv')
      .eq('id', body.bankId)
      .maybeSingle();

    if (!found.data) return NextResponse.json({ error: 'Die vragenbank bestaat niet.' }, { status: 404 });

    const read = importQuestionList([
      { name: `${found.data.vertical}.csv`, text: String(found.data.csv ?? '') },
    ]);
    if (!read.bank) {
      return NextResponse.json({ error: 'Deze vragenbank is niet in te lezen.' }, { status: 422 });
    }
    banks = [read.bank];
    bankLabel = `${found.data.vertical} v${found.data.version}`;
  }

  try {
    const collected = await collectShop(body.url, DEFAULTS);

    if (collected.rows.length === 0) {
      // Dit is geen storing maar een uitkomst, en een harde: er staat geen
      // gestructureerde productdata op de pagina's. Dan kan een agent er ook
      // niets uit halen.
      return NextResponse.json({
        origin: collected.origin,
        empty: true,
        candidates: collected.candidates,
        requests: collected.requests,
        blockedBots: collected.blockedBots,
        notes: collected.notes,
      });
    }

    const catalog = ingest('openbaar.json', JSON.stringify(collected.rows));
    const questions = generateQuestionSets(catalog, banks);
    const report = runScan(catalog, questions, { scannedAt: new Date().toISOString() });

    const attributes = new Set<string>();
    for (const row of collected.rows) for (const key of Object.keys(row)) attributes.add(key);

    return NextResponse.json({
      origin: collected.origin,
      scannedAt: report.stamp.scannedAt,
      bank: bankLabel,
      sample: collected.rows.length,
      candidates: collected.candidates,
      requests: collected.requests,
      blockedBots: collected.blockedBots,
      notes: collected.notes,
      attributes: [...attributes].filter((key) => key !== 'url'),
      categories: report.categories
        .filter((one) => one.subcategory === undefined)
        .map((one) => ({ name: one.category, products: one.total })),
      funnel: report.funnel,
      // Per vraag: kan de winkel hem beantwoorden uit wat hij publiceert. Dat is
      // wat een merchant wil zien — een lijst velden zegt hem niets, een lijst
      // vragen die onbeantwoord blijft wel.
      questions: report.questionCoverage
        .filter((one) => one.scored)
        .map((one) => ({
          id: one.questionId,
          label: one.label,
          importance: one.importance,
          answered: one.answered,
          applicable: one.applicable,
          evidence: (one.evidence ?? []).map((entry) => entry.label),
        })),
    });
  } catch (caught) {
    if (caught instanceof CollectError) {
      return NextResponse.json({ error: caught.message }, { status: 422 });
    }
    console.error('public-scan', caught);
    return NextResponse.json({ error: 'De meting is niet gelukt.' }, { status: 502 });
  }
}
