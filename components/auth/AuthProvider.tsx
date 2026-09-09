'use client';

// Wie er ingelogd is, op één plek.
//
// In een context en niet per scherm, om dezelfde reden als de taalkeuze: de
// header toont wie je bent terwijl de pagina eronder iets heel anders doet.
// Twee losse hooks zouden pas na een remount weer gelijk lopen, en dan staat er
// in de header nog "uitloggen" terwijl de pagina al zegt dat je weg bent.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../src/auth/client';

/** Waarom een handeling niet lukte, in termen die de app zelf kent. */
export type AuthFailure =
  | 'credentials'
  | 'email-in-use'
  | 'weak-password'
  | 'email-invalid'
  | 'not-configured'
  | 'generic';

export interface AuthState {
  /** `undefined` zolang we het nog niet weten; `null` als er niemand is. */
  user: User | null | undefined;
  /**
   * Het account waar deze gebruiker bij hoort.
   *
   * Iets anders dan zijn gebruikers-id, en dat verschil is niet cosmetisch: een
   * account kan straks meerdere mensen hebben, en alles wat bewaard wordt hangt
   * aan het account en niet aan de persoon. Wie vertrekt neemt de scans niet mee.
   *
   * `undefined` zolang het opgehaald wordt of er niemand is ingelogd.
   */
  accountId: string | undefined;
  /** Of er überhaupt een accountdienst aangesloten is. */
  configured: boolean;
  signIn(email: string, password: string): Promise<AuthFailure | null>;
  signUp(email: string, password: string): Promise<AuthFailure | null>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<AuthFailure | null>;
  setPassword(password: string): Promise<AuthFailure | null>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * De melding van Supabase terugbrengen tot iets waar een scherm een tekst bij
 * heeft.
 *
 * Op de tekst en niet op een code, want die codes verschillen per endpoint en
 * per versie. Herkennen we hem niet, dan is het `generic` — een onbekende fout
 * tonen als "verkeerd wachtwoord" stuurt iemand het verkeerde bos in.
 */
function classify(message: string): AuthFailure {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'credentials';
  if (m.includes('already registered') || m.includes('already been registered')) return 'email-in-use';
  if (m.includes('password should be')) return 'weak-password';
  if (m.includes('validate email') || m.includes('invalid email')) return 'email-invalid';
  return 'generic';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = supabase();
  const [user, setUser] = useState<User | null | undefined>(client ? undefined : null);
  const [accountId, setAccountId] = useState<string>();

  useEffect(() => {
    if (!client) return;
    let alive = true;

    // Eerst vragen wat er nu geldt, daarna pas luisteren. Andersom mist de
    // eerste render de bestaande sessie en knippert elk scherm door "uitgelogd".
    void client.auth.getSession().then(({ data }) => {
      if (alive) setUser(data.session?.user ?? null);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  // Het account erbij zoeken zodra we weten wie er is. Een database-trigger maakt
  // hem aan bij registratie, dus hij hoort er te zijn; is hij er niet, dan blijft
  // dit leeg en zegt het scherm dat er geen aanvraag bewaard kan worden.
  useEffect(() => {
    let alive = true;
    void (async () => {
      // Na de render, anders lokt dit een extra render uit voordat deze klaar is.
      await Promise.resolve();
      if (!alive) return;
      if (!client || !user) { setAccountId(undefined); return; }
      const { data } = await client
        .from('account_members')
        .select('account_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (alive) setAccountId(data?.account_id ?? undefined);
    })();
    return () => { alive = false; };
  }, [client, user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!client) return 'not-configured' as const;
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error ? classify(error.message) : null;
  }, [client]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!client) return 'not-configured' as const;
    const { error } = await client.auth.signUp({
      email,
      password,
      // Waar iemand na het bevestigen terechtkomt. Zonder dit stuurt Supabase
      // hem naar zijn eigen standaardadres, en dat is niet deze app.
      options: { emailRedirectTo: `${window.location.origin}/inloggen` },
    });
    return error ? classify(error.message) : null;
  }, [client]);

  const signOut = useCallback(async () => {
    await client?.auth.signOut();
  }, [client]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!client) return 'not-configured' as const;
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/wachtwoord-herstellen`,
    });
    return error ? classify(error.message) : null;
  }, [client]);

  const setPassword = useCallback(async (password: string) => {
    if (!client) return 'not-configured' as const;
    const { error } = await client.auth.updateUser({ password });
    return error ? classify(error.message) : null;
  }, [client]);

  const value = useMemo<AuthState>(
    () => ({ user, accountId, configured: client !== null, signIn, signUp, signOut, requestPasswordReset, setPassword }),
    [user, accountId, client, signIn, signUp, signOut, requestPasswordReset, setPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    // Zonder provider is er niemand ingelogd en staat er niets aan. Dat is een
    // toestand die elk scherm al afdekt, dus blijft de app leesbaar.
    throw new Error('useAuth buiten AuthProvider');
  }
  return value;
}
