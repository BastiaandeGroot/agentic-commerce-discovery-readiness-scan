// Wat de uitvoerder als eerstvolgende moet doen.
//
// Eén aanvraag per keer, meteen op `running` gezet, zodat een tweede beurt hem
// niet ook oppakt. Was de app een dag dicht en lopen er drie beurten achter
// elkaar in, dan pakken ze drie verschillende aanvragen of ze vinden niets.
//
// Er zit geen mens achter dit verzoek, dus het loopt op de uitvoerderssleutel en
// niet op een sessie.

import { NextResponse } from 'next/server';
import { guard, isRefusal, STALE_AFTER_HOURS } from '../../../src/server/executor';

export async function GET(request: Request) {
  const supabase = guard(request);
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  const now = Date.now();
  const stale = new Date(now - STALE_AFTER_HOURS * 3600_000).toISOString();

  // Eerst opruimen: een uitvoerder die halverwege uitviel laat een aanvraag op
  // `running` staan. Na een dag is dat geen lopend werk meer maar een blokkade,
  // en niemand komt hem anders nog halen.
  await supabase
    .from('bank_requests')
    .update({ status: 'queued', started_at: null })
    .eq('status', 'running')
    .lt('started_at', stale);

  const { data, error } = await supabase
    .from('bank_requests')
    .select('id, vertical, segments, site_url, suggested_sites, requested_at')
    .eq('status', 'queued')
    .order('requested_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'De wachtrij is niet te lezen.' }, { status: 500 });
  }
  if (!data) {
    // Niets te doen is het normale geval, drie keer per dag. Geen fout, en de
    // uitvoerder hoort hier stil van te blijven.
    return NextResponse.json({ request: null });
  }

  // Meteen bezet zetten. Lukt dat niet omdat een ander hem net pakte, dan is er
  // voor deze beurt niets te doen — beter dan twee keer hetzelfde onderzoek.
  const claimed = await supabase
    .from('bank_requests')
    .update({ status: 'running', started_at: new Date(now).toISOString() })
    .eq('id', data.id)
    .eq('status', 'queued')
    .select('id')
    .maybeSingle();

  if (!claimed.data) return NextResponse.json({ request: null });

  return NextResponse.json({
    request: {
      id: data.id,
      vertical: data.vertical,
      segments: data.segments ?? [],
      merchantSite: data.site_url ?? undefined,
      suggestedSites: data.suggested_sites ?? [],
      requestedAt: data.requested_at,
    },
  });
}
