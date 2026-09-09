// De prompts, één per fase, uit `kennis/_methode/prompt-vragenbank-genereren.md`.
//
// Ze staan hier in code en niet als markdownbestand dat wordt ingelezen, om
// dezelfde reden als de teksten in `src/i18n/`: wat de uitkomst bepaalt hoort
// mee te versionen met de code die hem verwerkt. Verandert een prompt zó dat de
// uitkomst op dezelfde markt anders wordt, dan hoort `GENERATION_VERSION`
// omhoog — anders lijkt een verschoven definitie op vooruitgang.
//
// De methode in `kennis/_methode/` blijft de bron. Wijkt deze tekst daarvan af,
// dan is dat een fout hier en niet daar.
//
// **Het systeemdeel is voor elke fase gelijk.** Dat is geen netheid maar de
// grootste kostenknop die er is: een gelijk voorvoegsel wordt gecachet, en een
// generatie doet twaalf tot vijftien aanroepen op dezelfde regels. Zet er dus
// nooit iets fase-eigens in — geen categorienaam, geen sitenaam, geen datum.

import type { GroupingEntry, Phase, RunState, Topic } from './state';

/** Omhoog zodra een prompt de uitkomst op dezelfde markt kan verschuiven. */
export const GENERATION_VERSION = '1.0.0';

/**
 * De regels die in élke fase gelden.
 *
 * Vier ervan zijn poortregels: ze bepalen wat er niet in mag. De app controleert
 * ze naderhand nog een keer serverzijdig — de generatie wordt niet op haar woord
 * geloofd — maar een model dat ze vooraf kent levert minder werk af dat later
 * gedegradeerd wordt, en dat scheelt een hele herkansing.
 */
export const SYSTEM = `Je bouwt een vragenbank voor een markt (vertical) volgens een vaste methode.

Het principe: je bouwt geen attribuutlijst maar een lijst vragen die een koper
stelt, en je leidt daar het benodigde bewijs uit af. Een attribuutlijst is een
mening; een vragenlijst met per vraag het benodigde bewijs is een meetinstrument.

De bank hoort bij de markt en niet bij één winkel. Eén site geeft je de vragen
die die ene merchant belangrijk vindt, inclusief zijn blinde vlekken. Vijf sites
geven je de vragen van de markt plus een meetbare frequentie.

Deze regels gelden altijd:

1. HERKOMST. Elke drempel, norm of certificering die je noemt draagt zijn bron.
   Een gepubliceerde drempel noemt de site waar hij vandaan komt; een drempel die
   jij beredeneert noem je expliciet beredeneerd. Verzin nooit een normnummer,
   een certificering of een wettelijke verplichting die je niet kunt onderbouwen.
   Een verzonnen getal op naam van een site is erger dan geen getal.
2. DEKKING IS GETELD, NIET GESCHAT. Dekking is op hoeveel panelsites een
   onderwerp werkelijk voorkwam, met die sites erbij. Weet je het niet, dan is
   het null — dat is iets anders dan nul, want nul betekent dat niemand het
   behandelt en dat is juist een vondst.
3. FORMULEER ALS KLANTVRAAG. "Is deze stof sterk genoeg voor mijn bank", niet
   "Martindale-waarde". De attribuutnaam volgt uit de vraag, nooit andersom.
4. GEEN PRODUCTDATA. Je krijgt categorienamen met aantallen en een URL. Je
   vraagt nooit om de catalogus van de merchant en je kijkt er niet in. De bank
   wordt gebouwd vóórdat die catalogus opengaat, anders meet je alleen nog of
   er staat wat er staat.

Weging: 'kritiek' betekent niet commercieel belangrijk maar: deze vraag voorkomt
de fout die de koper niet kan terugdraaien. Dekking boven 70% van het panel
rechtvaardigt 'hoog'. Volledige dekking samen met de onomkeerbare fout
rechtvaardigt 'kritiek'. Een vraag met dekking 0 kan alsnog kritiek zijn als er
een dure fout achter zit; leg dan uit waarom je afwijkt.

Vragen die uit geen enkel attribuut te beantwoorden zijn — procesvragen ("kan ik
een staal krijgen"), structuurvragen, levenscyclusvragen — horen in de bank omdat
er advies in zit, maar ze gaan buiten de score. Markeer ze als zodanig.

Je antwoordt altijd met één JSON-object en niets eromheen: geen inleiding, geen
uitleg, geen markdown-hekjes. Wat je niet weet laat je leeg of null; verzin geen
vulling om een veld te vullen.`;

