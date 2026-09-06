# Prompt — vragenbank genereren voor een nieuwe vertical

Bestemming: `/kennis/_methode/prompt-vragenbank-genereren.md`

Zes prompts, in volgorde te gebruiken. Niet samenvoegen: één prompt om 130 vragen te maken levert 130 middelmatige vragen op.

Vul overal `{{...}}` in. Draai dit in een **aparte sessie** waarin de productexport van je klant niet aanwezig is.

---

## Prompt 0 — Sitepanel en vorm van de vertical

> Ik ga een vragenbank bouwen voor de vertical **{{vertical}}**. De bank moet gelden voor de hele markt, niet voor één webshop, want ik ga hem bij meerdere merchants gebruiken.
>
> Dit is mijn panel:
>
> | Site | Type |
> |---|---|
> | {{url_1}} | categorieleider |
> | {{url_2}} | categorieleider |
> | {{url_3}} | specialist |
> | {{url_4}} | merk/fabrikant |
> | {{url_5}} | merk/fabrikant |
> | {{url_6}} | buitenlands (DE/UK) |
> | {{url_7}} | {{...}} |
>
> Het doel is niet om attributen te bedenken, maar om vast te leggen welke vragen een koper stelt en welk bewijs nodig is om die te beantwoorden. De attributen leid ik daar later uit af.
>
> Verken het panel en beantwoord:
>
> 1. Wordt er per stuk of per maateenheid verkocht? Wat is de koopeenheid, en verschilt dat tussen de sites?
> 2. Zijn er GTIN's en verkoopt men via marketplaces? Zo ja, welke feedspecs zijn relevant?
> 3. Bestaat er een sectorstandaard om op te ankeren (ETIM, GPC/GS1, eCl@ss, ISO- of EN-testnormen)? Welke sites verwijzen ernaar?
> 4. Is er een parent/child-structuur, en wat is het echte productobject versus de variant? Hanteren de sites daar dezelfde opvatting over?
> 5. **Welke aankoopfout kan de koper niet terugdraaien?** Denk aan op maat gemaakt, aangebroken verpakking, vervallen herroepingsrecht, uitverkochte productiebatch.
> 6. Welke wetgeving raakt dit producttype dwingend?
> 7. Welke categorieën komen op meerdere sites terug, en welke zijn sitespecifiek? Onderscheid daarbij echte toepassingen van eigenschappen en commerciële segmenten.
>
> Geef bij elk antwoord aan uit welke site het komt, of dat het vakkennis is. Noem het expliciet als sites elkaar tegenspreken. Verzin geen normen die je niet kunt onderbouwen.

---

## Prompt 1 — Bronoogst per site

Draai dit per site, of in groepjes van twee tot drie. Niet alle zeven tegelijk: dan vervlakt de opbrengst.

> Oogst nu de klantvragen van **{{url}}** ({{type}}).
>
> Loop deze bronnen af, in deze volgorde van bewijskracht:
>
> 1. FAQ-blokken en veelgestelde-vragenpagina's
> 2. Categorie- en subcategorieteksten
> 3. Blogonderwerpen en kennisbankartikelen
> 4. Een handvol productdetailpagina's: welke technische kenmerken worden getoond, en onder welke naam?
> 5. Publieke reviews {{indien beschikbaar: bron}}
>
> Zoek daarnaast expliciet naar **gepubliceerde beslisregels**: drempeltabellen, rekenregels, geschiktheidsmatrices, hoeveelheidstabellen. Neem die letterlijk over inclusief de getallen, met bron-URL. Die regels zijn al door een marktpartij gevalideerd en hoeven we niet zelf te verzinnen.
>
> Lever per site op:
> - de ruwe vragenlijst, met per vraag de bron binnen deze site
> - de getoonde technische kenmerken met hun naam op deze site
> - de gevonden beslisregels met bron
>
> Parafraseer, neem geen teksten letterlijk over behalve de getallen in tabellen. Noteer per vondst de URL zodat `dekking` later reproduceerbaar is.
>
> Kijk **niet** naar mijn eigen klantcatalogus. Ik wil de vragen los van wat daar toevallig al vastligt.

---

## Prompt 1b — Consolidatie over het panel

