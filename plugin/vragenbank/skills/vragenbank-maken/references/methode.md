# Methode — vragenbank bouwen voor een nieuwe vertical

Bestemming: `/kennis/_methode/methode-vragenbank-genereren.md`

Dit is de herbruikbare kant van het project. De engine is generiek, de kennis is dat niet: per vertical is dit handwerk met modelondersteuning. Deze methode beschrijft de volgorde. De losse prompt staat in `prompt-vragenbank-genereren.md`.

Reken op één tot twee dagen per vertical bij een panel van vijf sites, plus de doorlooptijd van de domeinreview. De bronoogst is het meeste werk; de rest gaat snel zodra die ligt.

De uitkomst is een asset op **vertical-niveau**, herbruikbaar over al je merchants heen. Dat is de reden om het panel breed te trekken in plaats van bij één klant te blijven.

---

## Het principe

Je bouwt geen attribuutlijst. Je bouwt een lijst **vragen die een koper stelt**, en leidt daar de attributen uit af.

Dat onderscheid is het hele verschil. Een attribuutlijst is een mening. Een vragenlijst met per vraag het benodigde bewijs is een meetinstrument: je kunt er per categorie een score mee berekenen, en je kunt eerlijk rapporteren dat een vraag niet beantwoord kan worden.

---

## Fase 0 — Vorm van de vertical bepalen

Voordat je één vraag opschrijft, stel je vast wat voor soort vertical dit is. Dit bepaalt de rest.

| Vraag | Waarom het uitmaakt |
|---|---|
| Wordt er per stuk of per maateenheid verkocht? | Per maateenheid betekent: hoeveelheidsberekening is een koopdrempel en dus een vragencluster op zich |
| Zijn er GTIN's en kanaalfeeds? | Zo ja, dan zijn marketplace-specs een harde bron. Zo nee, val terug op testnormen |
| Bestaat er een sectorstandaard? | ETIM, GPC/GS1, eCl@ss, of ISO/EN-testnormen. Scheelt de helft van het werk |
| Is er een parent/child-structuur? | Bepaalt op welk niveau attributen horen |
| **Welke fout kan de koper niet terugdraaien?** | Dit bepaalt je weging. Zie hieronder |
| Welke wetgeving raakt dit producttype? | Alleen verplichtingen, geen advies |

### De onomkeerbare fout

Dit is de belangrijkste vraag van fase 0. In elke vertical bestaat een aankoopfout die niet te herstellen is, en de vragen die die fout voorkomen krijgen automatisch het hoogste gewicht.

Bij stoffen: op maat geknipt, dus geen herroepingsrecht. Verkeerd geknipt is totaalverlies.
Bij vloeren of tegels: te weinig besteld en het verfbad is op.
Bij verf: aangebroken blik, kleur zit al op de muur.
Bij maatwerkmeubilair: gemaakt op maat, geen retour.

Zoek de equivalent. Hij is het tweede criterium van de kritiek-toets hieronder, niet de hele toets.

### De kritiek-toets

De onomkeerbare fout alleen is geen maat. In een markt waar op maat geknipt of verwerkt wordt, is élke verkeerde keuze onomkeerbaar — en dan haalt bijna elke vraag de lat. Bij de eerste echte bank werden zo 31 van de 171 vragen kritiek, en na de herweging per categorie tot een derde per categorie. Kritiek is de poort voor basisgeschikt; een poort waar alles doorheen moet zegt niets.

Een vraag is alleen `kritiek` als alle vier ja zijn:

1. **Beslissend.** Maakt een fout antwoord het product ongeschikt voor wat de koper ermee wil? De verkeerde hoeveelheid, ongeschikt voor de toepassing, niet toegestaan of onveilig. Tegenvallen telt niet: sneller vuil, eerder verkleurd of minder mooi dan gehoopt is `hoog`.
2. **Onherstelbaar.** Kan de koper het na levering niet terugdraaien, omdat het geknipt, verwerkt of aangebracht is, of omdat retour is uitgesloten? Dit is de onomkeerbare fout hierboven.
3. **Over het product.** Gaat de vraag over een eigenschap van het product? Een vraag over beleid, levering of voorraad — retour, bijbestellen uit hetzelfde verfbad, een staal — is nooit kritiek, hoe belangrijk ook.
4. **Uit de catalogus.** Staat het antwoord in een kenmerk van het product zelf? Een berekening die ook de maten of keuzes van de koper nodig heeft — "hoeveel meter heb ik nodig voor mijn raam", antwoordtype `afgeleid` — is nooit kritiek. Een catalogus die alles goed vastlegt, haalt zo'n vraag nog steeds niet, en als poort verbergt hij elke andere kritieke vraag. Bij de eerste echte bank zette "hoeveel meter heb ik nodig" als kritieke vraag basisgeschikt van 1.523 op 136 producten. De vraag blijft in de meting, als `hoog`.

