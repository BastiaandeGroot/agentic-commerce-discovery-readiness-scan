'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './Button';

/**
 * Leeg is geen fout.
 *
 * Een leeg scherm zegt waaróm het leeg is en wat de volgende stap is. "Geen
 * resultaten" alleen laat iemand achter met de vraag of hij iets fout deed.
 */
export function EmptyState({ title, body, action }: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <Inbox className="size-6 text-muted" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">{body}</p>
      </div>
      {action ? (
        <Button variant="secondary" onClick={action.onClick}>{action.label}</Button>
      ) : null}
    </div>
  );
}

/**
 * Fout met een uitweg.
 *
 * `body` zegt wat er mis is, `next` zegt wat de merchant nu moet doen. Zonder
 * dat tweede deel is een foutmelding alleen een mededeling.
 */
export function ErrorState({ title, body, next, action }: {
  title: string;
  body: string;
  next?: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3" role="alert">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium text-danger">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{body}</p>
          {next ? <div className="mt-2 text-sm leading-relaxed text-ink">{next}</div> : null}
          {action ? (
            <div className="mt-3">
              <Button variant="secondary" onClick={action.onClick}>{action.label}</Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
