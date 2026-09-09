// Eén stap van één generatie, en dan ophouden.
//
// Dit is wat de poller aanroept. Hij doet geen onderzoek en houdt geen lus vast;
// hij zet één fase, bewaart wat eruit kwam en geeft antwoord. De volgende beurt
// pakt de volgende fase. Een markt is daarmee twaalf tot vijftien beurten, en
// tussen twee beurten mag alles omvallen zonder dat er werk verloren gaat.
//
// Waarom niet één lange aanroep die de hele bank maakt: dan is er geen hervatten
// en geen tussenstand, loopt hij tegen elke tijdslimiet aan die er tussen zit, en
// is een bank die raar uitvalt niet terug te voeren op één stap. Dat is precies
// waar de agentische opzet op vastliep.
//
// Er zit geen mens achter dit verzoek, dus het loopt op de uitvoerderssleutel.

import { NextResponse } from 'next/server';
import { isExecutor, isRefusal, serviceClient } from '../../../src/server/executor';
import { makeAsk } from '../../../src/server/generator';
import { deliverBank } from '../../../src/server/deliver';
import { advance } from '../../../src/generation/pipeline';
import {
  decodePhase,
  emptyState,
  encodePhase,
  FIRST_PHASE,
  phaseNumber,
  totalPhases,
  type RunBrief,
  type RunState,
} from '../../../src/generation/state';

/**
 * Hoe lang een beurt de run voor zichzelf houdt.
 *
 * Een fase die vijf sites leest duurt minuten, en de poller komt elk kwartier
 * langs. Zonder deze grendel zou een tweede beurt dezelfde fase nog een keer
 * draaien — twee keer betalen voor één stap, en twee schrijvers op dezelfde rij.
 *
 * De grendel gaat er meteen af zodra de fase klaar is, en hangt daarom aan een
 * eigen kolom en niet aan `updated_at`. Zat hij aan `updated_at`, dan zou elke
 * stap deze twintig minuten uitzitten voordat de volgende mocht beginnen, en
 * duurde een markt van vijftien stappen dagen in plaats van uren.
 */
const LEASE_MINUTES = 20;

/** Drie keer dezelfde fase stuk is geen pech meer maar een fout. */
const MAX_ATTEMPTS = 3;

interface RequestRow {
  id: string;
  account_id: string;
  vertical: string;
  segments: { name: string; count: number }[] | null;
  site_url: string | null;
  suggested_sites: string[] | null;
}

interface RunRow {
  id: string;
  request_id: string;
  phase: string;
  state: RunState;
  attempts: number;
  leased_until: string | null;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  updated_at: string;
}

const briefOf = (row: RequestRow): RunBrief => ({
  vertical: row.vertical,
  segments: Array.isArray(row.segments) ? row.segments : [],
  merchantSite: row.site_url ?? undefined,
  suggestedSites: Array.isArray(row.suggested_sites) ? row.suggested_sites : [],
});

