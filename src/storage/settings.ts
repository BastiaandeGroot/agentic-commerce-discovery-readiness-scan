'use client';

// Wat de merchant op een vragenbank deed: koppeling, categoriekeuze, validatie.
//
// Achter een interface, zoals `BankStore` en `VerdictStore`: waar het staat is
// een andere vraag dan wat je ermee doet. Met een account staat het in Supabase,
// zodat hij op een andere laptop of over drie maanden verder kan waar hij was.
// Zonder account blijft het in de browser, en dan is het werk er de volgende
// sessie op hetzelfde apparaat nog.
//
// Alleen namen: kenmerksleutels, kolomnamen, categorienamen, vraag-id's en de
// tekst van eigen vragen. Geen productrij, geen waarde, geen prijs.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuestionWork } from '../questions/work';

export interface BankSettings {
  vertical: string;
  /** De bankversie waarop dit werk gedaan is. */
  bankVersion: string;
  mapping: Record<string, string[]>;
  categories: Record<string, string | null>;
  work?: QuestionWork;
  /** Welke koppelingen nog een voorstel van een model zijn; zie `Proposed`. */
  proposed?: Record<string, string>;
  /** Onder welke `PROPOSAL_VERSION` die voorstellen gedaan zijn. */
  proposalVersion?: string;
  /** Wanneer dit voor het laatst bewaard is; voor "de meest recente eerst". */
  updatedAt?: string;
}

export interface SettingsStore {
  /** Waar het staat, voor het scherm: in het account of alleen in deze browser. */
  readonly where: 'account' | 'browser';
  load(accountId: string, vertical: string): Promise<BankSettings | undefined>;
  /** Alles wat dit account per markt bewaarde; voor het wijzigingslog in het dashboard. */
  list(accountId: string): Promise<BankSettings[]>;
  /** `false` als bewaren mislukte; dat hoort het scherm te zeggen. */
  save(accountId: string, settings: BankSettings): Promise<boolean>;
}

const KEY = (accountId: string, vertical: string) => `acdrs.settings.${accountId}.${vertical}`;

export class LocalSettingsStore implements SettingsStore {
  readonly where = 'browser' as const;

  async load(accountId: string, vertical: string): Promise<BankSettings | undefined> {
    try {
      const raw = window.localStorage.getItem(KEY(accountId, vertical));
      return raw ? (JSON.parse(raw) as BankSettings) : undefined;
    } catch {
      // Privemodus of onleesbare inhoud: dan staat er niets bewaard.
      return undefined;
    }
  }

  async list(accountId: string): Promise<BankSettings[]> {
    const prefix = `acdrs.settings.${accountId}.`;
    const out: BankSettings[] = [];
    try {
      for (let index = 0; index < window.localStorage.length; index++) {
        const key = window.localStorage.key(index);
        if (!key || !key.startsWith(prefix)) continue;
        const raw = window.localStorage.getItem(key);
        if (raw) out.push(JSON.parse(raw) as BankSettings);
      }
    } catch {
      // Geblokkeerde opslag of onleesbare inhoud: dan staat er niets bewaard.
    }
    return out;
  }

  async save(accountId: string, settings: BankSettings): Promise<boolean> {
    try {
      window.localStorage.setItem(KEY(accountId, settings.vertical), JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }
}

export class SupabaseSettingsStore implements SettingsStore {
  readonly where = 'account' as const;

  constructor(private readonly client: SupabaseClient) {}

  async load(accountId: string, vertical: string): Promise<BankSettings | undefined> {
    const query = (columns: string) => this.client
      .from('merchant_bank_settings')
      .select(columns)
      .eq('account_id', accountId)
      .eq('vertical', vertical)
      .maybeSingle();
    // Zonder migratie 0014 bestaan de kolommen voor voorstellen niet. Dan komt
    // het eerdere werk gewoon terug, alleen zonder herkomst.
    let found = await query(`${COLUMNS}, ${PROPOSAL_COLUMNS}`);
    if (found.error) found = await query(COLUMNS);
    if (found.error || !found.data) return undefined;
    return fromRow(found.data as unknown as Row);
  }

  async list(accountId: string): Promise<BankSettings[]> {
    const { data, error } = await this.client
      .from('merchant_bank_settings')
      .select(COLUMNS)
      .eq('account_id', accountId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as Row[]).map(fromRow);
  }

  async save(accountId: string, settings: BankSettings): Promise<boolean> {
    // Overschrijven: de laatste stand telt. De sleutel is account plus markt.
    const row = {
      account_id: accountId,
      vertical: settings.vertical,
      bank_version: settings.bankVersion,
      mapping: settings.mapping,
      categories: settings.categories,
      question_work: settings.work ?? null,
      updated_at: new Date().toISOString(),
    };
    const upsert = (values: Record<string, unknown>) => this.client
      .from('merchant_bank_settings')
      .upsert(values, { onConflict: 'account_id,vertical' });
    const withProposals = await upsert({
      ...row,
      proposed: settings.proposed ?? {},
      proposal_version: settings.proposalVersion ?? null,
    });
    if (!withProposals.error) return true;
    // Zonder migratie 0014: het werk zelf hoort bewaard te blijven. Alleen de
    // herkomst van de voorstellen gaat dan niet mee.
    const without = await upsert(row);
    return !without.error;
  }
}

const COLUMNS = 'vertical, bank_version, mapping, categories, question_work, updated_at';
const PROPOSAL_COLUMNS = 'proposed, proposal_version';

interface Row {
  vertical: string;
  bank_version: string | null;
  mapping: Record<string, string[]> | null;
  categories: Record<string, string | null> | null;
  question_work: QuestionWork | null;
  proposed?: Record<string, string> | null;
  proposal_version?: string | null;
  updated_at?: string | null;
}

function fromRow(row: Row): BankSettings {
  return {
    vertical: row.vertical,
    bankVersion: row.bank_version ?? '',
    mapping: row.mapping ?? {},
    categories: row.categories ?? {},
    work: row.question_work ?? undefined,
    proposed: row.proposed ?? undefined,
    proposalVersion: row.proposal_version ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}
