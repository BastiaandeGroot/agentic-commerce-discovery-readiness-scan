// De vragenbanken die er al zijn, voor de merchant.
//
// Een bank hoort bij een markt en niet bij een account, dus zodra er één ligt
// voor woontextiel kan elke woontextielwinkel er meteen op meten. Dit scherm is
// de plek waar dat blijkt: past een bestaande bank op zijn markt, dan hoeft hij
// niet twee werkdagen te wachten.
//
// Op zíjn token en niet op de servicesleutel: row level security bepaalt wat hij
// mag zien, en dat is precies wat er staat — een bank die vrijgegeven is. Wat in
// review staat is van ons.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../../../src/auth/config';
import { importQuestionList } from '../../../src/questions/list';

/**
 * Hoeveel vragen als voorproefje.
 *
 * Vijf. Genoeg om te herkennen of dit over zijn vak gaat, weinig genoeg om te
 * lezen zonder scrollen. De hele lijst zou hem laten beoordelen wat hij nog niet
 * kan beoordelen — daarvoor is het vragensetscherm, verderop, waar hij ze één
 * voor één langsloopt.
 */
const SAMPLE = 5;

export async function GET(request: Request) {
  const config = supabaseConfig();
  const token = request.headers.get('authorization');
  if (!config || !token) {
    return NextResponse.json({ banks: [] });
  }

  const supabase = createClient(config.url, config.anonKey, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false },
  });

  const wanted = new URL(request.url).searchParams.get('id');

  let found = await supabase
    .from('question_banks')
    .select('id, vertical, version, status, csv, excluded, attribute_types, standalone, overlay_labels, created_at, released_at')
    .order('created_at', { ascending: false });
  // Zonder migratie 0009 bestaat de kolom met kenmerktypen niet. Dan meet de
  // merchant gewoon zonder typen, in plaats van helemaal geen bank te zien.
  if (found.error) {
    found = await supabase
      .from('question_banks')
      .select('id, vertical, version, status, csv, excluded, created_at, released_at')
      .order('created_at', { ascending: false }) as typeof found;
  }

  if (found.error) {
    return NextResponse.json({ error: 'De vragenbanken zijn niet op te halen.' }, { status: 502 });
  }

  const rows = found.data ?? [];

  // Eén bank in zijn geheel, om in te lezen zodra de merchant hem kiest.
  if (wanted) {
    const bank = rows.find((one) => one.id === wanted);
    if (!bank) return NextResponse.json({ error: 'Die vragenbank bestaat niet.' }, { status: 404 });
    // Apart opgehaald: zonder migratie 0013 bestaat de kolom niet, en dan hoort de
    // bank er gewoon zonder correcties te zijn in plaats van helemaal niet.
    const corrections = await supabase
      .from('question_banks')
      .select('importance_corrections')
      .eq('id', wanted)
      .maybeSingle();
    return NextResponse.json({
      // Het belang dat de beheerder corrigeerde, per vraag of per herweging.
      importance: corrections.error ? {} : corrections.data?.importance_corrections ?? {},
      id: bank.id,
      vertical: bank.vertical,
      version: bank.version,
      csv: String(bank.csv ?? ''),
      // Wat de beheerder oversloeg. Het staat los van de tabel omdat de tabel
      // is wat de generatie opleverde, en het overslaan een oordeel erna.
      excluded: (bank.excluded as string[] | null) ?? [],
      // Alleen een bevestigde typering. Een tabel die nog op review staat is een
      // voorstel van een model, en dat mag niet stil voorstellen gaan afwijzen.
      // Wat de beheerder per categorie besliste: losstaand, en een gecorrigeerd label.
      standalone: (bank as { standalone?: unknown }).standalone ?? [],
      labels: (bank as { overlay_labels?: unknown }).overlay_labels ?? {},
      shapes: (() => {
        const typing = (bank as { attribute_types?: { status?: string; shapes?: Record<string, unknown> } | null }).attribute_types;
        return typing?.status === 'confirmed' ? typing.shapes ?? {} : {};
      })(),
    });
  }

  // Alleen de nieuwste versie per markt. Een oudere versie aanbieden zou hem
  // laten kiezen tussen twee meetlatten zonder dat hij het verschil kan zien.
  // Op versienummer en niet op aanmaakdatum: een herziening die eerder klaar
  // was maar later is vrijgegeven, blijft de nieuwere meetlat.
  const newest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const held = newest.get(row.vertical);
    if (!held || row.version > held.version) newest.set(row.vertical, row);
  }

  const banks = [...newest.values()].map((row) => {
    const read = importQuestionList([
      { name: `${row.vertical}.csv`, text: String(row.csv ?? '') },
    ]);
    const skipped = new Set((row.excluded as string[] | null) ?? []);
    return {
      id: row.id,
      vertical: row.vertical,
      version: row.version,
      releasedAt: row.released_at ?? undefined,
      questions: read.bank?.questions.length ?? 0,
      categories: read.bank?.overlays.length ?? 0,
      // De algemene vragen, want die gelden voor élk product in zijn winkel. Een
      // categorie-eigen vraag zou hem laten oordelen over een categorie die hij
      // misschien niet eens voert.
      // Een overgeslagen vraag als voorproefje zou hem de vraag tonen die wij
      // zelf hebben afgekeurd.
      sample: (read.bank?.questions ?? [])
        .filter((question) => !skipped.has(question.id))
        .slice(0, SAMPLE)
        .map((question) => question.label),
    };
  });

  return NextResponse.json({ banks });
}
