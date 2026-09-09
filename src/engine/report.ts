// Aggregatie tot het scanrapport.
//
// De kop is een trechter en geen cijfer: totaal → basisgeschikt → volledig. Geen
// percentage met een grens, want zo'n grens is verzonnen en het eerste waar een
// merchant terecht over gaat discussiëren. Wel een benoemde lijst vragen die hij
// kan nakijken.
//
// Naast het catalogusbrede cijfer levert dit bestand twee fijnere niveaus: per
// categorie en per product. Een catalogusbreed getal vertelt een merchant dat er
// werk is; pas de categorie zegt wáár, en pas het product zegt wat.

import type {
  Average, CategoryReport, Dataset, Gap, ProductResult, QuestionCoverage,
  QuestionSetState, ScanReport,
} from '../domain/types';
import { evaluateProduct } from './evaluate';
import { segmentLevel } from './join';
import { FIELD_REGISTER_ID } from '../spec/snapshot';
import { SCAN_VERSION } from './version';

/** Tel gaps samen over een verzameling producten, op veld en oorzaak. */
function aggregateGaps(results: ProductResult[]): Gap[] {
  const totals = new Map<string, Gap>();
  for (const result of results) {
    for (const gap of result.gaps) {
      const id = `${gap.field}|${gap.cause}`;
      const existing = totals.get(id);
      if (existing) {
        existing.affected += 1;
        for (const question of gap.questions) {
          if (!existing.questions.includes(question)) existing.questions.push(question);
        }
      } else {
        totals.set(id, { ...gap, questions: [...gap.questions] });
      }
    }
  }
  return [...totals.values()].sort((a, b) => b.affected - a.affected);
}

/**
 * Het gemiddelde op twee schalen: in vragen én in gewichtspunten.
 *
 * Allebei, en niet één van de twee. "5,4 van de 12" is meteen te bevatten maar
 * doet alsof elke vraag even zwaar weegt; "34 van de 48" weegt de vraag die de
 * onomkeerbare fout voorkomt zwaarder dan een kleurveld, maar zegt op zichzelf
 * niet hoeveel vragen er nog open staan. Het rapport toont ze naast elkaar.
 *
 * Alleen gescoorde vragen tellen mee. Procesvragen staan in het adviesblok.
 */
function answeredStats(results: ProductResult[]) {
  const empty = { avgAnswered: 0, avgApplicable: 0, avgEarned: 0, avgWeight: 0 };
  if (results.length === 0) return empty;
  let answered = 0;
  let applicable = 0;
  let earned = 0;
  let weight = 0;
  for (const result of results) {
    const questions = result.questions.filter((q) => q.scored);
    answered += questions.filter((q) => q.answered).length;
    applicable += questions.length;
    earned += result.earned;
    weight += result.weight;
  }
  return {
    avgAnswered: answered / results.length,
    avgApplicable: applicable / results.length,
    avgEarned: earned / results.length,
    avgWeight: weight / results.length,
  };
}

/**
 * Het gemiddelde over één soort vraag: hoeveel er beantwoord zijn, van hoeveel.
 *
 * Per product en niet per vraag, want dat is de eenheid waarin een merchant
 * denkt: "mijn gordijnstoffen beantwoorden gemiddeld 2 van de 7 kritieke
 * vragen". Een percentage zou dat verhullen — 30% zegt niets over hoeveel werk
 * er nog ligt, 2 van 7 wel.
 */
function averageOver(
  results: ProductResult[],
  keep: (question: ProductResult['questions'][number]) => boolean,
): Average {
  if (results.length === 0) return { answered: 0, total: 0 };
  let answered = 0;
  let total = 0;
  for (const result of results) {
    const questions = result.questions.filter((q) => q.scored && keep(q));
    answered += questions.filter((q) => q.answered).length;
    total += questions.length;
  }
  return { answered: answered / results.length, total: total / results.length };
}

function summarise(
  setId: string,
  category: string,
  members: ProductResult[],
  subcategory?: string,
): CategoryReport {
  return {
    setId,
    category,
    subcategory,
    total: members.length,
    qualified: members.filter((m) => m.qualified).length,
    findable: members.filter((m) => m.findable).length,
    ...answeredStats(members),
    critical: averageOver(members, (q) => q.importance === 'critical'),
    general: averageOver(members, (q) => q.layer !== 'category'),
    all: averageOver(members, () => true),
    topGaps: aggregateGaps(members)
      .slice(0, 4)
      .map((g) => ({ field: g.field, label: g.label, cause: g.cause, affected: g.affected })),
  };
}

/**
 * Per categorie een rij, en per subcategorie die er is nog een.
 *
 * De subcategorierijen dragen hetzelfde `setId`: ze zijn een dóórsnede van
 * dezelfde vragenset en geen eigen meting. Zou een subcategorie zijn eigen set
 * krijgen, dan meet je je filters in plaats van je markt.
 */
