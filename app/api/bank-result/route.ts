// De vragenbank die een uitvoerder aanlevert.
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
//
// Het aannemen zelf staat in `src/server/deliver.ts`, want de generator in deze
// app levert langs dezelfde weg af en hoort door dezelfde poorten te gaan.

import { NextResponse } from 'next/server';
import { guard, isRefusal } from '../../../src/server/executor';
import { deliverBank, type Delivery } from '../../../src/server/deliver';

export async function POST(request: Request) {
  const supabase = guard(request);
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  let payload: Delivery;
  try {
    payload = (await request.json()) as Delivery;
  } catch {
    return NextResponse.json({ error: 'Het verzoek was geen geldige JSON.' }, { status: 400 });
  }

  const result = await deliverBank(supabase, payload);

  if (!result.ok) {
    return NextResponse.json(
      result.errors ? { stored: false, errors: result.errors } : { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    stored: true,
    bank: result.bank,
    questions: result.questions,
    overlays: result.overlays,
    findings: result.findings,
  });
}
