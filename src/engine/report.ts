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
  CategoryReport, Dataset, Gap, ProductResult, QuestionCoverage,
  QuestionSetState, ScanReport,
} from '../domain/types';
import { evaluateProduct } from './evaluate';
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

  return [...grouped.entries()]
    .map(([setId, members]) => {
      const set = questionState.sets.find((s) => s.id === setId);
      return {
        setId,
        category: set?.category ?? set?.label.nl ?? setId,
        total: members.length,
        qualified: members.filter((m) => m.qualified).length,
        findable: members.filter((m) => m.findable).length,
        ...answeredStats(members),
        topGaps: aggregateGaps(members)
          .slice(0, 4)
          .map((g) => ({ field: g.field, label: g.label, cause: g.cause, affected: g.affected })),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function runScan(
  catalog: Dataset,
  questionState: QuestionSetState,
  /** Het tijdstip komt van de aanroeper: een motor met een eigen klok geeft op
   *  dezelfde invoer twee keer een ander rapport. */
  options: { scannedAt: string },
): ScanReport {
  const products = catalog.products.map(
    (product) => evaluateProduct(product, questionState.sets, catalog),
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
