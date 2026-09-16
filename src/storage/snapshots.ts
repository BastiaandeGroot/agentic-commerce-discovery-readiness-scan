'use client';

// Bewaarde scans.
//
// Achter een interface, want waar ze staan is een andere vraag dan wat je ermee
// doet. Vandaag is dat de browser van de merchant: dan blijft de belofte overeind
// dat zijn data zijn apparaat niet verlaat, en kan hij tóch historie opbouwen en
// twee scans naast elkaar leggen. Komt er een account, dan is dat een tweede
// implementatie van dezelfde drie methodes — niet een verbouwing van het scherm.
//
// Elke rij draagt nu al een accountId, ook al is er nog geen login. Achteraf
// toevoegen betekent een migratie op data die er al staat.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScanSnapshot, SnapshotDetail } from '../engine/snapshot';

export const LOCAL_ACCOUNT = 'lokaal';

export interface SnapshotStore {
  list(accountId: string): Promise<ScanSnapshot[]>;
  /**
   * Bewaar een analyse. Het detail is los: mislukt alleen dat, dan staat de
   * analyse er wel en gooit dit `DetailNotSaved`, zodat het scherm kan zeggen
   * dat bijwerken zonder catalogus voor deze analyse niet kan.
   */
  save(snapshot: ScanSnapshot, detail?: SnapshotDetail): Promise<void>;
  /** Het detail van één analyse, of `undefined` als het er niet is. */
  loadDetail(accountId: string, id: string): Promise<SnapshotDetail | undefined>;
  remove(accountId: string, id: string): Promise<void>;
  clear(accountId: string): Promise<void>;
}

const KEY = (accountId: string) => `acdrs.snapshots.${accountId}`;
const DETAIL_KEY = (accountId: string, id: string) => `acdrs.snapshot-detail.${accountId}.${id}`;

/** De analyse is bewaard, het detail niet. */
export class DetailNotSaved extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DetailNotSaved';
  }
}

/**
 * Van hoeveel analyses de browser het detail bewaart. Een detail is een paar
 * honderd kilobyte en de browser geeft een paar megabyte; de nieuwste tellen.
 */
export const LOCAL_DETAIL_LIMIT = 3;

/** Hoeveel scans we lokaal bewaren; daarboven valt de oudste af. */
export const LOCAL_LIMIT = 25;

export class LocalSnapshotStore implements SnapshotStore {
  private read(accountId: string): ScanSnapshot[] {
    try {
      const raw = window.localStorage.getItem(KEY(accountId));
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ScanSnapshot[]) : [];
    } catch {
      // Privémodus, geblokkeerde opslag of onleesbare inhoud: dan is er niets
      // bewaard. Dat is een lege lijst, geen fout waar de pagina op omvalt.
      return [];
    }
  }

  private write(accountId: string, snapshots: ScanSnapshot[]): void {
    window.localStorage.setItem(KEY(accountId), JSON.stringify(snapshots));
  }

  async list(accountId: string): Promise<ScanSnapshot[]> {
    // Nieuwste eerst; dat is de volgorde waarin je ernaar kijkt.
    return this.read(accountId).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async save(snapshot: ScanSnapshot, detail?: SnapshotDetail): Promise<void> {
    const current = this.read(snapshot.accountId).filter((s) => s.id !== snapshot.id);
    const next = [snapshot, ...current]
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .slice(0, LOCAL_LIMIT);
    this.write(snapshot.accountId, next);
    // Alleen de nieuwste houden een detail; de rest valt terug op de snapshot.
    for (const old of next.slice(LOCAL_DETAIL_LIMIT)) {
      window.localStorage.removeItem(DETAIL_KEY(snapshot.accountId, old.id));
    }
    if (!detail) return;
    try {
      window.localStorage.setItem(DETAIL_KEY(snapshot.accountId, snapshot.id), JSON.stringify(detail));
    } catch (caught) {
      throw new DetailNotSaved((caught as Error).message);
    }
  }

  async loadDetail(accountId: string, id: string): Promise<SnapshotDetail | undefined> {
    try {
      const raw = window.localStorage.getItem(DETAIL_KEY(accountId, id));
      return raw ? (JSON.parse(raw) as SnapshotDetail) : undefined;
    } catch {
      return undefined;
    }
  }

  async remove(accountId: string, id: string): Promise<void> {
    this.write(accountId, this.read(accountId).filter((s) => s.id !== id));
    window.localStorage.removeItem(DETAIL_KEY(accountId, id));
  }

  async clear(accountId: string): Promise<void> {
    for (const snapshot of this.read(accountId)) window.localStorage.removeItem(DETAIL_KEY(accountId, snapshot.id));
    window.localStorage.removeItem(KEY(accountId));
  }
}

