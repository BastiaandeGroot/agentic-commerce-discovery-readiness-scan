'use client';

// Stap 3: het rapport.
//
// De kop is een trechter en geen cijfer, en er staat nergens een uitspraak over
// ranking — dat is een belofte over andermans black box en niet aan ons. Wat
// hier gemeten wordt is één ding: kan de catalogus de vragen beantwoorden die
// een koper in deze markt stelt.

import { useRouter } from 'next/navigation';
import { useRef, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Download } from 'lucide-react';
import { adviceKey, categoryLabel } from '../src/report/derive';
import { modelFromReport, type ModelQuestion, type ReportModel } from '../src/report/model';
import { toSnapshot, toSnapshotDetail } from '../src/engine/snapshot';
import { DetailNotSaved, snapshotStoreFor } from '../src/storage/snapshots';
import { supabase } from '../src/auth/client';
import { useAuth } from './auth/AuthProvider';
import type { Locale, QuestionSetState, ScanReport } from '../src/domain/types';
import { requirementLabel } from '../src/spec/fields';
import { PLACEMENT_FIELD, isPlacementAttribute } from '../src/spec/placement';
import type { Strings } from '../src/i18n/strings';
import { Badge, Bar, Button, Card, CardTitle, ErrorState, InfoButton, InfoPanel, Select, TrafficLight, statusOf } from './ui';
import { Explorer } from './Explorer';
import { AdvisoryCard } from './AdvisoryCard';
import type { SiteCheck } from '../src/collect/answers';

/** Waarom de toets op de achtergrond niet liep; zie `SiteCheckRefused`. */
export type SiteCheckFailure = 'forbidden' | 'not-configured' | 'too-many' | 'failed';
/** Waar de toets staat die de scanpagina zelf startte. */
export type SiteCheckProgress =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'done'; check: SiteCheck }
  | { status: 'failed'; reason: SiteCheckFailure };

function n(value: number): string {
  return value.toLocaleString('nl-NL');
}

function FunnelCard({ s, model }: { s: Strings; model: ReportModel }) {
  const { funnel } = model;
  const status = statusOf(funnel.avgAnswered, funnel.avgApplicable);
  // Eén uitleg tegelijk open: twee tegelijk maakt de kaart onleesbaar.
  const [openInfo, setOpenInfo] = useState<string>();
  // Kent deze catalogus geen enkele kritieke vraag, dan is de eerste trede leeg
  // en zegt hij niets. Dat gebeurt bij een voorlopige bank: welke fout in deze
  // markt onomkeerbaar is, volgt uit onderzoek. Hem dan stilzwijgend op "iedereen
  // geslaagd" zetten zou een poort suggereren die er niet is.
  const { hasCritical } = model;

  const rows = [
    { label: s.report.total, value: funnel.total, tone: 'neutral' as const, explain: undefined, info: undefined },
    {
      // Groen, ook als het nul is: basisgeschikt is een prestatie en geen
      // waarschuwing. Amber zeggen omdat het getal laag is maakt van de meting
      // een mening; de lengte van de balk zegt al hoe ver je bent.
      label: s.report.qualified, value: funnel.qualified, tone: 'ok' as const,
      explain: hasCritical ? s.report.qualifiedExplain : s.report.qualifiedNoCritical,
      info: s.report.qualifiedInfo,
    },
    {
      label: s.report.findable, value: funnel.findable, tone: 'ok' as const,
      explain: s.report.findableExplain, info: s.report.findableInfo,
    },
  ];

  return (
    <Card>
      <CardTitle>{s.report.funnelHeading}</CardTitle>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="tnum text-2xl font-semibold">{n(row.value)}</span>
              <span className="flex items-center gap-1.5 text-sm text-muted">
                {row.label}
                {row.info ? (
                  <InfoButton
                    label={s.report.infoLabel}
                    open={openInfo === row.label}
                    onToggle={() => setOpenInfo(openInfo === row.label ? undefined : row.label)}
                    onOpen={() => setOpenInfo(row.label)}
                    onClose={() => setOpenInfo(undefined)}
                  />
                ) : null}
              </span>
            </div>
            <div className="mt-1.5">
              <Bar value={row.value} total={funnel.total} tone={row.tone} />
            </div>
            {row.explain ? <p className="mt-1 text-xs text-muted">{row.explain}</p> : null}
            {row.info && openInfo === row.label ? <InfoPanel>{row.info}</InfoPanel> : null}
          </div>
        ))}
      </div>
      {/* De trechter is binair en zegt vaak nul. Dit laat zien hoe ver een
          product komt, zonder te doen alsof gedeeltelijk ook goed is. */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-center gap-3">
          <TrafficLight status={status} />
          <div className="min-w-0">
            <p className="font-medium">{s.report.status[status]}</p>
            <p className="tnum text-sm text-muted">
              {funnel.avgAnswered.toFixed(1)} {s.report.statusScale}{' '}
              {funnel.avgApplicable.toFixed(0)} {s.report.statusAnswered}
            </p>
            {/* Twee schalen naast elkaar. Het aantal vragen is meteen te
                bevatten; de punten zeggen wat het waard is, want een kritieke
                vraag weegt vijf keer een lage. */}
            <p className="tnum text-xs text-muted">
              {s.report.avgPointsLine} {funnel.avgEarned.toFixed(1)} {s.report.statusScale}{' '}
              {funnel.avgWeight.toFixed(0)} {s.report.points}
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          {s.report.statusExplain[status]}
        </p>
      </div>
    </Card>
  );
}

/**
 * Waar begin je?
 *
 * De trechter is binair en zegt bij de meeste merchants nul. Dat leest als een
 * dichte deur terwijl er al veel staat. Dit blok laat de afstand zien en wat de
 * eerstvolgende stap oplevert — zonder de lat te verlagen, want vindbaar blijft
 * alle vragen beantwoord. Het is een richting, geen zachter cijfer.
 */
/**
 * Waar sta je per categorie, in drie gemiddelden met hun doel ernaast.
 *
 * Gemiddelden per product en geen percentages: "2 van de 7 kritieke vragen"
 * zegt hoeveel werk er ligt, 30% niet. En het doel is nooit verzonnen — het is
 * telkens "alles", omdat de twee treden van de trechter precies dat vragen.
 */
