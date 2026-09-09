// De uitvoerder: wie namens ons een vragenbank mag ophalen en aanleveren.
//
// Een eigen sleutel en niet de gebruikerssessie, want er zit geen mens achter:
// dit is een geplande taak of straks een achtergrondproces. En een andere
// sleutel dan die van Supabase, zodat je hem kunt intrekken zonder de database
// opnieuw in te richten — bij een tweede uitvoerder krijgt die zijn eigen.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Refusal = { error: string; status: number };

/** Draagt dit verzoek de uitvoerderssleutel? */
export function isExecutor(request: Request): boolean {
  const expected = process.env.BANK_EXECUTOR_KEY;
  if (!expected || expected.length < 16) return false;
  const given = request.headers.get('x-executor-key') ?? '';
  // Even lang vergelijken, zodat de tijd niets over de sleutel verklapt.
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * De client die buiten row level security om mag schrijven.
 *
 * Alleen hier en nergens anders: dit is de enige plek waar een aanvraag op
 * `ready` gezet kan worden, en een merchant hoort zijn eigen bank niet klaar te
 * kunnen melden.
 */
export function serviceClient(): SupabaseClient | Refusal {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { error: 'De uitvoerderskant is niet ingericht in deze installatie.', status: 503 };
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function guard(request: Request): SupabaseClient | Refusal {
  if (!isExecutor(request)) return { error: 'Geen geldige uitvoerderssleutel.', status: 401 };
  return serviceClient();
}

export const isRefusal = (value: SupabaseClient | Refusal): value is Refusal =>
  (value as Refusal).error !== undefined;

/** Hoe lang een aanvraag op `running` mag staan voordat hij terugvalt. */
export const STALE_AFTER_HOURS = 24;
