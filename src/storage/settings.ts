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
    const { data, error } = await this.client
      .from('merchant_bank_settings')
      .select('vertical, bank_version, mapping, categories, question_work')
      .eq('account_id', accountId)
      .eq('vertical', vertical)
      .maybeSingle();
    if (error || !data) return undefined;
    return {
      vertical: data.vertical as string,
      bankVersion: (data.bank_version as string | null) ?? '',
      mapping: (data.mapping as Record<string, string[]> | null) ?? {},
      categories: (data.categories as Record<string, string | null> | null) ?? {},
      work: (data.question_work as QuestionWork | null) ?? undefined,
    };
  }

  async list(accountId: string): Promise<BankSettings[]> {
    const { data, error } = await this.client
      .from('merchant_bank_settings')
      .select('vertical, bank_version, mapping, categories, question_work')
      .eq('account_id', accountId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      vertical: row.vertical as string,
      bankVersion: (row.bank_version as string | null) ?? '',
      mapping: (row.mapping as Record<string, string[]> | null) ?? {},
      categories: (row.categories as Record<string, string | null> | null) ?? {},
      work: (row.question_work as QuestionWork | null) ?? undefined,
    }));
  }

  async save(accountId: string, settings: BankSettings): Promise<boolean> {
    // Overschrijven: de laatste stand telt. De sleutel is account plus markt.
    const { error } = await this.client.from('merchant_bank_settings').upsert(
      {
        account_id: accountId,
        vertical: settings.vertical,
        bank_version: settings.bankVersion,
        mapping: settings.mapping,
        categories: settings.categories,
        question_work: settings.work ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,vertical' },
    );
    return !error;
  }
}
