'use client';

// De categorieën van één bank: losstaand of niet, en het label.
//
// Losstaand is voor producten die niet het kernproduct van de markt zijn. Een
// klos garen krijgt anders "hoe breed is de stof" als algemene vraag, en dat
// meet iets wat er niet is. De generatie kan dat zelf vaststellen; een bank die
// er al ligt krijgt het hier, zonder opnieuw gegenereerd te worden.
//
// Het label corrigeer je voor een bank die de schrijfwijze van één winkel
// overnam. Een bank hoort bij de markt, niet bij de spelfout van een catalogus —
// en de categorie van de merchant blijft er gewoon op aansluiten.

import { useState } from 'react';
import type { Bilingual } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import { authHeader } from '../src/auth/client';
import { Badge, Button, ErrorState } from './ui';

export interface BankOverlayRow {
  id: string;
  label: Bilingual;
  /** Het label zoals de bank het zelf draagt, vóór een correctie. */
  original: Bilingual;
  standalone: boolean;
  questions: number;
}

interface Props {
  s: Strings;
  bank: { id: string; vertical: string; version: number; overlays?: BankOverlayRow[] };
  onChanged: () => Promise<void>;
}

export function BankCategoriesPanel({ s, bank, onChanged }: Props) {
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  /** Het label dat nu bewerkt wordt, en wat er in de velden staat. */
  const [editing, setEditing] = useState<{ id: string; nl: string; en: string }>();

  async function post(payload: Record<string, unknown>, marker: string) {
    setBusy(marker);
    setError(undefined);
    try {
      const response = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ bankId: bank.id, ...payload }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? response.statusText);
        return false;
      }
      await onChanged();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      return false;
    } finally {
      setBusy(undefined);
    }
  }

  const overlays = bank.overlays ?? [];

  return (
    <div>
      <p className="font-medium">{bank.vertical} v{bank.version}</p>

      {error ? (
        <div className="mt-2">
          <ErrorState title={s.admin.categoriesFailed} body={error} next={s.admin.categoriesFailedNext} />
        </div>
      ) : null}

      {overlays.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{s.admin.categoriesNone}</p>
      ) : (
        <ul className="mt-2">
          {overlays.map((overlay) => {
            const renamed = overlay.label.nl !== overlay.original.nl || overlay.label.en !== overlay.original.en;
            return (
              <li key={overlay.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line py-2 first:border-t-0">
                <div className="min-w-0 flex-1">
                  {editing?.id === overlay.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        aria-label={`${s.admin.categoriesRename} (NL)`}
                        value={editing.nl}
                        onChange={(event) => setEditing({ ...editing, nl: event.target.value })}
                        className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-sm"
                      />
                      <input
                        aria-label={`${s.admin.categoriesRename} (EN)`}
                        value={editing.en}
                        onChange={(event) => setEditing({ ...editing, en: event.target.value })}
                        className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-sm"
                      />
                      <Button
                        onClick={() => void post(
                          { action: 'label', overlayId: overlay.id, label: { nl: editing.nl, en: editing.en } },
                          `label:${overlay.id}`,
                        ).then((ok) => { if (ok) setEditing(undefined); })}
                        loading={busy === `label:${overlay.id}`}
                      >
                        {s.admin.categoriesSave}
                      </Button>
                      <Button variant="quiet" onClick={() => setEditing(undefined)}>{s.admin.categoriesCancel}</Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">{overlay.label.nl}</span>
                        <span className="ml-2 text-xs text-muted">
                          <span className="tnum">{overlay.questions}</span> {s.admin.categoriesQuestions}
                        </span>
                      </p>
                      {/* Wat er in de bank zelf staat, zodat een correctie
                          navolgbaar blijft. */}
                      {renamed ? (
                        <p className="text-xs text-muted">{s.admin.categoriesWas} {overlay.original.nl}</p>
                      ) : null}
                    </>
                  )}
                </div>

                {editing?.id !== overlay.id ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone={overlay.standalone ? 'warn' : 'neutral'}>
                      {overlay.standalone ? s.admin.categoriesStandaloneOn : s.admin.categoriesStandaloneOff}
                    </Badge>
                    <Button
                      variant="secondary"
                      onClick={() => void post({ action: 'standalone', overlayId: overlay.id }, `standalone:${overlay.id}`)}
                      loading={busy === `standalone:${overlay.id}`}
                      disabled={busy !== undefined && busy !== `standalone:${overlay.id}`}
                    >
                      {overlay.standalone ? s.admin.categoriesUndoStandalone : s.admin.categoriesMakeStandalone}
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => setEditing({ id: overlay.id, nl: overlay.label.nl, en: overlay.label.en })}
                    >
                      {s.admin.categoriesRename}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
