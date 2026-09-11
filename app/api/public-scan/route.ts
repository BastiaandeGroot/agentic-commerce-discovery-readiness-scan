// De openbare meting van één winkel, op één vragenbank.
//
// Wat een agent van deze winkel kan zien, gemeten tegen de vragen die kopers in
// zijn markt stellen. Geen upload, geen toestemming, alleen wat hij publiceert —
// en juist dat maakt hem bruikbaar als opening van een gesprek dat er nog niet
// is.
//
// Alleen voor de beheerder. Dit haalt andermans site op, en dat hoort geen knop
// te zijn die het hele internet kan indrukken.

import { NextResponse } from 'next/server';
import { isAdmin } from '../../../src/server/admin';
import { isRefusal, serviceClient } from '../../../src/server/executor';
import { collectShop, CollectError, DEFAULTS } from '../../../src/server/collect';
import { importQuestionList } from '../../../src/questions/list';
import { ingest } from '../../../src/intake/index';
import { generateQuestionSets } from '../../../src/questions/generate';
import { runScan } from '../../../src/engine/report';
import { excludeFromScore, type QuestionBank } from '../../../src/questions/bank';

/**
 * Dezelfde vraag over alle vragensets heen optellen.
 *
 * `questionCoverage` telt per vragenset, dus een algemene vraag komt net zo vaak
 * terug als er categorieën zijn. In een rapport is dat verwarrend — dezelfde
 * vraag vier keer onder elkaar, met vier verschillende noemers — en in het
 * scherm gaf het bovendien twee elementen met dezelfde sleutel.
 *
 * Voor een merchant is er één vraag: "kan mijn data hem beantwoorden, en op
 * hoeveel van mijn producten". Dat is de som.
 */
function mergeQuestions(coverage: ReturnType<typeof runScan>['questionCoverage']) {
  const merged = new Map<string, {
    id: string;
    label: { nl: string; en: string };
    importance: string;
    answered: number;
    applicable: number;
    evidence: { nl: string; en: string }[];
  }>();

  for (const one of coverage) {
    const existing = merged.get(one.questionId);
    if (existing) {
      existing.answered += one.answered;
      existing.applicable += one.applicable;
      continue;
    }
    merged.set(one.questionId, {
      id: one.questionId,
      label: one.label,
      importance: one.importance,
      answered: one.answered,
      applicable: one.applicable,
      evidence: (one.evidence ?? []).map((entry) => entry.label),
    });
  }
  return [...merged.values()];
}

/**
 * Van een veldsleutel naar wat er op de pagina stond.
 *
 * Een vinkje zonder herkomst is een oordeel dat de merchant moet geloven. Met de
 * kolom én de waarde erbij kan hij het nakijken op zijn eigen productpagina, en
 * dan is het geen bewering meer maar een waarneming.
 *
 * De motor werkt in canonieke sleutels (`material`) of in patronen (`attr:...`);
 * de winkel publiceert onder zijn eigen naam. Deze functie legt die twee op
 * elkaar via de kolomherkenning die de intake al deed.
 */