/** Wat een fase aan het model vraagt, plus hoe zwaar het model mag zijn. */
export interface PhasePrompt {
  prompt: string;
  /** `reader` leest sites, `judge` weegt en schrijft. Zie `src/server/generator.ts`. */
  model: 'reader' | 'judge';
  /** Mag deze fase het web op? Alleen de fasen die werkelijk bronnen raadplegen. */
  web: boolean;
  maxTokens: number;
}

const list = (values: string[]) => values.map((value) => `- ${value}`).join('\n');

const segmentTable = (state: RunState) =>
  state.brief.segments.map((segment) => `- ${segment.name} (${segment.count} producten)`).join('\n');

const shapeBlock = (state: RunState) => {
  const shape = state.shape;
  if (!shape) return 'Onbekend — die fase leverde niets op.';
  return [
    `Koopeenheid: ${shape.unit}`,
    `Onomkeerbare fout: ${shape.irreversibleMistake}`,
    `Normen: ${shape.standards.join(', ') || 'geen gevonden'}`,
    `Wetgeving: ${shape.legal.join(', ') || 'geen gevonden'}`,
  ].join('\n');
};

const topicBlock = (topics: Topic[]) =>
  topics
    .map((topic) => {
      const coverage = `dekking ${topic.coverage} (${topic.coverageSites.join(', ') || 'geen sites'})`;
      const conflict = topic.conflict ? ` — tegenspraak: ${topic.conflict}` : '';
      return `- ${topic.question} [${topic.topic}] ${coverage}${conflict}`;
    })
    .join('\n');

const groupingBlock = (grouping: GroupingEntry[]) =>
  grouping.map((entry) => `- ${entry.category} (${entry.count}): ${entry.kind}`).join('\n');

/**
 * De vraag die bij deze stap hoort.
 *
 * Elke fase krijgt alleen wat hij nodig heeft en niet de hele toestand. Dat is
 * geen zuinigheid maar kwaliteit: een basislaag die de ruwe oogst van vijf sites
 * naast zich heeft liggen gaat die oogst herhalen in plaats van hem te wegen.
 */