Een vraag die alleen informatie geeft waaruit een ander antwoord volgt, is zelf niet beslissend. "Waar is deze stof van gemaakt" voedt "is deze stof geschikt voor mijn bank"; alleen die tweede kan kritiek zijn.

Leg per kritieke vraag in `kritiek_toets` vast waarom elk van de vier criteria geldt, in één zin per criterium. Een herweging naar kritiek in een overlay krijgt dezelfde toets. Bij twijfel: `hoog`.

---

## Fase 1 — Sitepanel samenstellen

De vragenbank hoort bij de **vertical**, niet bij één merchant. Eén site geeft je de vragen die die ene merchant belangrijk vindt, plus zijn blinde vlekken. Vijf tot acht sites geven je de vragen van de markt, en bovendien een meetbare frequentie.

Stel een panel samen met bewust verschillende soorten bronnen, want ze leveren verschillende dingen op:

| Type | Aantal | Wat het bijdraagt |
|---|---|---|
| Categorieleiders in de thuismarkt | 2 | Vragen, FAQ's, gepubliceerde beslisregels |
| Specialisten of nichespelers | 1 | Diepere technische vragen, randtoepassingen |
| Merk- of fabrikantsites | 1 | Testnormen, attribuutnamen, datasheets |
| Buitenlandse spelers (DE, UK) | 1 | Vaak veel technischer, andere wetgeving |

Vijf en niet acht: het onderzoek per site is het meeste werk, en acht sites maakt
een bank per markt een dagtaak. Wat je inlevert is de fijnheid van de
frequentiemaat — dekking 3 van 5 is grover dan 5 van 8 — en dat hoort bij de
dekking vermeld te worden, niet verstopt. De marketplace-categoriepagina is
eruit: die bracht verplichte feedvelden, en daar meet deze scan niet tegen.

Duitse webshops publiceren in vrijwel elke vertical meer technische data dan Nederlandse. Ze zijn daarom onevenredig waardevol voor het attribuutdeel, ook als de vragen in het Duits staan.

Leg het panel vast in de meta van de vragenbank, met datum en URL. Anders is `dekking` later niet reproduceerbaar.

### Twee opbrengsten die je gratis krijgt

**Dekking als frequentieproxy.** Als zes van de acht sites een FAQ-item of tekstblok wijden aan één onderwerp, is dat convergerend bewijs. Veel sterker dan het oordeel van één merchant, en meetbaar zonder servicedata. Dit vervangt de inschatting die `belang` anders is.

**Cold start voor de benchmark.** Hetzelfde panel levert per site welke attributen wél publiek gemaakt worden. Dat is je publieke benchmark voordat je drie tot vijf merchants als klant hebt, en daarmee de oplossing voor het probleem dat je eerste klant anders geen vergelijking krijgt.

---

## Fase 2 — Bronoogst, in deze volgorde

Per site dezelfde volgorde aflopen. De volgorde is niet willekeurig: elke bron lager in de lijst is zwakker bewijs.

1. **De FAQ van de site zelf.** Sterkste signaal: de merchant heeft deze vragen zelf als belangrijk aangemerkt. Vaak staan er drempeltabellen en rekenregels in.
2. **Categorie- en subcategorieteksten.** Verklappen welke onderscheidingen commercieel belangrijk gevonden worden.
3. **Blogonderwerpen en kennisbanken.** Een artikel over een onderwerp is bewijs dat de vraag leeft. Niet hoe vaak.
4. **Productdetailpagina's van een handvol producten.** Welke technische kenmerken worden getoond, en onder welke naam.
5. **Publieke reviews.** Bevatten "had ik geweten dat". Levert frequentie op, wat de andere bronnen niet doen.
6. **Servicetickets, chat, klachten, retourredenen.** Beste bron, alleen beschikbaar bij je eigen klant. Scrubben op persoonsgegevens voordat er iets een prompt in gaat.
7. **Vakkennis en testnormen.** Vult wat klanten niet weten te vragen maar wel nodig hebben.

