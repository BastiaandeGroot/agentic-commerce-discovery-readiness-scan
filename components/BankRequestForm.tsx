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
import { Send, TriangleAlert } from 'lucide-react';
import { Button, Card, CardTitle, ErrorState, Input } from './ui';
import { authHeader } from '../src/auth/client';
import type { Strings } from '../src/i18n/strings';

export interface Segment {
  name: string;
  count: number;
}

type Phase = 'idle' | 'busy' | { failed: string };

/** Lijkt deze marktnaam op wat de merchant invulde? Ruw, en dat is genoeg: het
 *  bepaalt alleen de volgorde, nooit wat er wel of niet getoond wordt. */
function matches(vertical: string, market: string): boolean {
  const value = market.trim().toLowerCase();
  if (value === '') return false;
  const name = vertical.toLowerCase();
  return name.includes(value) || value.includes(name);
}

/** Een vragenlijst die er al ligt, met een voorproefje van zijn vragen. */
export interface BankOffer {
  id: string;
  vertical: string;
  version: number;
  questions: number;
  categories: number;
  sample: { nl: string; en: string }[];
}

export function BankRequestForm({ s, locale, segments, accountId, siteUrl, onQueued, onChoose }: {
  s: Strings;
  locale: 'nl' | 'en';
  /** De marktsegmenten uit het categoriescherm, facetten er al uit. */
  segments: Segment[];
  /** Zonder account kan er niets bewaard worden en dus niets bericht. */
  accountId?: string;
  /** De winkel van de merchant, als hij hem op het categoriescherm gaf. */
  siteUrl?: string;
  onQueued: (joined: boolean) => void;
  /** De merchant herkent zijn markt in een lijst die er al ligt. */
  onChoose: (id: string) => void;
}) {
  const [market, setMarket] = useState('');
  const [guessing, setGuessing] = useState(false);
  const [panel, setPanel] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [offers, setOffers] = useState<BankOffer[] | undefined>();
  /** De keuze: een bank-id, of `none` voor "geen van deze past". */
  const [choice, setChoice] = useState<string>();

  // Wat er al ligt. Een bank hoort bij een markt en niet bij een winkel, dus de
  // tweede merchant in woontextiel hoeft niets aan te vragen — die kan meteen
  // door. Dat is precies wat dit blok hem laat zien.
  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        const response = await fetch('/api/banks', { headers: await authHeader() });
        const data = response.ok ? await response.json() : undefined;
        if (alive) setOffers((data?.banks ?? []) as BankOffer[]);
      } catch {
        if (alive) setOffers([]);
      }
    })();
    return () => { alive = false; };
  }, []);

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

  /**
   * Is de opgegeven markt eigenlijk een van zijn eigen categorieën?
   *
   * Dat is geen fout maar wel bijna altijd een vergissing: "meubelstoffen" is
   * een segment van woontextiel, en een eigen bank daarvoor zou zijn
   * meubelstoffen langs een andere lat leggen dan zijn gordijnstoffen. De
   * volgende merchant in die markt is dan met geen van beide te vergelijken.
   *
   * Een waarschuwing en geen blokkade: een winkel die uitsluitend meubelstoffen
   * verkoopt heeft wél die markt, en dat weet hij beter dan wij. Vandaar ook de
   * eis dat er meer dan één segment is — bij één segment is het geen vergissing
   * maar een specialist.
   */
  const looksLikeCategory = segments.length > 1 && segments.some(
    (one) => one.name.trim().toLowerCase() === market.trim().toLowerCase(),
  );

  /**
   * Eén markt, en niet twee.
   *
   * De vragenlijst wordt voor één markt gemaakt: hij hangt aan een panel van
   * vijf winkels in díe markt. "Woontextiel en tuinmeubelen" zou één bank
   * opleveren die voor allebei half klopt, en die is dan voor geen van beide een
   * meetlat. Wie in twee markten handelt doet ze na elkaar.
   */
  function marketProblem(): string | undefined {
    const value = market.trim();
    if (/[,;/&]| en | and |\+/i.test(value)) return s.waiting.marketTooMany;
    if (value.split(/\s+/).length > 4) return s.waiting.marketTooMany;
    return undefined;
  }

  async function submit() {
    const problem = marketProblem();
    if (problem) { setPhase({ failed: problem }); return; }
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

        {/* Past er al een lijst op zijn markt? Dan is de rest van dit scherm
            overbodig, en dat hoort hij te zien vóórdat hij een aanvraag invult
            die hem twee werkdagen kost. */}
        {offers === undefined ? (
          <p className="text-sm text-muted">{s.waiting.matchBusy}</p>
        ) : offers.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted">{s.waiting.matchEmpty}</p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{s.waiting.matchHeading}</legend>
            <p className="mb-1 text-xs leading-relaxed text-muted">{s.waiting.matchBody}</p>

            {[...offers]
              // De lijst die op zijn ingevulde markt lijkt bovenaan. Hij hoeft
              // niet te zoeken naar het antwoord dat hij net zelf heeft gegeven.
              .sort((a, b) => Number(matches(b.vertical, market)) - Number(matches(a.vertical, market)))
              .map((offer) => (
              <label
                key={offer.id}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                  choice === offer.id ? 'border-accent bg-surface-2' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="bank-choice"
                  className="mt-1"
                  checked={choice === offer.id}
                  onChange={() => setChoice(offer.id)}
                />
                <span className="min-w-0 flex-1">
                  {/* Met versie: zonder is niet te zien of dit de herziening is
                      of de lijst die hij al kende. */}
                  <span className="block text-sm font-medium">
                    {offer.vertical} <span className="font-normal text-muted">v{offer.version}</span>
                  </span>
                  <span className="block text-xs text-muted">
                    {offer.questions} {s.waiting.matchQuestions}
                    {offer.categories > 0 ? ` · ${offer.categories} ${s.waiting.matchCategories}` : ''}
                  </span>
                  {offer.sample.length > 0 ? (
                    <span className="mt-1.5 block text-xs leading-relaxed text-muted">
                      <span className="font-medium">{s.waiting.matchSample}:</span>
                      <span className="mt-0.5 block">
                        {offer.sample.map((question) => (
                          <span key={question.nl} className="block">— {question[locale]}</span>
                        ))}
                      </span>
                    </span>
                  ) : null}
                </span>
              </label>
            ))}

            <label
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                choice === 'none' ? 'border-accent bg-surface-2' : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="bank-choice"
                className="mt-1"
                checked={choice === 'none'}
                onChange={() => setChoice('none')}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{s.waiting.matchNone}</span>
                <span className="block text-xs leading-relaxed text-muted">{s.waiting.matchNoneHint}</span>
              </span>
            </label>
          </fieldset>
        )}

        {choice !== undefined && choice !== 'none' ? (
          <div>
            <Button onClick={() => onChoose(choice)}>{s.waiting.matchUse}</Button>
          </div>
        ) : null}

        {/* De aanvraag zelf: alleen als er niets past. Hem altijd tonen zou de
            merchant een formulier laten invullen dat hij niet nodig heeft. */}
        {offers !== undefined && (offers.length === 0 || choice === 'none') ? (
        <>
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

        {looksLikeCategory ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-warn/40 bg-warn-soft px-3 py-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            <p className="text-sm leading-relaxed text-ink">
              {s.waiting.marketIsCategory.replace('{naam}', market.trim())}
            </p>
          </div>
        ) : null}

        {typeof phase === 'object' ? (
          <ErrorState title={s.waiting.submitFailed} body={phase.failed} />
        ) : null}

        <div>
          <Button onClick={() => void submit()} loading={phase === 'busy'} disabled={market.trim() === ''}>
            <Send className="size-4" aria-hidden />
            {phase === 'busy' ? s.waiting.submitBusy : s.waiting.submit}
          </Button>
        </div>
        </>
        ) : null}
      </div>
    </Card>
  );
}
