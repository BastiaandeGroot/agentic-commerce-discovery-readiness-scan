// De vragenbank die de uitvoerder aanlevert.
//
// De app gelooft de uitvoerder niet op zijn woord. Wat hier binnenkomt wordt
// eerst ingelezen met dezelfde lezer die de merchant gebruikt; komt daar een
// fout uit, dan wordt er niets opgeslagen. Een bank die de app niet kan lezen is
// geen bank, en hem toch bewaren zou het probleem verplaatsen naar het moment
// dat een merchant erop wacht.
//
// De waarschuwingen van de lezer zijn de bevindingen: een drempel zonder bron,
// dekking zonder panelsites, een vraag die geen enkel attribuut kan dragen. Die
// halen de bank niet onderuit maar zetten hem op `review`, zodat er een mens
// naar kijkt voordat een merchant erop meet.

import { NextResponse } from 'next/server';
import { guard, isRefusal } from '../../../src/server/executor';
import { importQuestionList } from '../../../src/questions/list';

interface Payload {
  requestId: string;
  /** De vragenlijst in de vorm die de app inleest. */
  csv: string;
  /** Het panel waarop de bank rust: naam, url, type, datum. */
  panel?: { name: string; url: string; type?: string; consultedAt?: string }[];
  /** Wat de uitvoerder zelf al markeerde tijdens het controleren. */
  findings?: string[];
}

/** Ruim genoeg voor een bank van een paar honderd vragen. */
const MAX_CSV = 2_000_000;

export async function POST(request: Request) {
  const supabase = guard(request);
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Het verzoek was geen geldige JSON.' }, { status: 400 });
  }

  if (typeof payload.requestId !== 'string' || typeof payload.csv !== 'string') {
    return NextResponse.json({ error: 'Verwacht een requestId en een csv.' }, { status: 400 });
  }
  if (payload.csv.length > MAX_CSV) {
    return NextResponse.json({ error: 'De vragenlijst is te groot.' }, { status: 413 });
  }

  const found = await supabase
    .from('bank_requests')
    .select('id, vertical, status')
    .eq('id', payload.requestId)
    .maybeSingle();

  if (!found.data) {
    return NextResponse.json({ error: 'Deze aanvraag bestaat niet.' }, { status: 404 });
  }

  // Dezelfde lezer als de merchant gebruikt, en niet een soepelere variant. Wat
  // hier doorkomt, komt straks ook door zijn scherm.
  const read = importQuestionList([{ name: `${found.data.vertical}.csv`, text: payload.csv }]);

  if (read.errors.length > 0 || !read.bank) {
    await supabase
      .from('bank_requests')
      .update({ status: 'failed', failure: read.errors.join(' ') || 'De lijst bevat geen bruikbare vragen.' })
      .eq('id', payload.requestId);
    return NextResponse.json({ stored: false, errors: read.errors }, { status: 422 });
  }

  // De bevindingen: wat de lezer opmerkte plus wat de uitvoerder zelf markeerde.
  const findings = [
    ...read.warnings,
    ...(Array.isArray(payload.findings) ? payload.findings.filter((one) => typeof one === 'string') : []),
  ].slice(0, 200);

  // Oplopend per markt. Een bevroren bank verandert nooit; een herziening komt
  // ernaast te staan zodat een oud rapport zijn meetlat houdt.
  const previous = await supabase
    .from('question_banks')
    .select('version')
    .eq('vertical', found.data.vertical)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (previous.data?.version ?? 0) + 1;

  const stored = await supabase
    .from('question_banks')
    .insert({
      vertical: found.data.vertical,
      version,
      // Bevindingen betekent dat er een mens naar hoort te kijken. Zonder
      // bevindingen mag hij meteen naar de merchant.
      status: findings.length > 0 ? 'review' : 'ready',
      csv: payload.csv,
      findings,
      panel: Array.isArray(payload.panel) ? payload.panel.slice(0, 20) : [],
    })
    .select('id, version, status')
    .single();

  if (stored.error) {
    return NextResponse.json({ error: 'De bank kon niet worden bewaard.' }, { status: 500 });
  }

  await supabase
    .from('bank_requests')
    .update({
      status: findings.length > 0 ? 'review' : 'ready',
      finished_at: new Date().toISOString(),
      flagged: findings,
      bank_id: stored.data.id,
    })
    .eq('id', payload.requestId);

  return NextResponse.json({
    stored: true,
    bank: stored.data,
    questions: read.bank.questions.length,
    overlays: read.bank.overlays.length,
    findings,
  });
}
