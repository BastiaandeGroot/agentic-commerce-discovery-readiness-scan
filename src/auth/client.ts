'use client';

// De verbinding met Supabase, één per browsertab.
//
// Eén exemplaar en niet één per component: elke client houdt zijn eigen sessie
// bij en luistert op zijn eigen kanaal. Twee exemplaren betekent twee keer
// verversen van hetzelfde token, en dan wint willekeurig welke het laatst
// schreef.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

let cached: SupabaseClient | null | undefined;

/**
 * De client, of `null` als er geen project aangesloten is.
 *
 * De aanroeper moet dus op `null` controleren. Dat is expres: zo kan een scherm
 * niet vergeten dat inloggen misschien niet beschikbaar is, en komt die
 * toestand in beeld in plaats van in een crash.
 */
export function supabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const config = supabaseConfig();
  cached = config
    ? createClient(config.url, config.anonKey, {
        auth: {
          // De sessie overleeft het sluiten van het tabblad, en het token wordt
          // ververst voordat het verloopt. Anders staat een merchant halverwege
          // het koppelen van zijn kenmerken ineens uitgelogd.
          persistSession: true,
          autoRefreshToken: true,
          // Herstel- en bevestigingslinks komen terug als fragment in de URL.
          detectSessionInUrl: true,
        },
      })
    : null;
  return cached;
}
