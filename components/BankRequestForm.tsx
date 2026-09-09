'use client';

// De aanvraag die de merchant in de wachtrij zet.
//
// Twee dingen worden hier gevraagd en niet meer. De markt, want daar hangt de
// hele vragenlijst aan — een verkeerde markt zet de verkeerde vragen op zijn
// hele winkel. En de webshops die wij zouden moeten bekijken, want hij kent zijn
// markt beter dan wij.
//
// Wat hij aandraagt wordt tóégevoegd en niet overgenomen. Zou een merchant het
// panel bepalen, dan kiest hij zijn zwakste concurrenten en meet hij zichzelf
// rijk. Dat staat ook zo op het scherm, want hij hoort te weten wat er met zijn
// opgave gebeurt.
//
// Er gaat geen productdata mee: de markt, de segmenten met hun aantallen, en
// een URL.

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Card, CardTitle, ErrorState, Input } from './ui';
import { authHeader } from '../src/auth/client';
import type { Strings } from '../src/i18n/strings';

export interface Segment {
  name: string;
  count: number;
}

type Phase = 'idle' | 'busy' | { failed: string };

export function BankRequestForm({ s, segments, accountId, siteUrl, onQueued }: {
  s: Strings;
  /** De marktsegmenten uit het categoriescherm, facetten er al uit. */
  segments: Segment[];
  /** Zonder account kan er niets bewaard worden en dus niets bericht. */
  accountId?: string;
  /** De winkel van de merchant, als hij hem op het categoriescherm gaf. */
  siteUrl?: string;
  onQueued: (joined: boolean) => void;
}) {
  const [market, setMarket] = useState('');
  const [guessing, setGuessing] = useState(false);
  const [panel, setPanel] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');

  // Eén kleine aanroep over alleen de categorienamen. De merchant ziet het
  // voorstel staan en kan het overschrijven; hij beslist, wij stellen voor.
  useEffect(() => {
    if (segments.length === 0 || market !== '') return;
    let alive = true;
    void (async () => {
      // De render eerst laten aflopen; een setState in het lichaam van een
      // effect lokt een extra render uit voordat deze klaar is.
      await Promise.resolve();
      if (!alive) return;
      setGuessing(true);
      try {
        const response = await fetch('/api/mapping', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            kind: 'market',
            attributes: segments.map((one) => ({ key: one.name, text: `${one.count} producten` })),
            columns: [],
          }),
        });
        const result = response.ok ? await response.json() : undefined;
        const guess = String(result?.text ?? '').trim().toLowerCase();
        // "onbekend" is een geldig antwoord van het model en geen markt.
        if (alive && guess && guess !== 'onbekend' && guess.length <= 40) setMarket(guess);
      } catch {
        // Geen voorstel is geen fout: de merchant vult het zelf in.
      } finally {
        if (alive) setGuessing(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  async function submit() {
    setPhase('busy');
    try {
      const response = await fetch('/api/bank-request', {
        method: 'POST',
        // Zijn token gaat mee, anders weet de route niet wie er belt en weigert
        // hij — terecht, want dan zou hij namens niemand iets vastleggen.
        headers: { 'content-type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          accountId,
          vertical: market.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          segments,
          siteUrl,
          // Regel per regel; lege regels vallen weg. Wat hier staat is een
          // suggestie voor het panel en niet het panel zelf.
          suggestedSites: panel.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20),
        }),
      });
      const result = await response.json().catch(() => undefined);
      if (!response.ok) {
        // De route weet vaak wél wat er mis is — "probeer het nog eens" helpt
        // niemand als het antwoord "je bent niet ingelogd" was.
        setPhase({ failed: typeof result?.error === 'string' ? result.error : s.waiting.submitFailedNext });
        return;
      }
      onQueued(result?.joined === true);
    } catch {
      setPhase({ failed: s.waiting.submitFailedNext });
    }
  }

  if (!accountId) {
    return (
      <Card>
        <ErrorState title={s.waiting.needAccount} body={s.waiting.needAccountBody} />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>{s.waiting.askHeading}</CardTitle>
      <div className="flex flex-col gap-4">
        <Input
          id="bank-market"
          label={s.waiting.marketLabel}
          hint={guessing ? s.waiting.marketBusy : s.waiting.marketHint}
          value={market}
          onChange={setMarket}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bank-panel" className="text-sm font-medium">{s.waiting.panelLabel}</label>
          <textarea
            id="bank-panel"
            rows={4}
            value={panel}
            onChange={(event) => setPanel(event.target.value)}
            placeholder={s.waiting.panelPlaceholder}
            aria-describedby="bank-panel-hint"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <p id="bank-panel-hint" className="text-xs leading-relaxed text-muted">{s.waiting.panelHint}</p>
        </div>

        {typeof phase === 'object' ? (
          <ErrorState title={s.waiting.submitFailed} body={phase.failed} />
        ) : null}

        <div>
          <Button onClick={() => void submit()} loading={phase === 'busy'} disabled={market.trim() === ''}>
            <Send className="size-4" aria-hidden />
            {phase === 'busy' ? s.waiting.submitBusy : s.waiting.submit}
          </Button>
        </div>
      </div>
    </Card>
  );
}
