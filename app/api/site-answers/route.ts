// De sitetoets: beantwoordt de website van een winkel de vragen die een
// catalogus niet kan dragen?
//
// Voor elke ingelogde retailer: het rapport start de toets zelf, zodat hij er
// niet om hoeft te vragen. Wie niet is ingelogd krijgt hem niet — dit haalt een
// site op en roept een model aan, en zonder account is er niets om een rem aan
// te hangen.
//
// De rem: een paar toetsen per uur per account. Het rapport hergebruikt een
// eerdere uitkomst (`reusableSiteCheck`), dus een gewone retailer komt daar niet
// aan; het houdt alleen tegen dat iemand deze route als gratis sitelezer
// gebruikt. Hij staat in het geheugen van dit proces en begint na een herstart
// opnieuw: genoeg voor één instantie, en zonder tabel.
//
// Wat naar het model gaat zijn de vragen uit de vragenbank en de tekst van
// openbare pagina's. Geen catalogus, geen productrij.

import { NextResponse } from 'next/server';
import { callerEmail, isAdmin } from '../../../src/server/admin';
import { CollectError } from '../../../src/server/collect';
import { SiteCheckFailed, checkSite } from '../../../src/server/siteAnswers';
import type { SiteQuestion } from '../../../src/collect/answers';

// Ophalen en het model samen duren langer dan een gewone aanroep.
export const maxDuration = 300;

const MAX_QUESTIONS = 120;

const PER_HOUR = 4;
const recent = new Map<string, number[]>();

/** Mag dit account nu een toets starten? Telt hem dan meteen mee. */
function mayRun(caller: string, now: number): boolean {
  const kept = (recent.get(caller) ?? []).filter((at) => now - at < 60 * 60 * 1000);
  if (kept.length >= PER_HOUR) {
    recent.set(caller, kept);
    return false;
  }
  recent.set(caller, [...kept, now]);
  return true;
}

export async function POST(request: Request) {
  const caller = await callerEmail(request);
  if (!caller) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!(await isAdmin(request)) && !mayRun(caller, Date.now())) {
    return NextResponse.json({ error: 'too-many' }, { status: 429 });
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
