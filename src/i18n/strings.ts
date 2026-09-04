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
      skipToContent: 'Naar de inhoud',
      menu: 'Menu',
      footerNote:
        'De gratis scan draait volledig in je browser. Je bestand wordt niet geüpload en verlaat je apparaat niet.',
      footerRights: 'Alle rechten voorbehouden.',
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
            a: 'Tot ongeveer 20 MB gaat prima in de browser; daarboven waarschuwen we, want dan kan een tabblad omvallen. Grotere catalogi horen serverzijdig te draaien, en dat komt met een account.',
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
          'Rapporten worden nog nergens bewaard, en dus ook niet op een adres dat je kunt doorsturen. Dat is een bewuste volgorde: opslaan betekent dat je productdata ons systeem in gaat, en daar hoort eerst een account met een bewaartermijn bij. Tot die tijd druk je een rapport af of sla je het op als pdf — dat gebeurt op je eigen apparaat. Draai de scan opnieuw om een vers rapport te krijgen.',
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
          'Je bewaarde scans staan in de opslag van deze browser en gaan nergens heen. Dat betekent ook: op een ander apparaat of na het wissen van je browsergegevens zijn ze weg, en je kunt ze niet delen. Daarvoor is een account nodig.',
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
      bank: 'Vragenbank',
      questions: 'Vragensets valideren',
      report: 'Rapport',
    },

    upload: {
      heading: 'Lever je productdata aan',
      intro:
        'Eén bestand: de export uit het systeem waar je productdata onderhouden wordt. Daar staat wat je wéét van je producten, en dat is wat we meten. Zit er een kenmerk niet in je catalogus, dan kan geen enkel kanaal het doorgeven.',
      drop: 'Sleep je bestand hierheen of klik om te kiezen',
      previewHeading: 'Zo lezen wij je bestand',
      previewIntro:
        'De eerste regels zoals wij ze zien. Staat hier iets scheef, dan klopt het scheidingsteken of de kopregel niet en heeft corrigeren verderop weinig zin.',
      previewMore: 'en nog',
      previewRows: 'regels',
      mappingHeading: 'Kolommen koppelen',
      mappingIntro:
        'Wij raden welke kolom welk veld draagt. Zit er iets fout, corrigeer het hier — jij weet wat er in je kolommen staat en wij leiden het af uit de naam.',
      mappingColumn: 'Jouw kolom',
      mappingField: 'Wij lezen dit als',
      mappingSample: 'Eerste waarde',
      mappingNone: '— niet koppelen —',
      mappingGuessed: 'geraden',
      mappingCorrected: 'door jou gezet',
      mappingShow: 'Kolommen koppelen',
      mappingHide: 'Koppeling verbergen',
      mappingUnmappedNote:
        'Kolommen die we niet plaatsen gaan niet verloren: juist daar zit de categoriespecifieke informatie waar de vragensets op afgaan.',
      tooLarge: 'Dit bestand is groot',
      tooLargeBody:
        'Boven de {limit} MB wordt een scan in de browser traag en kan een tabblad omvallen. Je kunt het proberen, maar serverzijdig draaien is hiervoor gemaakt — dat komt met een account.',
      tryAnyway: 'Toch in de browser proberen',
      workerOn: 'De scan draait naast de pagina, dus je scherm blijft reageren.',
      workerOff:
        'Je browser staat geen achtergrondverwerking toe. De scan draait daarom op de pagina zelf en die kan even stilstaan.',
      progressReading: 'Bezig met lezen',
      progressScanning: 'Bezig met beoordelen',
      catalogLabel: 'Je productcatalogus',
      catalogHint: 'Een export uit je PIM of MDM, of anders uit Magento of Shopify. Neem alle kolommen mee die je hebt: een kolom die bestaat maar leeg is, is iets heel anders dan een kolom die er niet is.',
      siteLabel: 'Adres van je webshop',
      siteHint:
        'Optioneel. Alleen het adres — je productdata gaat nooit mee. We gebruiken het om je markt te herkennen, en als één van de bronnen als er voor jouw markt nog een vragenbank gebouwd moet worden.',
      sitePlaceholder: 'https://…',
      formats: 'CSV, TSV, puntkomma-CSV, JSON, NDJSON of XML',
      choose: 'Kies bestand',
      chosen: 'Gekozen',
      remove: 'Verwijderen',
      sample: 'Gebruik een voorbeeldcatalogus',
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

    bank: {
      heading: 'De vragenbank',
      intro:
        'De vragen waaraan je data wordt gemeten komen niet uit je eigen kolommen — dat zou meten of je catalogus zijn eigen velden draagt, en dat is altijd waar. Ze komen uit een vragenbank: de vragen die kopers in jouw markt stellen, opgebouwd uit een panel van vijf tot acht sites en nagekeken door iemand die het vak kent.',
      marketNotShop:
        'Een bank hoort bij een markt en niet bij een winkel. Daarom is hij herbruikbaar: is hij er eenmaal voor jouw markt, dan meet elke volgende winkel in dezelfde markt langs dezelfde lat, en pas dán is vergelijken zinvol.',
      usedHeading: 'Welke bank je scan gebruikt',
      version: 'Bankversie',
      panel: 'Sitepanel',
      panelNone: 'geen panel',
      panelSites: 'sites geraadpleegd',
      status: {
        provisional: 'Voorlopig',
        'in-review': 'In review',
        frozen: 'Bevroren',
      } as Record<string, string>,
      statusExplain: {
        provisional:
          'Deze vragen komen uit vakkennis, niet uit onderzoek naar jouw markt. Er is geen panel geraadpleegd, er staat geen dekking bij en er zijn geen beslisregels. Je krijgt een volledig rapport, maar de lat is beredeneerd en niet gemeten.',
        'in-review':
          'Deze bank komt uit onderzoek maar is nog niet door de domeinreview. De vragen kunnen nog verschuiven.',
        frozen:
          'Deze bank is opgebouwd uit een sitepanel, nagekeken door een domeinexpert en daarna bevroren. Dit is de lat waarlangs elke winkel in deze markt gemeten wordt.',
      } as Record<string, string>,
      irreversible: 'De fout die een koper niet kan terugdraaien',
      irreversibleWhy:
        'Dit is de vraag waar de hele weging aan hangt. In elke markt bestaat een aankoopfout die niet te herstellen is — op maat gemaakt, verpakking open, partij uitverkocht. De vragen die díe fout voorkomen wegen het zwaarst, en dat is iets anders dan de vragen die commercieel het meest besproken worden.',
      openPoints: 'Wat er nog open staat',
      openPointsIntro:
        'Punten die de domeinexpert moet beslechten. Ze staan hier omdat een onbeantwoorde vraag in de bank een uitkomst kleurt, en je dat hoort te weten voordat je op een cijfer vertrouwt.',
      rulesHeading: 'Beslisregels',
      rulesIntro:
        'Drempels en rekenregels die bepalen wat een goed antwoord is. Gepubliceerd betekent: overgenomen van een marktpartij, met bron. Beredeneerd betekent: door ons ingevuld, en dus nog te bevestigen.',
      rulePublished: 'Gepubliceerd',
      ruleReasoned: 'Beredeneerd',
      ruleDeviation: 'Sites die hiervan afwijken',
      rulesNone: 'Deze bank draagt geen beslisregels. Ze komen uit de bronoogst, met de site erbij — een drempel zonder bron is erger dan geen drempel.',
      requestHeading: 'Een bank laten bouwen voor jouw markt',
      requestIntro:
        'Je scan draait nu op een voorlopige bank. Hieronder staat de aanvraag: alles wat nodig is om de methode te draaien, klaar om aan een agent of onderzoeker te geven. Het resultaat lees je hier weer in, en vanaf dan meet elke scan in deze markt daarlangs.',
      requestPrivacy:
        'In de aanvraag staan je categorieën met hun aantallen, en het adres van je webshop als je dat hebt opgegeven. Geen producten, geen veldwaarden en geen kolomnamen. Dat is niet alleen privacy: de bank hoort gebouwd te zijn vóórdat iemand je catalogus ziet, anders sturen je bestaande velden de vragen.',
      requestBuild: 'Aanvraag samenstellen',
      requestCopy: 'Kopieer de aanvraag',
      requestCopied: 'Gekopieerd',
      requestDownload: 'Bewaar als bestand',
      requestNotNeeded:
        'Voor elke categorie in je catalogus ligt er al een onderzochte bank. Er is niets aan te vragen.',
      importHeading: 'Een bank inlezen',
      importIntro:
        'Plak de YAML uit de promptreeks, of kies het bestand. We controleren hem voordat hij meetelt: een bank die zijn herkomst niet kan tonen levert een rapport op dat overtuigender oogt dan het is.',
      importPaste: 'Plak hier de YAML van de vragenbank',
      importFile: 'Kies een bestand',
      importCheck: 'Controleer',
      importAccept: 'Gebruik deze bank',
      importAccepted: 'In gebruik',
      importRemove: 'Verwijderen',
      importEmpty: 'Er is nog geen eigen bank ingelezen.',
      importErrors: 'Dit moet eerst hersteld worden',
      importErrorsBody:
        'Zolang deze punten er staan, wordt de bank niet gebruikt. Herstel ze in het YAML-bestand en lees hem opnieuw in.',
      importWarnings: 'Let hierop',
      importWarningsBody:
        'De bank is bruikbaar, maar dit hoor je te weten voordat je op de uitkomst vertrouwt.',
      importOk: 'Deze bank is compleet en kan gebruikt worden.',
      storedHeading: 'Ingelezen banken',
      storedNote: 'Bewaard op dit apparaat, net als je scans. Er gaat niets naar een server.',
      continue: 'Verder naar de vragensets',
      skip: 'Verder met de voorlopige bank',
    },

    questions: {
      heading: 'Vragensets valideren',
      intro:
        'Deze sets gaan over jouw eigen categorieën. Het zijn hypotheses, geen waarheid: wij kennen jouw markt niet. Loop ze langs, pas aan wat niet klopt, vul aan wat we missen, en bevestig ze — een bevestiging kun je altijd weer intrekken.',
      generatedNote:
        'De drempel is een benoemde checklist, geen percentage. Deze vragen bepalen of een product bij een verzoek past.',
      categoriesFound: 'categorieën gevonden in je catalogus',
      productsInCategory: 'producten',
      basedOn: 'Uit vragenbank',
      fromArchetype: 'Uit de bank',
      fromData: 'Zelf toegevoegd',
      importance: {
        critical: 'Kritiek', high: 'Hoog', medium: 'Middel', low: 'Laag',
      } as Record<string, string>,
      importanceExplain:
        'Kritiek is niet hetzelfde als commercieel belangrijk. Het zijn de vragen die de aankoopfout voorkomen die je koper niet kan terugdraaien. Blijft er daar één van open, dan haalt het product de eerste trede van de trechter niet.',
      coverage: 'Dekking',
      coverageOf: 'van de',
      coverageSites: 'sites',
      coverageNone: 'niet onderzocht',
      coverageNoneExplain:
        'Deze vraag komt uit vakkennis en niet uit een sitepanel. Dat is iets anders dan dekking nul, wat zou betekenen dat geen enkele site in het panel dit onderwerp behandelt — dát is een vondst.',
      coverageZeroExplain:
        'Geen enkele site in het panel behandelt dit onderwerp, terwijl kopers de vraag wel hebben. Juist daar zit ruimte om als eerste een antwoord te geven.',
      notScored: 'Buiten de score',
      notScoredExplain:
        'Deze vraag is niet uit productattributen te beantwoorden — hij gaat over een dienst, een proces of je assortiment. Hij blijft staan omdat er advies in zit, maar hij telt niet mee: een merchant afrekenen op iets wat per definitie niet in een catalogus past is geen meting.',
      weightNote: 'Waarom dit gewicht',
      intents: {
        fit: 'Geschiktheid', quantity: 'Hoeveelheid', care: 'Onderhoud',
        expectation: 'Verwachting', material: 'Materiaal', processing: 'Verwerking',
        durability: 'Duurzaamheid', safety: 'Veiligheid',
        'purchase-certainty': 'Koopzekerheid',
      } as Record<string, string>,
      provisionalSet:
        'Deze set komt uit een voorlopige bank: vakkennis zonder panel en zonder domeinreview.',
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
      startHeading: 'Waar begin je?',
      startIntro:
        'De trechter is streng: volledig betekent dat élke vraag beantwoord is. Dat zegt niet hoe ver je bent, en dat staat hier wel.',
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
        'Deze vragen alleen zijn niet genoeg: er blijven bij elk product nog andere vragen open. Dat is geen reden om ze te laten liggen — ze zijn wel de grootste stap.',
      total: 'producten in je catalogus',
      qualified: 'basisgeschikt',
      findable: 'volledig beantwoord',
      qualifiedExplain: 'Elke kritieke vraag van de eigen categorie is beantwoord.',
      qualifiedInfo:
        'Kan een agent je product aanbevelen zonder de koper een fout te laten maken die hij niet kan terugdraaien? Elke markt heeft zo\'n fout — stof die op maat geknipt is en dus niet terug mag, een band die gemonteerd is, een verpakking die open is. De vragen die die fout voorkomen heten kritiek, en dit is de trede waar ze allemaal beantwoord moeten zijn. Het is een lagere lat dan volledig en een hardere dan niets: een product dat hier niet doorheen komt, hoort een agent niet aan te raden, hoe compleet de rest ook is.',
      qualifiedNoCritical:
        'Deze vragenset kent geen kritieke vragen, dus deze trede zegt hier niets. Dat komt doordat de bank voorlopig is: welke fout in jouw markt onomkeerbaar is, volgt uit onderzoek en niet uit vakkennis op afstand.',
      findableExplain: 'Elke vraag van de eigen categorie is beantwoord.',
      points: 'punten',
      pointsScale:
        'Gewichtspunten in plaats van vragen: een kritieke vraag telt voor vijf, hoog voor drie, middel voor twee en laag voor één. Zo weegt de vraag die de onomkeerbare fout voorkomt zwaarder dan een kleurveld. Beide schalen staan er, want het aantal vragen is meteen te bevatten en de punten zeggen wat het waard is.',
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
        'Deze vragen stelt een koper wel, maar geen enkel productattribuut kan ze beantwoorden — het gaat om een dienst, een proces of je assortiment. Ze tellen daarom niet mee in de trechter. Ze staan hier omdat het advies is: dit is wat je catalogus niet gaat oplossen en je website of je klantenservice wel.',
      bankHeading: 'Vragenbank',
      bankProvisional:
        'Dit rapport is gemeten langs een voorlopige vragenbank: vakkennis zonder sitepanel en zonder domeinreview. De cijfers kloppen met de gestelde vragen, maar of dit de vragen zijn die jouw kopers stellen is beredeneerd en niet onderzocht.',
      infoLabel: 'Wat betekent dit?',
      findableInfo:
        'Kan een agent jouw product beoordelen? Dat kan pas als élke vraag die in jouw categorie speelt uit je catalogus te beantwoorden is: samenstelling, breedte, onderhoud, waarvoor het geschikt is. Blijft er één over, dan weet de agent niet of jouw product past bij wat de koper vroeg, en laat hij het liever weg. Daarom is er geen "bijna": het zijn alle vragen, of het telt niet.',
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
        'De onbeantwoorde vragen zijn de werklijst. Er staat bij waar elk antwoord strandt: een veld dat bestaat maar leeg is, is een heel andere opdracht dan een kenmerk waar je catalogus geen kolom voor heeft.',
      fromFeed: 'beantwoord',
      enrichable: 'veld leeg',
      neither: 'geen veld voor',
      answeredBy: 'beantwoord door',
      ofProducts: 'van de producten',
      gapsHeading: 'Waar komt elk gat vandaan',
      gapsIntro:
        'Omdat "ontbreekt" geen werkopdracht is. Deze tabel zegt per gat wat voor werk het is — en welke vragen erdoor blijven liggen, want een gat zonder vraag bestaat hier niet.',
      gapsWhy:
        'Drie uitkomsten. Invulwerk betekent dat de kolom er al is en bij deze producten leeg staat — lage inspanning, en meestal de grootste winst. Modelwerk betekent dat je catalogus dit kenmerk niet kent: er moet eerst een veld bij, en dat is een beslissing over je datamodel. Geen bron betekent dat het uit een systeem moet komen dat een catalogus niet draagt, zoals je reviewplatform — één keuze die daarna voor je hele assortiment geldt.',
      gapField: 'Veld',
      gapQuestions: 'Vragen',
      gapCause: 'Oorzaak',
      gapAffected: 'Producten',
      gapColumnInfo: {
        questions:
          'Hoeveel vragen er door dit gat onbeantwoord blijven. Staat hier nul, dan zou het veld hier niet moeten staan — een gat bestaat in dit rapport alleen als er een kopersvraag door blijft liggen.',
        field:
          'Het gegeven dat ontbreekt. Staat er een rij met schuine strepen, dan is dat geen veldnaam uit een specificatie maar een zoekpatroon: we kijken in je eigen kolommen of een van deze woorden voorkomt, zodat je kolom "wasvoorschrift" ook meetelt als het protocol hem "care" noemt.',
        cause:
          'Waarom het ontbreekt, en daarmee wat voor werk het is. Invulwerk: de kolom bestaat en staat leeg. Modelwerk: je catalogus kent het kenmerk niet en er moet eerst een veld bij. Geen bron: het komt uit een systeem dat een productcatalogus niet draagt, zoals je reviewplatform.',
        affected:
          'Hoeveel van je producten dit gat hebben. Bovenaan staat wat het zwaarst weegt maal hoeveel producten het raakt — dat is meestal ook de grootste winst per handeling, omdat één ingreep in je catalogus ze allemaal tegelijk oplost.',
      } as Record<string, string>,
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
        'Een score kan bewegen zonder dat je iets deed: doordat wij de scanregels of het veldenregister aanpasten, doordat de vragenbank voor jouw markt vernieuwde, of doordat je je eigen vragenset aanpaste. Alle drie staan hieronder, zodat je echte vooruitgang kunt onderscheiden van een verschoven definitie.',
      scanVersion: 'Scanversie',
      specSnapshot: 'Veldenregister',
      questionVersion: 'Vragenset-versie',
      bankVersion: 'Vragenbank',
      scannedAt: 'Gescand op',
      disclaimer:
        'Deze scan meet of jouw data de vragen beantwoordt die een koper in jouw categorie stelt. Dat is een uitspraak over je eigen data, niet een voorspelling van hoe een agent rangschikt. Een agent put ook uit je website, reviews van derden, marktplaatsvermeldingen en zijn eigen trainingsdata; de catalogus is één van meerdere bronnen.',
      saveScan: 'Bewaar deze scan',
      savedScan: 'Bewaard op dit apparaat',
      printReport: 'Afdrukken of opslaan als pdf',
      shareNote:
        'Rapporten worden nergens bewaard: dit rapport leeft zolang je dit tabblad open hebt. Wil je het delen of bewaren, druk het dan af of sla het op als pdf — dat gebeurt op je eigen apparaat, net als de scan zelf.',
      startOver: 'Nieuwe scan',
    },

    explorer: {
      heading: 'Per categorie en per product',
      intro:
        'Eén getal over je hele catalogus zegt dát er werk is. De categorie zegt waar het zit, het product zegt wat er mist.',
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
      didYouMean: 'Bedoelde je deze kolom?',
      linkIt: 'Koppel hem',
      wrongType: 'Dit bestandstype kunnen we niet lezen',
      wrongTypeNext: 'We lezen CSV, TSV, puntkomma-CSV, JSON, NDJSON en XML. Een xlsx exporteer je eerst als CSV.',
      scanFailed: 'De scan kon niet worden uitgevoerd',
      scanFailedNext: 'Ga terug naar de eerste stap en lever je bestand opnieuw aan. Blijft het misgaan, dan helpt het om de pagina te herladen — de scan draait in je browser en verliest zijn geheugen als een tabblad lang open staat.',
      feedRequired: 'Lever eerst je catalogusexport aan.',
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
      skipToContent: 'Skip to content',
      menu: 'Menu',
      footerNote:
        'The free scan runs entirely in your browser. Your file is not uploaded and never leaves your device.',
      footerRights: 'All rights reserved.',
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
            a: 'Up to about 20 MB is fine in the browser; above that we warn you, because a tab can fall over. Larger catalogues belong server-side, and that comes with an account.',
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
          'Reports are not stored anywhere yet, and therefore not at an address you can forward either. That order is deliberate: storing means your product data enters our systems, and that needs an account with a retention period first. Until then, print a report or save it as a PDF — that happens on your own device. Run the scan again to get a fresh report.',
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
          'Your saved scans live in this browser\'s storage and go nowhere. Which also means: on another device, or after clearing your browsing data, they are gone — and you cannot share them. That needs an account.',
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
      bank: 'Question bank',
      questions: 'Validate question sets',
      report: 'Report',
    },

    upload: {
      heading: 'Supply your product data',
      intro:
        'One file: the export from the system where your product data is maintained. That is where you keep what you know about your products, and that is what we measure. If a characteristic is not in your catalogue, no channel can pass it on.',
      drop: 'Drop your file here, or click to choose one',
      previewHeading: 'How we read your file',
      previewIntro:
        'The first rows as we see them. If something looks skewed here, the delimiter or the header row is wrong, and correcting fields below will not help.',
      previewMore: 'and another',
      previewRows: 'rows',
      mappingHeading: 'Link your columns',
      mappingIntro:
        'We guess which column carries which field. If we got one wrong, correct it here — you know what is in your columns, we infer it from the name.',
      mappingColumn: 'Your column',
      mappingField: 'We read this as',
      mappingSample: 'First value',
      mappingNone: '— do not link —',
      mappingGuessed: 'guessed',
      mappingCorrected: 'set by you',
      mappingShow: 'Link your columns',
      mappingHide: 'Hide linking',
      mappingUnmappedNote:
        'Columns we do not place are not lost: that is exactly where the category-specific information lives that the question sets rely on.',
      tooLarge: 'This is a large file',
      tooLargeBody:
        'Above {limit} MB a scan in the browser gets slow and a tab can fall over. You can try, but running server-side is built for this — that comes with an account.',
      tryAnyway: 'Try in the browser anyway',
      workerOn: 'The scan runs alongside the page, so your screen stays responsive.',
      workerOff:
        'Your browser does not allow background processing. The scan therefore runs on the page itself, which may briefly freeze.',
      progressReading: 'Reading',
      progressScanning: 'Assessing',
      catalogLabel: 'Your product catalogue',
      catalogHint: 'An export from your PIM or MDM, or otherwise from Magento or Shopify. Include every column you have: a column that exists but is empty is something quite different from a column that is not there.',
      siteLabel: 'Address of your webshop',
      siteHint:
        'Optional. The address only — your product data never travels with it. We use it to recognise your market, and as one of the sources if a question bank still has to be built for that market.',
      sitePlaceholder: 'https://…',
      formats: 'CSV, TSV, semicolon CSV, JSON, NDJSON or XML',
      choose: 'Choose file',
      chosen: 'Selected',
      remove: 'Remove',
      sample: 'Use a sample catalogue',
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

    bank: {
      heading: 'The question bank',
      intro:
        'The questions your data is measured against do not come from your own columns — that would measure whether your catalogue carries its own fields, which is always true. They come from a question bank: the questions buyers ask in your market, built from a panel of five to eight sites and reviewed by someone who knows the trade.',
      marketNotShop:
        'A bank belongs to a market, not to a shop. That is what makes it reusable: once it exists for your market, every next shop in that market is measured against the same yardstick — and only then does comparing mean anything.',
      usedHeading: 'Which bank your scan uses',
      version: 'Bank version',
      panel: 'Site panel',
      panelNone: 'no panel',
      panelSites: 'sites consulted',
      status: {
        provisional: 'Provisional',
        'in-review': 'In review',
        frozen: 'Frozen',
      } as Record<string, string>,
      statusExplain: {
        provisional:
          'These questions come from domain knowledge, not from research into your market. No panel was consulted, there is no coverage figure and there are no decision rules. You get a full report, but the bar is reasoned rather than measured.',
        'in-review':
          'This bank comes from research but has not been through the domain review yet. The questions may still shift.',
        frozen:
          'This bank was built from a site panel, checked by a domain expert and then frozen. This is the bar every shop in this market is measured against.',
      } as Record<string, string>,
      irreversible: 'The mistake a buyer cannot undo',
      irreversibleWhy:
        'This is the question the entire weighting hangs on. Every market has a purchase mistake that cannot be repaired — made to measure, packaging opened, batch sold out. The questions that prevent that mistake weigh the most, and that is something other than the questions that get discussed most commercially.',
      openPoints: 'What is still open',
      openPointsIntro:
        'Points for the domain expert to settle. They are here because an unanswered question inside the bank colours an outcome, and you should know that before you rely on a figure.',
      rulesHeading: 'Decision rules',
      rulesIntro:
        'Thresholds and calculations that decide what a good answer is. Published means: taken from a market party, with its source. Reasoned means: filled in by us, and therefore still to be confirmed.',
      rulePublished: 'Published',
      ruleReasoned: 'Reasoned',
      ruleDeviation: 'Sites that deviate',
      rulesNone: 'This bank carries no decision rules. They come from the source harvest, with the site attached — a threshold without a source is worse than no threshold.',
      requestHeading: 'Have a bank built for your market',
      requestIntro:
        'Your scan currently runs on a provisional bank. Below is the request: everything needed to run the method, ready to hand to an agent or researcher. You import the result here again, and from then on every scan in this market is measured against it.',
      requestPrivacy:
        'The request contains your categories with their counts, and the address of your webshop if you supplied one. No products, no field values and no column names. That is not only privacy: the bank should be built before anyone sees your catalogue, otherwise your existing fields steer the questions.',
      requestBuild: 'Compose the request',
      requestCopy: 'Copy the request',
      requestCopied: 'Copied',
      requestDownload: 'Save as a file',
      requestNotNeeded:
        'A researched bank already exists for every category in your catalogue. There is nothing to request.',
      importHeading: 'Import a bank',
      importIntro:
        'Paste the YAML from the prompt series, or choose the file. We check it before it counts: a bank that cannot show its provenance produces a report that looks more convincing than it is.',
      importPaste: 'Paste the question bank YAML here',
      importFile: 'Choose a file',
      importCheck: 'Check',
      importAccept: 'Use this bank',
      importAccepted: 'In use',
      importRemove: 'Remove',
      importEmpty: 'No bank of your own has been imported yet.',
      importErrors: 'This has to be repaired first',
      importErrorsBody:
        'While these points stand, the bank is not used. Repair them in the YAML file and import it again.',
      importWarnings: 'Note this',
      importWarningsBody:
        'The bank is usable, but you should know this before you rely on the outcome.',
      importOk: 'This bank is complete and can be used.',
      storedHeading: 'Imported banks',
      storedNote: 'Stored on this device, just like your scans. Nothing goes to a server.',
      continue: 'Continue to the question sets',
      skip: 'Continue with the provisional bank',
    },

    questions: {
      heading: 'Validate question sets',
      intro:
        'These sets are about your own categories. They are hypotheses, not truth: we do not know your market. Walk through them, correct what is wrong, add what we missed, and confirm them — a confirmation can always be withdrawn.',
      generatedNote:
        'The threshold is a named checklist, not a percentage. These questions decide whether a product fits a request.',
      categoriesFound: 'categories found in your catalogue',
      productsInCategory: 'products',
      basedOn: 'From question bank',
      fromArchetype: 'From the bank',
      fromData: 'Added by you',
      importance: {
        critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
      } as Record<string, string>,
      importanceExplain:
        'Critical is not the same as commercially important. These are the questions that prevent the purchase mistake your buyer cannot undo. If one of those stays open, the product does not clear the first step of the funnel.',
      coverage: 'Coverage',
      coverageOf: 'of',
      coverageSites: 'sites',
      coverageNone: 'not researched',
      coverageNoneExplain:
        'This question comes from domain knowledge rather than a site panel. That is something other than coverage zero, which would mean no site in the panel covers this topic — and that is a finding.',
      coverageZeroExplain:
        'No site in the panel covers this topic, while buyers do have the question. That is precisely where there is room to be the first to answer it.',
      notScored: 'Outside the score',
      notScoredExplain:
        'This question cannot be answered from product attributes — it is about a service, a process or your assortment. It stays because there is advice in it, but it does not count: holding a merchant to something that by definition does not fit in a catalogue is not a measurement.',
      weightNote: 'Why this weight',
      intents: {
        fit: 'Suitability', quantity: 'Quantity', care: 'Care',
        expectation: 'Expectation', material: 'Material', processing: 'Processing',
        durability: 'Durability', safety: 'Safety',
        'purchase-certainty': 'Purchase certainty',
      } as Record<string, string>,
      provisionalSet:
        'This set comes from a provisional bank: domain knowledge without a panel and without a domain review.',
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
        'Can an agent recommend your product without letting the buyer make a mistake they cannot undo? Every market has such a mistake — fabric cut to length and therefore non-returnable, a tyre already fitted, a package already opened. The questions that prevent that mistake are called critical, and this is the step where all of them have to be answered. It is a lower bar than complete and a harder one than nothing: a product that does not clear it should not be recommended, however complete the rest is.',
      qualifiedNoCritical:
        'This question set has no critical questions, so this step says nothing here. That is because the bank is provisional: which mistake is irreversible in your market follows from research, not from domain knowledge at a distance.',
      findableExplain: 'Every question for the product category is answered.',
      points: 'points',
      pointsScale:
        'Weight points instead of questions: a critical question counts for five, high for three, medium for two and low for one. That way the question preventing the irreversible mistake outweighs a colour field. Both scales are shown, because a count of questions is immediately graspable and the points say what it is worth.',
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
        empty: 'The column exists in your catalogue but sits empty for these products. Data entry: the place is already there, and this is the cheapest win available.',
        unusable: 'The field is filled, but with too little to answer the question. This asks for rewriting something that is already there.',
        incomplete: 'Part of what is needed is present. For a question that asks two things at once — width and repeat — half is not an answer.',
        absent: 'Your catalogue does not know this characteristic: there is no column for it. A field has to be added first, and only then a value.',
      } as Record<string, string>,
      advisoryHeading: 'Outside the score: what your data cannot speak to',
      advisoryIntro:
        'Buyers do ask these questions, but no product attribute can answer them — they concern a service, a process or your assortment. They therefore do not count towards the funnel. They are here because they are advice: this is what your catalogue will not solve and your website or customer service will.',
      bankHeading: 'Question bank',
      bankProvisional:
        'This report was measured against a provisional question bank: domain knowledge without a site panel and without a domain review. The figures are correct for the questions asked, but whether these are the questions your buyers ask is reasoned rather than researched.',
      infoLabel: 'What does this mean?',
      findableInfo:
        'Can an agent judge your product? Only once every question that matters in your category can be answered from your catalogue: composition, width, care, what it is suitable for. Leave one unanswered and the agent cannot tell whether your product matches what the buyer asked for, so it leaves it out. That is why there is no "almost": it is every question, or it does not count.',
      status: {
        complete: 'Every question answered',
        partial: 'More than half answered',
        early: 'Less than half answered',
      } as Record<string, string>,
      statusExplain: {
        complete:
          'Your catalogue answers every question that matters in this category. That is what the scan aims at.',
        partial:
          'Your catalogue already answers most questions. You are only there once they can all be answered — the last few decide whether an agent dares to recommend your product.',
        early:
          'The basics are there, but an agent can still check too little. You are only there once every question can be answered.',
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
        'The unanswered questions are the work list. It says where each answer runs aground: a field that exists but sits empty is a quite different job from a characteristic your catalogue has no column for.',
      fromFeed: 'answered',
      enrichable: 'field empty',
      neither: 'no field for it',
      answeredBy: 'answered by',
      ofProducts: 'of products',
      gapsHeading: 'Where each gap comes from',
      gapsIntro:
        'Because "missing" is not a work order. This table says per gap what kind of work it is — and which questions it leaves unanswered, because a gap without a question does not exist here.',
      gapsWhy:
        'Three outcomes. Data entry means the column is already there and sits empty for these products — low effort, and usually the biggest win. Model work means your catalogue does not know this characteristic: a field has to be added, and that is a decision about your data model. No source means it has to come from a system a catalogue does not carry, such as your reviews platform — one decision that then covers your whole assortment.',
      gapField: 'Field',
      gapQuestions: 'Questions',
      gapCause: 'Cause',
      gapAffected: 'Products',
      gapColumnInfo: {
        field:
          'The piece of information that is missing. A row with slashes is not a field name from a specification but a search pattern: we look through your own columns for any of these words, so your column "wasvoorschrift" still counts when the protocol calls it "care".',
        cause:
          'Why it is missing, and therefore what kind of work it is. Data entry: the column exists and sits empty. Model work: your catalogue does not know the characteristic and a field has to be added first. No source: it comes from a system a product catalogue does not carry, such as your reviews platform.',
        affected:
          'How many of your products have this gap. The top of the list is what weighs most multiplied by how many products it touches — usually the biggest win per action too, because one change in your catalogue fixes them all at once.',
      } as Record<string, string>,
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
        'A score can move without you doing anything: because we adjusted the scan rules or the field register, because the question bank for your market was renewed, or because you adjusted your own question set. All three are recorded below, so you can tell real progress from a shifted definition.',
      scanVersion: 'Scan version',
      specSnapshot: 'Field register',
      questionVersion: 'Question set version',
      bankVersion: 'Question bank',
      scannedAt: 'Scanned at',
      disclaimer:
        'This scan measures whether your data answers the questions a buyer in your category asks. That is a statement about your own data, not a prediction of how an agent ranks. An agent also draws on your website, third-party reviews, marketplace listings and its own training data; the catalogue is one input of several.',
      saveScan: 'Save this scan',
      savedScan: 'Saved on this device',
      printReport: 'Print or save as PDF',
      shareNote:
        'Reports are not stored anywhere: this one lives as long as you keep this tab open. To share or keep it, print it or save it as a PDF — that happens on your own device, just like the scan itself.',
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
      didYouMean: 'Did you mean this column?',
      linkIt: 'Link it',
      wrongType: 'We cannot read this file type',
      wrongTypeNext: 'We read CSV, TSV, semicolon CSV, JSON, NDJSON and XML. Export an xlsx as CSV first.',
      scanFailed: 'The scan could not be run',
      scanFailedNext: 'Go back to the first step and supply your file again. If it keeps failing, reloading the page helps — the scan runs in your browser and loses its memory when a tab stays open for a long time.',
      feedRequired: 'Supply your catalogue export first.',
      readFailed: 'Could not read this file',
    },
  },
};

export type Locale = keyof typeof STRINGS;
export type Strings = (typeof STRINGS)['nl'];
