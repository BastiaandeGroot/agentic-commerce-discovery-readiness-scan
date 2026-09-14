// Wat het rapport laat zien, afgeleid uit de uitkomst van de scan.
//
// Het rapportscherm rekende dit in zijn eigen componenten uit: de vragen die de
// meeste producten tegenhouden, het gemiddelde over alle categorieën, de gaten
// samengevoegd. Een pdf die hetzelfde vertelt zou dat een tweede keer moeten
// doen, en twee kopieën van dezelfde afleiding lopen uit elkaar — dan zegt het
// scherm iets anders dan het bestand dat de merchant bewaart. Daarom staat het
// hier, één keer, en gebruiken het scherm en de pdf allebei deze functies.
//
// Puur: geen DOM, geen klok. Alles komt binnen als argument.

import type { Locale, ScanReport } from '../domain/types';

type Coverage = ScanReport['questionCoverage'][number];

export interface Blocker {
  label: string;
  /** Hoeveel producten deze vraag open hebben, over alle sets heen. */
  open: number;
  /** Waarvan het veld al bestaat maar leeg staat: invulwerk. */
  empty: number;
  ids: string[];
}

/**
 * Waar begin je: de vragen die de meeste producten tegenhouden, en wat het
 * oplevert als juist die beantwoord worden.
 */
export function topBlockers(report: ScanReport, locale: Locale, limit = 2): {
  top: Blocker[];
  /** Producten die compleet worden als alleen deze vragen beantwoord zijn. */
  wouldBecome: number;
  /** De dichtstbijzijnde stand die nog niet volledig is. */
  nearest?: ScanReport['distance'][number];
} {
  const blockers = new Map<string, { label: string; open: number; empty: number; ids: Set<string> }>();
  for (const row of report.questionCoverage) {
    if (!row.scored) continue;
    const open = row.applicable - row.answered;
    if (open === 0) continue;
    // Over alle sets heen: dezelfde vraag komt in meerdere categorieën terug.
    const key = row.label[locale];
    const entry = blockers.get(key) ?? { label: key, open: 0, empty: 0, ids: new Set<string>() };
    entry.open += open;
    entry.empty += row.empty;
    entry.ids.add(row.questionId);
    blockers.set(key, entry);
  }
  const top = [...blockers.values()]
    .sort((a, b) => b.open - a.open)
    .slice(0, limit)
    .map((entry) => ({ label: entry.label, open: entry.open, empty: entry.empty, ids: [...entry.ids] }));

  // Een product wordt compleet als er daarna niets meer openstaat.
  const topIds = new Set(top.flatMap((entry) => entry.ids));
  const wouldBecome = report.products.filter((product) => {
    if (product.unmatched) return false;
    const open = product.questions.filter((q) => q.scored && !q.answered);
    return open.length > 0 && open.every((q) => topIds.has(q.questionId));
  }).length;

  return { top, wouldBecome, nearest: report.distance.find((bucket) => bucket.open > 0) };
}

export interface Average { answered: number; total: number }

export interface ScoreRow {
  /** `all` voor alle categorieën samen, anders `setId|subcategorie`. */
  key: string;
  label: string;
  /** Een subcategorie, ingesprongen onder haar categorie. */
  sub: boolean;
  total: number;
  critical: Average;
  general: Average;
  all: Average;
}

/**
 * Waar sta je per categorie: eerst alle categorieën samen, dan elke categorie.
 *
 * Samen alleen over de hoofdcategorieën, gewogen naar producten; anders tellen
 * de subcategorieën hun producten een tweede keer mee.
 */
export function scoreRows(report: ScanReport, allLabel: string): ScoreRow[] {
  const mains = report.categories.filter((row) => row.subcategory === undefined);
  const total = mains.reduce((sum, row) => sum + row.total, 0);
  const mix = (pick: (row: typeof mains[number]) => Average): Average => ({
    answered: total === 0 ? 0 : mains.reduce((sum, row) => sum + pick(row).answered * row.total, 0) / total,
    total: total === 0 ? 0 : mains.reduce((sum, row) => sum + pick(row).total * row.total, 0) / total,
  });

  return [
    {
      key: 'all',
      label: allLabel,
      sub: false,
      total,
      critical: mix((row) => row.critical),
      general: mix((row) => row.general),
      all: mix((row) => row.all),
    },
    ...report.categories.map((row) => ({
      key: `${row.setId}|${row.subcategory ?? ''}`,
      label: row.subcategory ? `${row.category} › ${row.subcategory}` : row.category,
      sub: row.subcategory !== undefined,
      total: row.total,
      critical: row.critical,
      general: row.general,
      all: row.all,
    })),
  ];
}

/**
 * De onbeantwoorde gescoorde vragen, beste eerst.
 *
 * Beste eerst: een merchant leest dan van boven naar beneden waar hij al ver is
 * en waar het werk begint, in plaats van meteen tegen het slechtste nieuws aan
 * te kijken.
 */
export function unansweredQuestions(report: ScanReport, setId = 'all'): Coverage[] {
  return report.questionCoverage
    .filter((row) => row.scored && row.answered < row.applicable)
    .filter((row) => setId === 'all' || row.setId === setId)
    .sort((a, b) => b.answered / Math.max(b.applicable, 1) - a.answered / Math.max(a.applicable, 1));
}

export type AdviceKey = 'qNextUnlinked' | 'qNextEmpty' | 'qNextAbsent' | 'qNextWeak';

/**
 * Wat een merchant nu kan doen aan deze vraag, op volgorde van goedkoopst: een
 * ontbrekende koppeling, een leeg veld, een ontbrekende kolom, een te mager veld.
 */
export function adviceKey(row: Coverage): AdviceKey {
  if ((row.evidence ?? []).some((group) => group.fields.length === 0)) return 'qNextUnlinked';
  if (row.empty >= row.absent && row.empty > 0) return 'qNextEmpty';
  if (row.absent > 0) return 'qNextAbsent';
  if (row.unusable > 0 || row.incomplete > 0) return 'qNextWeak';
  return 'qNextEmpty';
}

/** De gaten, per veld en oorzaak één keer, de meeste producten eerst. */
export function mergedGaps(report: ScanReport, limit = 25): ScanReport['gaps'] {
  const merged = new Map<string, ScanReport['gaps'][number]>();
  for (const gap of report.gaps) {
    const id = `${gap.field}|${gap.cause}`;
    const existing = merged.get(id);
    if (!existing || gap.affected > existing.affected) merged.set(id, { ...gap });
  }
  return [...merged.values()].sort((a, b) => b.affected - a.affected).slice(0, limit);
}

export interface AdvisoryItem {
  id: string;
  label: string;
  importance: string;
  categories: string[];
}

/** Buiten de score: elke vraag één keer, met de categorieën waar hij speelt. */
export function advisoryItems(report: ScanReport, locale: Locale): AdvisoryItem[] {
  const names = new Map(report.categories.map((row) => [row.setId, row.category]));
  const seen = new Map<string, { label: string; importance: string; categories: Set<string> }>();
  for (const row of report.advisory) {
    const entry = seen.get(row.questionId)
      ?? { label: row.label[locale], importance: row.importance, categories: new Set<string>() };
    entry.categories.add(names.get(row.setId) ?? row.setId);
    seen.set(row.questionId, entry);
  }
  return [...seen.entries()].map(([id, entry]) => ({
    id,
    label: entry.label,
    importance: entry.importance,
    categories: [...entry.categories],
  }));
}
