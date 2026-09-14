// Kenmerktypen: een bank laten typeren, een type bijstellen, de tabel bevestigen.
//
// De enige plek waar de typeerstap met een model praat. Wat het model krijgt en
// hoe het antwoord gelezen wordt staat puur in `src/generation/attributes.ts`;
// hier alleen de aanroep, het bewaren en de controle wie er belt.
//
// Alleen voor de beheerder, en eerst het token nagekeken voordat de
// servicesleutel wordt gebruikt — dezelfde volgorde als `/api/admin/queue`.

import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../src/server/admin';
import { isRefusal, serviceClient } from '../../../../src/server/executor';
import { estimateCents, makeAsk, PhaseFailure } from '../../../../src/server/generator';
import { importQuestionList } from '../../../../src/questions/list';
import {
  cleanShape,
  isShapeKind,
  readTyping,
  TYPING_VERSION,
  typingBatches,
  typingInputs,
  typingTask,
  type StoredTyping,
} from '../../../../src/generation/attributes';

interface Body {
  bankId?: string;
  action?: 'type' | 'set' | 'confirm';
  key?: string;
  kind?: string;
  unit?: string;
  values?: string[];
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Geen beheerder.' }, { status: 403 });
  }
  const supabase = serviceClient();
  if (isRefusal(supabase)) {
    return NextResponse.json({ error: supabase.error }, { status: supabase.status });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }
  if (!body.bankId) return NextResponse.json({ error: 'Welke bank?' }, { status: 400 });

  const found = await supabase
    .from('question_banks')
    .select('id, vertical, csv, attribute_types')
    .eq('id', body.bankId)
    .maybeSingle();
  if (found.error) {
    // De kolom bestaat pas na migratie 0009. Zonder die melding lijkt dit een
    // storing, terwijl het een stap is die nog gezet moet worden.
    return NextResponse.json(
      {
        error: 'De database heeft nog geen plek voor kenmerktypen: migratie 0009 is nog niet gedraaid.',
        next: 'Open de SQL-editor van Supabase, voer supabase/migrations/0009_kenmerktypen.sql uit en druk daarna opnieuw op typeren.',
      },
      { status: 502 },
    );
  }
  if (!found.data) return NextResponse.json({ error: 'Deze bank bestaat niet.' }, { status: 404 });

  const current = found.data.attribute_types as StoredTyping | null;

  const save = async (typing: StoredTyping) => {
    const saved = await supabase
      .from('question_banks')
      .update({ attribute_types: typing })
      .eq('id', body.bankId as string);
    if (saved.error) return NextResponse.json({ error: 'Bewaren is niet gelukt.' }, { status: 502 });
    return NextResponse.json({ typing });
  };

  // Eén type bijstellen. Terug op review: de tabel die bevestigd was, is het niet
  // meer, en een merchant hoort niet op een half nagelopen tabel te koppelen.
  if (body.action === 'set') {
    if (!current) return NextResponse.json({ error: 'Deze bank is nog niet getypeerd.' }, { status: 409 });
    if (!body.key || !isShapeKind(body.kind)) {
      return NextResponse.json({ error: 'Welk kenmerk en welke vorm?' }, { status: 400 });
    }
    const errors: string[] = [];
    const shape = cleanShape(body.kind, body.unit, body.values, errors, body.key);
    if (errors.length > 0) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    return save({
      ...current,
      status: 'review',
      confirmedAt: undefined,
      shapes: { ...current.shapes, [body.key]: shape },
    });
  }

  if (body.action === 'confirm') {
    if (!current) return NextResponse.json({ error: 'Deze bank is nog niet getypeerd.' }, { status: 409 });
    return save({ ...current, status: 'confirmed', confirmedAt: new Date().toISOString() });
  }

  // Typeren.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Er staat geen API-sleutel op de server.' }, { status: 503 });
  }
  const read = importQuestionList([{ name: `${found.data.vertical}.csv`, text: String(found.data.csv ?? '') }]);
  if (!read.bank) return NextResponse.json({ error: 'Deze bank is niet in te lezen.' }, { status: 422 });

  const inputs = typingInputs(read.bank);
  const ask = makeAsk();
  const usage = { input: 0, output: 0, cached: 0 };
  const shapes: StoredTyping['shapes'] = {};
  const errors: string[] = [];

  // Tegelijk: de blokken hangen niet van elkaar af, en na elkaar zou een markt
  // als woontextiel een beheerder tien minuten naar een draaiende knop laten
  // kijken.
  const results = await Promise.all(typingBatches(inputs).map(async (batch, index) => {
    try {
      const reply = await ask(typingTask(batch, found.data!.vertical as string, index));
      return { batch, reply };
    } catch (caught) {
      return { batch, failure: caught };
    }
  }));

  for (const result of results) {
    if ('reply' in result && result.reply) {
      usage.input += result.reply.usage.input;
      usage.output += result.reply.usage.output;
      usage.cached += result.reply.usage.cached;
      const typed = readTyping(result.reply.json, result.batch.map((input) => input.key));
      Object.assign(shapes, typed.shapes);
      errors.push(...typed.errors);
    } else {
      const failure = (result as { failure: unknown }).failure;
      if (failure instanceof PhaseFailure) {
        usage.input += failure.usage.input;
        usage.output += failure.usage.output;
      }
      errors.push(`Een blok van ${result.batch.length} kenmerken mislukte: ${failure instanceof Error ? failure.message : 'onbekende fout'}.`);
    }
  }

  if (Object.keys(shapes).length === 0) {
    return NextResponse.json({ error: errors[0] ?? 'Het model gaf geen enkel type terug.' }, { status: 502 });
  }

  return save({
    version: TYPING_VERSION,
    status: 'review',
    typedAt: new Date().toISOString(),
    attributes: inputs.length,
    shapes,
    errors,
    cents: estimateCents('reader', usage),
  });
}
