'use client';

// Welke vragenset hoort bij welke eigen categorie.
//
// Het eerste wat er op het vragensetscherm gebeurt, want deze keuze bepaalt wélke
// vragen er zijn: een gordijnenset vraagt naar lichtdoorlatendheid, een meubelset
// naar slijtvastheid. Daarna valideert de merchant die vragen, en pas daarna
// koppelt hij kenmerken — alleen voor de vragen die overbleven.
//
// Eerst stond dit op het koppelscherm. Dan koppelde de merchant kenmerken van
// vragen die hij een scherm later uitzette.

import { useEffect, useRef, useState } from 'react';
import type { Locale, QuestionSetState } from '../src/domain/types';
import { MIN_MARGIN_CATEGORIES, suggestMappings } from '../src/semantic/suggest';
import { embed } from '../src/semantic/model';
import { MappingNotConfigured, requestMapping } from '../src/semantic/remote';
import type { Strings } from '../src/i18n/strings';
import { Button, Card } from './ui';

interface Props {
  s: Strings;
  locale: Locale;
  state: QuestionSetState;
  /** Welke vragenset uit de lijst bij welke eigen categorie hoort. */
  categories: Record<string, string | null>;
  onCategories: (
    next: Record<string, string | null> | ((current: Record<string, string | null>) => Record<string, string | null>),
  ) => void;
  /**
   * Een categorie niet meenemen. Hetzelfde als "Uitgesloten" op het
   * categoriescherm: haar vragen, kenmerken en producten doen verderop niet mee.
   */
  onExclude: (set: { category: string; parent?: string }) => void;
  /** Wat eerder niet meegenomen werd, om het terug te kunnen draaien. */
  excluded: { key: string; label: string }[];
  onInclude: (key: string) => void;
}

/** De waarde in de keuzelijst voor "niet meenemen"; botst niet met een overlay-id. */
const EXCLUDE = '\u0000exclude';

