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
import { applyOverlaySettings, type OverlaySettings } from '../../../../src/questions/bank';
import type { Bilingual } from '../../../../src/domain/types';
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
    .select('id, vertical, status, site_url, suggested_sites, panel, grouping, segments, requested_at, started_at, finished_at, failure, bank_id')
    .order('requested_at', { ascending: true });

  let banks = await supabase
    .from('question_banks')
    .select('id, vertical, version, status, findings, panel, grouping, csv, excluded, attribute_types, standalone, overlay_labels, created_at, released_at')
    .order('created_at', { ascending: false });
  // Zonder migratie 0009 of 0010 bestaat de kolom met kenmerktypen niet. Dan blijft het
  // beoordelen gewoon werken; alleen typeren meldt dat de migratie nog moet.
  if (banks.error) {
    banks = await supabase
      .from('question_banks')
      .select('id, vertical, version, status, findings, panel, grouping, csv, excluded, created_at, released_at')
      .order('created_at', { ascending: false }) as typeof banks;
  }

  // Hoe ver de generatie is. Een aparte vraag en geen join: het is de enige
  // plek waar de stand van het werk vandaan komt, en een aanvraag zonder run —
  // aangeleverd door een uitvoerder van buiten — hoort er gewoon zonder te staan.
  const runs = await supabase
    .from('bank_runs')
    .select('request_id, phase, attempts, input_tokens, output_tokens, cached_tokens, failure, updated_at');

  const runBy = new Map(
    (runs.data ?? []).map((run) => [
      run.request_id as string,
      {
        phase: run.phase as string,
        attempts: run.attempts as number,
        tokens: (run.input_tokens as number) + (run.output_tokens as number),
        failure: (run.failure as string | null) ?? undefined,
        updatedAt: run.updated_at as string,
      },
    ]),
  );

  const now = Date.now();
  return NextResponse.json({
    requests: (requests.data ?? []).map((one) => ({
      ...one,
      run: runBy.get(one.id as string),
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
      // Beoordelen op de bank zoals de merchant hem krijgt: met losstaande
      // categorieën en gecorrigeerde labels erop.
      const settings = settingsOf(bank);
      const applied = read.bank ? applyOverlaySettings(read.bank, settings) : undefined;
      return {
        ...rest,
        questions: applied ? reviewBank(applied) : [],
        summary: applied ? summariseBank(applied) : undefined,
        overlays: (read.bank?.overlays ?? []).map((overlay) => ({
          id: overlay.id,
          label: settings.labels[overlay.id] ?? overlay.label,
          original: overlay.label,
          standalone: settings.standalone.includes(overlay.id),
          questions: overlay.questions?.length ?? 0,
        })),
        // Opnieuw berekend en niet de opgeslagen lijst: die is vastgelegd bij
        // het afleveren, en de lezer is sindsdien scherper geworden. Een bank
        // beoordelen op meldingen die we inmiddels niet meer maken, kost een
        // uur van jouw tijd aan iets wat we zelf al hebben opgelost.
        warnings: read.warnings,
      };
    }),
  });
}

