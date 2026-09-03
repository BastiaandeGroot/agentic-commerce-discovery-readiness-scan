// Twee scans naast elkaar.
//
// De vraag die een merchant stelt is niet "wat staat er nu" maar "is het beter
// geworden". Dat is alleen te beantwoorden als de meetlat gelijk bleef, en dat
// is precies wat hier bewaakt wordt: veranderde de scanversie, de spec of de
// vragenset, dan kan een verschil ook uit de definitie komen in plaats van uit
// de data. Dan zeggen we dat hardop in plaats van een pijltje omhoog te tonen.

import type { Protocol } from '../domain/types';
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

export interface ProtocolComparison {
  findable: Delta;
  competitive: Delta;
  avgAnswered: Delta;
  unmatched: Delta;
  categories: CategoryDelta[];
  gaps: GapDelta[];
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
    specSnapshot: boolean;
    questionSet: boolean;
  };
  comparable: boolean;
  protocols: Record<Protocol, ProtocolComparison>;
}

function delta(before: number, after: number): Delta {
  return { before, after, change: after - before };
}

function compareProtocol(
  before: ScanSnapshot,
  after: ScanSnapshot,
  protocol: Protocol,
): ProtocolComparison {
  const a = before.protocols[protocol];
  const b = after.protocols[protocol];

  const setIds = [...new Set([...a.categories.map((c) => c.setId), ...b.categories.map((c) => c.setId)])];
  const categories: CategoryDelta[] = setIds.map((setId) => {
    const oud = a.categories.find((c) => c.setId === setId);
    const nieuw = b.categories.find((c) => c.setId === setId);
    return {
      setId,
      category: nieuw?.category ?? oud?.category ?? setId,
      presence: (oud && nieuw ? 'both' : nieuw ? 'only-after' : 'only-before') as CategoryDelta['presence'],
      total: delta(oud?.total ?? 0, nieuw?.total ?? 0),
      findable: delta(oud?.findable ?? 0, nieuw?.findable ?? 0),
      avgAnswered: delta(oud?.avgAnswered ?? 0, nieuw?.avgAnswered ?? 0),
    };
  }).sort((x, y) => y.total.after - x.total.after);

  // Gaten koppelen op veld én oorzaak: hetzelfde veld dat van mappinggat naar
  // verrijkingsgat gaat is een ander probleem geworden, geen kleiner probleem.
  const key = (gap: SnapshotGap) => `${gap.field}|${gap.cause}`;
  const keys = [...new Set([...a.gaps.map(key), ...b.gaps.map(key)])];
  const gaps: GapDelta[] = keys.map((id) => {
    const oud = a.gaps.find((g) => key(g) === id);
    const nieuw = b.gaps.find((g) => key(g) === id);
    const bron = nieuw ?? oud!;
    const affected = delta(oud?.affected ?? 0, nieuw?.affected ?? 0);
    const status: GapDelta['status'] =
      affected.after === 0 ? 'resolved'
      : affected.before === 0 ? 'new'
      : affected.change === 0 ? 'unchanged'
      : 'changed';
    return { field: bron.field, label: bron.label, cause: bron.cause, affected, status };
  }).sort((x, y) => Math.abs(y.affected.change) - Math.abs(x.affected.change));

  return {
    findable: delta(a.findable, b.findable),
    competitive: delta(a.competitive, b.competitive),
    avgAnswered: delta(a.avgAnswered, b.avgAnswered),
    unmatched: delta(before.unmatchedCount, after.unmatchedCount),
    categories,
    gaps,
  };
}

export function compareSnapshots(before: ScanSnapshot, after: ScanSnapshot): Comparison {
  const scaleChanged = {
    scanVersion: before.scanVersion !== after.scanVersion,
    specSnapshot: before.specSnapshot !== after.specSnapshot,
    questionSet: before.questionSetVersion !== after.questionSetVersion,
  };

  return {
    before,
    after,
    scaleChanged,
    comparable: !scaleChanged.scanVersion && !scaleChanged.specSnapshot && !scaleChanged.questionSet,
    protocols: {
      acp: compareProtocol(before, after, 'acp'),
      ucp: compareProtocol(before, after, 'ucp'),
    },
  };
}