> Voeg de oogst van alle {{n}} sites samen tot één lijst.
>
> 1. **Ontdubbel op onderwerp, niet op formulering.** "Kan ik hier mijn bank mee bekleden" en "welke stof is sterk genoeg voor dagelijks gebruik" zijn dezelfde vraag. Kies de formulering die het dichtst bij de klant staat.
> 2. Geef per vraag een **dekking**: op hoeveel van de {{n}} sites komt dit onderwerp voor, en welke. 
> 3. Markeer **tegenspraak**: onderwerpen waar sites verschillende drempels of adviezen hanteren. Leg beide vast; dat is een discussiepunt voor de domeinexpert, geen fout.
> 4. Maak een aparte lijst met **attribuutnamen per site** voor hetzelfde kenmerk, zodat ik zie hoe de markt het benoemt. Kies daar nog geen canonieke naam.
> 5. Voeg tot slot bewust vragen toe die op **geen enkele site** beantwoord worden maar die klanten wel hebben. Haal die uit reviews, fora en vakkennis over wat er in de praktijk misgaat. Markeer ze met `dekking: 0`.
>
> Punt 5 is belangrijk: als ik alleen oogst wat sites publiceren, reproduceer ik de blinde vlekken van de hele branche. Juist die vragen zijn commercieel interessant.
>
> Lever de geconsolideerde lijst gesorteerd op dekking, met per vraag de bronsites.

---

## Prompt 2 — Basislaag

> Bouw uit de ruwe lijst de basislaag: de vragen die gelden voor **elk** product in deze vertical, ongeacht toepassing of categorie.
>
> Lever een YAML met deze structuur:
>
> ```yaml
> meta:
>   vertical: {{vertical}}
>   laag: basis
>   versie: "1.0.0"
>   status: bevroren
>   sitepanel:                    # reproduceerbaarheid van dekking
>     - {naam: ..., url: ..., type: ..., geraadpleegd: JJJJ-MM-DD}
>   panelomvang: {{n}}
>   bronnen: [...]
>   nog_te_verwerken: [...]
> weging:
>   belang: {kritiek: 5, hoog: 3, middel: 2, laag: 1}
>   toestanden: [ontbreekt, verborgen, onvolledig, onbruikbaar, beantwoordbaar]
> context_vertical:
>   onomkeerbare_fout: "{{uit prompt 0}}"
>   gevolg: "Vragen die deze fout voorkomen krijgen belang kritiek"
> attributen:
>   {canonieke_naam}:
>     type: ...
>     normering: ...        # als er een testnorm bestaat
>     niveau: product | variant
>     wettelijk: ...        # alleen bij echte verplichting
>     benoemd_als: [...]    # hoe de sites in het panel dit kenmerk noemen
> beslisregels:
>   {naam}:
>     bron: ...             # gepubliceerd (met site) of beredeneerd
>     afwijkingen: [...]    # als sites verschillende drempels hanteren
>     regels: [...]
> vragen:
>   - id: BAS-XX
>     vraag: "Zoals een klant hem stelt"
>     intentie: ...
>     belang: ...
>     dekking: 6
>     dekking_bronnen: [site_a, site_b, ...]
>     bron: [faq, categorietekst, review, vakkennis]
>     bewijs: [attribuut, attribuut]
>     beslisregel: ...
>     antwoordtype: ...
>     beantwoordbaar_uit_attributen: true | gedeeltelijk | false
> uitgesloten_van_score: [...]
> open_punten: [...]
> ```
>
> Regels:
> - Formuleer als klantvraag, nooit als attribuutnaam. De attribuutnaam volgt uit de vraag.
> - Gebruik eigen canonieke attribuutnamen. Neem geen veldnamen van een site over, maar noteer ze wel onder `benoemd_als`.
> - Laat `dekking` het gewicht sturen maar niet bepalen: boven 70% van het panel rechtvaardigt `hoog`, volledige dekking samen met de onomkeerbare fout rechtvaardigt `kritiek`. Een vraag met `dekking: 0` kan alsnog kritiek zijn als er een dure fout achter zit; leg dan uit waarom je afwijkt.
> - Eén vraag mag meerdere attributen plus een beslisregel nodig hebben.
> - Markeer vragen die niet uit attributen te beantwoorden zijn (proces, structuur, levenscyclus) en zet ze in `uitgesloten_van_score`.
> - Onderscheid gepubliceerde drempels (met bronsite) van beredeneerde drempels (naar `open_punten`).
> - Verzin geen certificeringen, normnummers of wettelijke verplichtingen die je niet kunt onderbouwen.

