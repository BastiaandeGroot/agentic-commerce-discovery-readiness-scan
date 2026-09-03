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

import type { ScanSnapshot } from '../engine/snapshot';

export const LOCAL_ACCOUNT = 'lokaal';

export interface SnapshotStore {
  list(accountId: string): Promise<ScanSnapshot[]>;
  save(snapshot: ScanSnapshot): Promise<void>;
  remove(accountId: string, id: string): Promise<void>;
  clear(accountId: string): Promise<void>;
}

const KEY = (accountId: string) => `acdrs.snapshots.${accountId}`;

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

  async save(snapshot: ScanSnapshot): Promise<void> {
    const current = this.read(snapshot.accountId).filter((s) => s.id !== snapshot.id);
    const next = [snapshot, ...current]
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .slice(0, LOCAL_LIMIT);
    this.write(snapshot.accountId, next);
  }

  async remove(accountId: string, id: string): Promise<void> {
    this.write(accountId, this.read(accountId).filter((s) => s.id !== id));
  }

  async clear(accountId: string): Promise<void> {
    window.localStorage.removeItem(KEY(accountId));
  }
}

/** Eén gedeelde instantie; de opslag zelf heeft geen state om te delen. */
export const snapshotStore: SnapshotStore = new LocalSnapshotStore();
