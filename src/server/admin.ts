// Wie de beheerder is, en hoe de app dat vaststelt.
//
// Een lijst met e-mailadressen in de omgeving van de app, serverzijdig
// gecontroleerd. Geen extra tabel en geen rollenbeheer: er is één beheerder, en
// een rollenstelsel bouwen voor één persoon is werk dat zichzelf niet
// terugverdient. Komt er ooit een team, dan wordt dit een tabel — de controle
// zit op één plek, dus dat is dan een kleine wissel.
//
// De controle gebeurt op het token van de beller en niet op iets wat de browser
// meestuurt: een beheerdersvlag die de client zelf zet, is geen slot.

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../auth/config';

function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((one) => one.trim().toLowerCase())
    .filter(Boolean);
}

/** Het e-mailadres achter dit verzoek, of niets. */
async function callerEmail(request: Request): Promise<string | undefined> {
  const config = supabaseConfig();
  const token = request.headers.get('authorization');
  if (!config || !token) return undefined;
  const client = createClient(config.url, config.anonKey, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data.user?.email?.toLowerCase();
}

export async function isAdmin(request: Request): Promise<boolean> {
  const list = allowlist();
  if (list.length === 0) return false;
  const email = await callerEmail(request);
  return email !== undefined && list.includes(email);
}
