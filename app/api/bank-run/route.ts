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
// Het antwoord komt meteen, en het werk daarna. Een fase duurt minuten en de
// proxy van Render kapt een verzoek af dat zolang niets terugstuurt — dan kreeg
// de poller een 502 terwijl de generatie prima liep. Een storingsmelding die bij
// élke geslaagde stap verschijnt is erger dan geen melding: dan kun je een echte
// storing niet meer herkennen. Dus zegt de route "opgepakt" en maakt `after` de
// fase af; de tussenstand in `bank_runs` blijft de waarheid.
//
// Er zit geen mens achter dit verzoek, dus het loopt op de uitvoerderssleutel.

import { after, NextResponse } from 'next/server';
import { isExecutor, isRefusal, serviceClient } from '../../../src/server/executor';
import { batchable, collectBatch, makeAsk, PhaseFailure, submitBatch } from '../../../src/server/generator';
import { deliverBank } from '../../../src/server/deliver';
import { advance, applyReply, taskFor } from '../../../src/generation/pipeline';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  decodePhase,
  emptyState,
  encodePhase,
  FIRST_PHASE,
  phaseNumber,
  totalPhases,
  type Phase,
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
  /** Loopt er een batch voor deze fase? Dan wachten we op de uitkomst. */
  batch_id: string | null;
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
      .select('id, request_id, phase, state, attempts, leased_until, batch_id, input_tokens, output_tokens, cached_tokens, updated_at')
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
        .select('id, request_id, phase, state, attempts, leased_until, batch_id, input_tokens, output_tokens, cached_tokens, updated_at')
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

    // Vanaf hier is het werk van deze beurt, en het antwoord gaat er nu al uit.
    // Als functie en niet als losse belofte: dan begint het werk pas nadat het
    // antwoord verstuurd is, en niet ergens ertussenin.
    const claimedRun = run;
    after(() => runPhase(supabase, row, claimedRun, now));

    const state: RunState = { ...emptyState(briefOf(row)), ...(run.state ?? {}) };
    return NextResponse.json({
      request: row.id,
      vertical: row.vertical,
      phase: run.phase,
      started: true,
      step: `${phaseNumber(decodePhase(run.phase), state)}/${totalPhases(state)}`,
    });
  }

  // Niets te doen. Dat is het normale geval en het hoort niets te kosten.
  return NextResponse.json({ request: null });
}

/**
 * Eén fase draaien en wegschrijven, nadat het antwoord al verstuurd is.
 *
 * Alles wat hier misgaat komt in `bank_runs` terecht en niet in een HTTP-antwoord
 * dat niemand meer leest. Dat is ook waarom de grendel eraf gaat in beide takken:
 * valt het proces hiertussen om, dan blijft de grendel staan tot hij verloopt en
 * pakt de volgende beurt dezelfde fase opnieuw op.
 */
async function runPhase(
  supabase: SupabaseClient,
  row: RequestRow,
  run: RunRow,
  now: Date,
): Promise<void> {
  const phase = decodePhase(run.phase);
  const state: RunState = { ...emptyState(briefOf(row)), ...(run.state ?? {}) };

  try {
    const result = await work(supabase, run, state, phase, now);
    // Nog niets te verwerken: de batch loopt. De grendel gaat eraf zodat een
    // volgende beurt kan kijken of hij intussen klaar is.
    if (result === null) {
      await supabase
        .from('bank_runs')
        .update({ leased_until: null, updated_at: new Date().toISOString() })
        .eq('id', run.id);
      return;
    }

    await supabase
      .from('bank_runs')
      .update({
        phase: encodePhase(result.next),
        state: result.state,
        attempts: 0,
        failure: null,
        leased_until: null,
        input_tokens: run.input_tokens + result.usage.input,
        output_tokens: run.output_tokens + result.usage.output,
        cached_tokens: run.cached_tokens + result.usage.cached,
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    console.log('bank-run', row.vertical, run.phase, '→', encodePhase(result.next));

    // Klaar. De bank gaat door dezelfde poorten als een bank van buiten: de app
    // gelooft haar eigen pijplijn net zomin op haar woord.
    if (result.next.kind === 'done') {
      const delivered = await deliverBank(supabase, {
        requestId: row.id,
        csv: result.state.csv ?? '',
        panel: result.state.panel,
        grouping: result.state.grouping,
        findings: result.state.findings,
      });
      console.log('bank-run', row.vertical, 'afgeleverd:', delivered.ok ? 'ja' : delivered.error);
    }
  } catch (caught) {
    const attempts = run.attempts + 1;
    const failure = caught instanceof Error ? caught.message : 'Onbekende fout.';
    // Wat een gestrande fase kostte telt gewoon mee: die tokens zijn betaald.
    const spent = caught instanceof PhaseFailure ? caught.usage : { input: 0, output: 0, cached: 0 };

    await supabase
      .from('bank_runs')
      .update({
        attempts,
        failure,
        leased_until: null,
        input_tokens: run.input_tokens + spent.input,
        output_tokens: run.output_tokens + spent.output,
        cached_tokens: run.cached_tokens + spent.cached,
        updated_at: new Date().toISOString(),
      })
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
  }
}

/**
 * Het werk van deze fase, langs de goedkope weg als dat kan.
 *
 * Drie toestanden. Loopt er al een batch, dan kijken we of hij klaar is —
 * `null` betekent dat hij nog bezig is en dat deze beurt niets te doen heeft.
 * Kan de fase in een batch, dan dienen we hem in en wachten we tot een volgende
 * beurt. Kan hij dat niet — de fasen die het web op gaan — dan gaat hij zoals
 * altijd meteen.
 *
 * De batch kost de helft: zelfde model, zelfde prompt, zelfde antwoord, alleen
 * later. Dat is precies wat je kunt missen bij werk dat toch uren duurt en waar
 * de merchant één tot twee werkdagen voor krijgt beloofd.
 */
async function work(
  supabase: SupabaseClient,
  run: RunRow,
  state: RunState,
  phase: Phase,
  now: Date,
) {
  const at = now.toISOString().slice(0, 10);

  if (run.batch_id) {
    const reply = await collectBatch(run.batch_id);
    if (reply === null) return null;
    return applyReply(state, phase, reply, at);
  }

  const task = taskFor(state, phase);
  if (task !== null && batchable(task)) {
    const batchId = await submitBatch(task);
    await supabase
      .from('bank_runs')
      .update({ batch_id: batchId, batch_at: now.toISOString() })
      .eq('id', run.id);
    console.log('bank-run batch ingediend', run.phase, batchId);
    return null;
  }

  return advance(state, phase, makeAsk(), at);
}
