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
          'Een koper vraagt een AI-agent om een product. Die agent leest jouw feed en moet daaruit opmaken of jouw product past bij wat er gevraagd is. Deze scan laat zien welke van die vragen jouw data kan beantwoorden, en welke niet.',
        secondary: 'Geen account nodig. De scan draait op je eigen apparaat.',
        sampleHeading: 'Zo ziet een uitkomst eruit',
        sampleIntro:
          'Hieronder draait de scan live op een voorbeeldwinkel. Geen schermafbeelding: dit is dezelfde motor die straks over jouw feed gaat.',
        sampleFull: 'Bekijk het hele voorbeeldrapport',
        stepsHeading: 'Hoe het werkt',
        steps: [
          {
            title: 'Je kiest je bestand',
            body: 'Je productfeed, zoals je die naar Google of een kanaal stuurt. Lever je er ook een export uit je PIM bij, dan kunnen we zien of een ontbrekend veld een instelling is of echt ontbreekt.',
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
          'Je feed en je PIM-export worden in je browser gelezen en verwerkt. Er gaat geen bestand naar een server, ook niet tijdelijk.',
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
            a: 'CSV, TSV, puntkomma-CSV, JSON, NDJSON en XML. Dus ook gewoon de feed die je al naar Channable of Google Shopping stuurt. Een xlsx exporteer je eerst als CSV.',
          },
          {
            q: 'Mijn kolommen heten anders dan bij anderen. Werkt het dan?',
            a: 'Meestal wel — we herkennen een paar honderd gangbare namen, met of zonder prefix. Zit er iets fout, dan zie je dat meteen in de voorbeeldweergave en kun je het per kolom zelf rechtzetten.',
          },
          {
            q: 'Waarom vragen jullie ook mijn PIM-export?',
            a: 'Omdat "ontbreekt" geen werkopdracht is. Ligt het antwoord al in je PIM en haalt het alleen je feed niet, dan is dat een middag werk. Staat het nergens, dan is het maandenwerk. Zonder die tweede bron kunnen we die twee niet uit elkaar houden.',
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
        closingHeading: 'Kijk wat er in jouw feed staat',
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
          'De scan meet of jouw productdata de vragen beantwoordt die een koper in jouw categorie stelt, getoetst aan OpenAI ACP en Google UCP.',
        deterministic:
          'De uitkomst is volledig deterministisch. Vragen worden beantwoord uit gestructureerde attributen en niet uit lopende tekst, en er komt geen taalmodel aan te pas. Hetzelfde bestand geeft altijd hetzelfde rapport, en een scan kost niets.',
        privacy:
          'De gratis scan draait in je browser. Je feed en je catalogus verlaten je apparaat niet en worden nergens opgeslagen.',
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
        comparable: 'Dezelfde meetlat, dus dit verschil komt uit je data.',
        deltaFindable: 'Vindbaar',
        deltaCompetitive: 'Concurrerend',
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

    steps: { upload: 'Data aanleveren', questions: 'Vragensets valideren', report: 'Rapport' },

    upload: {
      heading: 'Lever je productdata aan',
      intro:
        'De feed is wat de agent daadwerkelijk ziet en is daarom de analysebron. De catalogus-export uit je PIM is optioneel, maar zonder die tweede bron kunnen we niet zien of een ontbrekend veld een mappingfout is of een echt gat.',
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
      startHeading: 'Waar begin je?',
      startIntro:
        'De trechter is streng: vindbaar betekent dat élke vraag beantwoord is. Dat zegt niet hoe ver je bent, en dat staat hier wel.',
      startNoneFindable: 'Nog geen enkel product is vindbaar.',
      startSomeFindable: 'producten zijn al vindbaar.',
      startNearest: 'Het dichtst in de buurt:',
      startNearestProducts: 'producten missen nog',
      startNearestQuestions: 'antwoorden.',
      startBlockersHeading: 'Wat de meeste producten tegenhoudt',
      startBlockerOpen: 'producten hebben deze vraag open',
      startBlockerPim: 'waarvan uit je PIM te halen',
      startBlockerNowhere: 'staat nergens vastgelegd',
      startWinHeading: 'Wat de eerste stap oplevert',
      startWinBody: 'Beantwoord je deze vragen voor je hele catalogus, dan zijn',
      startWinProducts: 'producten meteen vindbaar.',
      startWinNone:
        'Deze vragen alleen zijn niet genoeg: er blijven bij elk product nog andere vragen open. Dat is geen reden om ze te laten liggen — ze zijn wel de grootste stap.',
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
      scanVersion: 'Scanversie',
      specSnapshot: 'Spec-snapshot',
      questionVersion: 'Vragenset-versie',
      scannedAt: 'Gescand op',
      disclaimer:
        'Deze scan meet of jouw data de vragen beantwoordt die een koper in jouw categorie stelt. Dat is een uitspraak over je eigen data, niet een voorspelling van hoe een agent rangschikt. Een agent put ook uit je website, reviews van derden, marktplaatsvermeldingen en zijn eigen trainingsdata; de catalogus is één van meerdere bronnen.',
      saveScan: 'Bewaar deze scan',
      savedScan: 'Bewaard op dit apparaat',
      printReport: 'Afdrukken of opslaan als pdf',
      shareNote:
        'Rapporten worden nergens bewaard: dit rapport leeft zolang je dit tabblad open hebt. Wil je het delen of bewaren, druk het dan af of sla het op als pdf — dat gebeurt op je eigen apparaat, net als de scan zelf.',
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
      noColumns: 'We herkennen geen enkele kolom in dit bestand',
      noColumnsNext:
        'Controleer of de eerste regel de kolomnamen bevat en niet bijvoorbeeld een titel of een lege regel. Een export uit Excel zet daar soms een regel boven.',
      didYouMean: 'Bedoelde je deze kolom?',
      linkIt: 'Koppel hem',
      wrongType: 'Dit bestandstype kunnen we niet lezen',
      wrongTypeNext: 'We lezen CSV, TSV, puntkomma-CSV, JSON, NDJSON en XML. Een xlsx exporteer je eerst als CSV.',
      scanFailed: 'De scan kon niet worden uitgevoerd',
      scanFailedNext: 'Ga terug naar de eerste stap en lever je bestand opnieuw aan. Blijft het misgaan, dan helpt het om de pagina te herladen — de scan draait in je browser en verliest zijn geheugen als een tabblad lang open staat.',
      feedRequired: 'Lever eerst een productfeed aan.',
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
          'A buyer asks an AI agent for a product. That agent reads your feed and has to work out whether your product matches what was asked. This scan shows which of those questions your data can answer, and which it cannot.',
        secondary: 'No account needed. The scan runs on your own device.',
        sampleHeading: 'This is what an outcome looks like',
        sampleIntro:
          'Below, the scan runs live on a sample shop. Not a screenshot: this is the same engine that will read your feed.',
        sampleFull: 'See the full example report',
        stepsHeading: 'How it works',
        steps: [
          {
            title: 'You choose your file',
            body: 'Your product feed, the one you already send to Google or a channel. Add an export from your PIM and we can tell whether a missing field is a setting or genuinely absent.',
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
          'Your feed and your PIM export are read and processed in your browser. No file goes to a server, not even briefly.',
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
            a: 'CSV, TSV, semicolon CSV, JSON, NDJSON and XML. So the feed you already send to Channable or Google Shopping works. Export an xlsx as CSV first.',
          },
          {
            q: 'My columns are named differently. Will it still work?',
            a: 'Usually — we recognise a few hundred common names, with or without a prefix. If we get one wrong you see it straight away in the preview and can correct it per column.',
          },
          {
            q: 'Why do you also ask for my PIM export?',
            a: 'Because "missing" is not a work order. If the answer already sits in your PIM and only fails to reach your feed, that is an afternoon of work. If it is nowhere, it is months. Without that second source we cannot tell those apart.',
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
        closingHeading: 'See what is in your feed',
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
          'The scan measures whether your product data answers the questions a buyer in your category asks, against OpenAI ACP and Google UCP.',
        deterministic:
          'The outcome is fully deterministic. Questions are answered from structured attributes rather than prose, and no language model is involved. The same file always gives the same report, and a scan costs nothing.',
        privacy:
          'The free scan runs in your browser. Your feed and your catalogue never leave your device and are not stored anywhere.',
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
        comparable: 'Same yardstick, so this difference comes from your data.',
        deltaFindable: 'Findable',
        deltaCompetitive: 'Competitive',
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

    steps: { upload: 'Supply data', questions: 'Validate question sets', report: 'Report' },

    upload: {
      heading: 'Supply your product data',
      intro:
        'The feed is what the agent actually sees, so that is the analysis source. The catalogue export from your PIM is optional, but without that second source we cannot tell whether a missing field is a mapping error or a real gap.',
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
      startHeading: 'Where do you start?',
      startIntro:
        'The funnel is strict: findable means every question is answered. That does not tell you how far along you are, and this does.',
      startNoneFindable: 'No product is findable yet.',
      startSomeFindable: 'products are already findable.',
      startNearest: 'Closest to the line:',
      startNearestProducts: 'products are still missing',
      startNearestQuestions: 'answers.',
      startBlockersHeading: 'What holds back the most products',
      startBlockerOpen: 'products have this question open',
      startBlockerPim: 'of which available from your PIM',
      startBlockerNowhere: 'is recorded nowhere',
      startWinHeading: 'What the first step buys you',
      startWinBody: 'Answer these questions across your catalogue and',
      startWinProducts: 'products become findable straight away.',
      startWinNone:
        'These questions alone are not enough: every product still has others open. That is no reason to leave them — they are still the biggest single step.',
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
      scanVersion: 'Scan version',
      specSnapshot: 'Spec snapshot',
      questionVersion: 'Question set version',
      scannedAt: 'Scanned at',
      disclaimer:
        'This scan measures whether your data answers the questions a buyer in your category asks. That is a statement about your own data, not a prediction of how an agent ranks. An agent also draws on your website, third-party reviews, marketplace listings and its own training data; the catalogue is one input of several.',
      saveScan: 'Save this scan',
      savedScan: 'Saved on this device',
      printReport: 'Print or save as PDF',
      shareNote:
        'Reports are not stored anywhere: this one lives as long as you keep this tab open. To share or keep it, print it or save it as a PDF — that happens on your own device, just like the scan itself.',
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
      noColumns: 'We do not recognise a single column in this file',
      noColumnsNext:
        'Check that the first row holds the column names and not, say, a title or a blank line. An export from Excel sometimes puts a row above it.',
      didYouMean: 'Did you mean this column?',
      linkIt: 'Link it',
      wrongType: 'We cannot read this file type',
      wrongTypeNext: 'We read CSV, TSV, semicolon CSV, JSON, NDJSON and XML. Export an xlsx as CSV first.',
      scanFailed: 'The scan could not be run',
      scanFailedNext: 'Go back to the first step and supply your file again. If it keeps failing, reloading the page helps — the scan runs in your browser and loses its memory when a tab stays open for a long time.',
      feedRequired: 'Supply a product feed first.',
      readFailed: 'Could not read this file',
    },
  },
};

export type Locale = keyof typeof STRINGS;
export type Strings = (typeof STRINGS)['nl'];