---

## Prompt 3 — Overlay per categorie

Herhaal per hoofdcategorie.

> Bouw nu de overlay voor **{{categorie}}**, die erft van de basislaag.
>
> Neem alleen op wat categoriespecifiek is. Herhaal geen basisvragen.
>
> Voeg toe:
>
> - `herweging_basisvragen`: welke basisvragen krijgen in deze categorie een ander gewicht, en waarom
> - `attributen`: alleen de nieuwe
> - `beslisregels`: inclusief hoeveelheidsberekeningen als die hier spelen
> - `vragen`: de categoriespecifieke vragen
> - `toepassingsprofielen`: per toepassingssubcategorie de drempels, berekeningen en kritieke vragen. Géén eigen vragenset, alleen parametrisering
>
> Voor de toepassingsprofielen gebruik je deze subcategorieën: {{lijst}}.
>
> Let op dat een vraag in deze categorie een ander gewicht kan hebben dan in de basis. Leg dat expliciet vast in plaats van de vraag te herschrijven.

---

## Prompt 4 — Facetanalyse

> Loop de volledige categorieboom van {{merchant}} langs: {{plak de boom met aantallen}}.
>
> Bepaal per pad of het een **toepassing** is (verdient een profiel of overlay) of een **facet** (is eigenlijk een eigenschap en hoort een attribuutwaarde te zijn).
>
> Gebruik het sitepanel als toets: als andere spelers hetzelfde onderscheid als filter aanbieden in plaats van als categorie, is dat sterk bewijs dat het een facet is.
>
> Lever een YAML met per facet:
> - de categorienaam en het aantal producten
> - het attribuut dat het zou moeten vervangen
> - de conditie waaronder het facet waar is
> - hoeveel sites in het panel dit als filter aanbieden
> - prioriteit, waarbij veiligheids- en claimgerelateerde facetten (brandveiligheid, duurzaamheid, gezondheid) altijd bovenaan staan omdat een categorie zonder onderliggend attribuut daar een claim zonder bewijs is
> - welke facetten commerciële segmentatie zijn en dus categorie mogen blijven
>
> Geef aan het eind het totaal: hoeveel van de paden zijn facet. Dat getal is een indicator van attribuutschuld en is over merchants heen vergelijkbaar.

---

## Prompt 4b — Publieke benchmark

> Maak uit het sitepanel een benchmarkbestand: per canoniek attribuut uit de vragenbank, op hoeveel van de {{n}} sites het publiek getoond wordt, en onder welke naam.
>
> Lever YAML met per attribuut: `dekking`, `bronsites`, `benoemd_als`, en of het als filter beschikbaar is of alleen als specificatie op de productpagina.
>
> Dit is mijn cold-startbenchmark: hiermee kan ik een eerste klant vertellen hoe hij zich verhoudt tot de markt, voordat ik genoeg klanten heb voor een echte onderlinge vergelijking. Markeer het expliciet als publieke-databenchmark, niet als merchantbenchmark, want het meet wat sites tónen en niet wat ze vastleggen.

---

## Prompt 5 — Leesbare versie voor de domeinexpert

> Maak een markdownversie van alle vragenbanken samen, bedoeld om aan een {{vakgebied}}-expert voor te leggen.
>
> Bevat:
> - overzichtstabel met per bestand het aantal vragen en attributen
> - uitleg van de laagopzet en waarom die zo is
> - per categorie alle vragen in een tabel met id, vraag en belang
> - de beslisregels met hun drempels
> - een expliciete scheiding tussen **gepubliceerde** drempels (met bron) en **beredeneerde** drempels die nog bevestigd moeten worden
> - de openstaande inhoudelijke vragen, per categorie, met een aanwijzing welke het zwaarst wegen
>
> Schrijf voor iemand die het vak kent maar de tool niet. Geen jargon over datamodellen.

---

## Na afloop

Bevriezen, in git, en pas dán de mappinglaag bouwen naar de velden van de merchant. Structuurinspectie van de export mag daarvoor al; semantische inspectie niet.
