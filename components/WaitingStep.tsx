'use client';

// Wat een merchant ziet zolang er nog geen vragenbank voor zijn markt is.
//
// Dit scherm verving de vraag om zelf een vragenlijst te uploaden, en dat was
// geen kosmetische wijziging. Een webshop-eigenaar wéét niet welke vragen zijn
// markt stelt — dat is precies wat hij van ons komt halen. Hem vragen die aan te
// leveren is de drempel die niemand neemt.
//
// Het uploaden is niet verdwenen maar van eigenaar veranderd: het staat
// hieronder als beheerhandeling, weggevouwen. Eén keer per markt, door ons, niet
// per merchant.
//
// De belangrijkste alinea is `why`. Wachten voelt als slechte dienstverlening
// tenzij je zegt waarom het alternatief slechter is, en dat is hier waar: een
// uitkomst op algemene vragen ziet er goed uit en meet het verkeerde.

import { useState } from 'react';
import { Clock, Mail, Search, ShieldQuestion } from 'lucide-react';
import { Badge, Button, Card, CardTitle, ErrorState } from './ui';
import type { Strings } from '../src/i18n/strings';

export type RequestStatus = 'queued' | 'running' | 'review' | 'ready' | 'failed';

const TONE = {
  queued: 'neutral', running: 'accent', review: 'accent', ready: 'ok', failed: 'danger',
} as const;

export function WaitingStep({ s, status, requestedAt, email, hasList, onContinue, children }: {
  s: Strings;
  status: RequestStatus;
  /** Wanneer de aanvraag binnenkwam, al opgemaakt; de motor heeft geen klok. */
  requestedAt?: string;
  /** Waar het bericht heen gaat. Leeg als er niemand ingelogd is. */
  email?: string;
  /** Ligt er al een lijst waarmee doorgegaan kan worden? */
  hasList: boolean;
  onContinue: () => void;
  /** Het inleesscherm, weggevouwen onder beheer. */
  children: React.ReactNode;
}) {
  const [manage, setManage] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge tone={TONE[status]}>{s.waiting.status[status]}</Badge>
          {requestedAt ? (
            <span className="text-sm text-muted">{s.waiting.queuedSince} {requestedAt}</span>
          ) : null}
        </div>

        <CardTitle sub={s.waiting.intro}>{s.waiting.heading}</CardTitle>

        {status === 'failed' ? (
          <ErrorState title={s.waiting.status.failed} body={s.waiting.failedNext} />
        ) : (
          <dl className="flex flex-col gap-4">
            {([
              [Search, s.waiting.what, s.waiting.whatBody],
              [Clock, s.waiting.when, s.waiting.whenBody],
              [ShieldQuestion, s.waiting.why, s.waiting.whyBody],
            ] as const).map(([Icon, title, body]) => (
              <div key={title} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-sm font-medium">{title}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-muted">{body}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}

        {/* De belofte die het wachten draaglijk maakt, en daarom staat hij apart
            en niet tussen de rest. Zonder adres kunnen we hem niet waarmaken;
            dan zegt het scherm dat in plaats van iets te beloven. */}
        <div className="mt-5 flex items-start gap-3 rounded-lg bg-surface-2 p-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p className="text-sm leading-relaxed">
            {email ? (
              <>
                {s.waiting.notifyTo} <span className="font-medium">{email}</span>
              </>
            ) : (
              <span className="text-muted">{s.waiting.notifyAnon}</span>
            )}
          </p>
        </div>

        {/* Ligt er al een lijst, dan is wachten onnodig. Dat is de situatie van
            de tweede merchant in een markt, en van ons tijdens het bouwen. */}
        {hasList ? (
          <div className="mt-4">
            <Button onClick={onContinue}>{s.waiting.continueAnyway}</Button>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {s.waiting.manageHeading}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{s.waiting.manageBody}</p>
          </div>
          <Button variant="quiet" onClick={() => setManage(!manage)}>
            {manage ? s.waiting.manageClose : s.waiting.manageOpen}
          </Button>
        </div>
        {manage ? <div className="mt-4">{children}</div> : null}
      </Card>
    </div>
  );
}