/**
 * Bewaarde analyses in het account (migratie 0011).
 *
 * De snapshot gaat in zijn geheel in één kolom; de losse kolommen ernaast zijn
 * er om te kunnen sorteren en filteren zonder json uit te pakken. Row level
 * security bepaalt wie wat ziet: een vergeten where-clausule is geen datalek.
 */
export class SupabaseSnapshotStore implements SnapshotStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(accountId: string): Promise<ScanSnapshot[]> {
    const { data, error } = await this.client
      .from('scan_snapshots')
      .select('snapshot')
      .eq('account_id', accountId)
      .not('snapshot', 'is', null)
      .order('saved_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({ ...(row.snapshot as ScanSnapshot), accountId }));
  }

  async save(snapshot: ScanSnapshot, detail?: SnapshotDetail): Promise<void> {
    const { error } = await this.client.from('scan_snapshots').upsert(
      {
        account_id: snapshot.accountId,
        snapshot_key: snapshot.id,
        saved_at: snapshot.savedAt,
        label: snapshot.label,
        scan_version: snapshot.scanVersion,
        spec_snapshot: snapshot.fieldRegister,
        question_set_version: snapshot.questionSetVersion,
        catalog_name: snapshot.catalogName,
        product_count: snapshot.productCount,
        unmatched_count: snapshot.unmatchedCount,
        snapshot,
      },
      { onConflict: 'account_id,snapshot_key' },
    );
    if (error) throw new Error(error.message);
    if (!detail) return;
    // Apart, zodat de analyse er staat ook als de kolom er nog niet is (migratie 0012).
    const { error: detailError } = await this.client
      .from('scan_snapshots')
      .update({ detail })
      .eq('account_id', snapshot.accountId)
      .eq('snapshot_key', snapshot.id);
    if (detailError) throw new DetailNotSaved(detailError.message);
  }

  async loadDetail(accountId: string, id: string): Promise<SnapshotDetail | undefined> {
    const { data, error } = await this.client
      .from('scan_snapshots')
      .select('detail')
      .eq('account_id', accountId)
      .eq('snapshot_key', id)
      .maybeSingle();
    // Zonder kolom of zonder detail is dit een analyse van vóór het bijwerken: geen fout.
    if (error || !data?.detail) return undefined;
    return data.detail as SnapshotDetail;
  }

  async remove(accountId: string, id: string): Promise<void> {
    const { error } = await this.client.from('scan_snapshots').delete().eq('account_id', accountId).eq('snapshot_key', id);
    if (error) throw new Error(error.message);
  }

  async clear(accountId: string): Promise<void> {
    const { error } = await this.client.from('scan_snapshots').delete().eq('account_id', accountId);
    if (error) throw new Error(error.message);
  }
}

/** Eén gedeelde instantie; de opslag zelf heeft geen state om te delen. */
export const snapshotStore: SnapshotStore = new LocalSnapshotStore();

/**
 * Waar bewaarde analyses staan voor deze bezoeker.
 *
 * Ingelogd: in het account, zodat hij ze op elk apparaat terugziet. Anders in
 * deze browser, onder het lokale account. Het scherm zegt welke van de twee het
 * is, want dat bepaalt wat de merchant ermee kan.
 */
export function snapshotStoreFor(
  client: SupabaseClient | null | undefined,
  accountId: string | undefined,
): { store: SnapshotStore; accountId: string; where: 'account' | 'browser' } {
  if (client && accountId) return { store: new SupabaseSnapshotStore(client), accountId, where: 'account' };
  return { store: snapshotStore, accountId: LOCAL_ACCOUNT, where: 'browser' };
}