function buildCategoryReports(
  results: ProductResult[],
  questionState: QuestionSetState,
): CategoryReport[] {
  const grouped = new Map<string, ProductResult[]>();
  for (const result of results) {
    if (result.unmatched || !result.setId) continue;
    const list = grouped.get(result.setId) ?? [];
    list.push(result);
    grouped.set(result.setId, list);
  }

  const out: CategoryReport[] = [];
  for (const [setId, members] of grouped) {
    const set = questionState.sets.find((s) => s.id === setId);
    const category = set?.category ?? set?.label.nl ?? setId;
    out.push(summarise(setId, category, members));

    // Alleen de subcategorieën waarover de vragenlijst iets eigens te zeggen
    // heeft. Een subcategorie die dezelfde vragen krijgt is geen tweede meting
    // maar dezelfde meting op minder producten; hem als eigen rij tonen zou een
    // onderscheid suggereren dat de lijst niet maakt. Het aggregatieniveau volgt
    // de vragen en niet de categorieboom.
    const distinguished = new Set(set?.distinguishes ?? []);
    if (distinguished.size === 0) continue;

    const subs = new Map<string, ProductResult[]>();
    for (const member of members) {
      if (!member.subcategory || !distinguished.has(member.subcategory)) continue;
      const list = subs.get(member.subcategory) ?? [];
      list.push(member);
      subs.set(member.subcategory, list);
    }
    // Eén product is geen doorsnede; zo'n rij zegt alleen iets over dat product.
    for (const [name, list] of [...subs.entries()].sort((a, b) => b[1].length - a[1].length)) {
      if (list.length < 2) continue;
      out.push(summarise(setId, category, list, name));
    }
  }

  return out.sort((a, b) =>
    a.category.localeCompare(b.category)
    || Number(a.subcategory !== undefined) - Number(b.subcategory !== undefined)
    || b.total - a.total);
}

export function runScan(
  catalog: Dataset,
  questionState: QuestionSetState,
  /** Het tijdstip komt van de aanroeper: een motor met een eigen klok geeft op
   *  dezelfde invoer twee keer een ander rapport. */
  options: { scannedAt: string },
): ScanReport {
  // Eén keer bepalen voor de hele catalogus, niet per product: het niveau is een
  // eigenschap van de boom en niet van een rij.
  const level = segmentLevel(catalog.products, questionState.sets.map((set) => set.category ?? ''));
  const products = catalog.products.map(
    (product) => evaluateProduct(product, questionState.sets, catalog, level),
  );
  const scored = products.filter((r) => !r.unmatched);

  // Per vraag: hoeveel producten die de set gebruiken, beantwoorden hem?
  const coverage = new Map<string, QuestionCoverage>();
  const advisory = new Map<string, ScanReport['advisory'][number]>();
  for (const result of scored) {
    for (const question of result.questions) {
      const id = `${result.setId}|${question.questionId}`;
      const entry = coverage.get(id) ?? {
        setId: result.setId ?? '',
        questionId: question.questionId,
        label: question.label,
        layer: question.layer,
        evidence: question.evidence,
        answered: 0,
        empty: 0,
        unusable: 0,
        incomplete: 0,
        absent: 0,
        applicable: 0,
        importance: question.importance,
        weight: question.weight,
        scored: question.scored,
      };
      entry.applicable += 1;
      // De vijf toestanden wijzen elk naar een andere handeling. Ze op één hoop
      // gooien levert een lijst op waar niemand mee verder kan.
      entry[question.state] += 1;
      coverage.set(id, entry);

      if (!question.scored && !advisory.has(id)) {
        advisory.set(id, {
          setId: result.setId ?? '',
          questionId: question.questionId,
          label: question.label,
          importance: question.importance,
        });
      }
    }
  }

  // Afstand tot volledig: hoeveel producten hebben er nog n vragen open? Alleen
  // gescoorde vragen, anders staat elk product minstens één stap van volledig af
  // door een vraag die per definitie niet uit een catalogus te beantwoorden is.
  const distance = new Map<number, number>();
  for (const result of scored) {
    const open = result.questions.filter((q) => q.scored && !q.answered).length;
    distance.set(open, (distance.get(open) ?? 0) + 1);
  }

  return {
    stamp: {
      scanVersion: SCAN_VERSION,
      fieldRegister: FIELD_REGISTER_ID,
      questionSetVersion: questionState.version,
      banks: questionState.banks,
      blindAttributes: questionState.blindAttributes,
      scannedAt: options.scannedAt,
    },
    sources: { catalog },
    productCount: products.length,
    unmatchedCount: products.filter((p) => p.unmatched).length,
    funnel: {
      total: products.length,
      qualified: scored.filter((r) => r.qualified).length,
      findable: scored.filter((r) => r.findable).length,
      ...answeredStats(scored),
    },
    distance: [...distance.entries()]
      .map(([open, count]) => ({ open, products: count }))
      .sort((a, b) => a.open - b.open),
    // Volgorde: eerst wat het zwaarst weegt, dan wat het slechtst gedekt is.
    // Alleen op dekking sorteren zet een kleurveld dat nergens ingevuld is boven
    // de vraag die de onomkeerbare fout voorkomt, en dat is precies de verkeerde
    // volgorde om aan een merchant voor te leggen.
    questionCoverage: [...coverage.values()].sort((a, b) => {
      const gap = (e: QuestionCoverage) => (e.applicable - e.answered) * e.weight;
      return gap(b) - gap(a)
        || a.answered / Math.max(a.applicable, 1) - b.answered / Math.max(b.applicable, 1);
    }),
    advisory: [...advisory.values()],
    gaps: aggregateGaps(scored),
    categories: buildCategoryReports(products, questionState),
    products,
  };
}