> **Zoek expliciet naar gepubliceerde beslisregels.** Drempeltabellen, meterage-tabellen, geschiktheidsmatrices. Die zijn goud: al gevalideerd door een marktpartij, deterministisch uitvoerbaar, en je hoeft ze niet zelf te verzinnen. Bij stoffen leverde dit de Martindale-tabel en de meteragetabel op. Als meerdere sites afwijkende drempels hanteren, leg beide vast en zet het verschil bij de open punten: dat is een inhoudelijke discussie voor de domeinexpert, geen fout.

### Vragen die niemand beantwoordt

Voeg bewust een stap toe voor vragen die op **geen enkele** site beantwoord worden maar die klanten wel hebben. Bronnen: reviews, fora, en vakkennis over wat er in de praktijk misgaat.

Zonder die stap convergeer je op het marktgemiddelde en reproduceer je de blinde vlekken van de hele branche. Juist deze vragen zijn commercieel het interessantst, want daar kan je advies zeggen: niemand doet dit, wees de eerste. Markeer ze met `dekking: 0` en een aparte bron.

---

## Fase 3 — Blinderen

**Bouw de vragenbank vóórdat je de productexport van je klant opent, en bevries hem daarna.**

Zodra je de bestaande attributen ziet, sturen die je denken en meet je alleen nog of er staat wat er staat. Blindering is de enige manier om eerlijk te kunnen rapporteren dat een vraag onbeantwoordbaar is.

Bij een sitepanel geldt dit alleen voor de **klantcatalogus**. De publieke sites van andere spelers zijn juist bron: daar kijk je bewust wél naar de getoonde kenmerken. Het verschil is dat je die als markt-observatie behandelt en niet als jouw datamodel.

Praktisch:
- Aparte sessie voor de vragenbank, aparte sessie voor de analyse
- Eigen canonieke attribuutnaamgeving, losgekoppeld van alle sitespecifieke veldnamen
- Mapping naar merchantvelden is een expliciete, latere stap
- Structuurinspectie van de klantexport (aantal rijen, parent/child, categoriepaden) mag wel; semantische inspectie niet

Als je onderweg toch iets ziet, bijvoorbeeld filternamen op een categoriepagina van je eigen klant, noteer dat als transparantienoot in het bestand.

---

## Fase 4 — Lagen

Splits meteen. Achteraf splitsen doe je nooit.

```
_basis_{vertical}.yaml          ← vragen die voor elk product gelden
{categorie}.yaml                ← overlay per hoofdcategorie
_merchant_{naam}.yaml           ← optioneel, alleen wat uniek is voor één klant
_facetcategorieen.yaml          ← analyse, geen vragen
{vertical}.md                   ← leesbare versie voor de domeinexpert
```

Drie lagen, niet twee. De vertical-laag is je herbruikbare asset over alle klanten heen; de merchantlaag bevat alleen wat aantoonbaar uniek is voor die ene klant, zoals een eigen dienst of een afwijkend assortimentsdeel. Houd die laag klein: alles wat erin sluipt en eigenlijk generiek is, verlies je bij de volgende klant.

Vuistregel: bij stoffen was een derde van de vragen categorieoverstijgend. Verwacht iets vergelijkbaars.

Een overlay mag een basisvraag **herwegen** of uitschakelen, maar niet herschrijven. Anders lopen dezelfde vragen uit de pas.

### Een eigen vragenset vraagt een vraag die de markt stelt

Een categorie krijgt alleen een eigen vragenset als minstens één eigen consumentenvraag op een panelsite voorkomt: dekking groter dan nul. Kun je die niet vinden, dan stelt de markt in deze categorie geen andere vragen dan elders, en is het een toepassingsprofiel. Een subcategorie die de toets niet haalt, wordt onder haar categorie gemeten; een hoofdcategorie houdt alleen de basislaag.

De toets geldt alleen als er gemeten is. Zonder sitepanel is de dekking niet onderzocht, en dat is iets anders dan nul.

### Losstaande categorieën krijgen geen basislaag

