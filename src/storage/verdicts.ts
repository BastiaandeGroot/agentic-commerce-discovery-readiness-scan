'use client';

// Wat de merchant besliste over zijn eigen categorieboom, bewaard.
//
// Achter een interface, om dezelfde reden als bij `SnapshotStore` en `BankStore`:
// waar het staat is een andere vraag dan wat je ermee doet. Zonder account is er
// niets om aan te hangen, en dan valt hij terug op niets bewaren — de scan werkt
// nog, alleen begint hij de volgende keer opnieuw.
//
// Waarom bewaren überhaupt: het voorstel dat een model doet is niet elke keer
// hetzelfde. Op de echte catalogus wisselden 8 van de 54 paden tussen drie
// identieke aanroepen. Zou de merchant elke scan opnieuw beslissen, dan kunnen
// twee rapporten op verschillende definities rusten en lijkt er vooruitgang die
// er niet is.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PathKind, Verdicts } from '../intake/facets';

export interface StoredVerdict {
  pathKey: string;
  segments: string[];
  kind: PathKind;
}

export interface VerdictStore {
  list(accountId: string): Promise<Verdicts>;
  save(accountId: string, verdict: StoredVerdict): Promise<void>;
}

/** Niets bewaren, en dat zichtbaar: zonder account of dienst is dit de terugval. */
export class NoVerdictStore implements VerdictStore {
  async list(): Promise<Verdicts> { return {}; }
  async save(): Promise<void> { /* bewust leeg */ }
}

export class SupabaseVerdictStore implements VerdictStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(accountId: string): Promise<Verdicts> {
    const { data } = await this.client
      .from('category_verdicts')
      .select('path_key, kind')
      .eq('account_id', accountId);
    const out: Verdicts = {};
    for (const row of data ?? []) out[row.path_key as string] = row.kind as PathKind;
    return out;
  }

  async save(accountId: string, verdict: StoredVerdict): Promise<void> {
    // Overschrijven en niet toevoegen: hij mag van gedachten veranderen, en dan
    // telt zijn laatste woord. De sleutel is account plus pad.
    await this.client.from('category_verdicts').upsert(
      {
        account_id: accountId,
        path_key: verdict.pathKey,
        segments: verdict.segments,
        kind: verdict.kind,
        decided_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,path_key' },
    );
  }
}
