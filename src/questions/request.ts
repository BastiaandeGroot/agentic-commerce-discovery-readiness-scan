// De bankaanvraag: het signaal dat er voor deze markt nog een vragenbank gebouwd
// moet worden.
//
// Het is verleidelijk om dit per merchant te laten lopen: hij uploadt zijn feed,
// een agent leest zijn site, en er rolt een vragenlijst uit. Dat is precies het
// anti-patroon dat de methode bovenaan zet. Dan bouw je de bank van één winkel,
// inclusief zijn blinde vlekken, heb je geen frequentiemaat, en zijn twee
// merchants in dezelfde markt niet meer met elkaar te vergelijken — terwijl die
// vergelijking het hele bestaansrecht van een bank op vertical-niveau is.
//
// Dus: de aanvraag hangt aan de **markt**. De site van de merchant is één van de
// vijf à acht panelsites, en het resultaat geldt voor iedereen die daarna in
// diezelfde markt scant. Daarmee is het dure pad ook zeldzaam: één keer per
// vertical, daarna kost de volgende merchant niets.
//
// Wat er niet in mag is productdata. Dat is twee eisen tegelijk: fase 3 van de
// methode (bouw de bank vóórdat je de catalogus opent, anders sturen de bestaande
// attributen je denken) en de belofte dat de catalogus het apparaat niet verlaat.
// Het type hieronder kán geen productrijen dragen, en `tests/request.test.ts`
// controleert dat de afgeleverde tekst ze ook niet bevat.
//
// Deze module is puur: het tijdstip komt van de aanroeper.

import type { Bilingual, Locale, QuestionSetState } from '../domain/types';
import type { PanelSiteType } from './bank';
import type { CategoryStat } from './generate';

/** Het soort bron dat de methode in een panel wil zien, met hoeveel ervan. */
export const PANEL_RECIPE: { type: PanelSiteType; count: string; brings: Bilingual }[] = [
  {
    type: 'category-leader', count: '2–3',
    brings: {
      nl: 'vragen, FAQ\'s en gepubliceerde beslisregels',
      en: 'questions, FAQs and published decision rules',
    },
  },
  {
    type: 'specialist', count: '1–2',
    brings: {
      nl: 'diepere technische vragen en randtoepassingen',
      en: 'deeper technical questions and edge applications',
    },
  },
  {
    type: 'brand', count: '2–3',
    brings: {
      nl: 'testnormen, attribuutnamen en datasheets',
      en: 'test standards, attribute names and datasheets',
    },
  },
  {
    type: 'foreign', count: '1–2',
    brings: {
      nl: 'vaak veel technischer, en andere wetgeving',
      en: 'often far more technical, and different legislation',
    },
  },
  {
    type: 'marketplace', count: '0–1',
    brings: {
      nl: 'de verplichte feedvelden voor deze categorie',
      en: 'the mandatory feed fields for this category',
    },
  },
];

/**
 * Alles wat een agent nodig heeft om de promptreeks te draaien.
 *
 * Merk op wat er ontbreekt: geen producten, geen veldwaarden, en ook geen
 * kolomnamen. Dat laatste is een bewuste keuze. De categorieboom vraagt de
 * methode expliciet op (fase 4, de facetanalyse), maar de kolomnamen van de
 * merchant vraagt geen enkele prompt — en ze zien is precies wat blinderen moet
 * voorkomen.
 */