Niet alles wat een winkel verkoopt is het kernproduct van de markt. Een stoffenwinkel verkoopt ook naaigaren, onderhoudsmiddelen en gereedschap; een fietsenwinkel verlichting en sloten. Voor zulke producten slaan de algemene vragen nergens op — "hoe breed is de stof" bij een klos garen — en ze meetellen meet iets wat er niet is.

Markeer zo'n categorie als **losstaand**: een eigen vragenset, zonder de basislaag. De toets: slaan de meeste algemene vragen van deze markt op deze producten nergens op, dan is ze losstaand. Waar de winkel haar in zijn menu hangt verandert daar niets aan; De Groot hangt zijn garens onder Meubelstoffen, en het blijft garen.

In de vragenlijst is dat `laag: standalone`. Voor een bank die er al ligt kan de beheerder een categorie op het beoordeelscherm losstaand maken, zonder opnieuw te genereren.

Neem categorienamen over zoals de markt ze schrijft en niet zoals één winkel ze spelt: een bank hoort bij de markt. Een label is op het beoordeelscherm te corrigeren; de categorie van de merchant blijft er dan gewoon op aansluiten.

### Subcategorieën worden profielen, geen eigen bank

Toepassingssubcategorieën (banken, eetkamerstoelen, vouwgordijnen) verschillen niet in wélke vragen gesteld worden, maar in de **drempels en berekeningen** bij dezelfde vragen. Leg ze vast als `toepassingsprofielen` binnen de overlay. Dat houdt de vragenset klein en de parametrisering expliciet.

### Facetten scheiden van categorieën

Loop de categorieboom langs en markeer elk pad dat eigenlijk een eigenschap is: Vlekwerend, Duurzaam, Effen, Vlamvertragend. Die krijgen geen vragenset; ze horen een attribuutwaarde te zijn.

Het aantal facetcategorieën is zelf een meetwaarde en over merchants heen vergelijkbaar. Hoe meer categorieën die eigenlijk een filter zijn, hoe groter de onderliggende attribuutschuld. Bij De Groot: 22 van de 58 paden.

---

## Fase 5 — Vragen schrijven

Per vraag leg je vast:

```yaml
- id: XXX-00
  vraag: "Zoals een klant hem stelt, niet als attribuutnaam"
  intentie: geschiktheid | hoeveelheid | onderhoud | verwachting |
            materiaal | verwerking | duurzaamheid | veiligheid | koopzekerheid
  belang: kritiek | hoog | middel | laag
  kritiek_toets:                      # alleen bij kritiek: één zin per criterium
    beslissend: "..."
    onherstelbaar: "..."
    product: "..."
    uit_de_catalogus: "..."
  dekking: 6            # op hoeveel sites van het panel komt dit onderwerp voor
  dekking_bronnen: [site_a, site_b, ...]
  bron: [faq, categorietekst, review, vakkennis]
  bewijs: [attribuut, attribuut]      # wat is nodig om te antwoorden
  beslisregel: naam_van_regel         # optioneel, deterministisch
  antwoordtype: enum | getal | boolean | afgeleid_* | tekst | relatie | proces
  beantwoordbaar_uit_attributen: true | gedeeltelijk | false
```

Vijf regels die de kwaliteit bepalen:

**Formuleer als klantvraag, niet als attribuut.** "Is deze stof sterk genoeg voor mijn bank" en niet "Martindale-waarde". De attribuutnaam volgt uit de vraag, nooit andersom.

**Laat `dekking` het gewicht sturen, maar niet bepalen.** Vuistregel: dekking boven 70% van het panel rechtvaardigt `hoog`. Dekking maakt een vraag nooit `kritiek` — dat doet de kritiek-toets uit fase 0, vier keer ja. Een vraag met dekking 0 kan kritiek zijn als de toets dat zegt; leg dan uit waarom je van de dekking afwijkt.

**Eén vraag kan meerdere attributen plus een regel nodig hebben.** Dat is normaal en het is precies waar de waarde zit. "Hoeveel meter heb ik nodig" vraagt breedte plus rapport plus een berekening.

**Markeer wat niet uit attributen te beantwoorden is.** Procesvragen ("kan ik een staal krijgen"), structuurvragen ("welke kleuren bestaan er nog meer in deze kwaliteit") en levenscyclusvragen. Die blijven in de bank staan omdat ze advies opleveren, maar ze gaan uit de score. Anders vertekenen ze de meting.