/** De instellingen per categorie, zoals ze naast de bank bewaard staan. */
function settingsOf(bank: unknown): OverlaySettings {
  const row = bank as { standalone?: unknown; overlay_labels?: unknown };
  return {
    standalone: Array.isArray(row.standalone) ? row.standalone.filter((id): id is string => typeof id === 'string') : [],
    labels: row.overlay_labels && typeof row.overlay_labels === 'object'
      ? row.overlay_labels as Record<string, Bilingual>
      : {},
  };
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Geen beheerder.' }, { status: 403 });
  }
  const supabase = serviceClient();
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  let body: {
    bankId?: string;
    questionId?: string;
    action?: 'release' | 'toggle' | 'standalone' | 'label';
    overlayId?: string;
    label?: { nl?: string; en?: string };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }
  if (!body.bankId) return NextResponse.json({ error: 'Welke bank?' }, { status: 400 });

  // Een vraag overslaan of weer meenemen. De vraag blijft in de bank staan; hem
  // eruit knippen zou de herkomst wegnemen, en dan is later niet meer na te gaan
  // dat hij er ooit was.
  if (body.action === 'toggle' && body.questionId) {
    const current = await supabase
      .from('question_banks')
      .select('excluded')
      .eq('id', body.bankId)
      .maybeSingle();
    if (!current.data) return NextResponse.json({ error: 'Deze bank bestaat niet.' }, { status: 404 });

    const excluded = new Set<string>((current.data.excluded as string[]) ?? []);
    if (excluded.has(body.questionId)) excluded.delete(body.questionId);
    else excluded.add(body.questionId);

    const saved = await supabase
      .from('question_banks')
      .update({ excluded: [...excluded] })
      .eq('id', body.bankId)
      .select('excluded')
      .maybeSingle();
    return NextResponse.json({ excluded: saved.data?.excluded ?? [] });
  }

  // Een categorie losstaand maken, of de algemene vragen weer meenemen. Naast de
  // CSV bewaard, zoals een overgeslagen vraag: terug te draaien zonder dat de bank
  // herschreven wordt.
  if (body.action === 'standalone' && body.overlayId) {
    const current = await supabase.from('question_banks').select('standalone').eq('id', body.bankId).maybeSingle();
    if (current.error) {
      return NextResponse.json({ error: 'Losstaande categorieën zijn niet op te halen. Is migratie 0010 al gedraaid?' }, { status: 502 });
    }
    if (!current.data) return NextResponse.json({ error: 'Deze bank bestaat niet.' }, { status: 404 });
    const standalone = new Set<string>((current.data.standalone as string[]) ?? []);
    if (standalone.has(body.overlayId)) standalone.delete(body.overlayId);
    else standalone.add(body.overlayId);
    const saved = await supabase.from('question_banks').update({ standalone: [...standalone].sort() }).eq('id', body.bankId);
    if (saved.error) return NextResponse.json({ error: 'Bewaren is niet gelukt.' }, { status: 502 });
    return NextResponse.json({ standalone: [...standalone].sort() });
  }

  // Een label corrigeren. Leeg in beide talen zet het terug op wat de bank zegt.
  if (body.action === 'label' && body.overlayId) {
    const current = await supabase.from('question_banks').select('overlay_labels').eq('id', body.bankId).maybeSingle();
    if (current.error) {
      return NextResponse.json({ error: 'Labels zijn niet op te halen. Is migratie 0010 al gedraaid?' }, { status: 502 });
    }
    if (!current.data) return NextResponse.json({ error: 'Deze bank bestaat niet.' }, { status: 404 });
    const labels = { ...((current.data.overlay_labels as Record<string, { nl: string; en: string }>) ?? {}) };
    const nl = body.label?.nl?.trim() ?? '';
    const en = body.label?.en?.trim() ?? '';
    if (nl === '' && en === '') delete labels[body.overlayId];
    else labels[body.overlayId] = { nl: nl || en, en: en || nl };
    const saved = await supabase.from('question_banks').update({ overlay_labels: labels }).eq('id', body.bankId);
    if (saved.error) return NextResponse.json({ error: 'Bewaren is niet gelukt.' }, { status: 502 });
    return NextResponse.json({ labels });
  }

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
  //
  // Niet `running`: daar wordt op dit moment een versie gegenereerd, en die op
  // klaar zetten legt de generatie stil zonder dat iemand het merkt. Zo stond
  // woontextiel v3 een uur op stap 13 van 19, omdat v2 werd vrijgegeven terwijl
  // v3 liep — dezelfde aanvraag, en de wachtrij pakt alleen open aanvragen op.
  await supabase
    .from('bank_requests')
    .update({ status: 'ready' })
    .eq('vertical', bank.data.vertical)
    .in('status', ['review', 'queued']);

  return NextResponse.json({ released: bank.data });
}
