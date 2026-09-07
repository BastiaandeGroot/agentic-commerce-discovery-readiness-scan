'use client';

// Stap 3: kenmerken aan kolommen koppelen.
//
// Je vragenlijst noemt een kenmerk zoals het vak het noemt, je export zoals je
// systeem het opsloeg. Drie lagen, van goedkoop naar duur en elk strenger dan
// nodig: schrijfwijze en taal doet `spec/match.ts` gratis en offline; betekenis
// doet een taalmodel in de browser; en de merchant wijst zelf aan, wat van
// allebei wint.
//
// Wat het model oplevert zijn **voorstellen** en geen koppelingen. Ze staan
// gemarkeerd in de lijst tot de merchant ze laat staan of wijzigt. Dat verschil
// is niet cosmetisch: een model geeft altijd een beste kandidaat, ook als er
// geen goede is, en een verkeerde koppeling laat een gat verdwijnen dat er wél
// is. Ongemarkeerd overnemen zou precies de fout maken die deze scan hoort te
// voorkomen.

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Dataset, Locale, QuestionSetState } from '../src/domain/types';
import { attributeInventory, type Mapping } from '../src/questions/mapping';
import { describeAttribute, describeColumn } from '../src/semantic/describe';
import { suggestMappings } from '../src/semantic/suggest';
import { embed, ModelUnavailable, type LoadProgress } from '../src/semantic/model';
import { MappingNotConfigured, requestMapping } from '../src/semantic/remote';
import type { Strings } from '../src/i18n/strings';
import { Badge, Button, Card, CardTitle, ErrorState } from './ui';

interface Props {
  s: Strings;
  locale: Locale;
  catalog: Dataset;
  state: QuestionSetState;
  mapping: Mapping;
  onChange: (mapping: Mapping) => void;
  onContinue: () => void;
}

/** Geen kolom is een geldig antwoord; die keuze moet expliciet kunnen. */
const NONE = '';

