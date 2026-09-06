'use client';

// Ingelezen vragenbanken.
//
// Achter een interface, om dezelfde reden als bij `SnapshotStore`: waar ze staan
// is een andere vraag dan wat je ermee doet. Vandaag is dat de browser, zodat een
// merchant een onderzochte bank één keer inleest en hem daarna houdt. Komt er een
// account met een echte wachtrij — een agent die een aanvraag oppakt en de bank
// terugstuurt — dan is dat een tweede implementatie van deze vier methodes en
// geen verbouwing van het scherm.
//
// Elke rij draagt nu al een accountId, ook al is er nog geen login. Achteraf
// toevoegen betekent een migratie op data die er al staat.

import type { QuestionBank } from '../questions/bank';

export const LOCAL_ACCOUNT = 'lokaal';

/** Een bank zoals hij bewaard is, met wanneer en waarvandaan. */
export interface StoredBank {
  accountId: string;
  savedAt: string;
  /** Bestandsnaam of bron, zodat herkomst navolgbaar blijft. */
  source: string;
  bank: QuestionBank;
}

export interface BankStore {
  list(accountId: string): Promise<StoredBank[]>;
  save(entry: StoredBank): Promise<void>;
  remove(accountId: string, vertical: string): Promise<void>;
  clear(accountId: string): Promise<void>;
}

const KEY = (accountId: string) => `acdrs.banks.${accountId}`;

export class LocalBankStore implements BankStore {
  private read(accountId: string): StoredBank[] {
    try {
      const raw = window.localStorage.getItem(KEY(accountId));
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredBank[]) : [];
    } catch {
      // Privemodus, geblokkeerde opslag of onleesbare inhoud: dan staat er niets
      // bewaard. Dat is een lege lijst, geen fout waar de pagina op omvalt.
      return [];
    }
  }

  private write(accountId: string, banks: StoredBank[]): void {
    window.localStorage.setItem(KEY(accountId), JSON.stringify(banks));
  }

  async list(accountId: string): Promise<StoredBank[]> {
    return this.read(accountId).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async save(entry: StoredBank): Promise<void> {
    // Eén bank per vertical: een tweede versie vervangt de eerste in plaats van
    // ernaast te gaan staan. Twee banken voor dezelfde markt zouden betekenen dat
    // de volgorde bepaalt waarlangs er gemeten wordt, en dat is geen meetlat.
    const current = this.read(entry.accountId)
      .filter((stored) => stored.bank.meta.vertical !== entry.bank.meta.vertical);
    this.write(entry.accountId, [entry, ...current]);
  }

  async remove(accountId: string, vertical: string): Promise<void> {
    this.write(accountId, this.read(accountId).filter((s) => s.bank.meta.vertical !== vertical));
  }

  async clear(accountId: string): Promise<void> {
    window.localStorage.removeItem(KEY(accountId));
  }
}

/** Eén gedeelde instantie; de opslag zelf heeft geen state om te delen. */
export const bankStore: BankStore = new LocalBankStore();