export function promptFor(phase: Phase, state: RunState): PhasePrompt {
  const { vertical } = state.brief;

  switch (phase.kind) {
    case 'panel':
      return {
        model: 'judge',
        web: true,
        maxTokens: 16000,
        prompt: `Markt: ${vertical}

De merchant bevestigde deze categorieën:
${segmentTable(state)}
${state.brief.merchantSite ? `\nZijn eigen winkel: ${state.brief.merchantSite}` : ''}
${state.brief.suggestedSites.length > 0 ? `\nWebshops die hij aandroeg:\n${list(state.brief.suggestedSites)}` : ''}

Doe twee dingen.

EEN — stel een panel van precies vijf sites samen. Wat de merchant aandroeg wordt
toegevoegd, niet overgenomen: zou hij het panel bepalen, dan kiest hij zijn
zwakste concurrenten en meet hij zichzelf rijk. Zijn eigen winkel is één
panelsite en nooit de enige. Vul aan tot vijf met: twee categorieleiders in de
thuismarkt, één specialist, één merk- of fabrikantsite, één buitenlandse (DE/UK,
die publiceren vrijwel altijd meer technische data).

Kies op na te lopen signalen, in deze volgorde: reviews onder een keurmerk
(WebwinkelKeur, Thuiswinkel Waarborg, Trusted Shops — reviews op de site zelf
tellen niet), aantal reviews en niet het cijfer, breedte van het assortiment,
diepte van de productinformatie, fysieke aanwezigheid of leeftijd. Gebruik
nadrukkelijk NIET: advertenties, zoekpositie of verkooppraat op de site zelf.
Controleer dat elke site bestaat en werkelijk in deze markt handelt.

TWEE — bepaal de vorm van de markt, en groepeer de categorieën hierboven.

Per categorie kies je één van drie:
- "overlay": deze categorie roept ándere vragen op dan de rest en verdient een
  eigen vragenset.
- "profiel": een toepassing binnen een overlay. Dezelfde vragen, andere drempels
  of berekeningen (banken, eetkamerstoelen en poefs binnen meubelstoffen). Noem
  bij "parent" onder welke overlay hij hangt.
- "facet": geen categorie maar een eigenschap die een attribuutwaarde hoort te
  zijn (Vlekwerend, Duurzaam, Effen, Vlamvertragend).

Wees streng op "overlay". Een eigen overlay is alleen terecht als de vragen
verschillen, niet als de producten verschillen; anders is het dezelfde meting op
minder producten en suggereert het rapport een onderscheid dat de vragenlijst
niet maakt.

Antwoord met dit JSON-object:
{
  "panel": [{"name": "...", "url": "https://...", "type": "categorieleider|specialist|merk|buitenlands", "reason": "waarom deze site"}],
  "shape": {
    "unit": "per stuk | per meter | ...",
    "irreversibleMistake": "welke aankoopfout kan de koper niet terugdraaien",
    "standards": ["ETIM, ISO/EN-normen, ... — alleen wat je kunt onderbouwen"],
    "legal": ["alleen echte verplichtingen"]
  },
  "grouping": [{"category": "exact zoals hierboven", "count": 0, "kind": "overlay|profiel|facet", "parent": "alleen bij profiel", "reason": "in één zin"}],
  "findings": ["wat een mens hierover moet weten voordat hij dit vaststelt"]
}`,
      };

    case 'harvest': {
      const site = state.panel[phase.index];
      return {
        model: 'reader',
        web: true,
        maxTokens: 16000,
        prompt: `Oogst de klantvragen van ${site?.url ?? ''} (${site?.type ?? 'onbekend type'}) in de markt ${vertical}.

Loop deze bronnen af, in deze volgorde van bewijskracht:
1. FAQ-blokken en veelgestelde-vragenpagina's — het sterkste signaal, want de
   merchant heeft deze vragen zelf als belangrijk aangemerkt.
2. Categorie- en subcategorieteksten.
3. Blogonderwerpen en kennisbankartikelen.
4. Een handvol productdetailpagina's: welke technische kenmerken worden getoond,
   en onder welke naam op deze site?
5. Publieke reviews, als die er zijn.

Zoek daarnaast expliciet naar GEPUBLICEERDE BESLISREGELS: drempeltabellen,
rekenregels, geschiktheidsmatrices, hoeveelheidstabellen. Neem die letterlijk
over inclusief de getallen, met de URL erbij. Die regels zijn al door een
marktpartij gevalideerd; die hoeven we niet zelf te verzinnen.

Parafraseer de teksten. Neem niets letterlijk over behalve de getallen in
tabellen. Noteer per vondst de URL, anders is de dekking later niet
reproduceerbaar. Laadt de site niet of vind je een bron niet, zet dat dan in
"notes" — een site die zwijgt is een bevinding en geen reden om iets aan te
nemen.

Antwoord met dit JSON-object:
{
  "questions": [{"question": "zoals een klant hem stelt", "source": "faq|categorietekst|blog|productpagina|review", "url": "https://..."}],
  "attributes": [{"namedAs": "de naam op deze site", "meaning": "welk kenmerk dit is"}],
  "rules": [{"name": "korte naam", "rule": "de regel inclusief getallen", "url": "https://..."}],
  "notes": ["wat er niet lukte of opviel"]
}`,
      };
    }

    case 'consolidate':
      return {
        model: 'judge',
        web: false,
        maxTokens: 32000,
        prompt: `Markt: ${vertical}. Panel van ${state.panel.length} sites: ${state.panel.map((site) => site.name).join(', ')}.

Dit is de ruwe oogst per site:

${JSON.stringify(state.harvest, null, 1)}

Voeg samen tot één lijst onderwerpen.

1. Ontdubbel op ONDERWERP, niet op formulering. "Kan ik hier mijn bank mee
   bekleden" en "welke stof is sterk genoeg voor dagelijks gebruik" zijn dezelfde
   vraag. Kies de formulering die het dichtst bij de klant staat.
2. Geef per onderwerp de dekking: op hoeveel van de ${state.panel.length} sites het
   voorkwam, en welke. Tel wat er in de oogst staat; schat niet.
3. Markeer tegenspraak: onderwerpen waar sites verschillende drempels of adviezen
   hanteren. Leg beide vast — dat is een discussiepunt voor de vakexpert en geen
   fout.
4. Voeg tot slot bewust onderwerpen toe die op GEEN ENKELE site beantwoord worden
   maar die klanten wel hebben. Haal die uit vakkennis over wat er in de praktijk
   misgaat. Markeer ze met dekking 0 en bron "vakkennis". Zonder deze stap
   reproduceer je de blinde vlekken van de hele branche, en juist daar zit het
   onderscheidend vermogen.

Sorteer op dekking, hoogste eerst.

Antwoord met dit JSON-object:
{
  "topics": [{"topic": "korte sleutel", "question": "de klantvraag", "coverage": 0, "coverageSites": ["..."], "sources": ["faq|categorietekst|blog|productpagina|review|vakkennis"], "conflict": "alleen als sites elkaar tegenspreken"}],
  "findings": ["wat een mens moet weten"]
}`,
      };

    case 'base':
      return {
        model: 'judge',
        web: false,
        maxTokens: 32000,
        prompt: `Markt: ${vertical}.

Vorm van de markt:
${shapeBlock(state)}

De geconsolideerde onderwerpen:
${topicBlock(state.topics)}

Bouw de BASISLAAG: de vragen die gelden voor élk product in deze markt,
ongeacht toepassing of categorie. Laat categoriespecifieke vragen liggen, die
komen straks in de overlays.

Per vraag:
- een id in de vorm BAS-01, oplopend
- de vraag in het Nederlands én het Engels, allebei als klantvraag
- intentie: geschiktheid, hoeveelheid, onderhoud, verwachting, materiaal,
  verwerking, duurzaamheid, veiligheid, koopzekerheid, comfort of functie
- belang: kritiek, hoog, middel of laag — volgens de wegingsregel, met de
  onomkeerbare fout hierboven als maat voor kritiek
- dekking en dekking_bronnen, overgenomen uit het onderwerp waar hij op rust
- bewijs: de canonieke attribuutnamen die nodig zijn om hem te beantwoorden.
  Eigen namen in snake_case (rolbreedte_cm, schuurweerstand_martindale), nooit
  de veldnaam van een site. Eén vraag mag meerdere attributen nodig hebben.
- synoniemen: hoe de sites in het panel dit kenmerk noemen. Dit is vaktaal en
  die hoort bij de markt; de app gebruikt het om het kenmerk in de catalogus
  terug te vinden.
- modus: "alle" als er gerekend wordt (een som heeft al zijn termen nodig),
  "een" als bewijs stapelt (één attribuut dat de vraag draagt volstaat)
- antwoordtype: enum, getal, boolean, tekst, relatie, proces of afgeleid
- beantwoordbaar: true, gedeeltelijk of false. Zet false bij proces-, structuur-
  en levenscyclusvragen; die tellen niet mee in de score.
- beslisregel: alleen als er een deterministische regel bij hoort, met de bron
  in "note". Een gepubliceerde drempel noemt zijn site; een beredeneerde zegt
  dat hij beredeneerd is.

Antwoord met dit JSON-object:
{
  "questions": [{
    "id": "BAS-01", "questionNl": "...", "questionEn": "...",
    "intent": "...", "importance": "kritiek|hoog|middel|laag",
    "coverage": 0, "coverageSites": ["..."], "sources": ["..."],
    "evidence": ["attribuut_naam"], "synonyms": ["naam op een site"],
    "rule": "naam_van_regel of weglaten", "answerType": "...",
    "answerable": "true|gedeeltelijk|false", "mode": "alle|een",
    "note": "bron van de drempel, of waarom het belang afwijkt van de dekking"
  }],
  "findings": ["beredeneerde drempels en andere open punten"]
}`,
      };

    case 'overlay': {
      const category = state.grouping.filter((entry) => entry.kind === 'overlay')[phase.index]?.category ?? '';
      const profiles = state.grouping
        .filter((entry) => entry.kind === 'profiel' && entry.parent === category)
        .map((entry) => entry.category);
      return {
        model: 'judge',
        web: false,
        maxTokens: 24000,
        prompt: `Markt: ${vertical}. Categorie: ${category}.

De basislaag stelt deze vragen al:
${(state.base?.questions ?? []).map((question) => `- ${question.id}: ${question.questionNl} (${question.importance})`).join('\n')}

De geconsolideerde onderwerpen:
${topicBlock(state.topics)}

${profiles.length > 0 ? `Toepassingen binnen deze categorie: ${profiles.join(', ')}.` : 'Er zijn geen aparte toepassingen binnen deze categorie.'}

Bouw de overlay voor ${category}. Neem alleen op wat categoriespecifiek is en
herhaal geen basisvragen.

Twee dingen apart:
- "reweight": basisvragen die in deze categorie ánders wegen, met de reden. Een
  overlay mag herwegen maar nooit herschrijven — zou hij de tekst van een
  basisvraag mogen veranderen, dan meten twee categorieën verschillende dingen
  onder hetzelfde id.
- "questions": de vragen die alleen hier gelden. Ids in de vorm ${(category.slice(0, 3) || 'CAT').toUpperCase()}-01.

De toepassingen hierboven krijgen GEEN eigen vragen. Zij verschillen in drempels
en berekeningen bij dezelfde vragen; noem dat verschil in "note" bij de vraag
waar het op slaat.

Antwoord met hetzelfde JSON-object als de basislaag, plus reweight:
{
  "questions": [ ... zelfde vorm als de basislaag ... ],
  "reweight": [{"id": "BAS-03", "importance": "kritiek", "reason": "..."}],
  "findings": ["..."]
}`,
      };
    }

    case 'facets':
      return {
        model: 'judge',
        web: false,
        maxTokens: 16000,
        prompt: `Markt: ${vertical}.

De groepering die in fase 0 is voorgesteld:
${groupingBlock(state.grouping)}

Werk de facetten uit: de categorieën die eigenlijk een eigenschap zijn en dus een
attribuutwaarde horen te zijn. Gebruik het panel als toets — bieden andere
spelers hetzelfde onderscheid als filter aan in plaats van als categorie, dan is
dat sterk bewijs dat het een facet is.

Veiligheids- en claimgerelateerde facetten (brandveiligheid, duurzaamheid,
gezondheid) staan altijd bovenaan: een categorie zonder onderliggend attribuut is
daar een claim zonder bewijs.

Kom je tot de conclusie dat een categorie verkeerd is ingedeeld in fase 0, zeg
dat dan in "regroup" — met de reden. Dat is geen fout maar het hele punt van
deze stap: nu heb je de vragen gezien en toen niet.

Antwoord met dit JSON-object:
{
  "facets": [{"category": "...", "count": 0, "attribute": "attribuut_dat_dit_vervangt", "condition": "wanneer het facet waar is", "panelSites": 0, "priority": "hoog|middel|laag"}],
  "regroup": [{"category": "...", "kind": "overlay|profiel|facet", "parent": "...", "reason": "..."}],
  "findings": ["..."]
}`,
      };

    default:
      return { model: 'judge', web: false, maxTokens: 1000, prompt: '' };
  }
}