export function MappingStep({ s, locale, catalog, state, mapping, onChange, onContinue }: Props) {
  const [busy, setBusy] = useState<LoadProgress | 'remote'>();
  const [failed, setFailed] = useState(false);
  /** Welk model de voorstellen deed; dat hoort de merchant te zien. */
  const [source, setSource] = useState<string>();
  /** Wat er aan het antwoord opviel; geen fout, wel iets om na te lopen. */
  const [notes, setNotes] = useState<string[]>([]);
  /** Welke keuzes van het model komen; ze blijven gemarkeerd tot je ze wijzigt. */
  const [proposed, setProposed] = useState<Record<string, string>>({});

  const rows = useMemo(() => attributeInventory(state), [state]);
  const columns = useMemo(
    () => [...catalog.columns].sort((a, b) => a.localeCompare(b)),
    [catalog.columns],
  );

  const linked = rows.filter((row) => row.fields.length > 0).length;
  const open = rows.filter((row) => row.fields.length === 0);
  const proposals = Object.keys(proposed).length;

  /** Neem voorstellen over en markeer ze, zodat ze na te lopen blijven. */
  function accept(pairs: { key: string; columns: string[] }[], from: string) {
    const next = { ...mapping };
    const marks: Record<string, string> = {};
    for (const pair of pairs) {
      if (pair.columns.length === 0) continue;
      next[pair.key] = [pair.columns[0]];
      marks[pair.key] = pair.columns[0];
    }
    setProposed(marks);
    setSource(from);
    onChange(next);
  }

  async function suggest() {
    setFailed(false);
    // Alleen wat nog open staat, en alleen de kolommen die nog vrij zijn: wat al
    // gekoppeld is hoeft niet opnieuw en mag niet weggekaapt worden.
    const taken = rows.flatMap((row) => mapping[row.key] ?? []);
    const free = columns.filter((column) => !taken.includes(column));
    const described = open.map((row) => ({
      key: row.key,
      text: describeAttribute({
        key: row.key,
        questions: row.questions.map((question) => question[locale]),
      }),
    }));

    // Eerst Claude: die kent de vaktaal en haalt er meer uit. Is er geen sleutel
    // op de server, dan is dat geen storing maar een instelling die ontbreekt,
    // en draait het model in de browser — met dat verschil erbij, want het is
    // een andere kwaliteit en dat hoort niemand te moeten raden.
    setBusy('remote');
    try {
      const result = await requestMapping(
        { attributes: described, columns: free.map((column) => ({ key: column, text: describeColumn(column, catalog) })) },
        catalog.columns,
      );
      setNotes([...result.notes, ...result.rejected]);
      accept(result.pairs, result.model);
      return;
    } catch (caught) {
      if (!(caught instanceof MappingNotConfigured)) {
        setFailed(true);
        setBusy(undefined);
        return;
      }
    }

    setBusy({ step: 'library' });
    try {
      const vectors = await embed(
        [...described.map((entry) => entry.text), ...free.map((column) => describeColumn(column, catalog))],
        setBusy,
      );
      const found = suggestMappings(
        described.map((entry, i) => ({ key: entry.key, vector: vectors[i] })),
        free.map((column, i) => ({ key: column, vector: vectors[described.length + i] })),
      );
      setNotes([]);
      accept(found.map((f) => ({ key: f.key, columns: [f.column] })), 'browser');
    } catch (caught) {
      setFailed(caught instanceof ModelUnavailable);
    } finally {
      setBusy(undefined);
    }
  }

  /** Een eigen keuze haalt het voorstel-label weg; het is dan van de merchant. */
  function choose(key: string, column: string) {
    setProposed((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    onChange({ ...mapping, [key]: column === NONE ? [] : [column] });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub={s.mapping.intro}>{s.mapping.heading}</CardTitle>
        <p className="text-sm">
          <span className="tnum font-semibold">{linked}</span>
          <span className="text-muted"> / </span>
          <span className="tnum font-semibold">{rows.length}</span>{' '}
          <span className="text-muted">{s.mapping.countLinked}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{s.mapping.agentNote}</p>

        {open.length > 0 ? (
          <div className="mt-3">
            <Button onClick={() => void suggest()} loading={busy !== undefined}>
              <Sparkles className="size-4" aria-hidden />
              {busy
                ? s.mapping.suggestBusy[busy === 'remote' ? 'remote' : busy.step]
                : s.mapping.suggest}
            </Button>
            <p className="mt-2 text-xs leading-relaxed text-muted">{s.mapping.suggestNote}</p>
          </div>
        ) : null}

        {failed ? (
          <div className="mt-3">
            <ErrorState
              title={s.mapping.suggestFailed}
              body={s.mapping.suggestFailedBody}
              next={s.mapping.suggestFailedNext}
            />
          </div>
        ) : null}

        {notes.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 rounded-lg border border-warn/40 bg-warn-soft px-4 py-2.5 pl-7 text-xs leading-relaxed text-ink">
            {notes.map((note, i) => <li key={i}>{note}</li>)}
          </ul>
        ) : null}

        {proposals > 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-ink">
            <span className="tnum font-semibold">{proposals}</span> {s.mapping.proposedCount}{' '}
            {source === 'browser' ? s.mapping.bySelf : `${s.mapping.byModel} ${source}.`}
          </p>
        ) : null}
      </Card>

      <Card>
        <ul>
          {rows.map((row) => {
            const current = mapping[row.key]?.[0] ?? row.fields[0] ?? NONE;
            const isProposal = proposed[row.key] !== undefined;
            return (
              <li
                key={row.key}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{row.key}</p>
                  {/* De vraag eronder: een sleutel alleen is een woord zonder
                      context, en dan kan niemand beoordelen of de kolom klopt. */}
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {row.questions[0]?.[locale]}
                  </p>
                </div>
                {isProposal ? <Badge tone="accent">{s.mapping.proposed}</Badge> : null}
                <select
                  aria-label={row.key}
                  value={current}
                  onChange={(event) => choose(row.key, event.target.value)}
                  className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink"
                >
                  <option value={NONE}>{s.mapping.noColumn}</option>
                  {columns.map((column) => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </Card>

      <Button onClick={onContinue}>{s.mapping.continue}</Button>
    </div>
  );
}