// `excluded` valt terug op een lege lijst. Toen dit blok de lijst erbij kreeg,
// laadde bij het herladen van de code eerst dit bestand en pas daarna de pagina
// die hem meegeeft; `excluded.length` op niets liet het scherm omvallen en nam de
// ingelezen catalogus mee.
export function CategorySetsCard({ s, locale, state, categories, onCategories, onExclude, excluded = [], onInclude }: Props) {
  /** Bezig met het koppelen van de vragensets, en wie het deed. */
  const [matchingSets, setMatchingSets] = useState(false);
  const [setsBy, setSetsBy] = useState<string>();
  /**
   * Een grendel die synchroon dichtgaat. Elke toepassing levert een nieuwe staat
   * en dus een nieuwe render; zonder grendel begint het effect opnieuw — gemeten
   * negen modelaanroepen waar er één hoort te zijn.
   */
  const startedSets = useRef(false);

  /**
   * Leg de vragensets uit de lijst op de eigen categorieën van de merchant.
   *
   * Dit gebeurt vanzelf en niet pas na een klik, want zonder deze koppeling
   * krijgt élke categorie stilzwijgend alleen de algemene vragen — en dan valt
   * het cijfer te gunstig uit, want juist de categoriespecifieke vragen dragen
   * de onomkeerbare fout. Een merchant hoort niet te moeten weten dat hij eerst
   * een knop moet indrukken voordat zijn eigen lijst helemaal meetelt.
   *
   * Wat de deur uit gaat zijn twee lijstjes namen. Geen aantallen, geen
   * producten: het aantal producten per categorie zegt niets over wélke set
   * erbij hoort, en het is data die er niet hoeft te zijn.
   */
  async function matchCategories(open: typeof state.sets) {
    const namen = state.overlays.map((overlay) => ({ key: overlay.id, text: overlay.label[locale] }));
    const eigen = open.map((set) => ({ key: set.category as string, text: set.category as string }));

    const toepassen = (pairs: { key: string; columns: string[] }[], from: string) => {
      if (pairs.length === 0) return false;
      // Op de keuze van nu, en alleen wat nog open is. Het model antwoordt pas na
      // een paar seconden; wat de merchant intussen koos, is van hem.
      onCategories((current) => {
        const next = { ...current };
        for (const pair of pairs) {
          const category = pair.columns[0];
          if (category && !(category in current)) next[category] = pair.key;
        }
        return next;
      });
      setSetsBy(from);
      return true;
    };

    try {
      const gevonden = await requestMapping(
        { kind: 'categories', attributes: namen, columns: eigen },
        eigen.map((entry) => entry.key),
      );
      if (toepassen(gevonden.pairs, gevonden.model)) return;
    } catch (caught) {
      if (!(caught instanceof MappingNotConfigured)) return;
    }

    // Terugval op het browsermodel. Dat haalt de categorieën met een verwant
    // woord (Decoratiestoffen ↔ Decorative fabrics) en laat de rest los —
    // gemeten 2 van de 4 goed en 0 fout, dankzij de wederzijds-beste-eis.
    try {
      const vectors = await embed([...namen.map((n) => n.text), ...eigen.map((e) => e.text)]);
      const found = suggestMappings(
        namen.map((n, i) => ({ key: n.key, vector: vectors[i] })),
        eigen.map((e, i) => ({ key: e.key, vector: vectors[namen.length + i] })),
        [],
        { minMargin: MIN_MARGIN_CATEGORIES },
      );
      toepassen(found.map((f) => ({ key: f.key, columns: [f.column] })), 'browser');
    } catch {
      // Geen model beschikbaar: de keuzelijsten staan er, de merchant wijst aan.
    }
  }

  useEffect(() => {
    if (startedSets.current) return;
    startedSets.current = true;
    // Alleen wat nog open is. Een categorie waar de merchant al over besliste —
    // ook "alleen de algemene vragen", die geen eigen set heeft — gaat niet
    // opnieuw naar het model. Eerst ging dat wel: het voorstel overschreef zijn
    // keuze niet, maar het scherm zei daarna "automatisch gekoppeld", en dan lijkt
    // het alsof de app zijn keuze vergeten was.
    const openSets = state.sets.filter(
      (set) => set.category !== undefined && set.overlayId === undefined && !(set.category in categories),
    );
    void (async () => {
      // De render eerst laten aflopen; een fase omzetten in het lichaam van een
      // effect lokt een extra render uit voordat deze klaar is.
      await Promise.resolve();
      if (openSets.length > 0 && state.overlays.length > 0) {
        setMatchingSets(true);
        try {
          await matchCategories(openSets);
        } finally {
          setMatchingSets(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sets, state.overlays]);

  if (state.overlays.length === 0) return null;

  return (
    <>
      {/* Eerst welke vragenset bij welke categorie hoort, en pas daarna de
          kenmerken. Die volgorde is niet willekeurig: kiest de merchant hier een
          andere set, dan verandert de lijst kenmerken eronder mee — een
          gordijnenset vraagt naar lichtdoorlatendheid, een meubelset naar
          slijtvastheid. */}
      {state.overlays.length > 0 ? (
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {s.mapping.setsHeading}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{s.mapping.setsNote}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{s.mapping.setExcludeNote}</p>
          {state.sets.some((set) => set.parent) ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.mapping.setSubNote}</p>
          ) : null}
          {matchingSets ? (
            <p className="mt-1.5 text-xs text-muted">{s.mapping.setsMatching}</p>
          ) : !setsBy && Object.keys(categories).length > 0 ? (
            <p className="mt-1.5 text-xs text-muted">{s.mapping.setsRemembered}</p>
          ) : setsBy ? (
            <p className="mt-1.5 text-xs text-muted">
              {s.mapping.setsMatched}{' '}
              <span className="text-ink">
                {setsBy === 'browser' ? s.mapping.bySelf : `${s.mapping.byModel} ${setsBy}.`}
              </span>
            </p>
          ) : null}
          <ul className="mt-2">
            {state.sets.filter((set) => set.category !== undefined).map((set) => (
              <li
                key={set.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2 first:border-t-0"
              >
                <span className={`min-w-0 flex-1 truncate text-sm ${set.parent ? 'pl-4' : ''}`}>
                  {set.category}
                  {/* Een subcategorie noemt haar tak: "Lampenkapstoffen" zegt
                      zonder "onder Decoratiestoffen" niet waar ze in de boom zit. */}
                  {set.parent ? (
                    <span className="ml-1.5 text-xs text-muted">{s.mapping.setUnder} {set.parent}</span>
                  ) : null}
                  <span className="ml-2 text-xs text-muted">
                    {set.questions.filter((q) => q.layer === 'category').length > 0
                      ? `${set.questions.length} ${s.mapping.setQuestions}`
                      : s.mapping.setBaseOnly}
                  </span>
                  {/* Een losstaande categorie: geen algemene vragen, alleen de
                      eigen. Dat hoort hij te zien, want anders lijkt het getal
                      naast een gewone categorie klein uitgevallen. */}
                  {set.questions.length > 0 && set.questions.every((q) => q.layer !== 'base') ? (
                    <span className="ml-2 text-xs text-muted">· {s.mapping.setStandalone}</span>
                  ) : null}
                </span>
                <select
                  aria-label={set.category}
                  // Een bewuste keuze voor "alleen de algemene vragen" is `null`,
                  // en die mag niet terugvallen op het voorstel van eerder.
                  value={(set.category as string) in categories
                    ? categories[set.category as string] ?? ''
                    : set.overlayId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === EXCLUDE) {
                      onExclude({ category: set.category as string, parent: set.parent });
                      return;
                    }
                    onCategories((current) => ({
                      ...current,
                      [set.category as string]: value === '' ? null : value,
                    }));
                  }}
                  className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink"
                >
                  <option value="">{s.mapping.setNone}</option>
                  <option value={EXCLUDE}>{s.mapping.setExclude}</option>
                  {state.overlays.map((overlay) => (
                    <option key={overlay.id} value={overlay.id}>{overlay.label[locale]}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          {/* Wat niet meegenomen wordt, blijft zichtbaar en is terug te draaien.
              Een categorie die stil uit de lijst verdwijnt, zoekt niemand terug. */}
          {excluded.length > 0 ? (
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-xs font-medium text-muted">{s.mapping.setExcludedHeading}</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {excluded.map((entry) => (
                  <li key={entry.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted line-through">{entry.label}</span>
                    <Button variant="quiet" onClick={() => onInclude(entry.key)}>{s.mapping.setInclude}</Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

    </>
  );
}