function CategoryScores({ s, model }: { s: Strings; model: ReportModel }) {
  const [category, setCategory] = useState('all');
  // Eén uitleg tegelijk open, zoals bij de trechter.
  const [openInfo, setOpenInfo] = useState<string>();

  // Hoofdcategorieën eerst, hun subcategorieën eronder: dat is de volgorde
  // waarin een merchant zijn eigen boom leest.
  const options = useMemo(() => [
    { value: 'all', label: s.report.scoreAllCategories },
    ...model.categories.map((row) => ({
      value: `${row.setId}|${row.subcategory ?? ''}`,
      label: row.subcategory ? `   ${row.category} › ${row.subcategory}` : row.category,
    })),
  ], [model.categories, s.report.scoreAllCategories]);

  // De afleiding staat in `src/report/derive.ts`, zodat de pdf hetzelfde zegt.
  const rowsByKey = useMemo(() => new Map(model.scoreRows.map((row) => [row.key, row])), [model.scoreRows]);
  const shown = rowsByKey.get(category);

  if (model.categories.length === 0 || !shown) return null;

  // Heeft deze catalogus subcategorieën, en maakt de vragenlijst er onderscheid
  // in? Die twee zijn los: het eerste komt uit de data, het tweede uit de lijst.
  const hasSubcategories = model.hasSubcategories === true;
  const hasLevels = model.categories.some((row) => row.subcategory !== undefined);

  // Een oudere bewaarde analyse kent niet alle drie; wat ontbreekt staat er niet.
  const bars = [
    { label: s.report.scoreCritical, goal: s.report.scoreCriticalGoal, info: s.report.scoreCriticalInfo, value: shown.critical },
    { label: s.report.scoreGeneral, goal: s.report.scoreGeneralGoal, info: s.report.scoreGeneralInfo, value: shown.general },
    { label: s.report.scoreAll, goal: s.report.scoreAllGoal, info: undefined, value: shown.all },
  ].flatMap((bar) => (bar.value ? [{ ...bar, value: bar.value }] : []));

  return (
    <Card>
      <CardTitle sub={s.report.scoreIntro}>{s.report.scoreHeading}</CardTitle>

      {options.length > 2 ? (
        <div className="mb-3">
          <Select
            label={s.report.filterCategory}
            value={category}
            onChange={setCategory}
            options={options}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        {bars.map((bar) => {
          const goal = Math.max(bar.value.total, 0);
          const done = goal > 0 && bar.value.answered >= goal - 0.001;
          const togo = Math.max(goal - bar.value.answered, 0);
          // Alle drie met dezelfde precisie, anders telt 0,8 + 12,7 niet op tot
          // 14 en lijkt het rapport zich te vergissen. Het doel is fractioneel
          // zodra er categorieën met verschillende aantallen bij elkaar staan.
          const fmt = (value: number) => value.toFixed(1);
          return (
            <div key={bar.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {bar.label}
                  {bar.info ? (
                    <InfoButton
                      label={s.report.infoLabel}
                      open={openInfo === bar.label}
                      onToggle={() => setOpenInfo(openInfo === bar.label ? undefined : bar.label)}
                      onOpen={() => setOpenInfo(bar.label)}
                      onClose={() => setOpenInfo(undefined)}
                    />
                  ) : null}
                </span>
                <span className="text-sm">
                  <span className="tnum font-semibold">{fmt(bar.value.answered)}</span>
                  <span className="text-muted"> {s.report.scoreOf} </span>
                  <span className="tnum font-semibold">{fmt(goal)}</span>
                  {/* Wat er nog te halen valt, en niet alleen wat er staat. Een
                      merchant stuurt op het verschil, niet op het getal. */}
                  {done ? (
                    <span className="ml-2 text-xs text-ok">✓ {s.report.scoreDone}</span>
                  ) : (
                    <span className="ml-2 text-xs text-muted">
                      {/* Onder 0,05 zou één decimaal "0.0" tonen terwijl er nog
                          producten openstaan; dan twee decimalen. */}
                      <span className="tnum">{togo < 0.05 ? togo.toFixed(2) : fmt(togo)}</span> {s.report.scoreToGo}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1">
                {/* Groen: de balk toont wat beantwoord is, zoals bij de vragen
                    hieronder. Wat nog openstaat is het lege deel en het getal
                    ernaast, niet een waarschuwingskleur. */}
                <Bar value={bar.value.answered} total={goal} tone="ok" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{bar.goal}</p>
              {bar.info && openInfo === bar.label ? <InfoPanel>{bar.info}</InfoPanel> : null}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        <span className="tnum">{n(shown.total)}</span> {s.report.scoreProducts} · {shown.label}
      </p>

      {/* Zonder deze regel lijkt een ontbrekend niveau een gemis in de app,
          terwijl het een eigenschap van de vragenlijst is. */}
      {hasSubcategories && !hasLevels ? (
        <p className="mt-1 text-xs leading-relaxed text-muted">{s.report.scoreLevelNote}</p>
      ) : null}
    </Card>
  );
}

/** De volgorde waarin een retailer zijn vragen leest: wat het zwaarst weegt eerst. */
const IMPORTANCE_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * De vragen van de bank, per categorie.
 *
 * Alleen wat een retailer nodig heeft om de lijst te beoordelen: de vraag, hoe
 * zwaar hij weegt, welk kenmerk hem beantwoordt en bij hoeveel producten dat
 * lukt. Dekking, herkomst en weging staan op het vragensetscherm; hier zou het
 * de vraag zelf wegdrukken.
 */
function BankQuestions({ s, locale, model, rows }: {
  s: Strings; locale: Locale; model: ReportModel; rows: NonNullable<ReportModel['bankQuestions']>;
}) {
  const [setId, setSetId] = useState(model.categories[0]?.setId ?? '');
  const shown = useMemo(() => rows
    .filter((row) => row.setId === setId)
    .sort((a, b) => Number(!a.scored) - Number(!b.scored)
      || (IMPORTANCE_ORDER[a.importance] ?? 9) - (IMPORTANCE_ORDER[b.importance] ?? 9)
      || a.label[locale].localeCompare(b.label[locale])), [rows, setId, locale]);

  return (
    <Card>
      <CardTitle sub={s.report.bankQuestionsIntro}>{s.report.bankQuestionsHeading}</CardTitle>
      {model.categories.length > 1 ? (
        <div className="mb-3">
          <Select
            label={s.report.filterCategory}
            value={setId}
            onChange={setSetId}
            options={model.categories.map((c) => ({ value: c.setId, label: `${categoryLabel(c)} (${n(c.total)})` }))}
          />
        </div>
      ) : null}
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{s.report.bankQuestionsNone}</p>
      ) : (
        <ul>
          {shown.map((row) => (
            <li key={row.questionId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line py-2 first:border-t-0">
              <Badge tone={row.importance === 'critical' ? 'danger' : 'neutral'}>
                {s.questions.importance[row.importance as keyof typeof s.questions.importance] ?? row.importance}
              </Badge>
              <span className="min-w-0 flex-1 text-sm">
                {row.label[locale]}
                {row.needs.length > 0 ? (
                  <span className="mt-0.5 block text-xs text-muted">
                    {s.report.bankQuestionsNeeds} {row.needs.map((need) => need[locale]).join(', ')}
                  </span>
                ) : null}
              </span>
              <span className="tnum shrink-0 text-xs text-muted">
                {row.scored
                  ? <>{n(row.answered)}/{n(row.applicable)} {s.report.fromFeed}</>
                  : s.questions.notScored}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function QuestionCoverageCard({ s, model, locale, onReviewQuestion }: {
  s: Strings; model: ReportModel; locale: Locale;
  onReviewQuestion?: (question: { setId: string; questionId: string; base: boolean }) => void;
}) {
  const [setId, setSetId] = useState('all');
  const [openRow, setOpenRow] = useState<string>();
  /** Waarmee beantwoord: los van "waarom niet", want je wilt ze naast elkaar kunnen zien. */
  const [openAnswered, setOpenAnswered] = useState<string>();
  const categories = model.categories;

  // Toon de categorienaam van de merchant, niet onze interne set-id.
  const categoryName = new Map(categories.map((c) => [c.setId, categoryLabel(c)]));

  // Beste eerst. Een merchant leest dan van boven naar beneden af waar hij al
  // ver is en waar het werk begint, in plaats van meteen tegen het slechtste
  // nieuws aan te kijken.
  const rows = (model.questions ?? []).filter((row) => setId === 'all' || row.setId === setId);

  // Zonder categoriekeuze zou de lijst over alle sets heen te lang worden; met
  // een gekozen categorie hoort hij compleet te zijn.
  const shown = setId === 'all' ? rows.slice(0, 14) : rows;

  if (model.questions === undefined) {
    return (
      <Card>
        <CardTitle sub={s.report.questionsIntro}>{s.report.questionsHeading}</CardTitle>
        <p className="text-sm text-muted">{s.pages.dashboard.snapshotOld}</p>
      </Card>
    );
  }
  if (model.questions.length === 0 && categories.length === 0) return null;

  return (
    <Card>
      <CardTitle sub={s.report.questionsIntro}>{s.report.questionsHeading}</CardTitle>

      {categories.length > 1 ? (
        <div className="mb-3">
          <Select
            label={s.report.filterCategory}
            value={setId}
            onChange={setSetId}
            options={[
              { value: 'all', label: s.report.allCategories },
              ...categories.map((c) => ({ value: c.setId, label: `${categoryLabel(c)} (${n(c.total)})` })),
            ]}
          />
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-sm text-muted">{s.report.allAnswered}</p>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((row) => {
            const rowKey = `${row.setId}-${row.questionId}`;
            const weak = row.weak ?? (row.unusable ?? 0) + (row.incomplete ?? 0);
            return (
            <li key={rowKey}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  {/* Het gewicht staat vóór de vraag: het bepaalt of dit de
                      eerste trede van de trechter blokkeert of alleen de laatste. */}
                  {row.importance === 'critical' ? (
                    <Badge tone="danger">{s.questions.importance.critical}</Badge>
                  ) : null}
                  {row.layer === 'category' ? (
                    <Badge tone="neutral">{s.questions.layerCategory}</Badge>
                  ) : null}
                  <span className="min-w-0">{row.label[locale]}</span>
                </span>
                {/* Het ene getal dat zegt hoe het staat, en meteen de ingang naar
                    waarmee beantwoord is: een vinkje zonder herkomst is een oordeel
                    dat de merchant moet geloven, met de kolommen erbij kan hij het
                    nakijken. Eronder staat alleen nog wat werk is. */}
                {row.answered > 0 && row.answeredBy ? (
                  <button
                    type="button"
                    title={s.report.qAnsweredVia}
                    aria-expanded={openAnswered === rowKey}
                    onClick={() => setOpenAnswered(openAnswered === rowKey ? undefined : rowKey)}
                    className="tnum text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
                  >
                    {n(row.answered)}/{n(row.applicable)} {s.report.ofProducts}
                  </button>
                ) : (
                  <span className="tnum text-xs text-muted">
                    {n(row.answered)}/{n(row.applicable)} {s.report.ofProducts}
                  </span>
                )}
              </div>
              {/* Vier lagen: beantwoord, veld leeg, gevuld maar te mager, en
                  geen veld. Elke laag wijst naar ander werk — invullen,
                  herschrijven of modelleren — en op één hoop gooien levert een
                  lijst op waar niemand mee verder kan.

                  Beantwoord is `ok` en niet `accent`. Statuskleuren staan los
                  van de accentkleur: groen betekent hier "beantwoord" en niet
                  "klik hier". Toen het accent terracotta werd, las een balk die
                  voor 99% beantwoord was als alarm. */}
              <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-ok"
                  style={{ width: `${(row.answered / Math.max(row.applicable, 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-warn"
                  style={{ width: `${(row.empty / Math.max(row.applicable, 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-warn/50"
                  style={{ width: `${(weak / Math.max(row.applicable, 1)) * 100}%` }}
                />
              </div>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                <span>{categoryName.get(row.setId) ?? row.setId}</span>
                {/* Beantwoord, maar alleen dankzij de plek in de boom: geen gat, wel
                    werk. Los geteld, anders verdwijnt het in het groene getal. */}
                {(row.fromTree ?? 0) > 0 ? (
                  <span className="tnum" title={s.report.qNextTree}>
                    <span className="text-warn">{n(row.fromTree ?? 0)}</span> {s.report.fromTree}
                  </span>
                ) : null}
                {row.empty > 0 ? (
                  <span className="tnum" title={s.report.statesExplain.empty}>
                    <span className="text-warn">{n(row.empty)}</span> {s.report.enrichable}
                  </span>
                ) : null}
                {row.weak !== undefined && row.weak > 0 ? (
                  <span className="tnum">{n(row.weak)} {s.pages.dashboard.snapshotWeak}</span>
                ) : null}
                {row.unusable !== undefined && row.unusable > 0 ? (
                  <span className="tnum" title={s.report.statesExplain.unusable}>
                    {n(row.unusable)} {s.report.states.unusable.toLowerCase()}
                  </span>
                ) : null}
                {row.incomplete !== undefined && row.incomplete > 0 ? (
                  <span className="tnum" title={s.report.statesExplain.incomplete}>
                    {n(row.incomplete)} {s.report.states.incomplete.toLowerCase()}
                  </span>
                ) : null}
                {row.absent > 0 ? (
                  <span className="tnum" title={s.report.statesExplain.absent}>
                    {n(row.absent)} {s.report.neither}
                  </span>
                ) : null}
                {/* Alleen waar er iets te doen valt: bij een vraag die overal uit
                    een kolom beantwoord is, valt er niets uit te leggen. */}
                {row.evidence && (row.answered < row.applicable || (row.fromTree ?? 0) > 0) ? (
                  <button
                    type="button"
                    onClick={() => setOpenRow(rowKey === openRow ? undefined : rowKey)}
                    className="underline decoration-dotted underline-offset-2 hover:text-ink"
                  >
                    {rowKey === openRow ? s.report.qDetailClose : row.answered < row.applicable ? s.report.qDetail : s.report.qNext}
                  </button>
                ) : null}
                {/* Een vraag die hier niet klopt, meteen kunnen uitzetten: naar
                    het vragensetscherm, op deze vraag. */}
                {onReviewQuestion ? (
                  <button
                    type="button"
                    onClick={() => onReviewQuestion({
                      setId: row.setId, questionId: row.questionId, base: row.layer !== 'category',
                    })}
                    className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-ink"
                  >
                    {s.report.qReview}
                    <ArrowUpRight className="size-3" aria-hidden />
                  </button>
                ) : null}
              </p>

              {openAnswered === rowKey && row.answeredBy ? (
                <AnsweredPanel s={s} locale={locale} row={row} />
              ) : null}

              {/* Waaróp de vraag strandt, in de taal van de merchant: welk
                  kenmerk hij nodig heeft, welke kolom daaraan hangt, en wat de
                  goedkoopste handeling is. Zonder dit is een onbeantwoorde vraag
                  een mededeling in plaats van een klus. */}
              {rowKey === openRow ? (
                <div className="mt-2 rounded-lg bg-surface-2 p-3 text-xs">
                  <p className="font-medium text-muted">{s.report.qNeeds}</p>
                  <ul className="mt-1 space-y-1">
                    {(row.evidence ?? []).map((group) => (
                      <li key={group.attributeKey} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{group.label[locale]}</span>
                        <span aria-hidden className="text-muted">→</span>
                        {group.fields.length === 0 ? (
                          <span className="text-warn">{s.report.qNoColumn}</span>
                        ) : (
                          <span className="font-mono text-muted">
                            {group.fields.map((field) => requirementLabel(field, locale)).join(', ')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-medium text-muted">{s.report.qNext}</p>
                  {/* Eén attribuut in het lijstje erboven is "het attribuut", niet
                      "de attributen": de zin hoort te kloppen met wat er staat. */}
                  <p className="mt-0.5 leading-relaxed">
                    {adviceKey(row) === 'qNextEmpty' && (row.evidence ?? []).flatMap((group) => group.fields).length === 1
                      ? s.report.qNextEmptyOne
                      : s.report[adviceKey(row)]}
                  </p>
                </div>
              ) : null}
            </li>
          );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Hoeveel producten we bij naam noemen; daarboven "en nog zoveel". */
const ANSWERED_LISTED = 12;

/**
 * Waarmee een vraag beantwoord is: per kenmerk de kolommen die het antwoord
 * droegen, met hoeveel producten, en — na een verse scan — welke producten.
 */
function AnsweredPanel({ s, locale, row }: { s: Strings; locale: Locale; row: ModelQuestion }) {
  const counts = new Map((row.answeredBy ?? []).map((entry) => [entry.field, entry.products]));
  // Elk attribuut waar de vraag op leunt, ook als het er meer zijn, met al zijn
  // kolommen: een vraag is pas beantwoord als ze er allemaal staan, dus wie wil
  // nakijken waarmee, moet ze allemaal zien. Een kolom die bij geen product het
  // antwoord droeg staat er met een nul bij.
  const grouped = (row.evidence ?? []).map((group) => ({
    ...group,
    carried: [
      ...group.fields,
      // Waar een product voor bedoeld is, kan ook uit de categorieboom komen.
      ...(isPlacementAttribute(group.attributeKey) && counts.has(PLACEMENT_FIELD) ? [PLACEMENT_FIELD] : []),
    ],
  }));
  const listed = new Set(grouped.flatMap((group) => group.carried));
  const loose = [...counts.keys()].filter((field) => !listed.has(field));
  const products = row.answeredProducts;

  return (
    <div className="mt-2 rounded-lg bg-surface-2 p-3 text-xs">
      <p className="font-medium text-muted">{s.report.qAnsweredVia}</p>
      {counts.size === 0 ? (
        <p className="mt-1 text-muted">{s.report.qAnsweredNoFields}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {grouped.map((group) => (
            <li key={group.attributeKey} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{group.label[locale]}</span>
              <span aria-hidden className="text-muted">→</span>
              <span className="text-muted">
                {group.carried.length === 0 ? <span className="text-warn">{s.report.qNoColumn}</span> : null}
                {group.carried.map((field, index) => (
                  <span key={field}>
                    {index > 0 ? ', ' : ''}
                    <span className="font-mono">{requirementLabel(field, locale)}</span>
                    <span className="tnum"> ({n(counts.get(field) ?? 0)})</span>
                  </span>
                ))}
              </span>
            </li>
          ))}
          {loose.map((field) => (
            <li key={field} className="text-muted">
              <span className="font-mono">{requirementLabel(field, locale)}</span>
              <span className="tnum"> ({n(counts.get(field) ?? 0)})</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 leading-relaxed text-muted">{s.report.qAnsweredCountNote}</p>

      <p className="mt-2 font-medium text-muted">{s.report.qAnsweredProducts}</p>
      {products === undefined ? (
        <p className="mt-0.5 leading-relaxed text-muted">{s.report.qAnsweredNoProducts}</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {products.slice(0, ANSWERED_LISTED).map((product) => (
            <li key={product.key} className="flex flex-wrap gap-x-2">
              <span className="font-mono text-muted">{product.key}</span>
              {product.title ? <span>{product.title}</span> : null}
            </li>
          ))}
          {products.length > ANSWERED_LISTED ? (
            <li className="text-muted">
              {s.report.qAnsweredMore.replace('{aantal}', n(products.length - ANSWERED_LISTED))}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

/**
 * Wat er in een attribuut hoort te staan: het soort antwoord, hoe de retailer
 * het zelf al invult, en hoe het bij een onderzochte winkel staat.
 *
 * Alleen echte waarden. Zijn eigen invulling is het zekerste voorbeeld dat er
 * is; een waarde van een andere winkel staat er met het adres van de pagina
 * erbij, zodat hij kan nakijken dat het klopt. Is er geen van beide, dan staat
 * er geen voorbeeld — liever niets dan een verzonnen waarde die hij overneemt.
 */
function GapExpectation({ s, row }: { s: Strings; row: ReportModel['gaps'][number] }) {
  const kind = row.expect?.shape?.kind ?? (row.expect?.answerType === 'enum' ? 'list' : row.expect?.answerType);
  const kindText = kind ? s.report.expectKinds[kind] : undefined;
  const unit = row.expect?.shape?.unit;
  const examples = row.expect?.examples ?? [];
  const own = row.ownExamples ?? [];
  if (!kindText && examples.length === 0 && own.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-0.5 text-xs leading-relaxed text-muted">
      {kindText ? (
        <p>
          <span className="font-medium text-ink">{s.report.gapExpect}</span>{' '}
          {kindText}{unit ? ` (${unit})` : ''}
        </p>
      ) : null}
      {own.length > 0 ? (
        <p>
          <span className="font-medium text-ink">{s.report.gapOwnExamples}</span>{' '}
          {own.map((value) => `"${value}"`).join(' · ')}
        </p>
      ) : null}
      {examples.slice(0, 2).map((example) => (
        <p key={`${example.url}|${example.value}`}>
          <span className="font-medium text-ink">{s.report.gapExample}</span>{' '}
          &ldquo;{example.value}&rdquo;{' '}
          <a
            href={example.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            {example.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')}
            <ArrowUpRight className="size-3" aria-hidden />
          </a>
        </p>
      ))}
    </div>
  );
}

/** Hoeveel vragen er onder een attribuut staan voordat je moet klikken. */
const BLOCKED_SHOWN = 2;

function GapTable({ s, model, locale }: { s: Strings; model: ReportModel; locale: Locale }) {
  // Eén kolomuitleg tegelijk; twee open panelen boven een tabel is onleesbaar.
  const [openInfo, setOpenInfo] = useState<string>();

  const [setId, setSetId] = useState('all');
  /** Het attribuut waarvan alle vragen uitgeklapt staan; één tegelijk. */
  const [openBlocked, setOpenBlocked] = useState<string>();
  if (model.gaps.length === 0) return null;
  // Standaard de meeste producten eerst. Op oorzaak loopt van goedkoop naar duur
  // werk: invullen, modelleren, geen bron.
  type SortKey = 'field' | 'questions' | 'cause' | 'affected';
  const [sort, setSort] = useState<{ by: SortKey; dir: 'asc' | 'desc' }>({ by: 'affected', dir: 'desc' });
  const causeOrder: Record<string, number> = { unfilled: 0, unmodelled: 1, 'no-source': 2 };
  const unsorted = setId === 'all' ? model.gaps : model.gapsBySet?.[setId] ?? [];
  const rows = [...unsorted].sort((a, b) => {
    const byAffected = a.affected - b.affected;
    const byName = a.label[locale].localeCompare(b.label[locale]);
    const first = sort.by === 'cause' ? (causeOrder[a.cause] ?? 9) - (causeOrder[b.cause] ?? 9)
      : sort.by === 'questions' ? (a.questions ?? 0) - (b.questions ?? 0)
        : sort.by === 'field' ? byName
          : byAffected;
    // Bij gelijke stand de meeste producten eerst, en dan op naam: dezelfde
    // gegevens geven altijd dezelfde volgorde.
    return (sort.dir === 'asc' ? first : -first) || -byAffected || byName;
  });
  // Waar een kolom begint: namen van A naar Z, oorzaak bij het goedkoopste
  // werk, aantallen bij de grootste.
  const startDir: Record<SortKey, 'asc' | 'desc'> = { field: 'asc', questions: 'desc', cause: 'asc', affected: 'desc' };
  const toggleSort = (by: SortKey) => setSort((current) => (
    current.by === by ? { by, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { by, dir: startDir[by] }
  ));

  // Op inspanning en niet op ernst: invulwerk is de goedkoopste winst die er is,
  // modelwerk vraagt eerst een beslissing over je datamodel, en geen bron vraagt
  // een koppeling die er niet is. De labels ernaast dragen de betekenis; de kleur
  // helpt alleen de goedkope rijen eruit te pikken.
  const causeTone = { unfilled: 'ok', unmodelled: 'warn', 'no-source': 'danger' } as const;

  const columns: { id: string; label: string; align?: string }[] = [
    { id: 'field', label: s.report.gapField },
    { id: 'questions', label: s.report.gapQuestions },
    { id: 'cause', label: s.report.gapCause },
    { id: 'affected', label: s.report.gapAffected, align: 'text-right' },
  ];

  return (
    <Card>
      <CardTitle>{s.report.gapsHeading}</CardTitle>

      {/* Waarom deze tabel er staat, en wat de drie uitkomsten aan werk betekenen.
          Zonder die uitleg is "verrijkingsgat" een woord en geen keuze. */}
      <ul className="rounded-md bg-surface-2 px-3 py-2 text-sm leading-relaxed text-muted">
        {/* "Geen bron" alleen als het in deze resultaten voorkomt: uitleg bij
            iets wat er niet staat is ruis. */}
        {['unfilled', 'unmodelled', 'no-source']
          .filter((cause) => cause !== 'no-source' || model.gaps.some((gap) => gap.cause === 'no-source'))
          .map((cause) => <li key={cause}>{s.report.gapsWhy[cause]}</li>)}
      </ul>

      {/* Hetzelfde filter als boven de vragenlijst: een merchant werkt per
          categorie, en dan wil hij de gaten van die categorie zien. */}
      {model.gapsBySet && model.categories.length > 1 ? (
        <div className="mt-3">
          <Select
            label={s.report.filterCategory}
            value={setId}
            onChange={setSetId}
            options={[
              { value: 'all', label: s.report.allCategories },
              ...model.categories.map((c) => ({ value: c.setId, label: `${categoryLabel(c)} (${n(c.total)})` })),
            ]}
          />
        </div>
      ) : null}

      {/* De uitleg staat boven de tabel en niet in de cel: een paneel binnen een
          scrollende tabel verdwijnt half achter de rand. */}
      {openInfo ? <InfoPanel>{s.report.gapColumnInfo[openInfo]}</InfoPanel> : null}

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{s.report.gapsNone}</p>
      ) : null}

      <div className={`mt-3 overflow-x-auto ${rows.length === 0 ? 'hidden' : ''}`}>
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              {columns.map((column) => (
                <th
                  key={column.id}
                  aria-sort={sort.by !== column.id ? undefined : sort.dir === 'asc' ? 'ascending' : 'descending'}
                  className={`py-2 pr-3 font-medium ${column.align ?? ''}`}
                >
                  <span className={`inline-flex items-center gap-1.5 ${column.align ? 'justify-end' : ''}`}>
                    {(
                      <button
                        type="button"
                        title={`${s.report.sortBy} ${column.label.toLowerCase()}`}
                        onClick={() => toggleSort(column.id as SortKey)}
                        className={`inline-flex items-center gap-1 hover:text-ink ${sort.by === column.id ? 'text-ink' : ''}`}
                      >
                        {column.label}
                        {sort.by !== column.id
                          ? <ArrowUpDown className="size-3" aria-hidden />
                          : sort.dir === 'asc'
                            ? <ArrowUp className="size-3" aria-hidden />
                            : <ArrowDown className="size-3" aria-hidden />}
                      </button>
                    )}
                    {/* Alleen op klik. De uitleg staat bóven de tabel en duwt de kop
                        omlaag: opende hij op aanwijzen, dan schoof het knopje onder
                        de muis vandaan, sloot de uitleg, en begon het opnieuw. */}
                    <InfoButton
                      label={s.report.infoLabel}
                      open={openInfo === column.id}
                      onToggle={() => setOpenInfo(openInfo === column.id ? undefined : column.id)}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.field}-${row.cause}`} className="border-b border-line/60 align-top">
                <td className="py-2 pr-3">
                  {row.label[locale]}
                  {/* De vragen zelf onder het attribuut: een naam als "bestelstap
                      cm" zegt pas iets met de vraag van de koper erbij. De eerste
                      twee staan er altijd, de rest achter een klik, anders wordt
                      een attribuut waar tien vragen op leunen de hele tabel. */}
                  {row.blocked && row.blocked.length > 0 ? (() => {
                    const key = `${row.field}-${row.cause}`;
                    const all = openBlocked === key;
                    const shown = all ? row.blocked : row.blocked.slice(0, BLOCKED_SHOWN);
                    return (
                      <ul className="mt-1 space-y-0.5 text-xs text-muted" aria-label={s.report.gapBlockedHeading}>
                        {shown.map((question) => (
                          <li key={question.questionId}>
                            {question.importance === 'critical' ? (
                              <span className="mr-1 font-medium text-danger">{s.questions.importance.critical}</span>
                            ) : null}
                            {question.label[locale]}
                          </li>
                        ))}
                        {row.blocked.length > BLOCKED_SHOWN ? (
                          <li>
                            <button
                              type="button"
                              aria-expanded={all}
                              onClick={() => setOpenBlocked(all ? undefined : key)}
                              className="underline decoration-dotted underline-offset-2 hover:text-ink"
                            >
                              {all ? s.report.gapBlockedLess
                                : row.blocked.length - BLOCKED_SHOWN === 1 ? s.report.gapBlockedMoreOne
                                  : s.report.gapBlockedMore.replace('{aantal}', String(row.blocked.length - BLOCKED_SHOWN))}
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    );
                  })() : null}
                  <GapExpectation s={s} row={row} />
                </td>
                <td className="py-2 pr-3">
                  {/* Welke vragen hierdoor blijven liggen. Een gat zonder vraag
                      bestaat niet: dat is het verschil met een lege-veldenlijst. */}
                  <span className="text-xs text-muted">{row.questions ?? '—'}</span>
                </td>
                <td className="py-2 pr-3">
                  <Badge tone={causeTone[row.cause as keyof typeof causeTone]}>
                    {s.report.causes[row.cause]}
                  </Badge>
                  {/* Het label alleen zegt een merchant niets: "Modelwerk" is
                      ons woord. De betekenis en de inspanning eronder maken er
                      een klus van die hij kan inplannen. */}
                  <span className="mt-0.5 block text-xs text-muted">
                    {s.report.causeMeaning[row.cause]}
                  </span>
                </td>
                <td className="tnum py-2 text-right">{n(row.affected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Buiten de score.
 *
 * Dit zijn vragen die een koper wel stelt maar die geen enkel productattribuut
 * kan beantwoorden: kan ik een staal krijgen, welke kleuren bestaan er nog in
 * deze kwaliteit. Ze meetellen zou elke merchant op hetzelfde punt laten zakken
 * en daarmee de meting vertekenen. Ze weglaten zou het waardevolste advies uit
 * het rapport halen — juist hier ligt het antwoord bij de website of de
 * klantenservice, en niet bij de catalogus.
 */
/**
 * Het rapport zelf, getekend uit het model.
 *
 * Een verse scan en een bewaarde analyse gebruiken allebei dit deel, zodat ze er
 * hetzelfde uitzien. Wat alleen met de producten kan — de verkenner, bewaren en
 * de pdf — komt van buiten binnen.
 */
export function ReportBody({ s, locale, model, explorer, footer, onReviewQuestion, siteCheck, onSiteCheck, defaultSite, siteSaveHint, sitePending, siteFailed }: {
  s: Strings;
  locale: Locale;
  model: ReportModel;
  /** Naar een vraag op het vragensetscherm. Alleen waar dat scherm bereikbaar is. */
  onReviewQuestion?: (question: { setId: string; questionId: string; base: boolean }) => void;
  /** Per product kijken, of de uitleg waarom dat hier niet kan. */
  explorer?: ReactNode;
  footer?: ReactNode;
  /** De sitetoets bij dit rapport, en hoe een nieuwe bewaard wordt; zie `AdvisoryCard`. */
  siteCheck?: SiteCheck;
  onSiteCheck?: (check: SiteCheck) => void | Promise<void>;
  defaultSite?: string;
  siteSaveHint?: boolean;
  /** De toets die het rapport zelf startte: loopt hij nog, of mislukte hij. */
  sitePending?: boolean;
  siteFailed?: SiteCheckFailure;
}) {
  // De status staat als label naast de zin en niet in de zin zelf: een cijfer
  // langs een voorlopige lat mag er niet hetzelfde uitzien als een cijfer langs
  // een bevroren lat, maar de merchant hoeft er geen alinea over te lezen.
  const banks = model.stamp.banks;
  const unfrozen = banks.filter((bank) => bank.status !== 'frozen');
  const [showQuestions, setShowQuestions] = useState(false);

  return (
    <div className="space-y-4">
      {banks.length > 0 ? (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${unfrozen.length > 0 ? 'border-warn/40 bg-warn-soft' : 'border-line bg-surface'}`}>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
            <span>
              {s.report.bankMeasured.replace('{naam}', banks.map((bank) => bank.label?.[locale] ?? bank.id).join(', '))}
            </span>
            {/* Eén label per status: vier voorlopige banken zeggen samen één keer "Voorlopig". */}
            {[...new Set(unfrozen.map((bank) => bank.status))].map((status) => (
              <Badge key={status} tone="warn">{s.bank.status[status as keyof typeof s.bank.status] ?? status}</Badge>
            ))}
          </p>
          {model.bankQuestions ? (
            <Button variant="secondary" onClick={() => setShowQuestions(!showQuestions)}>
              {showQuestions ? s.report.bankQuestionsHide : s.report.bankQuestionsShow}
            </Button>
          ) : null}
        </div>
      ) : null}

      {showQuestions && model.bankQuestions ? (
        <BankQuestions s={s} locale={locale} model={model} rows={model.bankQuestions} />
      ) : null}

      {model.stamp.blindAttributes.length > 0 ? (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <p className="font-medium text-warn">{s.report.blindHeading}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{s.report.blindBody}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {model.stamp.blindAttributes.map((attribute) => (
              <li key={attribute.key}>
                <Badge tone="neutral">{attribute.key}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelCard s={s} model={model} />
        <CategoryScores s={s} model={model} />
      </div>

      {/* Dezelfde vorm als de melding over ontbrekende attributen bovenaan: een
          bevinding naast de meting, geen onderdeel ervan. */}
      {model.unmatchedCount > 0 ? (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <p className="font-medium text-warn">{s.report.otherFindingsHeading}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            <span className="tnum font-semibold">{n(model.unmatchedCount)}</span>{' '}
            {model.unmatchedCount === 1 ? s.report.unmatchedOne : s.report.unmatched}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {model.unmatchedCount === 1 ? s.report.unmatchedExplainOne : s.report.unmatchedExplain}
          </p>
        </div>
      ) : null}

      <QuestionCoverageCard s={s} model={model} locale={locale} onReviewQuestion={onReviewQuestion} />

      <GapTable s={s} model={model} locale={locale} />

      {explorer}

      {/* Vragen die geen enkel attribuut kan dragen. Ze staan ná de meting: het
          is advies over je website en je dienstverlening, geen bevinding over je
          catalogus. */}
      <AdvisoryCard
        s={s}
        locale={locale}
        model={model}
        siteCheck={siteCheck}
        onSiteCheck={onSiteCheck}
        defaultSite={defaultSite}
        saveHint={siteSaveHint}
        pending={sitePending}
        pendingFailed={siteFailed}
      />

      <Card>
        <CardTitle sub={s.report.stampExplain}>{s.report.stampHeading}</CardTitle>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{s.report.scanVersion}</dt>
            <dd className="tnum font-medium">v{model.stamp.scanVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.specSnapshot}</dt>
            <dd className="tnum font-medium">{model.stamp.fieldRegister}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.bankVersion}</dt>
            <dd className="font-medium">
              {model.stamp.banks.length === 0 ? '—' : model.stamp.banks.map((bank) => (
                <span key={bank.id} className="mr-2 inline-flex items-center gap-1.5">
                  <span className="tnum">{bank.label?.[locale] ?? bank.id} {bank.version}</span>
                  {bank.status !== 'frozen' ? (
                    <Badge tone="warn">{s.bank.status[bank.status as keyof typeof s.bank.status] ?? bank.status}</Badge>
                  ) : null}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{s.report.questionVersion}</dt>
            <dd className="tnum font-medium">v{model.stamp.questionSetVersion}</dd>
          </div>
          {model.stamp.scannedAt ? (
            <div>
              <dt className="text-xs text-muted">{s.report.scannedAt}</dt>
              <dd className="tnum font-medium">
                {new Date(model.stamp.scannedAt).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')}
              </dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card>
        <p className="text-xs leading-relaxed text-muted">{s.report.disclaimer}</p>
      </Card>

      {footer}
    </div>
  );
}

export function ReportView({ s, locale, report, onRestart, restartLabel, canSave = true, onReviewQuestion, pristine, siteUrl, siteProgress }: {
  s: Strings;
  locale: Locale;
  report: ScanReport;
  /** De samenstelling zonder werk; gaat mee bij bewaren zodat de analyse later bij te werken is. */
  pristine?: QuestionSetState;
  onReviewQuestion?: (question: { setId: string; questionId: string; base: boolean }) => void;
  onRestart: () => void;
  /** Op /demo is de weg terug niet "nieuwe scan" maar "doe dit zelf". */
  restartLabel?: string;
  /** Een voorbeeldrapport hoort niet tussen je eigen scans te belanden. */
  canSave?: boolean;
  /** Het adres van de winkel, als de merchant dat eerder opgaf. */
  siteUrl?: string;
  /** De sitetoets die de scanpagina op de achtergrond startte. */
  siteProgress?: SiteCheckProgress;
}) {
  const { accountId } = useAuth();
  const router = useRouter();
  /** Ingelogd bewaren we in het account, anders in deze browser. */
  const target = useMemo(() => snapshotStoreFor(supabase(), accountId), [accountId]);
  const [saveState, setSaveState] = useState<'idle' | 'busy' | 'saved' | 'failed'>('idle');
  /** Bewaard, maar zonder wat nodig is om later zonder catalogus bij te werken. */
  const [detailFailed, setDetailFailed] = useState(false);
  /** Het pdf-bestand: bezig, of mislukt met de weg eromheen. */
  const [pdf, setPdf] = useState<'idle' | 'busy' | 'failed'>('idle');

  /**
   * Het rapport als pdf-bestand downloaden.
   *
   * Opgebouwd uit de gegevens en niet uit een afdruk van het scherm: de tekst is
   * doorzoekbaar en een tabel breekt niet midden in een regel af. De bibliotheek
   * laadt pas bij de klik, zodat wie het rapport alleen bekijkt hem niet
   * binnenhaalt. Alles gebeurt in de browser; er gaat niets de deur uit.
   */
  async function savePdf() {
    setPdf('busy');
    try {
      const { saveReportPdf } = await import('./reportPdf');
      await saveReportPdf(report, s, locale, siteCheck);
      setPdf('idle');
    } catch {
      setPdf('failed');
    }
  }

  /** De sitetoets van dit rapport; gaat mee de opslag in. */
  const [siteCheck, setSiteCheck] = useState<SiteCheck>();

  const snapshotNow = (check: SiteCheck | undefined) => ({
    ...toSnapshot(report, {
      id: `${report.stamp.scannedAt}-${report.sources.catalog.filename}`,
      accountId: target.accountId,
      savedAt: new Date().toISOString(),
      label: report.sources.catalog.filename,
    }),
    ...(check ? { siteCheck: check } : {}),
    ...(siteUrl ? { siteUrl } : {}),
  });

  /** Een nieuwe sitetoets: tonen, en bijschrijven als de analyse al bewaard is. */
  async function keepSiteCheck(check: SiteCheck) {
    setSiteCheck(check);
    if (saveState === 'saved') await target.store.save(snapshotNow(check));
  }

  // De toets die op de achtergrond liep, komt binnen wanneer hij klaar is: soms
  // vóór het rapport er staat, soms een minuut erna. Eén keer overnemen; wat de
  // retailer daarna zelf opnieuw laat toetsen, gaat voor.
  const taken = useRef<SiteCheck>(undefined);
  useEffect(() => {
    if (siteProgress?.status !== 'done' || taken.current === siteProgress.check) return;
    taken.current = siteProgress.check;
    void keepSiteCheck(siteProgress.check).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteProgress]);

  async function save() {
    setSaveState('busy');
    try {
      // Alleen de uitkomst gaat de opslag in, niet de producten of het bronbestand.
      await target.store.save(
        snapshotNow(siteCheck),
        pristine ? toSnapshotDetail(report, pristine) : undefined,
      );
      setSaveState('saved');
    } catch (caught) {
      if (caught instanceof DetailNotSaved) {
        setSaveState('saved');
        setDetailFailed(true);
      } else {
        setSaveState('failed');
      }
    }
  }


  const model = useMemo(() => modelFromReport(report, locale, s.report.scoreAllCategories), [report, locale, s.report.scoreAllCategories]);

  return (
    <ReportBody
      s={s}
      locale={locale}
      model={model}
      onReviewQuestion={onReviewQuestion}
      explorer={<Explorer s={s} locale={locale} report={report} />}
      siteCheck={siteCheck}
      onSiteCheck={canSave ? keepSiteCheck : undefined}
      defaultSite={siteUrl}
      siteSaveHint={siteCheck !== undefined && saveState !== 'saved'}
      sitePending={siteProgress?.status === 'busy'}
      siteFailed={siteProgress?.status === 'failed' ? siteProgress.reason : undefined}
      // Bewaren zonder dat er data weggaat: de pdf wordt in de browser gemaakt
      // en rechtstreeks gedownload.
      footer={
      <Card>
        <p className="text-sm leading-relaxed text-muted">
          {canSave && target.where === 'account' ? s.report.shareNoteAccount : s.report.shareNote}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canSave && target.where === 'browser' ? (
            <Button variant="secondary" onClick={() => void save()} disabled={saveState === 'saved'} loading={saveState === 'busy'}>
              {saveState === 'saved' ? s.report.savedScan : s.report.saveScan}
            </Button>
          ) : null}
          {/* Opslaan is een handeling van de merchant, geen stille bijzaak: hij
              hoort te weten dat dit rapport in zijn account staat, en waar hij
              het terugvindt. */}
          {canSave && target.where === 'account' ? (
            <>
              <Button
                variant="secondary"
                onClick={() => void save()}
                loading={saveState === 'busy'}
                disabled={saveState === 'saved'}
              >
                {saveState === 'saved' ? `✓ ${s.report.savedAccount}`
                  : saveState === 'failed' ? s.report.saveAccountRetry
                  : saveState === 'busy' ? s.report.savingAccount
                  : s.report.saveAccount}
              </Button>
              {saveState === 'saved' ? (
                <Button variant="quiet" onClick={() => router.push('/dashboard/scans')}>{s.report.viewAnalyses}</Button>
              ) : null}
            </>
          ) : null}
          <Button variant="secondary" onClick={() => void savePdf()} loading={pdf === 'busy'}>
            <Download className="size-4" aria-hidden />
            {pdf === 'busy' ? s.report.savingPdf : s.report.savePdf}
          </Button>
          <Button variant="quiet" onClick={onRestart}>{restartLabel ?? s.report.startOver}</Button>
        </div>
        {detailFailed ? (
          <p className="mt-2 text-sm text-warn">{s.report.saveDetailFailed}</p>
        ) : null}
        {saveState === 'failed' && target.where === 'account' ? (
          <p className="mt-2 text-sm text-warn">{s.report.saveAccountFailed}</p>
        ) : null}
        {pdf === 'failed' ? (
          <div className="mt-3">
            <ErrorState title={s.report.pdfFailed} body={s.report.pdfFailedBody} next={s.report.pdfFailedNext} />
          </div>
        ) : null}
      </Card>
      }
    />
  );
}