export interface BankRequest {
  id: string;
  createdAt: string;
  /** De markt, niet de merchant. Sleutel van de bank die eruit moet komen. */
  vertical: string;
  verticalLabel: Bilingual;
  /** De site van de merchant; hij wordt één panelsite van de vijf à acht. */
  merchantSite?: string;
  /** Categorienaam met aantal producten. Nodig voor de facetanalyse. */
  categories: { name: string; count: number }[];
  totalProducts: number;
  /** Waarom deze aanvraag er is: welke sets nu op een voorlopige bank draaien. */
  provisionalSets: string[];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/**
 * Draaien er sets op een voorlopige bank?
 *
 * Zo ja, dan is een aanvraag zinvol. Zo nee, dan ligt er al een onderzochte bank
 * en levert opnieuw onderzoeken alleen een tweede meetlat op.
 */
export function needsBank(state: QuestionSetState): boolean {
  return state.banks.some((bank) => bank.status === 'provisional');
}

export function buildBankRequest(
  state: QuestionSetState,
  categories: CategoryStat[],
  options: { createdAt: string; merchantSite?: string },
): BankRequest {
  const provisional = state.banks.filter((bank) => bank.status === 'provisional');
  // De grootste voorlopige bank bepaalt de markt: daar zit het meeste volume en
  // dus de meeste waarde in onderzoek.
  const target = provisional[0] ?? state.banks[0];

  return {
    id: `bank-${slugify(target?.id ?? 'onbekend')}-${options.createdAt.slice(0, 10)}`,
    createdAt: options.createdAt,
    vertical: target?.id ?? 'onbekend',
    verticalLabel: target?.label ?? { nl: 'Onbekend', en: 'Unknown' },
    merchantSite: options.merchantSite,
    categories: categories.map((category) => ({ name: category.name, count: category.count })),
    totalProducts: categories.reduce((sum, category) => sum + category.count, 0),
    provisionalSets: state.sets
      .filter((set) => set.bankStatus === 'provisional')
      .map((set) => set.category ?? set.label.nl),
  };
}

const METHOD_PATH = 'kennis/_methode/methode-vragenbank-genereren.md';
const PROMPT_PATH = 'kennis/_methode/prompt-vragenbank-genereren.md';

/**
 * De aanvraag als markdown, klaar om aan een agent te geven.
 *
 * De methode en de prompts staan er niet in maar worden aangewezen. Ze liggen in
 * git en veranderen zelden; ze hier inplakken zou betekenen dat ze op twee
 * plekken staan en op één plek achterlopen.
 */
export function renderBankRequest(request: BankRequest, locale: Locale = 'nl'): string {
  const nl = locale === 'nl';
  const lines: string[] = [];

  lines.push(nl ? `# Bankaanvraag — ${request.verticalLabel.nl}` : `# Bank request — ${request.verticalLabel.en}`);
  lines.push('');
  lines.push(nl
    ? `Aangemaakt op ${request.createdAt.slice(0, 10)}. Aanvraag-id \`${request.id}\`.`
    : `Created ${request.createdAt.slice(0, 10)}. Request id \`${request.id}\`.`);
  lines.push('');
  lines.push(nl
    ? `Voor deze markt draait de scan nu op een **voorlopige** vragenbank: vakkennis zonder panel en zonder domeinreview. Deze aanvraag vraagt om de echte.`
    : `For this market the scan currently runs on a **provisional** question bank: domain knowledge without a panel and without a domain review. This request asks for the real one.`);
  lines.push('');

  lines.push(nl ? '## Werkwijze' : '## How to run this');
  lines.push('');
  lines.push(nl
    ? `Volg \`${METHOD_PATH}\` en draai de zes prompts uit \`${PROMPT_PATH}\` in volgorde. Niet samenvoegen: één prompt om 130 vragen te maken levert 130 middelmatige vragen op.`
    : `Follow \`${METHOD_PATH}\` and run the six prompts from \`${PROMPT_PATH}\` in order. Do not merge them: one prompt asking for 130 questions yields 130 mediocre questions.`);
  lines.push('');
  lines.push(nl
    ? '**In een aparte sessie, zonder de productexport van de merchant erbij.** Dat is fase 3. Zie je zijn bestaande attributen eerst, dan sturen die je denken en meet je daarna alleen nog of er staat wat er staat.'
    : '**In a separate session, without the merchant\'s product export present.** That is phase 3. If you see their existing attributes first, those steer your thinking and afterwards you only measure whether what is there is there.');
  lines.push('');

  lines.push(nl ? '## De markt' : '## The market');
  lines.push('');
  lines.push(`- ${nl ? 'Vertical' : 'Vertical'}: \`${request.vertical}\` — ${nl ? request.verticalLabel.nl : request.verticalLabel.en}`);
  if (request.merchantSite) {
    lines.push(nl
      ? `- Site van de merchant: ${request.merchantSite} — neem hem op als **één** panelsite, nooit als enige bron`
      : `- Merchant site: ${request.merchantSite} — include it as **one** panel site, never as the only source`);
  }
  lines.push(`- ${nl ? 'Omvang van de catalogus' : 'Catalogue size'}: ${request.totalProducts}`);
  lines.push('');

  lines.push(nl ? '## Panel samen te stellen' : '## Panel to assemble');
  lines.push('');
  lines.push(nl
    ? 'Vijf tot acht sites, bewust van verschillende soorten. Leg naam, URL, type en datum van raadpleging vast, anders is `dekking` later niet reproduceerbaar.'
    : 'Five to eight sites, deliberately of different kinds. Record name, URL, type and date consulted, otherwise `coverage` is not reproducible later.');
  lines.push('');
  lines.push(nl ? '| Soort | Aantal | Wat het bijdraagt |' : '| Kind | Count | What it contributes |');
  lines.push('|---|---|---|');
  for (const entry of PANEL_RECIPE) {
    lines.push(`| ${entry.type} | ${entry.count} | ${nl ? entry.brings.nl : entry.brings.en} |`);
  }
  lines.push('');

  lines.push(nl ? '## Categorieboom van deze merchant' : '## This merchant\'s category tree');
  lines.push('');
  lines.push(nl
    ? 'Voor prompt 3 (overlays) en prompt 4 (facetanalyse). Bepaal per pad of het een toepassing is of eigenlijk een eigenschap.'
    : 'For prompt 3 (overlays) and prompt 4 (facet analysis). Decide per path whether it is an application or actually a property.');
  lines.push('');
  lines.push(nl ? '| Categorie | Producten |' : '| Category | Products |');
  lines.push('|---|---:|');
  for (const category of request.categories) lines.push(`| ${category.name} | ${category.count} |`);
  lines.push('');

  lines.push(nl ? '## Wat er bewust niet in staat' : '## What is deliberately absent');
  lines.push('');
  lines.push(nl
    ? 'Geen producten, geen veldwaarden en geen kolomnamen. De categorieboom vraagt de methode zelf op; de kolomnamen van de merchant vraagt geen enkele prompt, en ze zien is precies wat blinderen moet voorkomen. De catalogus verlaat het apparaat van de merchant niet.'
    : 'No products, no field values and no column names. The method itself asks for the category tree; no prompt asks for the merchant\'s column names, and seeing them is exactly what blinding is meant to prevent. The catalogue does not leave the merchant\'s device.');
  lines.push('');

  lines.push(nl ? '## Wat er terug moet komen' : '## What has to come back');
  lines.push('');
  lines.push(nl
    ? 'YAML volgens prompt 2, met het sitepanel in de meta. Lees hem in via het scherm *Vragenbank* in de app. Wat de app weigert en waarom:'
    : 'YAML per prompt 2, with the site panel in the meta. Import it through the *Question bank* screen in the app. What the app rejects, and why:');
  lines.push('');
  for (const rule of nl ? [
    '`context_vertical.onomkeerbare_fout` moet erin staan — zonder die fout is "kritiek" een mening.',
    'Een gepubliceerde drempel moet zijn site noemen. Zonder site is hij niet na te trekken en dus beredeneerd.',
    '`meta.panelomvang` moet overeenkomen met het aantal sites in `sitepanel`, anders is dekking niet na te rekenen.',
    'Elk attribuut in `bewijs` moet in `attributen` staan.',
    'Status `bevroren` mag alleen met een panel erbij.',
  ] : [
    '`context_vertical.onomkeerbare_fout` must be present — without that mistake, "critical" is an opinion.',
    'A published threshold must name its site. Without a site it cannot be traced and is therefore reasoned.',
    '`meta.panelomvang` must match the number of sites in `sitepanel`, otherwise coverage cannot be checked.',
    'Every attribute in `bewijs` must appear in `attributen`.',
    'Status `frozen` is only allowed with a panel.',
  ]) lines.push(`- ${rule}`);
  lines.push('');
  lines.push(nl
    ? 'Voeg per attribuut een `velden:`-lijst toe met de kolomnamen of zoekpatronen waaronder het in een feed staat. Laat je die weg, dan gokt de app op basis van `benoemd_als` en zegt dat erbij.'
    : 'Add a `velden:` list per attribute with the column names or patterns under which it appears in a feed. Leave it out and the app guesses from `benoemd_als`, and says so.');
  lines.push('');

  return lines.join('\n');
}
