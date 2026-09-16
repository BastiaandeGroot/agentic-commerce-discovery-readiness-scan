'use client';

// Het belang van de vragen van één bank corrigeren, ook na het vrijgeven.
//
// Kritiek is de poort voor basisgeschikt en hoort smal te zijn: alleen een vraag
// die beslissend is, onherstelbaar, en over het product gaat (zie
// `src/questions/critical.ts`). Een bank die er al ligt, kreeg zijn weging nog
// op de oude maat. Opnieuw genereren geeft nieuwe vraag-id's, en daar hangt het
// werk van elke merchant aan; daarom corrigeert een beheerder hier, naast de bank.
//
// Standaard alleen wat kritiek is of gecorrigeerd: dat is waar het om gaat. Een
// vraag die kritiek hoort te worden, staat één klik verder.

import { useState } from 'react';
import type { Bilingual } from '../src/domain/types';
import type { Locale, Strings } from '../src/i18n/strings';
import { authHeader } from '../src/auth/client';
import { Badge, Button, ErrorState, TableWrap, Td, Th } from './ui';

interface Row {
  id: string;
  label: Bilingual;
  category?: string;
  layer: 'base' | 'overlay' | 'reweight';
  importance: string;
  correctedFrom?: string;
  issues: string[];
}

interface Props {
  s: Strings;
  locale: Locale;
  bank: { id: string; vertical: string; version: number; questions: Row[]; importance?: Record<string, string>; canCorrect?: boolean };
  onChanged: () => Promise<void>;
}

const LEVELS = ['critical', 'high', 'medium', 'low'] as const;

export function ImportanceCorrectionsPanel({ s, locale, bank, onChanged }: Props) {
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [all, setAll] = useState(false);

  async function correct(key: string, importance: string) {
    setBusy(key);
    setError(undefined);
    try {
      const response = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ action: 'importance', bankId: bank.id, key, importance }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? response.statusText);
        return;
      }
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(undefined);
    }
  }

  const rows = bank.questions
    .filter((row) => all || row.importance === 'critical' || row.correctedFrom !== undefined)
    // Eerst wat nog een oordeel vraagt, dan op categorie en id.
    .sort((a, b) =>
      Number(b.issues.includes('critical-without-test')) - Number(a.issues.includes('critical-without-test'))
      || (a.category ?? '').localeCompare(b.category ?? '')
      || a.id.localeCompare(b.id));
  const open = bank.questions.filter((row) => row.issues.includes('critical-without-test')).length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{bank.vertical} v{bank.version}</p>
        <span className="text-xs text-muted">
          {open > 0 ? `${open} ${s.admin.importanceOpen}` : s.admin.importanceAllJudged}
        </span>
      </div>

      {bank.canCorrect === false ? (
        <p className="mt-2 text-sm text-warn">{s.admin.correctionsNeedMigration}</p>
      ) : null}
      {error ? (
        <div className="mt-2">
          <ErrorState title={s.admin.importanceFailed} body={error} next={s.admin.importanceFailedNext} />
        </div>
      ) : null}

      <div className="mt-2">
        <Button variant="quiet" onClick={() => setAll(!all)}>
          {all ? s.admin.importanceShowCritical : s.admin.importanceShowAll}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{s.admin.importanceNone}</p>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>{s.admin.questions}</Th>
              <Th>{s.admin.importanceLabel}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line align-top">
                <Td>
                  <span className="block">{row.label[locale]}</span>
                  <span className="mt-0.5 block font-mono text-xs text-muted">
                    {row.id}{row.category ? ` · ${row.category}` : ''}
                    {row.layer === 'reweight' ? ` · ${s.admin.reweightRow}` : ''}
                  </span>
                  {row.issues.includes('critical-without-test') ? (
                    <span className="mt-1 inline-block rounded-md bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
                      {s.admin.issues['critical-without-test']}
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <span className="flex flex-col items-start gap-1">
                    <Badge tone={row.importance === 'critical' ? 'danger' : 'neutral'}>
                      {s.questions.importance[row.importance as keyof typeof s.questions.importance] ?? row.importance}
                    </Badge>
                    {bank.canCorrect !== false ? (
                      <select
                        aria-label={s.admin.importanceLabel}
                        value={bank.importance?.[row.id] ?? ''}
                        disabled={busy === row.id}
                        onChange={(event) => void correct(row.id, event.target.value)}
                        className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs text-ink"
                      >
                        <option value="">{s.admin.importanceBank}</option>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>{s.questions.importance[level]}</option>
                        ))}
                      </select>
                    ) : null}
                    {row.correctedFrom ? (
                      <span className="text-xs text-muted">
                        {s.admin.importanceWas} {s.questions.importance[row.correctedFrom as keyof typeof s.questions.importance] ?? row.correctedFrom}
                      </span>
                    ) : null}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