function foundIn(
  keys: string[],
  row: Record<string, string> | undefined,
  columnOf: Map<string, string>,
  columns: string[],
): { field: string; value: string }[] {
  if (!row) return [];
  const out: { field: string; value: string }[] = [];

  for (const key of keys) {
    const column = key.startsWith('attr:')
      ? columns.find((one) => new RegExp(key.slice(5), 'i').test(one))
      : columnOf.get(key) ?? (key in row ? key : undefined);
    if (!column) continue;

    const value = row[column];
    if (!value) continue;
    if (out.some((entry) => entry.field === column)) continue;

    // Ingekort: een omschrijving van tweehonderd woorden hoort niet in een
    // regel die laat zien wáár het antwoord vandaan komt.
    out.push({ field: column, value: value.length > 120 ? `${value.slice(0, 120)}…` : value });
  }
  return out;
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Geen beheerder.' }, { status: 403 });
  }

  let body: { url?: string; bankId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Onleesbaar verzoek.' }, { status: 400 });
  }
  if (!body.url) return NextResponse.json({ error: 'Welk webadres?' }, { status: 400 });

  // De bank is optioneel: zonder valt de scan terug op de meegeleverde
  // voorlopige banken, net als in de app. Dat is bruikbaar om te kijken, maar
  // het rapport zegt er dan bij dat er niet op de markt gemeten is.
  let banks: QuestionBank[] = [];
  let bankLabel: string | undefined;

  if (body.bankId) {
    const supabase = serviceClient();
    if (isRefusal(supabase)) {
      return NextResponse.json({ error: supabase.error }, { status: supabase.status });
    }
    const found = await supabase
      .from('question_banks')
      .select('vertical, version, csv, excluded')
      .eq('id', body.bankId)
      .maybeSingle();

    if (!found.data) return NextResponse.json({ error: 'Die vragenbank bestaat niet.' }, { status: 404 });

    const read = importQuestionList([
      { name: `${found.data.vertical}.csv`, text: String(found.data.csv ?? '') },
    ]);
    if (!read.bank) {
      return NextResponse.json({ error: 'Deze vragenbank is niet in te lezen.' }, { status: 422 });
    }
    // Wat de beheerder oversloeg telt hier net zomin mee als bij de merchant:
    // het rapport dat een winkeleigenaar krijgt hoort op dezelfde lat te staan.
    banks = [excludeFromScore(read.bank, (found.data.excluded as string[] | null) ?? [])];
    bankLabel = `${found.data.vertical} v${found.data.version}`;
  }

  try {
    const collected = await collectShop(body.url, DEFAULTS);

    if (collected.rows.length === 0) {
      // Dit is geen storing maar een uitkomst, en een harde: er staat geen
      // gestructureerde productdata op de pagina's. Dan kan een agent er ook
      // niets uit halen.
      return NextResponse.json({
        origin: collected.origin,
        empty: true,
        candidates: collected.candidates,
        requests: collected.requests,
        blockedBots: collected.blockedBots,
        notes: collected.notes,
      });
    }

    const catalog = ingest('openbaar.json', JSON.stringify(collected.rows));
    const questions = generateQuestionSets(catalog, banks);
    const report = runScan(catalog, questions, { scannedAt: new Date().toISOString() });

    // Canonieke sleutel → de kolomnaam waaronder deze winkel hem publiceert.
    const columnOf = new Map<string, string>();
    for (const [column, key] of Object.entries(catalog.mapping)) {
      if (!columnOf.has(key)) columnOf.set(key, column);
    }

    const attributes = new Set<string>();
    for (const row of collected.rows) for (const key of Object.keys(row)) attributes.add(key);

    return NextResponse.json({
      origin: collected.origin,
      scannedAt: report.stamp.scannedAt,
      bank: bankLabel,
      sample: collected.rows.length,
      candidates: collected.candidates,
      requests: collected.requests,
      blockedBots: collected.blockedBots,
      notes: collected.notes,
      attributes: [...attributes].filter((key) => key !== 'url'),
      // Welke pagina's er werkelijk bekeken zijn, met per pagina de vragen die
      // eroverheen gingen. Zonder deze lijst is de steekproef een bewering; met
      // de lijst kan iemand hem zelf nalopen — en dat is precies wat dit rapport
      // van een mening onderscheidt.
      //
      // Per pagina en niet alleen als totaal, want een merchant herkent zijn
      // eigen product. "Gemiddeld 2,9 van de 14" is statistiek; "op deze stof
      // kan een agent niet zien of hij tegen een hond kan" is zijn winkel.
      // Op volgorde teruggekoppeld aan de opgehaalde rij: `product.key` is de
      // sku en niet het adres, en de motor houdt de volgorde van de invoer aan.
      pages: report.products.map((product, index) => ({
        url: collected.rows[index]?.url ?? '',
        titel: product.title ?? '',
        categorie: product.category ?? '',
        answered: product.questions.filter((one) => one.scored && one.answered).length,
        applicable: product.questions.filter((one) => one.scored).length,
        questions: product.questions
          .filter((one) => one.scored)
          .map((one) => ({
            id: one.questionId,
            label: one.label,
            answered: one.answered,
            importance: one.importance,
            found: one.answered
              ? foundIn(one.found, collected.rows[index], columnOf, catalog.columns)
              : [],
          })),
      })),
      categories: report.categories
        .filter((one) => one.subcategory === undefined)
        .map((one) => ({ name: one.category, products: one.total })),
      funnel: report.funnel,
      // Per vraag: kan de winkel hem beantwoorden uit wat hij publiceert. Dat is
      // wat een merchant wil zien — een lijst velden zegt hem niets, een lijst
      // vragen die onbeantwoord blijft wel.
      questions: mergeQuestions(report.questionCoverage.filter((one) => one.scored)),
    });
  } catch (caught) {
    if (caught instanceof CollectError) {
      return NextResponse.json({ error: caught.message }, { status: 422 });
    }
    console.error('public-scan', caught);
    return NextResponse.json({ error: 'De meting is niet gelukt.' }, { status: 502 });
  }
}
