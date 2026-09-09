// Een vragenbank aannemen, controleren en bewaren.
//
// Dit stond in `/api/bank-result` en staat nu apart, omdat er sinds de generator
// twee wegen naar binnen lopen: een uitvoerder die hem aanlevert, en de pijplijn
// in deze app die hem zelf maakt. Beide gaan door dezelfde poorten.
//
// Dat is geen netheid maar de kern van de afspraak: **de app gelooft de maker
// niet op zijn woord**, en dat geldt sinds vandaag ook als de maker de app zelf
// is. Sterker nog: juist dan. Een uitvoerder die iets verzint is een mens die je
// kunt aanspreken; een pijplijn die iets verzint doet het elke markt opnieuw.

import type { SupabaseClient } from '@supabase/supabase-js';
import { importQuestionList } from '../questions/list';

export interface PanelSite {
  name: string;
  url: string;
  type?: string;
  consultedAt?: string;
  reason?: string;
}

export interface GroupingEntry {
  category: string;
  count: number;
  kind: string;
  parent?: string;
  reason?: string;
}

export interface Delivery {
  requestId: string;
  csv: string;
  panel?: PanelSite[];
  grouping?: GroupingEntry[];
  findings?: string[];
}

export type DeliveryResult =
  | { ok: false; status: number; error: string; errors?: string[] }
  | {
      ok: true;
      bank: { id: string; version: number; status: string };
      questions: number;
      overlays: number;
      findings: string[];
    };

/** Ruim genoeg voor een bank van een paar honderd vragen. */
export const MAX_CSV = 2_000_000;

export async function deliverBank(supabase: SupabaseClient, delivery: Delivery): Promise<DeliveryResult> {
  if (typeof delivery.requestId !== 'string' || typeof delivery.csv !== 'string') {
    return { ok: false, status: 400, error: 'Verwacht een requestId en een csv.' };
  }
  if (delivery.csv.length > MAX_CSV) {
    return { ok: false, status: 413, error: 'De vragenlijst is te groot.' };
  }

  const found = await supabase
    .from('bank_requests')
    .select('id, vertical, status')
    .eq('id', delivery.requestId)
    .maybeSingle();

  if (!found.data) {
    return { ok: false, status: 404, error: 'Deze aanvraag bestaat niet.' };
  }

  // Dezelfde lezer als de merchant gebruikt, en niet een soepelere variant. Wat
  // hier doorkomt, komt straks ook door zijn scherm.
  const read = importQuestionList([{ name: `${found.data.vertical}.csv`, text: delivery.csv }]);

  if (read.errors.length > 0 || !read.bank) {
    await supabase
      .from('bank_requests')
      .update({
        status: 'failed',
        failure: read.errors.join(' ') || 'De lijst bevat geen bruikbare vragen.',
      })
      .eq('id', delivery.requestId);
    return { ok: false, status: 422, error: 'De lijst is niet in te lezen.', errors: read.errors };
  }

  // De bevindingen: wat de lezer opmerkte plus wat de maker zelf markeerde.
  const findings = [
    ...read.warnings,
    ...(Array.isArray(delivery.findings) ? delivery.findings.filter((one) => typeof one === 'string') : []),
  ].slice(0, 200);

  const panel = Array.isArray(delivery.panel) ? delivery.panel.slice(0, 20) : [];
  const grouping = Array.isArray(delivery.grouping) ? delivery.grouping.slice(0, 300) : [];

  // Oplopend per markt. Een bevroren bank verandert nooit; een herziening komt
  // ernaast te staan zodat een oud rapport zijn meetlat houdt.
  const previous = await supabase
    .from('question_banks')
    .select('version')
    .eq('vertical', found.data.vertical)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (previous.data?.version ?? 0) + 1;

  const stored = await supabase
    .from('question_banks')
    .insert({
      vertical: found.data.vertical,
      version,
      // Bevindingen betekent dat er een mens naar hoort te kijken. Zonder
      // bevindingen mag hij meteen naar de merchant.
      status: findings.length > 0 ? 'review' : 'ready',
      csv: delivery.csv,
      findings,
      panel,
      grouping,
    })
    .select('id, version, status')
    .single();

  if (stored.error) {
    return { ok: false, status: 500, error: 'De bank kon niet worden bewaard.' };
  }

  await supabase
    .from('bank_requests')
    .update({
      status: findings.length > 0 ? 'review' : 'ready',
      finished_at: new Date().toISOString(),
      flagged: findings,
      bank_id: stored.data.id,
      // Ook op de aanvraag, naast de winkel en de aangedragen sites: dan staat
      // op één plek wat de merchant meegaf én wat er werkelijk onderzocht is.
      panel,
      grouping,
    })
    .eq('id', delivery.requestId);

  return {
    ok: true,
    bank: stored.data,
    questions: read.bank.questions.length,
    overlays: read.bank.overlays.length,
    findings,
  };
}
