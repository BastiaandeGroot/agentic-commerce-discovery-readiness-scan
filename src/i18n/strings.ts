// Alle UI-teksten, Nederlands en Engels naast elkaar.
//
// Let op de formuleringen in het rapport. De rationale waarschuwt expliciet dat
// juist hier een uitkomstbelofte terugkruipt, omdat die lekkerder leest (§2).
// "Je wordt vaker gevonden" is een uitspraak over andermans black box. Wat we
// zeggen gaat over de eigen data van de merchant: meetbaar en weerlegbaar.

export const STRINGS = {
  nl: {
    appName: 'Agentic Commerce Discovery Readiness Scan',
    tagline: 'Is jouw productdata goed genoeg om door een AI-agent gevonden te worden?',
    language: 'Taal',

    steps: { upload: 'Data aanleveren', questions: 'Vragensets valideren', report: 'Rapport' },

    upload: {
      heading: 'Lever je productdata aan',
      intro:
        'De feed is wat de agent daadwerkelijk ziet en is daarom de analysebron. De catalogus-export uit je PIM is optioneel, maar zonder die tweede bron kunnen we niet zien of een ontbrekend veld een mappingfout is of een echt gat.',
      feedLabel: 'Productfeed',
      feedHint: 'Verplicht. Bijvoorbeeld je Channable- of Google Shopping-feed.',
      catalogLabel: 'Catalogus uit PIM',
      catalogHint: 'Optioneel. Bijvoorbeeld een Magento- of PIM-export.',
      formats: 'CSV, TSV, puntkomma-CSV, JSON, NDJSON of XML',
      choose: 'Kies bestand',
      chosen: 'Gekozen',
      remove: 'Verwijderen',
      sample: 'Gebruik een voorbeeldfeed',
      analyse: 'Analyseer',
      reading: 'Bezig met inlezen…',
      privacy: 'Je bestanden worden in je browser verwerkt en nergens naartoe gestuurd.',
      recognised: 'Herkend als',
      products: 'producten',
      mappedColumns: 'kolommen herkend',
      unmappedColumns: 'niet geplaatst',
      showMapping: 'Toon kolomherkenning',
      hideMapping: 'Verberg kolomherkenning',
      sourceColumn: 'Kolom in jouw bestand',
      mappedTo: 'Herkend als',
      unmappedNote:
        'Niet-geplaatste kolommen gaan niet verloren: juist daar zit de categoriespecifieke informatie waar de vragensets op afgaan.',
    },

    questions: {
      heading: 'Vragensets valideren',
      intro:
        'Deze sets gaan over jouw eigen categorieën. Het zijn hypotheses, geen waarheid: wij kennen jouw markt niet. Loop ze langs, pas aan wat niet klopt, vul aan wat we missen, en bevestig ze — een bevestiging kun je altijd weer intrekken.',
      generatedNote:
        'De drempel is een benoemde checklist, geen percentage. Deze vragen bepalen of een product bij een verzoek past.',
      categoriesFound: 'categorieën gevonden in je feed',
      productsInCategory: 'producten',
      basedOn: 'Gebaseerd op archetype',
      fromArchetype: 'Uit de bibliotheek',
      fromData: 'Zelf toegevoegd',
      needs: 'Nodig',
      edit: 'Bewerk',
      save: 'Opslaan',
      cancel: 'Annuleren',
      disable: 'Uitzetten',
      enable: 'Aanzetten',
      disabled: 'Uitgezet',
      addQuestion: 'Vraag toevoegen',
      newQuestionLabel: 'De vraag die een koper stelt',
      newQuestionField: 'Welk veld beantwoordt hem',
      add: 'Toevoegen',
      validate: 'Set bevestigen',
      unvalidate: 'Bevestiging intrekken',
      validated: 'Bevestigd',
      allValidated: 'Alle sets bevestigd',
      validateFirst: 'Bevestig eerst elke set',
      runScan: 'Scan uitvoeren',
      version: 'Vragenset-versie',
      changeLog: 'Wijzigingslog',
      noChanges: 'Nog geen wijzigingen.',
      changeActions: {
        edited: 'tekst gewijzigd', disabled: 'uitgezet', enabled: 'aangezet',
        added: 'toegevoegd', removed: 'verwijderd',
      } as Record<string, string>,
    },

    report: {
      heading: 'Rapport',
      funnelHeading: 'De trechter',
      total: 'producten in de feed',
      findable: 'vindbaar',
      competitive: 'concurrerend',
      findableExplain: 'Elke fit-vraag van de eigen categorie is beantwoord.',
      competitiveExplain: 'De volledige Selection-checklist is aanwezig en bruikbaar.',
      infoLabel: 'Wat betekent dit?',
      findableInfo:
        'Kan een agent jouw product beoordelen? Dat kan pas als élke vraag die in jouw categorie speelt uit je data te beantwoorden is: samenstelling, breedte, onderhoud, waarvoor het geschikt is. Blijft er één over, dan weet de agent niet of jouw product past bij wat de koper vroeg, en laat hij het liever weg. Daarom is er geen "bijna": het zijn alle vragen, of het telt niet.',
      competitiveInfo:
        'Durft een agent jouw product ook te kiezen? Daarvoor kijkt hij niet naar je categorie, maar naar een korte vaste lijst die voor elk product hetzelfde is: prijs, voorraad, een code waarmee hij je product herkent (GTIN of MPN), een vertrouwenssignaal en je retourbeleid. Die gegevens liggen vaak niet in je PIM maar in je webshop, je reviewplatform of bij je klantenservice. Het is geen vervolgstap op vindbaar: beide worden apart geteld, dus een product kan hier compleet zijn en toch niet vindbaar.',
      status: {
        complete: 'Alle vragen beantwoord',
        partial: 'Meer dan de helft beantwoord',
        early: 'Minder dan de helft beantwoord',
      } as Record<string, string>,
      statusExplain: {
        complete:
          'Je data beantwoordt elke vraag die in deze categorie speelt. Dit is wat vindbaar betekent.',
        partial:
          'Je data beantwoordt de meeste vragen al. Je bent pas goed vindbaar als ze állemaal te beantwoorden zijn — de laatste paar bepalen of een agent jouw product durft aan te raden.',
        early:
          'De basis staat, maar een agent kan nog te weinig controleren. Je bent pas goed vindbaar als alle vragen te beantwoorden zijn.',
      } as Record<string, string>,
      statusScale: 'van de',
      statusAnswered: 'vragen beantwoord',
      avgAnsweredLine: 'Gemiddeld beantwoordt een product',
      avgAnsweredOf: 'van de',
      avgAnsweredSuffix: 'fit-vragen van zijn categorie.',
      noBlend:
        'Core en Selection worden niet tot één cijfer samengevoegd. Een product kan perfect beschreven zijn en nooit gekozen worden; één getal verbergt welke van de twee stuk is.',
      perProtocol: 'Per protocol apart berekend, omdat de beschikbare velden verschillen.',
      unmatched: 'producten zonder categorie',
      unmatchedExplain:
        'Deze producten worden geteld maar niet gescoord. Een catalogus waarin een deel nergens op matcht, heeft een taxonomieprobleem dat op zichzelf het melden waard is.',
      questionsHeading: 'Welke vragen blijven onbeantwoord',
      questionsIntro:
        'De onbeantwoorde vragen zijn de werklijst. Er staat bij of het antwoord toch ergens ligt: wat je feed niet beantwoordt maar je PIM wel, is geen ontbrekende informatie maar onbenutte informatie.',
      fromFeed: 'uit je feed',
      enrichable: 'verrijkbaar uit je PIM',
      neither: 'nergens beschikbaar',
      answeredBy: 'beantwoord door',
      ofProducts: 'van de producten',
      selectionHeading: 'Selection-checklist',
      outHeading: 'Buiten de score: checkout-waarschuwingen',
      outIntro:
        'Deze velden tellen niet mee in de score — ze gaan over afrekenen, niet over vindbaarheid. Ze worden wel gerapporteerd: een merchant die perfect vindbaar is maar niets kan verkopen, moet dat niet van iemand anders horen.',
      notEligible: 'producten niet afrekenbaar',
      gapsHeading: 'Waar komt elk gat vandaan',
      gapsIntro:
        'Omdat "ontbreekt" geen werkopdracht is. Merchant Center en de Upload History van OpenAI kunnen alleen zeggen dát een veld leeg is; geen van beide ziet de catalogus áchter je feed. Deze tabel voegt de vraag toe die daar wel uit volgt: is dit doorzetwerk of nieuw werk?',
      gapsWhy:
        'Drie uitkomsten. Een mappinggat betekent dat het antwoord al in je PIM staat en alleen de feed niet haalt — lage inspanning. Een verrijkingsgat betekent dat niemand het ergens heeft vastgelegd en dat iemand het per product moet aanvullen — hoge inspanning. Geen bron betekent dat het uit een systeem moet komen dat je nu niet uitleest, zoals je reviewplatform — middelhoge inspanning, want het is één keuze die daarna voor je hele catalogus geldt. Dat onderscheid kan alleen omdat de scan je feed én je catalogus naast elkaar legt, en het bepaalt waar je begint.',
      gapField: 'Veld',
      gapTier: 'Waar het aan raakt',
      gapCause: 'Oorzaak',
      gapAffected: 'Producten',
      gapColumnInfo: {
        field:
          'Het gegeven dat ontbreekt. Staat er een rij met schuine strepen, dan is dat geen veldnaam uit een specificatie maar een zoekpatroon: we kijken in je eigen kolommen of een van deze woorden voorkomt, zodat je kolom "wasvoorschrift" ook meetelt als het protocol hem "care" noemt.',
        tier:
          'Waar dit gegeven voor nodig is. "Vindbaar" betekent dat een agent zonder dit veld niet kan beoordelen of je product past bij de vraag. "Concurrerend" betekent dat hij het wel snapt, maar je product niet durft te kiezen boven een alternatief dat het wel heeft.',
        cause:
          'Waarom het ontbreekt, en daarmee wat voor werk het is. Een mappinggat is doorzetwerk: het antwoord ligt al in je PIM en haalt de feed alleen niet. Een verrijkingsgat betekent dat niemand het ergens heeft vastgelegd. "Geen bron" betekent dat het uit een systeem moet komen dat je nu niet uitleest, zoals je reviewplatform.',
        affected:
          'Hoeveel van je producten dit gat hebben. Bovenaan staat wat de meeste producten raakt — dat is meestal ook de grootste winst per handeling, omdat één ingreep in je PIM of feedregel ze allemaal tegelijk oplost.',
      } as Record<string, string>,
      noCatalogWarning:
        'Je hebt geen catalogus-export aangeleverd. Daardoor kunnen we een mappinggat niet onderscheiden van een echt gat: alles wat een PIM zou kunnen dragen is hieronder als enrichment geclassificeerd. Lever de PIM-export aan voor volledige attributie.',
      causes: {
        mapping: 'Mappinggat',
        enrichment: 'Verrijkingsgat',
        'no-source': 'Geen bron',
      } as Record<string, string>,
      causeMeaning: {
        mapping: 'Staat in de catalogus, niet doorgezet naar de feed',
        enrichment: 'Staat in geen van beide bronnen',
        'no-source': 'Staat in geen systeem dat je kunt uitlezen',
      } as Record<string, string>,
      causeEffort: {
        mapping: 'Lage inspanning',
        enrichment: 'Hoge inspanning',
        'no-source': 'Middelhoge inspanning',
      } as Record<string, string>,
      tiers: {
        core: 'Vindbaar',
        selection: 'Concurrerend',
        out: 'Buiten de score',
      } as Record<string, string>,
      tierMeaning: {
        core: 'Zonder dit veld kan een agent niet beoordelen of je product past',
        selection: 'Hiermee durft een agent je te kiezen boven een gelijkwaardig alternatief',
        out: 'Telt niet mee; gaat over afrekenen',
      } as Record<string, string>,
      filterCategory: 'Categorie',
      allCategories: 'Alle categorieën',
      allAnswered: 'In deze categorie is elke vraag beantwoord.',
      stampHeading: 'Versiestempel',
      stampExplain:
        'Een score kan bewegen zonder dat je iets deed: doordat een specificatie veranderde, of doordat je vragenset veranderde. Beide staan hieronder, zodat je echte vooruitgang kunt onderscheiden van een verschoven definitie.',
      specSnapshot: 'Spec-snapshot',
      questionVersion: 'Vragenset-versie',
      scannedAt: 'Gescand op',
      disclaimer:
        'Deze scan meet of jouw data de vragen beantwoordt die een koper in jouw categorie stelt. Dat is een uitspraak over je eigen data, niet een voorspelling van hoe een agent rangschikt. Een agent put ook uit je website, reviews van derden, marktplaatsvermeldingen en zijn eigen trainingsdata; de catalogus is één van meerdere bronnen.',
      startOver: 'Nieuwe scan',
      protocolNames: { acp: 'OpenAI ACP', ucp: 'Google UCP' } as Record<string, string>,
    },

    explorer: {
      heading: 'Per categorie en per product',
      intro:
        'Een feed-breed getal zegt dát er werk is. De categorie zegt waar het zit, het product zegt wat er mist.',
      protocol: 'Protocol',
      categoryHeading: 'Per categorie',
      category: 'Categorie',
      products: 'Producten',
      findableCol: 'Vindbaar',
      competitiveCol: 'Concurrerend',
      avgAnswered: 'Gem. beantwoord',
      topGaps: 'Grootste gaten',
      productHeading: 'Per product',
      search: 'Zoek op ID, titel of categorie',
      filterAll: 'Alle',
      filterNotFindable: 'Niet vindbaar',
      filterNotCompetitive: 'Niet concurrerend',
      filterUnmatched: 'Zonder categorie',
      showing: 'Toont',
      of: 'van',
      prev: 'Vorige',
      next: 'Volgende',
      answered: 'vragen beantwoord',
      unanswered: 'Onbeantwoorde vragen',
      productGaps: 'Ontbrekende velden',
      noResults: 'Geen producten gevonden.',
      findableYes: 'Vindbaar',
      findableNo: 'Niet vindbaar',
      competitiveYes: 'Concurrerend',
      competitiveNo: 'Niet concurrerend',
      unmatchedBadge: 'Zonder categorie',
      noImage: 'geen afbeelding',
      openDetail: 'Toon details',
      closeDetail: 'Verberg details',
      filterCategory: 'Categorie',
      allCategories: 'Alle categorieën',
      perPage: 'Toon per pagina',
      allRecords: 'Alle',
    },

    errors: {
      feedRequired: 'Lever eerst een productfeed aan.',
      readFailed: 'Kon dit bestand niet inlezen',
    },
  },

  en: {
    appName: 'Agentic Commerce Discovery Readiness Scan',
    tagline: 'Is your product data good enough for an AI agent to find you?',
    language: 'Language',

    steps: { upload: 'Supply data', questions: 'Validate question sets', report: 'Report' },

    upload: {
      heading: 'Supply your product data',
      intro:
        'The feed is what the agent actually sees, so that is the analysis source. The catalogue export from your PIM is optional, but without that second source we cannot tell whether a missing field is a mapping error or a real gap.',
      feedLabel: 'Product feed',
      feedHint: 'Required. For example your Channable or Google Shopping feed.',
      catalogLabel: 'Catalogue from PIM',
      catalogHint: 'Optional. For example a Magento or PIM export.',
      formats: 'CSV, TSV, semicolon CSV, JSON, NDJSON or XML',
      choose: 'Choose file',
      chosen: 'Selected',
      remove: 'Remove',
      sample: 'Use a sample feed',
      analyse: 'Analyse',
      reading: 'Reading…',
      privacy: 'Your files are processed in your browser and sent nowhere.',
      recognised: 'Recognised as',
      products: 'products',
      mappedColumns: 'columns recognised',
      unmappedColumns: 'unplaced',
      showMapping: 'Show column mapping',
      hideMapping: 'Hide column mapping',
      sourceColumn: 'Column in your file',
      mappedTo: 'Recognised as',
      unmappedNote:
        'Unplaced columns are not lost: that is exactly where the category-specific information lives that the question sets draw on.',
    },

    questions: {
      heading: 'Validate question sets',
      intro:
        'These sets are about your own categories. They are hypotheses, not truth: we do not know your market. Walk through them, correct what is wrong, add what we missed, and confirm them — a confirmation can always be withdrawn.',
      generatedNote:
        'The threshold is a named checklist, not a percentage. These questions decide whether a product fits a request.',
      categoriesFound: 'categories found in your feed',
      productsInCategory: 'products',
      basedOn: 'Based on archetype',
      fromArchetype: 'From the library',
      fromData: 'Added by you',
      needs: 'Needs',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      disable: 'Disable',
      enable: 'Enable',
      disabled: 'Disabled',
      addQuestion: 'Add question',
      newQuestionLabel: 'The question a buyer asks',
      newQuestionField: 'Which field answers it',
      add: 'Add',
      validate: 'Confirm set',
      unvalidate: 'Undo confirmation',
      validated: 'Confirmed',
      allValidated: 'All sets confirmed',
      validateFirst: 'Confirm every set first',
      runScan: 'Run scan',
      version: 'Question set version',
      changeLog: 'Change log',
      noChanges: 'No changes yet.',
      changeActions: {
        edited: 'text changed', disabled: 'disabled', enabled: 'enabled',
        added: 'added', removed: 'removed',
      } as Record<string, string>,
    },

    report: {
      heading: 'Report',
      funnelHeading: 'The funnel',
      total: 'products in the feed',
      findable: 'findable',
      competitive: 'competitive',
      findableExplain: 'Every fit question for the product category is answered.',
      competitiveExplain: 'The full Selection checklist is present and usable.',
      infoLabel: 'What does this mean?',
      findableInfo:
        'Can an agent judge your product? Only once every question that matters in your category can be answered from your data: composition, width, care, what it is suitable for. Leave one unanswered and the agent cannot tell whether your product matches what the buyer asked for, so it leaves it out. That is why there is no "almost": it is every question, or it does not count.',
      competitiveInfo:
        'Will an agent dare to pick your product? For that it does not look at your category but at a short fixed list that is the same for every product: price, stock, a code it can identify your product by (GTIN or MPN), a trust signal and your return policy. That data often does not live in your PIM but in your webshop, your review platform or with your customer service. It is not a step after findable: the two are counted separately, so a product can be complete here and still not be findable.',
      status: {
        complete: 'Every question answered',
        partial: 'More than half answered',
        early: 'Less than half answered',
      } as Record<string, string>,
      statusExplain: {
        complete:
          'Your data answers every question that matters in this category. That is what findable means.',
        partial:
          'Your data already answers most questions. You are only properly findable once they can all be answered — the last few decide whether an agent dares to recommend your product.',
        early:
          'The basics are there, but an agent can still check too little. You are only properly findable once every question can be answered.',
      } as Record<string, string>,
      statusScale: 'of',
      statusAnswered: 'questions answered',
      avgAnsweredLine: 'On average a product answers',
      avgAnsweredOf: 'of the',
      avgAnsweredSuffix: 'fit questions for its category.',
      noBlend:
        'Core and Selection are never blended into one number. A product can be perfectly described and never chosen; a single figure hides which of the two is broken.',
      perProtocol: 'Computed per protocol separately, because the available fields differ.',
      unmatched: 'products without a category',
      unmatchedExplain:
        'These products are counted but not scored. A catalogue where part of it matches nothing has a taxonomy problem worth reporting in its own right.',
      questionsHeading: 'Which questions go unanswered',
      questionsIntro:
        'The unanswered questions are the work list. It says whether the answer sits somewhere after all: what your feed cannot answer but your PIM can is not missing information but unused information.',
      fromFeed: 'from your feed',
      enrichable: 'available in your PIM',
      neither: 'nowhere available',
      answeredBy: 'answered by',
      ofProducts: 'of products',
      selectionHeading: 'Selection checklist',
      outHeading: 'Outside the score: checkout warnings',
      outIntro:
        'These fields do not count towards the score — they concern checkout, not findability. They are reported anyway: a merchant who is perfectly findable and cannot sell must not learn that from somebody else.',
      notEligible: 'products not checkout-eligible',
      gapsHeading: 'Where each gap comes from',
      gapsIntro:
        'Because "missing" is not a work order. Merchant Center and OpenAI\'s Upload History can only tell you that a field is empty; neither sees the catalogue behind your feed. This table adds the question that follows from it: is this plumbing, or new work?',
      gapsWhy:
        'Three outcomes. A mapping gap means the answer already sits in your PIM and simply does not reach the feed — low effort. An enrichment gap means nobody has recorded it anywhere and someone has to fill it in product by product — high effort. No source means it has to come from a system you do not read out today, such as your reviews platform — medium effort, because it is one decision that then covers your whole catalogue. That distinction is only possible because the scan reads your feed and your catalogue side by side, and it decides where you start.',
      gapField: 'Field',
      gapTier: 'What it affects',
      gapCause: 'Cause',
      gapAffected: 'Products',
      gapColumnInfo: {
        field:
          'The piece of information that is missing. A row with slashes is not a field name from a specification but a search pattern: we look through your own columns for any of these words, so your column "wasvoorschrift" still counts when the protocol calls it "care".',
        tier:
          'What this information is needed for. "Findable" means that without this field an agent cannot judge whether your product fits the request. "Competitive" means it understands your product but will not pick it over an alternative that does have the field.',
        cause:
          'Why it is missing, and therefore what kind of work it is. A mapping gap is plumbing: the answer already sits in your PIM and simply does not reach the feed. An enrichment gap means nobody has recorded it anywhere. "No source" means it has to come from a system you do not read out today, such as your reviews platform.',
        affected:
          'How many of your products have this gap. What affects the most products sits at the top — usually the biggest win per action too, because one change in your PIM or feed rule fixes them all at once.',
      } as Record<string, string>,
      noCatalogWarning:
        'You supplied no catalogue export. That means we cannot distinguish a mapping gap from a real gap: everything a PIM could carry is classified below as enrichment. Supply the PIM export for full attribution.',
      causes: {
        mapping: 'Mapping gap',
        enrichment: 'Enrichment gap',
        'no-source': 'No-source gap',
      } as Record<string, string>,
      causeMeaning: {
        mapping: 'In the catalogue, not mapped into the feed',
        enrichment: 'In neither source',
        'no-source': 'In no system you can read',
      } as Record<string, string>,
      causeEffort: {
        mapping: 'Low effort',
        enrichment: 'High effort',
        'no-source': 'Medium effort',
      } as Record<string, string>,
      tiers: {
        core: 'Findable',
        selection: 'Competitive',
        out: 'Outside the score',
      } as Record<string, string>,
      tierMeaning: {
        core: 'Without this field an agent cannot judge whether your product fits',
        selection: 'This is what makes an agent pick you over an equal alternative',
        out: 'Does not count; concerns checkout',
      } as Record<string, string>,
      filterCategory: 'Category',
      allCategories: 'All categories',
      allAnswered: 'Every question in this category is answered.',
      stampHeading: 'Version stamp',
      stampExplain:
        'A score can move without you doing anything: because a specification changed, or because your question set changed. Both are recorded below, so you can tell real progress from a shifted definition.',
      specSnapshot: 'Spec snapshot',
      questionVersion: 'Question set version',
      scannedAt: 'Scanned at',
      disclaimer:
        'This scan measures whether your data answers the questions a buyer in your category asks. That is a statement about your own data, not a prediction of how an agent ranks. An agent also draws on your website, third-party reviews, marketplace listings and its own training data; the catalogue is one input of several.',
      startOver: 'New scan',
      protocolNames: { acp: 'OpenAI ACP', ucp: 'Google UCP' } as Record<string, string>,
    },

    explorer: {
      heading: 'By category and by product',
      intro:
        'A feed-wide number says there is work. The category says where it sits, the product says what is missing.',
      protocol: 'Protocol',
      categoryHeading: 'By category',
      category: 'Category',
      products: 'Products',
      findableCol: 'Findable',
      competitiveCol: 'Competitive',
      avgAnswered: 'Avg. answered',
      topGaps: 'Largest gaps',
      productHeading: 'By product',
      search: 'Search by ID, title or category',
      filterAll: 'All',
      filterNotFindable: 'Not findable',
      filterNotCompetitive: 'Not competitive',
      filterUnmatched: 'No category',
      showing: 'Showing',
      of: 'of',
      prev: 'Previous',
      next: 'Next',
      answered: 'questions answered',
      unanswered: 'Unanswered questions',
      productGaps: 'Missing fields',
      noResults: 'No products found.',
      findableYes: 'Findable',
      findableNo: 'Not findable',
      competitiveYes: 'Competitive',
      competitiveNo: 'Not competitive',
      unmatchedBadge: 'No category',
      noImage: 'no image',
      filterCategory: 'Category',
      allCategories: 'All categories',
      perPage: 'Show per page',
      allRecords: 'All',
      openDetail: 'Show details',
      closeDetail: 'Hide details',
    },

    errors: {
      feedRequired: 'Supply a product feed first.',
      readFailed: 'Could not read this file',
    },
  },
};

export type Locale = keyof typeof STRINGS;
export type Strings = (typeof STRINGS)['nl'];
