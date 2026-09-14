'use client';

// De kenmerktypen van één bank: typeren, nalopen, bevestigen.
//
// Een tabel en geen oordeel. Het model stelt per kenmerk een vorm voor; de
// beheerder ziet ze allemaal, past aan wat niet klopt en bevestigt. Pas dan
// gebruikt het koppelscherm van een merchant ze. Dat is dezelfde voorwaarde die
// op elke plek geldt waar hier een model komt: de uitkomst is een tabel die een
// mens ziet en bevestigt.

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Strings } from '../src/i18n/strings';
import type { ShapeKind } from '../src/domain/types';
import type { StoredTyping } from '../src/generation/attributes';
import { UNIT_WORDS } from '../src/engine/profile';
import { authHeader } from '../src/auth/client';
import { Badge, Button, ErrorState, TableWrap, Td, Th } from './ui';

const KINDS: ShapeKind[] = ['boolean', 'number', 'list', 'code', 'text'];

interface Props {
  s: Strings;
  bank: { id: string; vertical: string; version: number; attribute_types?: StoredTyping | null };
  onChanged: () => Promise<void>;
}

export function AttributeTypesPanel({ s, bank, onChanged }: Props) {
  const typing = bank.attribute_types ?? undefined;
  /** Wat er loopt: typeren, bevestigen, of een kenmerk dat wordt bijgesteld. */
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<{ body: string; next?: string }>();
  const [open, setOpen] = useState(false);

  async function post(payload: Record<string, unknown>, marker: string) {
    setBusy(marker);
    setError(undefined);
    try {
      const response = await fetch('/api/admin/attribute-types', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ bankId: bank.id, ...payload }),
      });
      if (!response.ok) {
        // De route weet het best wat er nu moet gebeuren; een vaste regel eronder
        // stuurde bij een ontbrekende migratie naar de API-sleutel.
        const body = await response.json().catch(() => ({})) as { error?: string; next?: string };
        setError({ body: String(body.error ?? response.statusText), next: body.next });
        return;
      }
      await onChanged();
    } catch (caught) {
      setError({ body: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setBusy(undefined);
    }
  }

  const keys = typing ? Object.keys(typing.shapes).sort((a, b) => a.localeCompare(b)) : [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{bank.vertical} v{bank.version}</span>
        {typing ? (
          <Badge tone={typing.status === 'confirmed' ? 'ok' : 'warn'}>
            {typing.status === 'confirmed' ? s.admin.typingConfirmed : s.admin.typingReview}
          </Badge>
        ) : (
          <span className="text-sm text-muted">{s.admin.typingNone}</span>
        )}
      </div>

      {typing ? (
        <p className="mt-1 text-sm text-muted">
          {s.admin.typingCount
            .replace('{getypeerd}', String(keys.length))
            .replace('{totaal}', String(typing.attributes))}
        </p>
      ) : null}

      {busy === 'type' ? (
        <p className="mt-2 text-sm text-muted" role="status">{s.admin.typingRunning}</p>
      ) : null}

      {error ? (
        <div className="mt-2">
          <ErrorState title={s.admin.typingFailed} body={error.body} next={error.next ?? s.admin.typingFailedNext} />
        </div>
      ) : null}

      {/* Wat de lezer weigerde of miste. Geen blokkade: een kenmerk zonder type
          krijgt op het koppelscherm alleen geen controle. */}
      {typing && typing.errors.length > 0 ? (
        <details className="mt-2 text-sm">
          <summary className="flex cursor-pointer items-center gap-1.5 text-warn">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            {typing.errors.length} {s.admin.typingErrors}
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5 text-xs leading-relaxed text-muted">
            {typing.errors.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </details>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant={typing ? 'secondary' : 'primary'}
          onClick={() => void post({ action: 'type' }, 'type')}
          loading={busy === 'type'}
          disabled={busy !== undefined && busy !== 'type'}
        >
          {typing ? s.admin.typingRerun : s.admin.typingRun}
        </Button>
        {typing ? (
          <Button variant="quiet" onClick={() => setOpen((value) => !value)}>
            {open ? s.admin.typingHide : s.admin.typingShow}
          </Button>
        ) : null}
        {typing && typing.status !== 'confirmed' ? (
          <Button
            onClick={() => void post({ action: 'confirm' }, 'confirm')}
            loading={busy === 'confirm'}
            disabled={busy !== undefined && busy !== 'confirm'}
          >
            {s.admin.typingConfirm}
          </Button>
        ) : null}
      </div>

      {/* Dicht, zoals het rapport: honderden kenmerken naast elkaar lezen is het
          werk, en daar hoort geen lucht tussen. */}
      {typing && open ? (
        <div className="mt-3">
          <TableWrap>
            <thead>
              <tr className="border-b border-line">
                <Th>{s.admin.typingKey}</Th>
                <Th>{s.admin.typingKind}</Th>
                <Th>{s.admin.typingUnit}</Th>
                <Th>{s.admin.typingValues}</Th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const shape = typing.shapes[key];
                const saving = busy === key;
                return (
                  <tr key={key} className="border-b border-line last:border-b-0">
                    <Td><span className="font-mono text-xs">{key}</span></Td>
                    <Td>
                      <select
                        aria-label={`${s.admin.typingKind} ${key}`}
                        value={shape.kind}
                        disabled={busy !== undefined}
                        onChange={(event) => void post({
                          action: 'set', key, kind: event.target.value,
                          unit: event.target.value === 'number' ? shape.unit : undefined,
                          values: event.target.value === 'list' ? shape.values : undefined,
                        }, key)}
                        className="rounded-lg border border-line bg-surface px-2 py-0.5 text-xs text-ink"
                      >
                        {KINDS.map((kind) => <option key={kind} value={kind}>{s.mapping.kinds[kind]}</option>)}
                      </select>
                    </Td>
                    <Td>
                      {shape.kind === 'number' ? (
                        <select
                          aria-label={`${s.admin.typingUnit} ${key}`}
                          value={shape.unit ?? ''}
                          disabled={busy !== undefined}
                          onChange={(event) => void post({
                            action: 'set', key, kind: 'number', unit: event.target.value || undefined,
                          }, key)}
                          className="rounded-lg border border-line bg-surface px-2 py-0.5 text-xs text-ink"
                        >
                          <option value="">—</option>
                          {UNIT_WORDS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                      ) : <span className="text-xs text-muted">—</span>}
                    </Td>
                    <Td>
                      <span className={`text-xs ${saving ? 'text-muted' : 'text-ink'}`}>
                        {shape.values && shape.values.length > 0 ? shape.values.join(' · ') : '—'}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </div>
      ) : null}
    </div>
  );
}