**Onderscheid gepubliceerde van beredeneerde drempels.** Als een site zegt dat 30.000 Martindale de bankgrens is, noteer je de bron. Als jij 40.000 kiest voor huisdieren, markeer je dat als beredeneerd en zet je het bij de open punten. Ongemarkeerde eigen getallen zijn de snelste manier om vertrouwen te verliezen bij de domeinexpert.

---

## Fase 6 — Domeinreview

Niet optioneel. Zonder review heb je plausibel advies, niet goed advies, en dat is precies wat een generiek taalmodel ook levert.

Lever de MD-versie aan, niet de YAML. Vraag specifiek om:
- de beredeneerde drempels
- of de vragen kloppen zoals klanten ze werkelijk stellen
- welke vraag ontbreekt die zij dagelijks krijgen
- of een attribuut op product- of variantniveau hoort

---

## Fase 7 — Kenmerken typeren

Na de review, en los van de generatie. Een bank noemt een kenmerk bij naam (`hittebestendigheid_max_c`, `coatingtype`), en het antwoordtype staat per vraag — een vraag met vier kenmerken heeft één type voor alle vier. Het koppelscherm moet per kenmerk weten welke waarde er in een catalogus hoort, anders legt het een °C-kenmerk op een ja/nee-kolom en verdwijnt een gat dat er wél is.

Per kenmerk één vorm:
- **ja/nee** — waar of niet waar
- **getal** — met een generieke eenheid als die er is (cm, g/m², °C, %); zonder eenheid bij toeren of een blauwschaal
- **lijst** — een keuze uit een beperkte set, met hooguit acht voorbeeldwaarden
- **code** — certificaatnummer, EAN, normcode
- **tekst** — vrije omschrijving

Het model krijgt alleen de kenmerknamen, hooguit twee vragen per kenmerk en hoe de sites het noemen. Geen catalogus: de typering hoort bij de markt. Eén keer per markt, in blokken van 120 die tegelijk lopen. De uitkomst is een tabel die de beheerder naloopt en bevestigt; pas dan ziet een merchant de typen. Bij twijfel liever "tekst": het koppelscherm wijst alleen af wat zeker niet past, en een te strenge vorm wijst een kolom af die wél klopte.

Omdat het een losse stap is, krijgt een bank die er al ligt zijn typen zonder opnieuw gegenereerd te worden. Pas je een type aan, dan gaat de tabel terug op review.

---

## Kosten

Alles hierboven gebeurt op **categorieniveau**: tientallen modelcalls, één keer, resultaat op schijf en in git. De vragenbank is een asset, geen berekening die je herhaalt.

Het model draait nooit per SKU. Bij de latere analyse laat je het model de extractor schrijven en draait code die extractor over de catalogus.

---

## Anti-patronen

**Beginnen met "welke attributen horen bij deze categorie".** Dan krijg je de attributen die het model uit vakliteratuur kent, niet de vragen die klanten stellen. Het lijkt op hetzelfde resultaat en is het niet.

**Wetgeving door het model laten bepalen.** Verplichtingen komen uit een onderhouden regelbibliotheek; het model classificeert alleen of een product binnen de scope valt.

**Duurzaamheidsclaims genereren.** Alleen verifieerbare certificeringen met bron.

**Één site als bron nemen.** Dan bouw je de vragenbank van één merchant, inclusief zijn blinde vlekken, en heb je geen frequentiemaat. Voor een SaaS die generiek moet zijn is dat meteen fataal: je eerste klant wordt je datamodel.

**Convergeren op het marktgemiddelde.** Als je alleen oogst wat sites publiceren, reproduceer je de blinde vlekken van de hele branche. Houd de stap voor vragen met `dekking: 0` er expliciet in; daar zit je onderscheidend vermogen.

**Alles in één prompt.** Vraag om 130 vragen in één keer en je krijgt 130 middelmatige. Werk per fase en per categorie, en laat de basislaag eerst af zijn.

**De klantcatalogus als startpunt.** Zie fase 3.

**Frequentie verwarren met belang.** `dekking` is hoeveel sites het onderwerp behandelen, niet hoe vaak klanten het vragen. Het is een proxy, geen meting. Noteer dat in de meta, anders gaat iemand er later mee rekenen alsof het servicedata is.
