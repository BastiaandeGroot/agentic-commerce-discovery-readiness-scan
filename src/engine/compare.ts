// Twee scans naast elkaar.
//
// De vraag die een merchant stelt is niet "wat staat er nu" maar "is het beter
// geworden". Dat is alleen te beantwoorden als de meetlat gelijk bleef, en dat
// is precies wat hier bewaakt wordt: veranderde de scanversie, het veldenregister
// of de vragenbank, dan kan een verschil ook uit de definitie komen in plaats van
// uit de data. Dan zeggen we dat hardop in plaats van een pijltje omhoog te tonen.

import type { ScanSnapshot, SnapshotGap } from './snapshot';

export interface Delta {
  before: number;
  after: number;
  /** after - before. Positief is meer, niet per se beter. */
  change: number;
}

export interface CategoryDelta {
  setId: string;
  category: string;
  /** Ontbreekt de categorie in een van beide scans, dan zegt dat ook iets. */
  presence: 'both' | 'only-before' | 'only-after';
  total: Delta;
  qualified: Delta;
  findable: Delta;
  avgAnswered: Delta;
}

export interface GapDelta {
  field: string;
  label: SnapshotGap['label'];
  cause: SnapshotGap['cause'];
  affected: Delta;
  status: 'resolved' | 'new' | 'changed' | 'unchanged';
}

export interface Comparison {
  before: ScanSnapshot;
  after: ScanSnapshot;
  /**
   * De meetlat verschoof. Zolang dit waar is, is elk verschil hieronder
   * mogelijk een definitiewijziging en geen vooruitgang.
   */
  scaleChanged: {
    scanVersion: boolean;
    fieldRegister: boolean;
    questionSet: boolean;
    /** Een bank die vernieuwde of erbij kwam verschuift de lat net zo hard. */
    bank: boolean;
  };
  comparable: boolean;
  qualified: Delta;
  findable: Delta;
  avgAnswered: Delta;
  avgEarned: Delta;
  unmatched: Delta;
  categories: CategoryDelta[];
  gaps: GapDelta[];
}

function delta(before: number, after: number): Delta {
  return { before, after, change: after - before };
}

/** Dezelfde banken, in dezelfde versies? Volgorde doet er niet toe. */
function sameBanks(before: ScanSnapshot, after: ScanSnapshot): boolean {
  const stamp = (snapshot: ScanSnapshot) => (snapshot.banks ?? [])
    .map((bank) => `${bank.id}@${bank.version}`)
    .sort()
    .join(',');
  return stamp(before) === stamp(after);
}

export function compareSnapshots(before: ScanSnapshot, after: ScanSnapshot): Comparison {
  const setIds = [...new Set([
    ...before.categories.map((c) => c.setId),
    ...after.categories.map((c) => c.setId),
  ])];
  const categories: CategoryDelta[] = setIds.map((setId) => {
    const oud = before.categories.find((c) => c.setId === setId);
    const nieuw = after.categories.find((c) => c.setId === setId);
    return {
      setId,
      category: nieuw?.category ?? oud?.category ?? setId,
      presence: (oud && nieuw ? 'both' : nieuw ? 'only-after' : 'only-before') as CategoryDelta['presence'],
      total: delta(oud?.total ?? 0, nieuw?.total ?? 0),
      qualified: delta(oud?.qualified ?? 0, nieuw?.qualified ?? 0),
      findable: delta(oud?.findable ?? 0, nieuw?.findable ?? 0),
      avgAnswered: delta(oud?.avgAnswered ?? 0, nieuw?.avgAnswered ?? 0),
    };
  }).sort((x, y) => y.total.after - x.total.after);

  // Gaten koppelen op veld én oorzaak: hetzelfde veld dat van invulwerk naar
  // modelwerk gaat is een ander probleem geworden, geen kleiner probleem.
  const key = (gap: SnapshotGap) => `${gap.field}|${gap.cause}`;
  const keys = [...new Set([...before.gaps.map(key), ...after.gaps.map(key)])];
  const gaps: GapDelta[] = keys.map((id) => {
    const oud = before.gaps.find((g) => key(g) === id);
    const nieuw = after.gaps.find((g) => key(g) === id);
    const bron = nieuw ?? oud!;
    const affected = delta(oud?.affected ?? 0, nieuw?.affected ?? 0);
    const status: GapDelta['status'] =
      affected.after === 0 ? 'resolved'
      : affected.before === 0 ? 'new'
      : affected.change === 0 ? 'unchanged'
      : 'changed';
    return { field: bron.field, label: bron.label, cause: bron.cause, affected, status };
  }).sort((x, y) => Math.abs(y.affected.change) - Math.abs(x.affected.change));

  const scaleChanged = {
    scanVersion: before.scanVersion !== after.scanVersion,
    fieldRegister: before.fieldRegister !== after.fieldRegister,
    questionSet: before.questionSetVersion !== after.questionSetVersion,
    bank: !sameBanks(before, after),
  };

  return {
    before,
    after,
    scaleChanged,
    comparable: !scaleChanged.scanVersion && !scaleChanged.fieldRegister
      && !scaleChanged.questionSet && !scaleChanged.bank,
    qualified: delta(before.qualified, after.qualified),
    findable: delta(before.findable, after.findable),
    avgAnswered: delta(before.avgAnswered, after.avgAnswered),
    avgEarned: delta(before.avgEarned, after.avgEarned),
    unmatched: delta(before.unmatchedCount, after.unmatchedCount),
    categories,
    gaps,
  };
}
