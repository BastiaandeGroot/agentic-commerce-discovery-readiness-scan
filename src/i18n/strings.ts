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

    shell: {
      nav: {
        home: 'Home',
        scan: 'Scan starten',
        demo: 'Voorbeeldrapport',
        methode: 'Wat we controleren',
        prijzen: 'Prijzen',
        over: 'Over',
        dashboard: 'Dashboard',
      } as Record<string, string>,
      primaryAction: 'Bekijk een voorbeeldrapport',
      menu: 'Menu',
      footerNote:
        'De gratis scan draait volledig in je browser. Je bestand wordt niet geüpload en verlaat je apparaat niet.',
      appNav: {
        overview: 'Overzicht',
        scans: 'Scans',
        settings: 'Instellingen',
      } as Record<string, string>,
      account: 'Account',
      accountPlaceholder: 'Nog geen account',
      backToSite: 'Terug naar de site',
    },

    pages: {
      home: {
        title: 'Zie wat een AI-agent van jouw producten begrijpt',
        intro:
          'Een koper vraagt een AI-agent om een product. Die agent moet uit jouw productdata opmaken of jouw product past bij wat er gevraagd is. Deze scan laat zien welke van die vragen jouw catalogus kan beantwoorden, en welke niet.',
        secondary: 'Geen account nodig. De scan draait op je eigen apparaat.',
        sampleHeading: 'Zo ziet een uitkomst eruit',
        sampleIntro:
          'Hieronder draait de scan live op een voorbeeldwinkel. Geen schermafbeelding: dit is dezelfde motor die straks over jouw catalogus gaat.',
        sampleFull: 'Bekijk het hele voorbeeldrapport',
        stepsHeading: 'Hoe het werkt',
        steps: [
          {
            title: 'Je kiest je bestand',
            body: 'Eén export uit het systeem waar je productdata echt onderhouden wordt: je PIM of MDM, of anders Magento of Shopify. Daar staat wat je wéét van je producten — een kanaalfeed is daar maar een afgeleide van.',
          },
          {
            title: 'De scan draait op je eigen apparaat',
            body: 'Je bestand wordt niet geüpload. Het rekenwerk gebeurt in je browser, naast de pagina, zodat je scherm blijft reageren ook bij duizenden producten.',
          },
          {
            title: 'Je rapport staat er',
            body: 'Per categorie de vragen die een koper stelt, welke jouw data beantwoordt, en waar de ontbrekende antwoorden vandaan moeten komen. Compleet, niets afgeschermd.',
          },
        ],
        privacyHeading: 'Wat er met je bestand gebeurt',
        privacyLead:
          'Kort gezegd: niets. De gratis scan verlaat je apparaat niet, en dat is geen belofte maar een eigenschap van hoe hij gebouwd is.',
        privacyPoints: [
          'Je catalogusexport wordt in je browser gelezen en verwerkt. Er gaat geen bestand naar een server, ook niet tijdelijk.',
          'Er wordt niets bewaard. Sluit je het tabblad, dan is het rapport weg. Wil je het houden, druk het dan af of sla het op als pdf.',
          'Er komt geen taalmodel aan te pas. De scan leest gestructureerde velden, niet je teksten, en kost daarom niets per keer.',
          'Zodra er accounts komen verandert dat, want bewaren betekent opslaan. Dan staat er ook bij hoe lang en hoe je het weggooit.',
        ],
        faqHeading: 'Vragen die we vaker krijgen',
        faq: [
          {
            q: 'Vertelt dit me of ik hoger in ChatGPT kom?',
            a: 'Nee, en dat zou niemand eerlijk kunnen. Hoe een agent rangschikt is andermans systeem, en die put ook uit je website, reviews en zijn eigen kennis. Wat we wél meten is of jouw data de vragen kan beantwoorden die in jouw categorie spelen. Dat gaat over je eigen bestand, en dat is te controleren en tegen te spreken.',
          },
          {
            q: 'Welke bestanden kan ik aanleveren?',
            a: 'CSV, TSV, puntkomma-CSV, JSON, NDJSON en XML. Dus gewoon de export die je PIM, Magento of Shopify je geeft. Een xlsx exporteer je eerst als CSV.',
          },
          {
            q: 'Mijn kolommen heten anders dan bij anderen. Werkt het dan?',
            a: 'Meestal wel — we herkennen een paar honderd gangbare namen, met of zonder prefix. Zit er iets fout, dan zie je dat meteen in de voorbeeldweergave en kun je het per kolom zelf rechtzetten.',
          },
          {
            q: 'Waarom vragen jullie ook mijn PIM-export?',
            a: 'Omdat "ontbreekt" geen werkopdracht is. Bestaat het veld in je catalogus en staat het leeg, dan is dat invulwerk en kan iemand er deze week mee beginnen. Bestaat het veld niet, dan moet er eerst iets in je datamodel veranderen. Dat is niet hetzelfde budget en niet dezelfde persoon.',
          },
          {
            q: 'Hoe groot mag mijn bestand zijn?',
            a: 'Tot ongeveer 50 MB gaat prima in de browser; daarboven waarschuwen we. Grotere catalogi horen serverzijdig te draaien, en dat komt met een account.',
          },
          {
            q: 'Wat kost het?',
            a: 'De scan zelf is gratis en blijft dat, inclusief het volledige rapport. Je betaalt pas als je resultaten wilt bewaren, vergelijken en delen.',
          },
        ],
        closingHeading: 'Kijk wat er in jouw catalogus staat',
        closingBody: 'Een scan kost een paar seconden, geen account en geen gegevens.',
      },
      demo: {
        title: 'Voorbeeldrapport',
        intro:
          'Een volledig rapport op verzonnen voorbeelddata, zodat je ziet wat je krijgt voordat je je eigen bestand kiest.',
        badge: 'Voorbeelddata',
        ownFile: 'Doe dit met je eigen bestand',
      },
      report: {
        title: 'Rapport',
        intro: 'Het resultaat van een scan, op een eigen adres zodat je het kunt delen.',
        notFound: 'Dit rapport bestaat niet of is verlopen',
        notFoundBody:
          'Rapporten worden nog nergens bewaard. Druk een rapport af of sla het op als pdf; dat gebeurt op je eigen apparaat.',
        runScan: 'Nieuwe scan starten',
      },
      pricing: {
        title: 'Prijzen',
        intro:
          'De scan zelf is gratis en blijft dat. Je betaalt pas als je resultaten wilt bewaren, vergelijken en delen — niet om de helft van je uitkomst te zien.',
        freeTitle: 'Gratis',
        freeBody:
          'De volledige scan op je eigen bestand, in je eigen browser. Het hele rapport, alle bevindingen, niets afgeschermd.',
        paidTitle: 'Met account',
        paidBody:
          'Rapporten bewaren, historie opbouwen, twee scans naast elkaar leggen, delen met je team, en grotere bestanden serverzijdig laten draaien.',
        todo: 'TODO — bedragen en de exacte bestandsgrens moeten nog vastgesteld worden.',
      },
      about: {
        title: 'Over deze scan',
        intro:
          'De scan meet of jouw productcatalogus de vragen beantwoordt die een koper in jouw markt stelt.',
        deterministic:
          'De uitkomst is volledig deterministisch. Vragen worden beantwoord uit gestructureerde attributen en niet uit lopende tekst, en er komt geen taalmodel aan te pas. Hetzelfde bestand geeft altijd hetzelfde rapport, en een scan kost niets.',
        privacy:
          'De gratis scan draait in je browser. Je catalogus verlaat je apparaat niet en wordt nergens opgeslagen.',
        promise:
          'Wat de scan niet doet: voorspellen hoe een agent rangschikt. Dat is een uitspraak over andermans systeem. Wat hier staat gaat over je eigen data en is daarmee meetbaar en weerlegbaar.',
        todo: 'TODO — wie hierachter zit en hoe je contact opneemt.',
      },
      dashboard: {
        title: 'Overzicht',
        intro: 'Je laatste scans, wat er veranderde, en wat er nog openstaat.',
        emptyTitle: 'Nog geen bewaarde scans',
        emptyBody:
          'Zodra je scans bewaart, zie je hier hoe je catalogus zich ontwikkelt en wat er sinds de vorige keer is opgelost.',
        scansTitle: 'Scans',
        scansIntro: 'Alle bewaarde scans, met de mogelijkheid om er twee naast elkaar te leggen.',
        settingsTitle: 'Instellingen',
        settingsIntro: 'Je account, je teamleden en wat er met je data gebeurt.',
        soon: 'Nog niet beschikbaar',
        soonBody:
          'Accounts komen later. Tot die tijd draait elke scan in je browser en wordt er niets bewaard.',
        localTitle: 'Bewaard op dit apparaat',
        localBody:
          'Je bewaarde scans staan in deze browser. Op een ander apparaat of na het wissen van je browsergegevens zijn ze weg.',
        saved: 'bewaarde scans',
        latest: 'Laatste scan',
        compareHeading: 'Twee scans naast elkaar',
        compareIntro: 'Kies welke twee je wilt vergelijken. Het verschil zegt alleen iets als de meetlat gelijk bleef.',
        compareBefore: 'Eerdere scan',
        compareAfter: 'Latere scan',
        compareNeedTwo: 'Bewaar minstens twee scans om te kunnen vergelijken.',
        scaleWarning: 'De meetlat is tussentijds veranderd',
        scaleWarningBody:
          'Een verschil hieronder kan dus ook uit een gewijzigde definitie komen in plaats van uit je data. Wat er veranderde:',
        scaleScan: 'de scanregels',
        scaleSpec: 'de specificatie-snapshot',
        scaleQuestions: 'je vragenset',
        scaleBank: 'de vragenbank',
        comparable: 'Dezelfde meetlat, dus dit verschil komt uit je data.',
        deltaHeading: 'Wat er veranderde',
        deltaQualified: 'Basisgeschikt',
        deltaFindable: 'Volledig beantwoord',
        deltaAvg: 'Gem. beantwoord',
        deltaUnmatched: 'Zonder categorie',
        gapsResolved: 'Opgelost',
        gapsNew: 'Nieuw',
        gapsChanged: 'Veranderd',
        noChange: 'ongewijzigd',
        remove: 'Verwijderen',
        clearTitle: 'Alles wissen',
        clearBody: 'Verwijdert alle scans die op dit apparaat bewaard zijn. Dit kan niet ongedaan gemaakt worden.',
        clearAction: 'Bewaarde scans wissen',
        cleared: 'Alle bewaarde scans zijn gewist.',
      },
    },

    steps: {
      upload: 'Data aanleveren',
      bank: 'Vragenlijst',
      mapping: 'Kenmerken koppelen',
      questions: 'Vragensets valideren',
      report: 'Rapport',
    },

    upload: {
      heading: 'Lever je productdata aan',
      intro:
        'Eén export uit het systeem waar je productdata echt onderhouden wordt: je PIM, Magento of Shopify.',
      drop: 'Sleep je bestand hierheen of klik om te kiezen',
      previewHeading: 'Zo lezen wij je bestand',
      previewIntro:
        'De eerste regels zoals wij ze lezen. Staat hier iets scheef, dan klopt de kopregel of het scheidingsteken niet.',
      previewMore: 'en nog',
      previewRows: 'regels',
      tooLarge: 'Dit bestand is groot',
      tooLargeBody:
        'Boven de {limit} MB kan een scan in de browser traag worden. Je kunt het proberen.',
      tryAnyway: 'Toch in de browser proberen',
      workerOn: 'De scan draait naast de pagina, dus je scherm blijft reageren.',
      workerOff:
        'Je browser staat geen achtergrondverwerking toe; het scherm kan even stilstaan.',
      progressReading: 'Bezig met lezen',
      catalogLabel: 'Je productcatalogus',
      catalogHint: 'Neem alle kolommen mee. Een kolom die leeg is, is iets anders dan een kolom die er niet is.',
      formats: 'CSV, TSV, puntkomma-CSV, JSON, NDJSON of XML',
      choose: 'Kies bestand',
      remove: 'Verwijderen',
      sample: 'Gebruik een voorbeeldcatalogus',
      analyse: 'Analyseer',
      reading: 'Bezig met inlezen…',
      privacy: 'Je bestanden worden in je browser verwerkt en nergens naartoe gestuurd.',
      recognised: 'Herkend als',
      products: 'producten',
      mappedColumns: 'kolommen herkend',
      unmappedColumns: 'niet geplaatst',
    },

    bank: {
      heading: 'Je vragenlijst',
      intro:
        'De vragen komen niet uit je eigen kolommen maar uit een lijst voor jouw markt: wat kopers vragen voordat ze bestellen.',
      // De status van de bank blijft in beeld op de vragensets en op het rapport:
      // een cijfer dat langs een voorlopige lat gemeten is, mag daar niet
      // hetzelfde uitzien als een cijfer langs een bevroren lat.
      status: {
        provisional: 'Voorlopig',
        'in-review': 'In review',
        frozen: 'Bevroren',
      } as Record<string, string>,
      choose: 'Kies je vragenlijst',
      drop:
        'Sleep het bestand hierheen of klik om te kiezen. Eén regel per vraag, met in elk geval een id, de vraag en het belang.',
      reading: 'Bezig met lezen',
      readAs: 'Gelezen als',
      countBase: 'basisvragen',
      countCategories: 'categorieën',
      countCategoryQuestions: 'categoriespecifieke vragen',
      countAttributes: 'attributen',
      baseExplain:
        'Basisvragen gelden voor élk product; een categorie voegt er zijn eigen aan toe.',
      accept: 'Gebruik deze vragenlijst',
      inUseHeading: 'In gebruik',
      remove: 'Verwijderen',
      storedNote: 'Bewaard op dit apparaat.',
      empty: 'Er is nog geen vragenlijst ingelezen.',
      fallback:
        'Zonder eigen lijst meten we langs een voorlopige vragenbank uit vakkennis.',
      importErrors: 'Dit moet eerst hersteld worden',
      importErrorsBody:
        'Herstel deze punten in het bestand en kies het opnieuw.',
      importWarnings: 'Let hierop',
      importWarningsBody:
        'De lijst is bruikbaar. Dit viel op.',
      continue: 'Verder naar de vragensets',
      skip: 'Verder zonder eigen lijst',
    },

    mapping: {
      heading: 'Koppel je kenmerken aan je kolommen',
      intro:
        'Je vragenlijst noemt een kenmerk zoals het vak het noemt, je export zoals je systeem het opsloeg. Wat vanzelf te koppelen was, staat al ingevuld.',
      countLinked: 'gekoppeld',
      agentNote:
        'Een AI-agent die je catalogus leest, snapt zelf wel dat `rol_breedte` de baanbreedte is. Hieronder doet een taalmodel in je browser hetzelfde, zodat we meten wat zo\'n agent bij jou zou vinden. De scan zelf rekent er niet mee: jij bevestigt de koppeling, en daarna is de uitkomst weer gewoon reproduceerbaar. Geen kolom is ook een antwoord — dan legt je catalogus dit kenmerk niet vast.',
      suggest: 'Laat de rest herkennen',
      suggestAgain: 'Opnieuw proberen',
      suggestBusy: {
        remote: 'Kenmerken herkennen…',
        library: 'Model laden…',
        model: 'Model laden…',
        embedding: 'Kenmerken vergelijken…',
      } as Record<string, string>,
      byModel: 'Voorgesteld door',
      bySelf: 'Voorgesteld door het model in je browser; er is geen sleutel ingesteld op de server.',
      suggestNote:
        'Hiervoor gaan je kolomnamen, een paar voorbeeldwaarden per kolom en de vragen uit je lijst naar Claude. Geen bestand, geen productrijen, geen prijzen. Kan dat niet, dan draait er een kleiner model in je browser en zie je dat erbij staan. Loop de voorstellen na — een fout voorstel kost je één klik, een gemist kenmerk kost je een gat dat je niet ziet.',
      suggestFailed: 'Het model kon niet geladen worden',
      suggestFailedBody:
        'De download is niet gelukt. Dat kan aan je verbinding liggen of aan een netwerk dat hem tegenhoudt.',
      suggestFailedNext:
        'Probeer het opnieuw, of wijs de kenmerken hieronder zelf aan — dat werkt altijd en het resultaat is hetzelfde.',
      proposed: 'Voorstel',
      proposedCount: 'voorstellen. Loop ze na en gooi weg wat niet klopt.',
      setsHeading: 'Welke vragenset hoort bij welke categorie',
      setsNote:
        'Elke categorie krijgt de algemene vragen. Kies hier welke categoriespecifieke vragen daar bovenop komen — juist daar zitten de vragen die de onomkeerbare fout voorkomen.',
      setsMatching: 'Bezig met koppelen…',
      setsMatched: 'Automatisch gekoppeld — loop het na.',
      setQuestions: 'vragen',
      setBaseOnly: 'alleen algemene vragen',
      setNone: '— alleen de algemene vragen —',
      listHeading: 'Kenmerken',
      noColumn: '— geen kolom —',
      continue: 'Verder naar de vragensets',
    },
    questions: {
      heading: 'Vragensets valideren',
      intro:
        'Deze sets gaan over jouw eigen categorieën. Pas aan wat niet klopt en bevestig ze.',
      generatedNote:
        'Deze vragen bepalen of een product bij een verzoek past.',
      categoriesFound: 'categorieën gevonden in je catalogus',
      productsInCategory: 'producten',
      basedOn: 'Uit vragenbank',
      fromArchetype: 'Uit de bank',
      fromData: 'Zelf toegevoegd',
      importance: {
        critical: 'Kritiek', high: 'Hoog', medium: 'Middel', low: 'Laag',
      } as Record<string, string>,
      importanceExplain:
        'Kritiek zijn de vragen die de aankoopfout voorkomen die je koper niet kan terugdraaien.',
      coverage: 'Dekking',
      coverageNone: 'niet onderzocht',
      notScored: 'Buiten de score',
      notScoredExplain:
        'Deze vraag gaat over een dienst of een proces, niet over een productkenmerk. Hij telt niet mee.',
      weightNote: 'Waarom dit gewicht',
      caution: 'Let op bij het antwoord',
      baseHeading: 'De algemene vragen',
      baseCount: 'vragen die voor élk product gelden',
      baseValidate: 'Bevestigen',
      ownCount: 'eigen vragen',
      noOwn: 'geen eigen vragen',
      noOwnExplain:
        'Deze categorie krijgt alleen de algemene vragen. Klopt dat niet, kies dan bij "Kenmerken koppelen" de vragenset die erbij hoort.',
      reweighted: 'Weegt zwaarder in',
      layerBase: 'Algemeen',
      layerCategory: 'Categorie-eigen',
      layerExplain:
        'Algemene vragen gelden voor élk product in je catalogus. Categorie-eigen vragen komen daar bovenop en gaan over wat in déze categorie misgaat.',
      noOverlayHeading: 'De categorieën van je vragenlijst sluiten niet aan op je catalogus',
      noOverlayBody:
        'Deze categorieën krijgen alleen de basisvragen; de categoriespecifieke blijven liggen. Je cijfer valt daardoor te laag uit.',
      noOverlayNext:
        'Zet je eigen categorienamen in de kolom `geldt_voor` van je vragenlijst, naast de namen die er al staan.',
      matchedHeading: 'Zelf gekoppelde kenmerken',
      matchedBody:
        'Deze koppelde de scan zelf, op schrijfwijze en woordbetekenis. Loop ze na.',
      intents: {
        fit: 'Geschiktheid', quantity: 'Hoeveelheid', care: 'Onderhoud',
        expectation: 'Verwachting', material: 'Materiaal', processing: 'Verwerking',
        durability: 'Duurzaamheid', safety: 'Veiligheid',
        'purchase-certainty': 'Koopzekerheid', comfort: 'Comfort', function: 'Functie',
      } as Record<string, string>,
      needs: 'Nodig',
      edit: 'Bewerk',
      save: 'Opslaan',
      cancel: 'Annuleren',
      disable: 'Uitzetten',
      enable: 'Aanzetten',
      disabled: 'Uitgezet',
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
      startHeading: 'Waar begin je?',
      startIntro:
        'De trechter is streng: volledig betekent élke vraag beantwoord. Dit zegt hoe ver je bent.',
      startNoneFindable: 'Nog geen enkel product beantwoordt alle vragen.',
      startSomeFindable: 'producten beantwoorden al elke vraag.',
      startNearest: 'Het dichtst in de buurt:',
      startNearestProducts: 'producten missen nog',
      startNearestQuestions: 'antwoorden.',
      startBlockersHeading: 'Wat de meeste producten tegenhoudt',
      startBlockerOpen: 'producten hebben deze vraag open',
      startBlockerPim: 'waarvan het veld al bestaat',
      startBlockerNowhere: 'er is geen veld voor',
      startWinHeading: 'Wat de eerste stap oplevert',
      startWinBody: 'Beantwoord je deze vragen voor je hele catalogus, dan zijn',
      startWinProducts: 'producten meteen compleet.',
      startWinNone:
        'Deze vragen alleen zijn niet genoeg, maar ze zijn wel de grootste stap.',
      total: 'producten in je catalogus',
      qualified: 'basisgeschikt',
      findable: 'volledig beantwoord',
      qualifiedExplain: 'Elke kritieke vraag van de eigen categorie is beantwoord.',
      qualifiedInfo:
        'Kan een agent je product aanraden zonder de koper een onherstelbare fout te laten maken? De vragen die die fout voorkomen heten kritiek; op deze trede zijn ze allemaal beantwoord.',
      qualifiedNoCritical:
        'Deze vragenset kent geen kritieke vragen, dus deze trede zegt hier niets.',
      findableExplain: 'Elke vraag van de eigen categorie is beantwoord.',
      points: 'punten',
      avgPointsLine: 'en haalt daarmee',
      states: {
        answered: 'Beantwoord',
        empty: 'Veld bestaat, staat leeg',
        unusable: 'Gevuld maar te mager',
        incomplete: 'Deels beantwoord',
        absent: 'Geen veld voor',
      } as Record<string, string>,
      statesExplain: {
        answered: 'Je catalogus draagt het antwoord. Dit is wat een agent kan lezen.',
        empty: 'De kolom bestaat in je catalogus, maar staat bij deze producten leeg. Invulwerk: de plek is er al, en dit is de goedkoopste winst die er is.',
        unusable: 'Het veld is gevuld, maar met te weinig om de vraag te beantwoorden. Dit vraagt om herschrijven van iets wat er al staat.',
        incomplete: 'Een deel van wat nodig is staat er. Bij een vraag die twee dingen tegelijk vraagt — breedte én rapport — is de helft geen antwoord.',
        absent: 'Je catalogus kent dit kenmerk niet: er is geen kolom voor. Er moet eerst een veld bij, en daarna pas een waarde.',
      } as Record<string, string>,
      advisoryHeading: 'Buiten de score: waar je data niets over kan zeggen',
      advisoryIntro:
        'Deze vragen stelt een koper wel, maar geen productattribuut kan ze beantwoorden. Ze tellen niet mee: dit lost je website of klantenservice op, niet je catalogus.',
      bankHeading: 'Vragenbank',
      blindHeading: 'De vragenbank sluit niet aan op je kolomnamen',
      blindBody:
        'Deze kenmerken komen in geen enkele kolom van je catalogus voor. Meestal staat het er wel, onder een andere naam — en dan telt de vraag onterecht als onbeantwoord.',
      blindNext:
        'Ga terug naar "Kenmerken koppelen" en wijs per kenmerk je eigen kolom aan.',
      blindCount: 'attributen zonder kolom',
      bankProvisional:
        'Gemeten langs een voorlopige vragenbank uit vakkennis. De cijfers kloppen met de gestelde vragen; of dit de vragen van jouw kopers zijn, is beredeneerd.',
      bankInReview:
        'Gemeten langs de vragenlijst die je zelf hebt aangeleverd. De cijfers kloppen met de gestelde vragen; of dit de vragen van jouw kopers zijn, staat of valt met je lijst.',
      infoLabel: 'Wat betekent dit?',
      findableInfo:
        'Een agent kan je product pas beoordelen als élke vraag uit je categorie te beantwoorden is. Blijft er één open, dan laat hij het liever weg. Daarom is er geen "bijna".',
      status: {
        complete: 'Alle vragen beantwoord',
        partial: 'Meer dan de helft beantwoord',
        early: 'Minder dan de helft beantwoord',
      } as Record<string, string>,
      statusExplain: {
        complete:
          'Je catalogus beantwoordt elke vraag die in deze categorie speelt. Dit is waar de scan op mikt.',
        partial:
          'Je catalogus beantwoordt de meeste vragen al. Je bent er pas als ze állemaal te beantwoorden zijn — de laatste paar bepalen of een agent jouw product durft aan te raden.',
        early:
          'De basis staat, maar een agent kan nog te weinig controleren. Je bent er pas als alle vragen te beantwoorden zijn.',
      } as Record<string, string>,
      statusScale: 'van de',
      statusAnswered: 'vragen beantwoord',
      unmatched: 'producten zonder categorie',
      unmatchedExplain:
        'Deze producten worden geteld maar niet gescoord: ze vallen in geen enkele categorie.',
      questionsHeading: 'Welke vragen blijven onbeantwoord',
      questionsIntro:
        'Je werklijst, met erbij waar elk antwoord strandt.',
      fromFeed: 'beantwoord',
      enrichable: 'veld leeg',
      neither: 'geen veld voor',
      ofProducts: 'van de producten',
      gapsHeading: 'Waar komt elk gat vandaan',
      gapsIntro:
        'Per gat: wat voor werk het is, en welke vragen erdoor blijven liggen.',
      gapsWhy:
        'Invulwerk: de kolom bestaat en staat leeg — meestal de grootste winst. Modelwerk: er moet eerst een veld bij. Geen bron: het komt uit een systeem dat een catalogus niet draagt.',
      gapField: 'Veld',
      gapQuestions: 'Vragen',
      gapCause: 'Oorzaak',
      gapAffected: 'Producten',
      gapColumnInfo: {
        questions:
          'Hoeveel vragen er door dit gat onbeantwoord blijven.',
        field:
          'Het gegeven dat ontbreekt. Een rij met schuine strepen is een zoekpatroon over je eigen kolommen, geen veldnaam.',
        cause:
          'Waarom het ontbreekt, en daarmee wat voor werk het is.',
        affected:
          'Hoeveel van je producten dit gat hebben. Bovenaan staat de grootste winst per handeling.',
      } as Record<string, string>,
      scoreHeading: 'Waar sta je per categorie',
      scoreIntro:
        'Per categorie hoeveel vragen een product gemiddeld beantwoordt, en hoeveel er te halen zijn. Geen percentage: 2 van de 7 zegt hoeveel werk er ligt, 30% niet.',
      scoreCritical: 'Kritieke vragen',
      scoreCriticalGoal: 'Alle kritieke vragen beantwoord = basisgeschikt. Dit is de eerste poort; blijft er één open, dan komt een product niet door.',
      scoreGeneral: 'Algemene vragen',
      scoreGeneralGoal: 'Deze vragen komen in élke categorie terug. Eén kolom vullen telt hier overal mee — dit is de goedkoopste winst die je kunt maken.',
      scoreAll: 'Alle vragen',
      scoreAllGoal: 'Alles beantwoord = volledig. De laatste trede, en de enige die telt voor een agent die je product met alles moet kunnen vergelijken.',
      scoreOf: 'van de',
      scoreToGo: 'nog te gaan',
      scoreDone: 'compleet',
      scoreSub: 'subcategorie',
      scoreAllCategories: 'Alle categorieën',
      scoreProducts: 'producten gemeten in',
      scoreLevelNote:
        'Je vragenlijst stelt vragen per categorie, niet per subcategorie. Subcategorieën krijgen dus dezelfde vragen en staan hier niet apart — dat zou een onderscheid suggereren dat je lijst niet maakt. Komen er vragen per subcategorie, dan verschijnt dat niveau vanzelf.',
      qDetail: 'Waarom niet beantwoord',
      qDetailClose: 'Verbergen',
      qNeeds: 'Deze vraag heeft nodig',
      qColumn: 'Kolom in je catalogus',
      qNoColumn: 'geen kolom gekoppeld',
      qStates: 'Waar het strandt',
      qNext: 'Wat je nu kunt doen',
      qNextEmpty: 'De kolommen bestaan. Vul ze voor de producten waar ze leeg staan — dat is invulwerk, geen datamodelwerk.',
      qNextAbsent: 'Je catalogus heeft geen kolom voor dit kenmerk. Dat is een beslissing over je datamodel, en pas daarna invulwerk.',
      qNextUnlinked: 'Dit kenmerk is aan geen enkele kolom gekoppeld. Ga terug naar "Kenmerken koppelen" en wijs de kolom aan — misschien staat het antwoord er gewoon.',
      qNextWeak: 'De velden zijn gevuld, maar te mager om een antwoord te heten. Hier helpt herschrijven, niet aanvullen.',
      causes: {
        unfilled: 'Invulwerk',
        unmodelled: 'Modelwerk',
        'no-source': 'Geen bron',
      } as Record<string, string>,
      causeMeaning: {
        unfilled: 'De kolom bestaat, maar staat hier leeg',
        unmodelled: 'Je catalogus heeft geen kolom voor dit kenmerk',
        'no-source': 'Komt uit een systeem dat een catalogus niet draagt',
      } as Record<string, string>,
      causeEffort: {
        unfilled: 'Lage inspanning',
        unmodelled: 'Hoge inspanning',
        'no-source': 'Middelhoge inspanning',
      } as Record<string, string>,
      filterCategory: 'Categorie',
      allCategories: 'Alle categorieën',
      allAnswered: 'In deze categorie is elke vraag beantwoord.',
      stampHeading: 'Versiestempel',
      stampExplain:
        'Een score kan bewegen doordat wij de regels aanpasten of doordat je vragenlijst veranderde. Daarom staan alle versies erbij.',
      scanVersion: 'Scanversie',
      specSnapshot: 'Veldenregister',
      questionVersion: 'Vragenset-versie',
      bankVersion: 'Vragenbank',
      scannedAt: 'Gescand op',
      disclaimer:
        'Deze scan meet of jouw data de vragen van een koper beantwoordt. Een agent put ook uit je website en reviews; je catalogus is één van meerdere bronnen.',
      saveScan: 'Bewaar deze scan',
      savedScan: 'Bewaard op dit apparaat',
      printReport: 'Afdrukken of opslaan als pdf',
      shareNote:
        'Dit rapport leeft zolang dit tabblad open staat. Druk het af of sla het op als pdf om het te bewaren.',
      startOver: 'Nieuwe scan',
    },

    explorer: {
      heading: 'Per categorie en per product',
      intro:
        'Eén getal zegt dát er werk is. De categorie zegt waar, het product zegt wat.',
      categoryHeading: 'Per categorie',
      category: 'Categorie',
      products: 'Producten',
      qualifiedCol: 'Basisgeschikt',
      findableCol: 'Vindbaar',
      avgAnswered: 'Gem. beantwoord',
      topGaps: 'Grootste gaten',
      productHeading: 'Per product',
      search: 'Zoek op ID, titel of categorie',
      filterAll: 'Alle',
      filterNotQualified: 'Niet basisgeschikt',
      filterNotFindable: 'Niet volledig',
      filterUnmatched: 'Zonder categorie',
      showing: 'Toont',
      of: 'van',
      prev: 'Vorige',
      next: 'Volgende',
      answered: 'vragen beantwoord',
      unanswered: 'Onbeantwoorde vragen',
      productGaps: 'Ontbrekende velden',
      noResults: 'Geen producten gevonden.',
      qualifiedYes: 'Basisgeschikt',
      qualifiedNo: 'Niet basisgeschikt',
      findableYes: 'Volledig',
      findableNo: 'Niet volledig',
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
      noColumns: 'We herkennen geen enkele kolom in dit bestand',
      noColumnsNext:
        'Controleer of de eerste regel de kolomnamen bevat en niet bijvoorbeeld een titel of een lege regel. Een export uit Excel zet daar soms een regel boven.',
      wrongType: 'Dit bestandstype kunnen we niet lezen',
      wrongTypeNext: 'We lezen CSV, TSV, puntkomma-CSV, JSON, NDJSON en XML. Een xlsx exporteer je eerst als CSV.',
      scanFailed: 'De scan kon niet worden uitgevoerd',
      scanFailedNext: 'Ga terug naar de eerste stap en lever je bestand opnieuw aan. Blijft het misgaan, herlaad dan de pagina.',
      readFailed: 'Kon dit bestand niet inlezen',
    },
  },

  en: {
    appName: 'Agentic Commerce Discovery Readiness Scan',
    tagline: 'Is your product data good enough for an AI agent to find you?',
    language: 'Language',

    shell: {
      nav: {
        home: 'Home',
        scan: 'Start a scan',
        demo: 'Example report',
        methode: 'What we check',
        prijzen: 'Pricing',
        over: 'About',
        dashboard: 'Dashboard',
      } as Record<string, string>,
      primaryAction: 'See an example report',
      menu: 'Menu',
      footerNote:
        'The free scan runs entirely in your browser. Your file is not uploaded and never leaves your device.',
      appNav: {
        overview: 'Overview',
        scans: 'Scans',
        settings: 'Settings',
      } as Record<string, string>,
      account: 'Account',
      accountPlaceholder: 'No account yet',
      backToSite: 'Back to the site',
    },

    pages: {
      home: {
        title: 'See what an AI agent understands about your products',
        intro:
          'A buyer asks an AI agent for a product. That agent has to work out from your product data whether your product matches what was asked. This scan shows which of those questions your catalogue can answer, and which it cannot.',
        secondary: 'No account needed. The scan runs on your own device.',
        sampleHeading: 'This is what an outcome looks like',
        sampleIntro:
          'Below, the scan runs live on a sample shop. Not a screenshot: this is the same engine that will read your catalogue.',
        sampleFull: 'See the full example report',
        stepsHeading: 'How it works',
        steps: [
          {
            title: 'You choose your file',
            body: 'One export from the system where your product data is really maintained: your PIM or MDM, or otherwise Magento or Shopify. That is where you keep what you know about your products — a channel feed is only derived from it.',
          },
          {
            title: 'The scan runs on your own device',
            body: 'Your file is not uploaded. The work happens in your browser, alongside the page, so your screen keeps responding even with thousands of products.',
          },
          {
            title: 'Your report is there',
            body: 'Per category the questions a buyer asks, which ones your data answers, and where the missing answers have to come from. Complete, nothing held back.',
          },
        ],
        privacyHeading: 'What happens to your file',
        privacyLead:
          'In short: nothing. The free scan never leaves your device, and that is not a promise but a property of how it is built.',
        privacyPoints: [
          'Your catalogue export is read and processed in your browser. No file goes to a server, not even briefly.',
          'Nothing is stored. Close the tab and the report is gone. To keep it, print it or save it as a PDF.',
          'No language model is involved. The scan reads structured fields, not your prose, which is why it costs nothing per run.',
          'That changes once accounts arrive, because keeping means storing. It will then say for how long and how you delete it.',
        ],
        faqHeading: 'Questions we get a lot',
        faq: [
          {
            q: 'Does this tell me whether I will rank higher in ChatGPT?',
            a: 'No, and nobody could say that honestly. How an agent ranks is somebody else\'s system, and it also draws on your website, reviews and its own knowledge. What we do measure is whether your data can answer the questions that matter in your category. That is about your own file, and it can be checked and contested.',
          },
          {
            q: 'What files can I supply?',
            a: 'CSV, TSV, semicolon CSV, JSON, NDJSON and XML. So whatever your PIM, Magento or Shopify hands you. Export an xlsx as CSV first.',
          },
          {
            q: 'My columns are named differently. Will it still work?',
            a: 'Usually — we recognise a few hundred common names, with or without a prefix. If we get one wrong you see it straight away in the preview and can correct it per column.',
          },
          {
            q: 'Why does every gap say what kind of work it is?',
            a: 'Because "missing" is not a work order. If the field exists in your catalogue and sits empty, that is data entry and someone can start this week. If the field does not exist, something in your data model has to change first. That is not the same budget and not the same person.',
          },
          {
            q: 'How large can my file be?',
            a: 'Up to about 50 MB is fine in the browser; above that we warn you. Larger catalogues belong server-side, and that comes with an account.',
          },
          {
            q: 'What does it cost?',
            a: 'The scan itself is free and stays that way, including the full report. You pay only to keep, compare and share results.',
          },
        ],
        closingHeading: 'See what is in your catalogue',
        closingBody: 'A scan takes a few seconds, no account and no details.',
      },
      demo: {
        title: 'Example report',
        intro:
          'A full report on invented sample data, so you can see what you get before choosing your own file.',
        badge: 'Sample data',
        ownFile: 'Do this with your own file',
      },
      report: {
        title: 'Report',
        intro: 'The result of a scan, at its own address so you can share it.',
        notFound: 'This report does not exist or has expired',
        notFoundBody:
          'Reports are not stored anywhere yet. Print a report or save it as a PDF; that happens on your own device.',
        runScan: 'Start a new scan',
      },
      pricing: {
        title: 'Pricing',
        intro:
          'The scan itself is free and stays that way. You pay to keep, compare and share results — not to see the other half of your outcome.',
        freeTitle: 'Free',
        freeBody:
          'The full scan on your own file, in your own browser. The whole report, every finding, nothing held back.',
        paidTitle: 'With an account',
        paidBody:
          'Keep reports, build up history, put two scans side by side, share with your team, and run larger files server-side.',
        todo: 'TODO — amounts and the exact file-size threshold still need to be decided.',
      },
      about: {
        title: 'About this scan',
        intro:
          'The scan measures whether your product catalogue answers the questions a buyer in your market asks.',
        deterministic:
          'The outcome is fully deterministic. Questions are answered from structured attributes rather than prose, and no language model is involved. The same file always gives the same report, and a scan costs nothing.',
        privacy:
          'The free scan runs in your browser. Your catalogue never leaves your device and is not stored anywhere.',
        promise:
          'What the scan does not do: predict how an agent ranks. That would be a claim about somebody else\'s system. What stands here is about your own data, and is therefore measurable and contestable.',
        todo: 'TODO — who is behind this and how to get in touch.',
      },
      dashboard: {
        title: 'Overview',
        intro: 'Your latest scans, what changed, and what is still open.',
        emptyTitle: 'No saved scans yet',
        emptyBody:
          'Once you save scans, this is where you see how your catalogue develops and what has been resolved since last time.',
        scansTitle: 'Scans',
        scansIntro: 'Every saved scan, with the option to put two side by side.',
        settingsTitle: 'Settings',
        settingsIntro: 'Your account, your team members and what happens to your data.',
        soon: 'Not available yet',
        soonBody:
          'Accounts come later. Until then every scan runs in your browser and nothing is stored.',
        localTitle: 'Saved on this device',
        localBody:
          'Your saved scans live in this browser. On another device, or after clearing your browsing data, they are gone.',
        saved: 'saved scans',
        latest: 'Latest scan',
        compareHeading: 'Two scans side by side',
        compareIntro: 'Choose which two to compare. A difference only means something if the yardstick stayed the same.',
        compareBefore: 'Earlier scan',
        compareAfter: 'Later scan',
        compareNeedTwo: 'Save at least two scans to compare them.',
        scaleWarning: 'The yardstick changed in between',
        scaleWarningBody:
          'A difference below may therefore come from a changed definition rather than from your data. What changed:',
        scaleScan: 'the scan rules',
        scaleSpec: 'the specification snapshot',
        scaleQuestions: 'your question set',
        scaleBank: 'the question bank',
        comparable: 'Same yardstick, so this difference comes from your data.',
        deltaHeading: 'What changed',
        deltaQualified: 'Baseline fit',
        deltaFindable: 'Fully answered',
        deltaAvg: 'Avg. answered',
        deltaUnmatched: 'No category',
        gapsResolved: 'Resolved',
        gapsNew: 'New',
        gapsChanged: 'Changed',
        noChange: 'unchanged',
        remove: 'Remove',
        clearTitle: 'Clear everything',
        clearBody: 'Removes every scan saved on this device. This cannot be undone.',
        clearAction: 'Clear saved scans',
        cleared: 'All saved scans have been cleared.',
      },
    },

    steps: {
      upload: 'Supply data',
      bank: 'Question list',
      mapping: 'Link characteristics',
      questions: 'Validate question sets',
      report: 'Report',
    },

    upload: {
      heading: 'Supply your product data',
      intro:
        'One export from the system where your product data is really maintained: your PIM, Magento or Shopify.',
      drop: 'Drop your file here, or click to choose one',
      previewHeading: 'How we read your file',
      previewIntro:
        'The first rows as we read them. If anything looks off, the header row or the delimiter is wrong.',
      previewMore: 'and another',
      previewRows: 'rows',
      tooLarge: 'This is a large file',
      tooLargeBody:
        'Above {limit} MB a scan in the browser gets slow and a tab can fall over. You can try, but running server-side is built for this — that comes with an account.',
      tryAnyway: 'Try in the browser anyway',
      workerOn: 'The scan runs alongside the page, so your screen stays responsive.',
      workerOff:
        'Your browser does not allow background processing. The scan therefore runs on the page itself, which may briefly freeze.',
      progressReading: 'Reading',
      catalogLabel: 'Your product catalogue',
      catalogHint: 'Include every column you have. A column that is empty is something other than a column that is not there.',
      formats: 'CSV, TSV, semicolon CSV, JSON, NDJSON or XML',
      choose: 'Choose file',
      remove: 'Remove',
      sample: 'Use a sample catalogue',
      analyse: 'Analyse',
      reading: 'Reading…',
      privacy: 'Your files are processed in your browser and sent nowhere.',
      recognised: 'Recognised as',
      products: 'products',
      mappedColumns: 'columns recognised',
      unmappedColumns: 'unplaced',
    },

    bank: {
      heading: 'Your question list',
      intro:
        'The questions do not come from your own columns but from a list for your market: what buyers ask before they order.',
      status: {
        provisional: 'Provisional',
        'in-review': 'In review',
        frozen: 'Frozen',
      } as Record<string, string>,
      choose: 'Choose your question list',
      drop:
        'Drag the file here or click to choose. One row per question, with at least an id, the question and its importance.',
      reading: 'Reading',
      readAs: 'Read as',
      countBase: 'base questions',
      countCategories: 'categories',
      countCategoryQuestions: 'category-specific questions',
      countAttributes: 'attributes',
      baseExplain:
        'Base questions apply to every product; a category adds its own on top.',
      accept: 'Use this question list',
      inUseHeading: 'In use',
      remove: 'Remove',
      storedNote: 'Stored on this device.',
      empty: 'No question list has been imported yet.',
      fallback:
        'Without a list of your own we measure against a provisional question bank from domain knowledge.',
      importErrors: 'This has to be repaired first',
      importErrorsBody:
        'Repair these points in the file and choose it again.',
      importWarnings: 'Note this',
      importWarningsBody:
        'The list is usable. This stood out.',
      continue: 'Continue to the question sets',
      skip: 'Continue without a list of your own',
    },

    mapping: {
      heading: 'Link your characteristics to your columns',
      intro:
        'Your question list names a characteristic the way the trade names it, your export the way your system stored it. Whatever could be linked automatically is already filled in.',
      countLinked: 'linked',
      agentNote:
        'An AI agent reading your catalogue works out for itself that `rol_breedte` is the roll width. Below, a language model in your browser does the same, so we measure what such an agent would find in your data. The scan itself does not use it: you confirm the mapping, and from there the outcome is reproducible again. No column is an answer too — your catalogue simply does not record it.',
      suggest: 'Recognise the rest',
      suggestAgain: 'Try again',
      suggestBusy: {
        remote: 'Recognising characteristics…',
        library: 'Loading the model…',
        model: 'Loading the model…',
        embedding: 'Comparing characteristics…',
      } as Record<string, string>,
      byModel: 'Proposed by',
      bySelf: 'Proposed by the model in your browser; no key is configured on the server.',
      suggestNote:
        'This sends your column names, a few sample values per column, and the questions from your list to Claude. No file, no product rows, no prices. If that is unavailable, a smaller model runs in your browser and you will see that noted. Check the proposals — a wrong one costs you a click, a missed characteristic costs you a gap you cannot see.',
      suggestFailed: 'The model could not be loaded',
      suggestFailedBody:
        'The download failed. That may be your connection, or a network blocking it.',
      suggestFailedNext:
        'Try again, or point the characteristics at their column yourself below — that always works and the result is the same.',
      proposed: 'Proposal',
      proposedCount: 'proposals. Check them and discard what is wrong.',
      setsHeading: 'Which question set belongs to which category',
      setsNote:
        'Every category gets the general questions. Choose which category-specific questions come on top — that is where the questions live that prevent the mistake your buyer cannot undo.',
      setsMatching: 'Matching…',
      setsMatched: 'Linked automatically — check it.',
      setQuestions: 'questions',
      setBaseOnly: 'general questions only',
      setNone: '— general questions only —',
      listHeading: 'Characteristics',
      noColumn: '— no column —',
      continue: 'Continue to the question sets',
    },
    questions: {
      heading: 'Validate question sets',
      intro:
        'These sets are about your own categories. Correct what is wrong and confirm them.',
      generatedNote:
        'These questions decide whether a product fits a request.',
      categoriesFound: 'categories found in your catalogue',
      productsInCategory: 'products',
      basedOn: 'From question bank',
      fromArchetype: 'From the bank',
      fromData: 'Added by you',
      importance: {
        critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
      } as Record<string, string>,
      importanceExplain:
        'Critical means the questions that prevent the purchase mistake your buyer cannot undo.',
      coverage: 'Coverage',
      coverageNone: 'not researched',
      notScored: 'Outside the score',
      notScoredExplain:
        'This question is about a service or a process, not a product characteristic. It does not count.',
      weightNote: 'Why this weight',
      caution: 'Note when answering',
      baseHeading: 'The general questions',
      baseCount: 'questions that apply to every product',
      baseValidate: 'Confirm',
      ownCount: 'own questions',
      noOwn: 'no own questions',
      noOwnExplain:
        'This category only gets the general questions. If that is wrong, pick the matching question set under "Link characteristics".',
      reweighted: 'Weighs heavier in',
      layerBase: 'General',
      layerCategory: 'Category-specific',
      layerExplain:
        'General questions apply to every product in your catalogue. Category-specific ones come on top and cover what goes wrong in this category.',
      noOverlayHeading: 'Your question list categories do not line up with your catalogue',
      noOverlayBody:
        'These categories only get the base questions; the category-specific ones are left out. Your figure comes out too low.',
      noOverlayNext:
        'Put your own category names into the `applies_to` column of your question list, alongside the ones already there.',
      matchedHeading: 'Characteristics linked automatically',
      matchedBody:
        'The scan linked these itself, by spelling and word meaning. Check them.',
      intents: {
        fit: 'Suitability', quantity: 'Quantity', care: 'Care',
        expectation: 'Expectation', material: 'Material', processing: 'Processing',
        durability: 'Durability', safety: 'Safety',
        'purchase-certainty': 'Purchase certainty', comfort: 'Comfort', function: 'Function',
      } as Record<string, string>,
      needs: 'Needs',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      disable: 'Disable',
      enable: 'Enable',
      disabled: 'Disabled',
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
      startHeading: 'Where do you start?',
      startIntro:
        'The funnel is strict: complete means every question is answered. That does not tell you how far along you are, and this does.',
      startNoneFindable: 'No product answers every question yet.',
      startSomeFindable: 'products already answer every question.',
      startNearest: 'Closest to the line:',
      startNearestProducts: 'products are still missing',
      startNearestQuestions: 'answers.',
      startBlockersHeading: 'What holds back the most products',
      startBlockerOpen: 'products have this question open',
      startBlockerPim: 'of which the field already exists',
      startBlockerNowhere: 'there is no field for it',
      startWinHeading: 'What the first step buys you',
      startWinBody: 'Answer these questions across your catalogue and',
      startWinProducts: 'products complete straight away.',
      startWinNone:
        'These questions alone are not enough: every product still has others open. That is no reason to leave them — they are still the biggest single step.',
      total: 'products in your catalogue',
      qualified: 'baseline fit',
      findable: 'fully answered',
      qualifiedExplain: 'Every critical question for the product category is answered.',
      qualifiedInfo:
        'Can an agent recommend your product without letting the buyer make a mistake they cannot undo? The questions that prevent that mistake are called critical; at this step they are all answered.',
      qualifiedNoCritical:
        'This question set has no critical questions, so this step says nothing here.',
      findableExplain: 'Every question for the product category is answered.',
      points: 'points',
      avgPointsLine: 'and thereby earns',
      states: {
        answered: 'Answered',
        empty: 'Field exists, sits empty',
        unusable: 'Filled but too thin',
        incomplete: 'Partly answered',
        absent: 'No field for it',
      } as Record<string, string>,
      statesExplain: {
        answered: 'Your catalogue carries the answer. This is what an agent can read.',
        empty: 'The column exists but sits empty for these products. The cheapest win there is.',
        unusable: 'The field is filled, but with too little to answer the question. This asks for rewriting something that is already there.',
        incomplete: 'Part of what is needed is present. For a question that asks two things at once — width and repeat — half is not an answer.',
        absent: 'Your catalogue does not know this characteristic: there is no column for it. A field has to be added first, and only then a value.',
      } as Record<string, string>,
      advisoryHeading: 'Outside the score: what your data cannot speak to',
      advisoryIntro:
        'Buyers do ask these, but no product attribute can answer them. They do not count: your website or customer service solves this, not your catalogue.',
      bankHeading: 'Question bank',
      blindHeading: 'The question bank does not line up with your column names',
      blindBody:
        'These characteristics appear in none of your catalogue columns. Usually they are there under a different name — and then the question counts as unanswered when it should not.',
      blindNext:
        'Go back to "Link characteristics" and point each characteristic at your own column.',
      blindCount: 'attributes without a column',
      bankProvisional:
        'Measured against a provisional question bank from domain knowledge. The figures are correct for the questions asked; whether these are your buyers\' questions is reasoned.',
      bankInReview:
        'Measured against the question list you supplied yourself. The figures are correct for the questions asked; whether these are your buyers\' questions stands or falls with your list.',
      infoLabel: 'What does this mean?',
      findableInfo:
        'An agent can only judge your product once every question in your category can be answered. Leave one open and it leaves the product out. That is why there is no "almost".',
      status: {
        complete: 'Every question answered',
        partial: 'More than half answered',
        early: 'Less than half answered',
      } as Record<string, string>,
      statusExplain: {
        complete:
          'Your catalogue answers every question that matters in this category. That is what the scan aims at.',
        partial:
          'Your catalogue answers most questions. You are only there once they can all be answered.',
        early:
          'The basics are there, but an agent can still check too little. You are only there once every question can be answered.',
      } as Record<string, string>,
      statusScale: 'of',
      statusAnswered: 'questions answered',
      unmatched: 'products without a category',
      unmatchedExplain:
        'These products are counted but not scored. A catalogue where part of it matches nothing has a taxonomy problem worth reporting in its own right.',
      questionsHeading: 'Which questions go unanswered',
      questionsIntro:
        'Your work list, with where each answer runs aground.',
      fromFeed: 'answered',
      enrichable: 'field empty',
      neither: 'no field for it',
      ofProducts: 'of products',
      gapsHeading: 'Where each gap comes from',
      gapsIntro:
        'Per gap: what kind of work it is, and which questions it leaves unanswered.',
      gapsWhy:
        'Data entry: the column exists and sits empty — usually the biggest win. Model work: a field has to be added first. No source: it comes from a system a catalogue does not carry.',
      gapField: 'Field',
      gapQuestions: 'Questions',
      gapCause: 'Cause',
      gapAffected: 'Products',
      gapColumnInfo: {
        field:
          'The piece of information that is missing. A row with slashes is a search pattern across your own columns, not a field name.',
        cause:
          'Why it is missing, and therefore what kind of work it is.',
        affected:
          'How many of your products have this gap. The top of the list is the biggest win per action.',
      } as Record<string, string>,
      scoreHeading: 'Where you stand per category',
      scoreIntro:
        'Per category, how many questions a product answers on average and how many there are to win. No percentage: 2 out of 7 tells you how much work is left, 30% does not.',
      scoreCritical: 'Critical questions',
      scoreCriticalGoal: 'All critical questions answered = base fit. This is the first gate; leave one open and a product does not pass.',
      scoreGeneral: 'General questions',
      scoreGeneralGoal: 'These come back in every category. Filling one column counts everywhere — the cheapest win available to you.',
      scoreAll: 'All questions',
      scoreAllGoal: 'Everything answered = complete. The last step, and the only one that counts for an agent that has to compare your product on everything.',
      scoreOf: 'of',
      scoreToGo: 'to go',
      scoreDone: 'complete',
      scoreSub: 'subcategory',
      scoreAllCategories: 'All categories',
      scoreProducts: 'products measured in',
      scoreLevelNote:
        'Your question list asks questions per category, not per subcategory. Subcategories therefore get the same questions and are not listed separately — that would suggest a distinction your list does not make. If questions per subcategory arrive, that level appears on its own.',
      qDetail: 'Why unanswered',
      qDetailClose: 'Hide',
      qNeeds: 'This question needs',
      qColumn: 'Column in your catalogue',
      qNoColumn: 'no column linked',
      qStates: 'Where it stalls',
      qNext: 'What you can do now',
      qNextEmpty: 'The columns exist. Fill them for the products where they are empty — that is data entry, not data modelling.',
      qNextAbsent: 'Your catalogue has no column for this characteristic. That is a decision about your data model, and only then data entry.',
      qNextUnlinked: 'This characteristic is linked to no column at all. Go back to "Link characteristics" and point at the column — the answer may simply be there.',
      qNextWeak: 'The fields are filled but too thin to count as an answer. Rewriting helps here, not adding.',
      causes: {
        unfilled: 'Data entry',
        unmodelled: 'Model work',
        'no-source': 'No source',
      } as Record<string, string>,
      causeMeaning: {
        mapping: 'In the catalogue, not mapped into the feed',
        enrichment: 'In neither source',
        'no-source': 'In no system you can read',
      } as Record<string, string>,
      causeEffort: {
        unfilled: 'Low effort',
        unmodelled: 'High effort',
        'no-source': 'Medium effort',
      } as Record<string, string>,
      filterCategory: 'Category',
      allCategories: 'All categories',
      allAnswered: 'Every question in this category is answered.',
      stampHeading: 'Version stamp',
      stampExplain:
        'A score can move because we adjusted the rules or because your question list changed. That is why every version is recorded.',
      scanVersion: 'Scan version',
      specSnapshot: 'Field register',
      questionVersion: 'Question set version',
      bankVersion: 'Question bank',
      scannedAt: 'Scanned at',
      disclaimer:
        'This scan measures whether your data answers a buyer\'s questions. An agent also draws on your website and reviews; your catalogue is one input of several.',
      saveScan: 'Save this scan',
      savedScan: 'Saved on this device',
      printReport: 'Print or save as PDF',
      shareNote:
        'This report lives as long as you keep this tab open. Print it or save it as a PDF to keep it.',
      startOver: 'New scan',
    },

    explorer: {
      heading: 'By category and by product',
      intro:
        'One number across your whole catalogue says there is work. The category says where it sits, the product says what is missing.',
      categoryHeading: 'By category',
      category: 'Category',
      products: 'Products',
      qualifiedCol: 'Baseline fit',
      findableCol: 'Findable',
      avgAnswered: 'Avg. answered',
      topGaps: 'Largest gaps',
      productHeading: 'By product',
      search: 'Search by ID, title or category',
      filterAll: 'All',
      filterNotQualified: 'No baseline fit',
      filterNotFindable: 'Not complete',
      filterUnmatched: 'No category',
      showing: 'Showing',
      of: 'of',
      prev: 'Previous',
      next: 'Next',
      answered: 'questions answered',
      unanswered: 'Unanswered questions',
      productGaps: 'Missing fields',
      noResults: 'No products found.',
      qualifiedYes: 'Baseline fit',
      qualifiedNo: 'No baseline fit',
      findableYes: 'Complete',
      findableNo: 'Not complete',
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
      noColumns: 'We do not recognise a single column in this file',
      noColumnsNext:
        'Check that the first row holds the column names and not, say, a title or a blank line. An export from Excel sometimes puts a row above it.',
      wrongType: 'We cannot read this file type',
      wrongTypeNext: 'We read CSV, TSV, semicolon CSV, JSON, NDJSON and XML. Export an xlsx as CSV first.',
      scanFailed: 'The scan could not be run',
      scanFailedNext: 'Go back to the first step and supply your file again. If it keeps failing, reload the page.',
      readFailed: 'Could not read this file',
    },
  },
};

export type Locale = keyof typeof STRINGS;
export type Strings = (typeof STRINGS)['nl'];
