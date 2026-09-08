'use client';

// De vier schermen rond een account: inloggen, registreren, wachtwoord vergeten
// en een nieuw wachtwoord kiezen.
//
// Eén component met een modus, en niet vier bestanden die 90% delen. Ze
// verschillen in welke velden er staan en wat de knop doet; alles daaromheen —
// de vier toestanden, de foutafhandeling, de opmaak — is hetzelfde, en dat twee
// keer onderhouden is precies hoe twee schermen uit elkaar gaan lopen.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Button, Card, CardTitle, ErrorState, Input, SkeletonLines } from '../ui';
import { STRINGS } from '../../src/i18n/strings';
import { useLocale } from '../../src/i18n/useLocale';
import { useAuth, type AuthFailure } from './AuthProvider';

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

/** Bij welke fout welke twee teksten horen: wat er mis is, en wat je nu doet. */
function messages(s: (typeof STRINGS)['nl'], failure: AuthFailure): [string, string] {
  switch (failure) {
    case 'credentials': return [s.auth.errorCredentials, s.auth.errorCredentialsNext];
    case 'email-in-use': return [s.auth.errorEmailInUse, s.auth.errorEmailInUseNext];
    case 'weak-password': return [s.auth.errorWeakPassword, s.auth.errorWeakPasswordNext];
    case 'email-invalid': return [s.auth.errorEmailInvalid, s.auth.errorEmailInvalidNext];
    case 'not-configured': return [s.auth.notConfigured, s.auth.notConfiguredNext];
    default: return [s.auth.errorGeneric, s.auth.errorGenericNext];
  }
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const [locale] = useLocale();
  const s = STRINGS[locale];
  const router = useRouter();
  const { user, configured, signIn, signUp, signOut, requestPasswordReset, setPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPasswordValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | undefined>();
  const [done, setDone] = useState(false);

  const needsEmail = mode !== 'reset';
  const needsPassword = mode !== 'forgot';

  // Niet ingericht: eerlijk zeggen in plaats van een formulier tonen waarmee
  // iemand een wachtwoord bedenkt voor een account dat nergens terechtkomt.
  if (!configured) {
    return (
      <Card className="mx-auto max-w-md">
        <ErrorState title={s.auth.notConfigured} body={s.auth.notConfiguredNext} />
      </Card>
    );
  }

  // We weten nog niet of er iemand ingelogd is. Even wachten is beter dan het
  // inlogformulier laten opflitsen bij wie al ingelogd was.
  if (user === undefined) {
    return (
      <Card className="mx-auto max-w-md">
        <CardTitle>{s.auth.checking}</CardTitle>
        <SkeletonLines lines={3} />
      </Card>
    );
  }

  // Al ingelogd en tóch op het inlogscherm: dan is het dashboard bedoeld.
  if (user && (mode === 'signin' || mode === 'signup')) {
    return (
      <Card className="mx-auto max-w-md">
        <CardTitle sub={`${s.auth.signedInAs} ${user.email ?? ''}`}>{s.shell.appNav.overview}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push('/dashboard')}>{s.shell.nav.dashboard}</Button>
          <Button variant="secondary" onClick={() => void signOut()}>{s.auth.signOut}</Button>
        </div>
      </Card>
    );
  }

  if (done) {
    const [title, body] = mode === 'signup'
      ? [s.auth.confirmTitle, s.auth.confirmBody]
      : [s.auth.forgotSentTitle, s.auth.forgotSentBody];
    return (
      <Card className="mx-auto max-w-md">
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        </div>
      </Card>
    );
  }

  async function submit() {
    setFailure(undefined);

    // Zelf controleren wat we zelf kunnen controleren: dat scheelt een
    // netwerkrondje en geeft antwoord op het veld in plaats van bovenaan.
    if (needsEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setFailure('email-invalid');
      return;
    }
    if (needsPassword && password.length < 8) {
      setFailure('weak-password');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const err = await signIn(email, password);
        if (err) setFailure(err);
        else router.push('/dashboard');
      } else if (mode === 'signup') {
        const err = await signUp(email, password);
        if (err) setFailure(err);
        else setDone(true);
      } else if (mode === 'forgot') {
        const err = await requestPasswordReset(email);
        if (err) setFailure(err);
        else setDone(true);
      } else {
        const err = await setPassword(password);
        if (err) setFailure(err);
        else router.push('/dashboard');
      }
    } finally {
      setBusy(false);
    }
  }

  const title = { signin: s.auth.signInTitle, signup: s.auth.signUpTitle, forgot: s.auth.forgotTitle, reset: s.auth.resetTitle }[mode];
  const intro = { signin: s.auth.signInIntro, signup: s.auth.signUpIntro, forgot: s.auth.forgotIntro, reset: s.auth.resetIntro }[mode];
  const action = { signin: s.auth.signIn, signup: s.auth.signUp, forgot: s.auth.forgotSubmit, reset: s.auth.resetSubmit }[mode];

  return (
    <Card className="mx-auto max-w-md">
      <CardTitle sub={intro}>{title}</CardTitle>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); void submit(); }}
      >
        {needsEmail ? (
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            label={s.auth.email}
            value={email}
            onChange={setEmail}
          />
        ) : null}

        {needsPassword ? (
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            label={mode === 'reset' ? s.auth.newPassword : s.auth.password}
            hint={mode === 'signin' ? undefined : s.auth.passwordHint}
            value={password}
            onChange={setPasswordValue}
          />
        ) : null}

        {failure ? <ErrorState title={messages(s, failure)[0]} body={messages(s, failure)[1]} /> : null}

        <div>
          <Button type="submit" loading={busy}>{action}</Button>
        </div>
      </form>

      <div className="mt-5 flex flex-col gap-1.5 border-t border-line pt-4 text-sm text-muted">
        {mode === 'signin' ? (
          <>
            <p>
              {s.auth.noAccount}{' '}
              <Link href="/registreren" className="text-accent underline underline-offset-2">{s.auth.signUp}</Link>
            </p>
            <p>
              <Link href="/wachtwoord-vergeten" className="text-accent underline underline-offset-2">{s.auth.forgotLink}</Link>
            </p>
          </>
        ) : null}
        {mode === 'signup' || mode === 'forgot' ? (
          <p>
            {s.auth.hasAccount}{' '}
            <Link href="/inloggen" className="text-accent underline underline-offset-2">{s.auth.signIn}</Link>
          </p>
        ) : null}
      </div>
    </Card>
  );
}