export async function POST(request: Request) {
  if (!isExecutor(request)) {
    return NextResponse.json({ error: 'Geen geldige uitvoerderssleutel.' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    // Geen sleutel is geen storing maar een installatie die niet af is. De
    // poller hoort dat te kunnen zien aan de code, niet aan een lege log.
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  const supabase = serviceClient();
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString();

  // De oudste aanvraag die nog werk heeft. `queued` is nieuw, `running` is een
  // generatie die al loopt en aan zijn volgende fase toe is.
  const open = await supabase
    .from('bank_requests')
    .select('id, account_id, vertical, segments, site_url, suggested_sites')
    .in('status', ['queued', 'running'])
    .order('requested_at', { ascending: true })
    .limit(5);

  if (open.error) {
    return NextResponse.json({ error: 'De wachtrij is niet te lezen.' }, { status: 500 });
  }

  for (const row of (open.data ?? []) as RequestRow[]) {
    const existing = await supabase
      .from('bank_runs')
      .select('id, request_id, phase, state, attempts, leased_until, input_tokens, output_tokens, cached_tokens, updated_at')
      .eq('request_id', row.id)
      .maybeSingle();

    let run = existing.data as RunRow | null;

    if (!run) {
      // Nieuw werk. De insert is meteen de grendel: `request_id` is uniek, dus
      // een tweede beurt die hier tegelijk aankomt krijgt een conflict en gaat
      // door naar de volgende aanvraag.
      const created = await supabase
        .from('bank_runs')
        .insert({
          request_id: row.id,
          account_id: row.account_id,
          phase: encodePhase(FIRST_PHASE),
          state: emptyState(briefOf(row)),
          leased_until: new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString(),
        })
        .select('id, request_id, phase, state, attempts, leased_until, input_tokens, output_tokens, cached_tokens, updated_at')
        .single();

      if (created.error || !created.data) continue;
      run = created.data as RunRow;
      await supabase
        .from('bank_requests')
        .update({ status: 'running', started_at: now.toISOString() })
        .eq('id', row.id);
    } else {
      if (run.phase === 'done') continue;
      // Loopt er nog een beurt op deze run, dan is die van hem.
      if (run.leased_until !== null && run.leased_until > now.toISOString()) continue;

      // Vergelijken-en-vervangen: alleen wie de rij aantreft zoals hij hem zag,
      // mag hem pakken. `updated_at` gaat mee omhoog en is meteen de vergelijking
      // — zonder dat zouden twee beurten die tegelijk aankomen allebei dezelfde
      // waarde aantreffen en allebei slagen.
      const claimed = await supabase
        .from('bank_runs')
        .update({ leased_until: leaseUntil, updated_at: now.toISOString() })
        .eq('id', run.id)
        .eq('updated_at', run.updated_at)
        .select('id')
        .maybeSingle();
      if (!claimed.data) continue;
    }

    const phase = decodePhase(run.phase);
    const state: RunState = { ...emptyState(briefOf(row)), ...(run.state ?? {}) };

    try {
      const result = await advance(state, phase, makeAsk(), now.toISOString().slice(0, 10));

      const usage = {
        input: run.input_tokens + result.usage.input,
        output: run.output_tokens + result.usage.output,
        cached: run.cached_tokens + result.usage.cached,
      };

      await supabase
        .from('bank_runs')
        .update({
          phase: encodePhase(result.next),
          state: result.state,
          attempts: 0,
          failure: null,
          leased_until: null,
          input_tokens: usage.input,
          output_tokens: usage.output,
          cached_tokens: usage.cached,
          updated_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      // Klaar. De bank gaat door dezelfde poorten als een bank van buiten: de
      // app gelooft haar eigen pijplijn net zomin op haar woord.
      if (result.next.kind === 'done') {
        const delivered = await deliverBank(supabase, {
          requestId: row.id,
          csv: result.state.csv ?? '',
          panel: result.state.panel,
          grouping: result.state.grouping,
          findings: result.state.findings,
        });

        return NextResponse.json({
          request: row.id,
          vertical: row.vertical,
          phase: 'done',
          delivered: delivered.ok,
          ...(delivered.ok
            ? { bank: delivered.bank, questions: delivered.questions, findings: delivered.findings.length }
            : { error: delivered.error, errors: delivered.errors }),
          tokens: usage,
        });
      }

      return NextResponse.json({
        request: row.id,
        vertical: row.vertical,
        phase: encodePhase(phase),
        next: encodePhase(result.next),
        step: `${phaseNumber(phase, result.state)}/${totalPhases(result.state)}`,
        tokens: usage,
      });
    } catch (caught) {
      const attempts = run.attempts + 1;
      const failure = caught instanceof Error ? caught.message : 'Onbekende fout.';

      await supabase
        .from('bank_runs')
        .update({ attempts, failure, leased_until: null, updated_at: new Date().toISOString() })
        .eq('id', run.id);

      // Drie keer dezelfde fase stuk: dan hoort er een mens naar te kijken in
      // plaats van dat het model het een vierde keer op onze rekening probeert.
      if (attempts >= MAX_ATTEMPTS) {
        await supabase
          .from('bank_requests')
          .update({ status: 'blocked', failure: `Fase ${run.phase}: ${failure}` })
          .eq('id', row.id);
      }

      console.error('bank-run', row.vertical, run.phase, failure);
      return NextResponse.json(
        { request: row.id, phase: run.phase, attempts, blocked: attempts >= MAX_ATTEMPTS, error: failure },
        { status: 500 },
      );
    }
  }

  // Niets te doen. Dat is het normale geval en het hoort niets te kosten.
  return NextResponse.json({ request: null });
}
