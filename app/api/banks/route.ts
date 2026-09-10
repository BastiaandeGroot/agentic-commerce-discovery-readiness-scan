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

  const found = await supabase
    .from('question_banks')
    .select('id, vertical, version, status, csv, created_at')
    .order('created_at', { ascending: false });

  if (found.error) {
    return NextResponse.json({ error: 'De vragenbanken zijn niet op te halen.' }, { status: 502 });
  }

  const rows = found.data ?? [];

  // Eén bank in zijn geheel, om in te lezen zodra de merchant hem kiest.
  if (wanted) {
    const bank = rows.find((one) => one.id === wanted);
    if (!bank) return NextResponse.json({ error: 'Die vragenbank bestaat niet.' }, { status: 404 });
    return NextResponse.json({
      id: bank.id,
      vertical: bank.vertical,
      version: bank.version,
      csv: String(bank.csv ?? ''),
    });
  }

  // Alleen de nieuwste versie per markt. Een oudere versie aanbieden zou hem
  // laten kiezen tussen twee meetlatten zonder dat hij het verschil kan zien.
  const newest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!newest.has(row.vertical)) newest.set(row.vertical, row);
  }

  const banks = [...newest.values()].map((row) => {
    const read = importQuestionList([
      { name: `${row.vertical}.csv`, text: String(row.csv ?? '') },
    ]);
    return {
      id: row.id,
      vertical: row.vertical,
      version: row.version,
      questions: read.bank?.questions.length ?? 0,
      categories: read.bank?.overlays.length ?? 0,
      // De algemene vragen, want die gelden voor élk product in zijn winkel. Een
      // categorie-eigen vraag zou hem laten oordelen over een categorie die hij
      // misschien niet eens voert.
      sample: (read.bank?.questions ?? []).slice(0, SAMPLE).map((question) => question.label),
    };
  });

  return NextResponse.json({ banks });
}
