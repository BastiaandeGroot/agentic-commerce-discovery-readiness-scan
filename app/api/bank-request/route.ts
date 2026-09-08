// De aanvraag voor een vragenbank in de wachtrij zetten, en zeggen hoe het staat.
//
// Dit is de naad tussen "de merchant heeft zijn catalogus aangeleverd" en "er
// ligt een vragenbank voor zijn markt". Kennen we die markt al, dan is er niets
// aan te vragen. Kennen we hem niet, dan wordt dit een taak die doorloopt nadat
// hij zijn browser sluit — en dat is de reden dat hij er een mail over krijgt.
//
// Wat er in de aanvraag gaat: de markt, de segmenten die een eigen overlay
// verdienen, categorienamen met aantallen, en de URL van de winkel. Verder
// niets — geen kolomnamen, geen productrijen, geen prijzen. Dat is fase 3 van
// de methode (bouw de bank vóórdat je de catalogus opent) en tegelijk de
// privacybelofte; `tests/request.test.ts` bewaakt de vorm.
//
// Eén openstaande aanvraag per markt, afgedwongen door een index in de
// database. Twee merchants die dezelfde dag in dezelfde markt aankomen wachten
// op dezelfde taak; hetzelfde onderzoek twee keer draaien kost geld en levert
// twee meetlatten op.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseConfig } from '../../../src/auth/config';

interface Payload {
  accountId: string;
  /** Sleutel van de markt: kleine letters met streepjes. */
  vertical: string;
  /** De segmenten die onderzocht moeten worden, met hoeveel producten erin. */
  segments: { name: string; count: number }[];
  siteUrl?: string;
}

const LIMITS = {
  segments: 40,
  name: 120,
};

/**
 * De client namens de merchant zelf, niet namens de server.
 *
 * Zijn token gaat mee, dus row level security blijft gelden: hij kan alleen een
 * aanvraag zetten op een account waar hij lid van is. Een servicesleutel zou dat
 * omzeilen, en die hoort alleen bij de werker die de bank straks klaarzet.
 */
function clientFor(request: Request) {
  const config = supabaseConfig();
  if (!config) return undefined;
  const token = request.headers.get('authorization');
  if (!token) return undefined;
  return createClient(config.url, config.anonKey, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  const supabase = clientFor(request);
  if (!supabase) {
    return NextResponse.json(
      { error: 'Bewaren staat niet aan in deze installatie, of je bent niet ingelogd.' },
      { status: 503 },
    );
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Het verzoek was geen geldige JSON.' }, { status: 400 });
  }

  const vertical = (payload.vertical ?? '').trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(vertical)) {
    return NextResponse.json({ error: 'De markt ontbreekt of heeft een onbruikbare naam.' }, { status: 400 });
  }
  if (!payload.accountId) {
    return NextResponse.json({ error: 'Er hoort een account bij deze aanvraag.' }, { status: 400 });
  }

  // Afkappen en niet weigeren: een catalogus met vijftig categorieën is geen
  // fout van de merchant, en de grootste segmenten dragen de meting.
  const segments = (payload.segments ?? [])
    .filter((one) => typeof one?.name === 'string' && one.name.trim() !== '')
    .map((one) => ({ name: one.name.trim().slice(0, LIMITS.name), count: Number(one.count) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, LIMITS.segments);

  // Loopt er al een aanvraag voor deze markt? Dan is dát het antwoord: wachten
  // op dezelfde taak in plaats van een tweede onderzoek starten.
  const open = await supabase
    .from('bank_requests')
    .select('id, status, requested_at, finished_at')
    .eq('vertical', vertical)
    .in('status', ['queued', 'running', 'review'])
    .maybeSingle();

  if (open.data) {
    return NextResponse.json({ request: open.data, joined: true });
  }

  const inserted = await supabase
    .from('bank_requests')
    .insert({
      account_id: payload.accountId,
      vertical,
      segments,
      site_url: payload.siteUrl ?? null,
    })
    .select('id, status, requested_at')
    .single();

  if (inserted.error) {
    // De unieke index kan alsnog toeslaan als er tussen kijken en schrijven een
    // andere merchant was; dat is geen fout maar hetzelfde antwoord.
    if (inserted.error.code === '23505') {
      return NextResponse.json({ request: { vertical, status: 'queued' }, joined: true });
    }
    return NextResponse.json(
      { error: 'De aanvraag kon niet worden vastgelegd. Probeer het zo nog eens.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ request: inserted.data, joined: false });
}

/** Hoe staat het ervoor? Het wachtscherm vraagt dit; er gaat niets de deur uit. */
export async function GET(request: Request) {
  const supabase = clientFor(request);
  if (!supabase) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 503 });

  const vertical = new URL(request.url).searchParams.get('vertical')?.toLowerCase() ?? '';
  if (!/^[a-z0-9-]{2,40}$/.test(vertical)) {
    return NextResponse.json({ error: 'Geen geldige markt opgegeven.' }, { status: 400 });
  }

  const found = await supabase
    .from('bank_requests')
    .select('id, status, failure, flagged, requested_at, finished_at')
    .eq('vertical', vertical)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ request: found.data ?? null });
}
