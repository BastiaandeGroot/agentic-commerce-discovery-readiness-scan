// De sitetoets: beantwoordt de website van een winkel de vragen die een
// catalogus niet kan dragen?
//
// Alleen voor de beheerder, om dezelfde reden als de openbare meting: dit haalt
// andermans site op en roept een model aan, en dat hoort geen knop te zijn die
// iedereen kan indrukken.
//
// Wat naar het model gaat zijn de vragen uit de vragenbank en de tekst van
// openbare pagina's. Geen catalogus, geen productrij.

import { NextResponse } from 'next/server';
import { isAdmin } from '../../../src/server/admin';
import { CollectError } from '../../../src/server/collect';
import { SiteCheckFailed, checkSite } from '../../../src/server/siteAnswers';
import type { SiteQuestion } from '../../../src/collect/answers';

// Ophalen en het model samen duren langer dan een gewone aanroep.
export const maxDuration = 300;

const MAX_QUESTIONS = 120;

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 });
  }

  let body: { site?: unknown; questions?: unknown; categories?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }
  const site = typeof body.site === 'string' ? body.site.trim() : '';
  const questions: SiteQuestion[] = Array.isArray(body.questions)
    ? body.questions.flatMap((one): SiteQuestion[] => {
      const id = (one as { id?: unknown })?.id;
      const label = (one as { label?: unknown })?.label;
      return typeof id === 'string' && typeof label === 'string' && id !== '' && label !== ''
        ? [{ id: id.slice(0, 80), label: label.slice(0, 400) }]
        : [];
    })
    : [];
  if (site === '' || questions.length === 0 || questions.length > MAX_QUESTIONS) {
    return NextResponse.json({ error: 'Geef een webadres en de vragen mee.' }, { status: 400 });
  }

  try {
    // Alleen namen van categorieën, om te kiezen welke pagina's gelezen worden.
    // Ze gaan niet naar het model.
    const categories = Array.isArray(body.categories)
      ? body.categories.filter((one): one is string => typeof one === 'string').slice(0, 60).map((one) => one.slice(0, 80))
      : [];
    const check = await checkSite(site, questions, new Date().toISOString(), categories);
    return NextResponse.json(check);
  } catch (caught) {
    if (caught instanceof CollectError) return NextResponse.json({ error: caught.message }, { status: 422 });
    if (caught instanceof SiteCheckFailed) return NextResponse.json({ error: caught.message }, { status: 502 });
    console.error('site-answers:', caught);
    return NextResponse.json({ error: 'De sitetoets is mislukt.' }, { status: 500 });
  }
}
