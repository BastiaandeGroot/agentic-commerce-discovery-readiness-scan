# Werknotities

Sessiestand: wat er staat, wat er besloten is, wat er open is.
Laatst bijgewerkt: 2026-09-11.

Structurele regels die altijd gelden staan **niet** hier maar in `CLAUDE.md`.

---

## Wat dit is

Een tweetalige (NL/EN) webapp die meet of de **productcatalogus** van een
merchant de vragen kan beantwoorden die een koper in zijn markt stelt. Niet
attribuutcompleetheid, maar beantwoordbaarheid van consumentenvragen.

Live: https://agentic-commerce-discovery-readiness-scan.onrender.com
Dashboard: https://dashboard.render.com/web/srv-dabkanvavr4c73dfl9qg
Elke merge naar `main` deployt automatisch naar Render (gratis plan, koude start ~50s).
De service is *blueprint managed*: `render.yaml` is leidend, en een variabele met
`sync: false` daarin haalt zijn waarde uit het dashboard onder Settings.

De keten is: **catalogus aanleveren → categorieën bevestigen → vragenbank
kiezen of aanvragen → kenmerken koppelen → vragensets valideren → rapport**,
plus een uitlegpagina op `/methode` in merchant-taal. Voor de beheerder daarnaast:
banken beoordelen en vrijgeven, een overzicht van alle banken, en winkel
doormeten (een meting van buitenaf, als pdf).

## Architectuur in het kort

| Map | Wat er staat |
|---|---|
| `src/intake/` | formaatdetectie (CSV/TSV/JSON/NDJSON/XML) en kolomherkenning |
| `src/semantic/` | het embeddingmodel in de browser en de voorstellen die het doet |
| `src/spec/` | veldenregister: kolomaliassen en eigenaar per veld |
| `src/questions/` | vragenbanken (model, banken, composer), generator, import, aanvraag, beoordeling |
| `src/engine/` | plaatsing van een product in de boom (`join.ts`), evaluatie, rapportaggregatie |
| `src/generation/` | de generatie van een vragenbank als vaste reeks fasen; puur |
| `src/collect/` | winkel doormeten: productgegevens en productadressen uit html en sitemaps halen; puur |
| `src/server/` | alleen serverzijdig: modelaanroepen van de generatie (direct en batch), aanleveren van een bank, het ophalen van een winkel |
| `app/api/` | de serverroutes, zie `CLAUDE.md` |
| `src/i18n/` | alle teksten, NL en EN naast elkaar |
| `src/storage/` | bewaarde scans en ingelezen banken achter een interface; nu de browser, later de server |
| `src/worker/` | de zware kant van de scan, weg van de hoofddraad |
| `components/` | UI: upload, vragenlijst, koppelen, validatie, rapport, verkenner, dashboard |
| `kennis/_methode/` | de methode en de promptreeks; de constante kant, niet in code |

---

## Genomen beslissingen

Deze zijn met de opdrachtgever doorgesproken. Niet terugdraaien zonder overleg.

**Het verdienmodel is een dienst (10 september 2026).** Een meting van de
catalogus met een rapport en een gesprek, voor €950 tot €1.500 per winkel. Niet
een scan van €295 in zelfbediening: een webshop-eigenaar koopt geen lijst gaten
maar weten wat hij eerst moet doen, en het gesprek is waar dat gebeurt. De
aanleiding waarop we ze aanspreken: ze weten dat agentic commerce eraan komt,
niet dat hun productdata daardoor zwaarder gaat wegen dan hun productpagina.

**Winkel doormeten is de opening, niet de meting (10 september 2026).** Een
agent leest in de praktijk een productfeed of de gestructureerde data van een
productpagina, en die laatste is het enige wat we zonder de merchant kunnen zien.
Het beheerscherm leest een steekproef van productpagina's (robots.txt en
sitemap, alleen wat de winkel toestaat; een pagina telt pas als product met
`og:type=product`, een Offer of JSON-LD Product), meet die op een gekozen bank
en maakt er een pdf van. Wat de catalogus zegt, meet alleen de catalogus; dit is
het gesprek daarvoor. Afgevallen alternatief: een gratis URL-check voor iedereen
op robots.txt — dat meet iets anders dan de kwaliteit van de data.

**De generatie loopt via de batch-API waar dat kan (11 september 2026).** De
fasen zonder web (consolidatie, basislaag, overlays, facetten) gaan via de
batch-API voor de halve prijs; panel en oogst lopen direct. Promptcaching was
eerst genoemd als grootste besparing en dat klopte niet: het systeemdeel is
~1.200 tokens, onder de minimale cachegrootte. Zie `ONTWERP-vragenbank-keten.md`
paragraaf 3a.

**Een overlay moet drie eigen vragen noemen (11 september 2026).** Het model
geeft een categorie alleen een eigen vragenset als het drie vragen noemt die
nergens anders in de markt gesteld worden. Nul: het wordt een profiel. Eén of
twee: het blijft een overlay met een bevinding. Minder overlays is niet minder
kwaliteit; een overlay zonder eigen vragen geeft zijn producten juist een
dunnere set dan de moedercategorie.

**Overgeslagen vragen blijven in de bank en tellen nergens mee (11 september
2026).** `excludeFromScore` zet ze op `answerable: 'no'`, bij de merchant en bij
winkel doormeten. Weghalen zou advies weggooien dat een merchant kan gebruiken;
laten meetellen zou meten op vragen die een mens heeft afgekeurd.

**Een product wordt gemeten op elke plek waar het hangt (11 september 2026,
scanversie 5.0.0).** Tot dan kreeg een product de vragen van zijn eerste
hoofdcategorie. In de Magento-export van De Groot staan alle categorieën van een
product op alfabet in één cel, dus "eerste" betekende "alfabetisch eerste": 1.371
stoffen werden als decoratiestof gemeten omdat de D vóór de G komt, en de eigen
vragen die de bank voor lampenkapstoffen, tafelkleedstoffen, schaduwdoek en
naaigarens had, werden nooit gesteld. Nu: per tak de diepste categorie met een
eigen vragenset, over takken heen allemaal (een stof die als gordijnstof én als
lampenkapstof verkocht wordt beantwoordt beide lijsten), elke vraag één keer met
het zwaarste gewicht. De rij in het rapport volgt de diepste set. Paden die op
het categoriescherm als kenmerk staan krijgen geen set; een tak die daarna niets
meer draagt ("Motieven") verdwijnt in zijn geheel. Op de testcatalogus met
woontextiel v2: van 5 naar 9 vragensets, 1.523 producten op meer dan één lijst.

**De catalogus is de enige bron.** Eén export, uit het systeem waar de merchant
zijn productkennis werkelijk onderhoudt: zijn PIM of MDM, of anders Magento of
Shopify. Een kanaalfeed is daar een afgeleide van en geeft een dunner beeld van
dezelfde catalogus; bovendien vlakt hij de categorieboom af.

*Dit verving op 4 september de eerdere opzet met feed én catalogus naast elkaar.
Wat daarmee wegviel is het onderscheid mappinggat/verrijkingsgat, dat op twee
bronnen leunde. Daarvoor in de plaats kwam een onderscheid dat uit één bron
volgt en even bruikbaar is: bestaat de kolom en staat hij leeg (`unfilled`,
invulwerk), of kent de catalogus het kenmerk niet (`unmodelled`, modelwerk).*

**Beantwoordbaarheid, geen compleetheid.** Een gat bestaat alleen als er een
vraag door onbeantwoord blijft; elk gat draagt de vragen die het blokkeert. Een
leeg veld waar geen vraag op leunt komt niet in de lijst, en een gevuld veld dat
de vraag niet beantwoordt komt er wél in. Dat is het hele verschil met een
compleetheidscontrole, en het is de reden dat het veldenregister geen tiers meer
kent.

**Vragen komen van de vraagkant.** Alleen uit een vragenbank. Nooit afleiden uit
de kolommen van de merchant: dat hij iets bijhoudt zegt niets over wat een koper
vraagt, en dan meet je of zijn feed zijn eigen velden draagt. De merchant mag
zelf vragen toevoegen — dat is zijn keuze, niet ons voorstel.

**Een vragenbank hoort bij een vertical, niet bij een merchant.** Dit is de
belangrijkste beslissing van 4 september. De verleiding is om per merchant een
bank te laten genereren uit zijn eigen site; dat is het anti-patroon dat de
methode bovenaan zet. Dan bouw je de bank van één winkel inclusief zijn blinde
vlekken, heb je geen frequentiemaat, en zijn twee merchants in dezelfde markt
niet meer vergelijkbaar — terwijl die vergelijking het bestaansrecht van de bank
is. De site van de merchant is één van de vijf panelsites.

**Een bankaanvraag draagt nooit productdata.** Categorienamen met aantallen en
de URL van de merchant, en verder niets — ook geen kolomnamen. Twee eisen
tegelijk: fase 3 van de methode (blinderen: bouw de bank vóórdat je de catalogus
opent) en de belofte dat de catalogus het apparaat niet verlaat. Het type in
`request.ts` kan geen productrijen dragen en `tests/request.test.ts` bewaakt de
afgeleverde tekst.

**Belang weegt mee in de trechter, via een eigen trede.** `kritiek` is niet
"commercieel belangrijk" maar "voorkomt de fout die de koper niet kan
terugdraaien". Daaruit volgt een trede vóór vindbaar: **basisgeschikt** = elke
kritieke vraag beantwoord. Vindbaar blijft daarnaast letterlijk alle gescoorde
vragen. Bewust géén gewogen percentagedrempel: dat verbod staat overeind, zie
hieronder. Het gemiddelde staat op twee schalen — vragen én gewichtspunten
(kritiek 5, hoog 3, middel 2, laag 1).

**Een vraag die geen enkel attribuut kan dragen telt niet mee.** Procesvragen
("kan ik een staal krijgen"), structuurvragen en levenscyclusvragen blijven in de
bank omdat er advies in zit, maar staan in een eigen adviesblok en buiten de
score. Meetellen zou elke merchant op hetzelfde punt laten zakken.

**Vijf toestanden in plaats van twee booleans.** Beantwoordbaar, verborgen (staat
in de catalogus, niet in de feed), onbruikbaar (gevuld maar onder de
woorddrempel), onvolledig (deel van het bewijs aanwezig) en ontbreekt. Elke
toestand wijst naar ander werk — mappen, herschrijven, aanvullen — en op één
hoop gooien levert een lijst op waar niemand mee verder kan.

**Herkomst boven alles.** Een gepubliceerde drempel zonder site komt de app niet
in; dekking zonder panel evenmin; `dekking: 0` (niemand behandelt dit — een
vondst) en niet-onderzochte dekking mogen nooit samenvallen. De meegeleverde
banken dragen daarom géén beslisregels: een verzonnen getal op naam van een site
is erger dan geen getal.

**Categorieën komen uit de catalogus als die er is**, met de feed als terugval.
De feed vlakt de boom af: bij de testmerchant werd `Outdoorstoffen > Gestreept`
tot los "Gestreept" en verdween een hele hoofdcategorie.

**Geen protocollen meer.** ACP en UCP zijn feedspecificaties; zonder feed
hebben ze geen anker. De dubbele trechter, de Selection-checklist en het
checkout-blok zijn eruit. Het veldenregister blijft bestaan als vocabulaire
waarin bewijs wordt uitgedrukt — kolomaliassen en eigenaar per veld — maar
zonder tier en zonder protocolnaam.

**Geen scoredrempels.** Benoemde checklists in plaats van percentages. De enige
uitzondering is het stoplicht, en daar is groen exact gelijk aan vindbaar
(alle vragen beantwoord) zodat het nooit groen staat terwijl de trechter nul zegt.

**Het bankscherm vraagt één ding: je vragenlijst.** Op 7 september teruggebracht
tot één upload. Wat eraf ging: de kaarten met sitepanel, beslisregels en open
punten, de aanvraag om een bank te laten bouwen, het plakvak en de losse
controleknop. Dat waren allemaal uitleg óver de lijst en geen keuze die de
merchant daar maakt; ze stonden in de weg van de enige stap die hij wél moet
zetten. Wat er ná het kiezen bij komt is alleen wat hij nodig heeft om te
beslissen of hij hierop verder wil: vier tellingen (basisvragen, categorieën,
categoriespecifieke vragen, attributen), de blokkerende fouten, en daarna de
waarschuwingen.

*Twee dingen vielen daarmee weg uit de UI. De aanvraag (`src/questions/request.ts`
plus zijn tests) blijft staan — de wachtrij erachter is open werk, zie onder —
maar heeft geen scherm meer. En het veld "adres van je webshop" op de uploadstap
is verdwenen: het bestond alleen om als panelsite in die aanvraag mee te gaan, en
een invoerveld dat stil niets doet is erger dan geen veld.*

**Een vragenlijst mag een tabel zijn.** De promptreeks levert in de praktijk een
CSV op — één regel per vraag, met kolommen voor laag, belang, benodigde
attributen, herweging en toepassingsprofielen. `src/questions/list.ts` leest die
naar hetzelfde model als de YAML. Kolommen worden op alias herkend en niet op
positie, want elke vertical levert een andere lijst; niet-herkende kolommen
worden benoemd in plaats van stilzwijgend genegeerd.

De vertaling van tabel naar model, voor zover die niet vanzelf spreekt:
`laag: standalone` is een overlay die de hele basislaag uitschakelt (naaigaren
heeft geen baanbreedte); `herweging: "gordijnstoffen: kritiek"` op een basisvraag
landt als `reweight` op de overlay van die categorie, en maakt die overlay aan
als de lijst er verder niets over zegt; `telt_mee_in_score: nee` zet
`answerable: 'no'`; zonder kolom `modus` vraagt elke vraag ál zijn attributen.

**De modus van een vraag volgt zijn beslisregel.** Staat er een beslisregel bij,
dan zijn álle genoemde attributen nodig; staat er geen, dan volstaat er één. Dat
is geen smaak maar navolging van wat een agent met dezelfde vraag doet. Zonder
regel antwoordt een agent met wat hij heeft — "is deze stof duurzaam
geproduceerd?" wordt beantwoord uit het OEKO-TEX-keurmerk, ook als het
gerecycled-percentage leeg is, en `garendikte_tex` naast `garendikte_nm` zijn
twee eenheden voor hetzelfde getal. Mét een regel wordt er gerekend, en een som
heeft al zijn termen nodig: een meterage uit een halve invoer is niet onzeker
maar fout, en bij stof die op maat geknipt wordt is een verkeerd getal erger dan
geen getal. Deels bewijs valt dan in de bestaande toestand *onvolledig*. Een
kolom `modus` gaat altijd voor.

**Vragenlijsten komen vanaf nu in het Engels.** De kolomnamen, de waarden van
`layer`, `importance`, `intent`, `answer_type` en `source`: alles wordt op alias
herkend en niet op positie. De attribuutnamen in die lijsten zijn nog wel
Nederlands, en de vertaalslag naar de kolommen is een apart probleem (hieronder).
Dat een lijst eentalig is, is geen waarschuwing meer — het is de normale vorm.

**Een ingelezen vragenlijst blijft de lat, ook als hij nergens op matcht.**
`bankFor` viel terug op een meegeleverde bank zodra de categorienamen van de
lijst niet op de boom van de merchant uitkwamen. Bij een Engelse lijst op een
Nederlandse catalogus is dat het normale geval, en stil terugvallen betekent dat
de merchant een rapport krijgt langs een lat die hij niet aanleverde. Nu wint de
ingelezen lijst altijd; matcht geen overlay, dan draagt de set alleen de
basislaag en zegt `categoriesWithoutOverlay` dat hardop op het vragensetscherm.
De uitweg staat erbij: zet je eigen categorienamen in `geldt_voor` naast de
namen die er al staan — daar wordt ook op gematcht.

**Terracotta accent, gebroken wit vlak, en minder tekst.** Op 7 september is het
accent van groen naar terracotta gegaan en is het paginavlak warmer gebroken wit
geworden; alle combinaties zijn opnieuw nagerekend (laagste 4,67). Daarbij kwam
een bestaande toegankelijkheidsfout boven water: elke primaire knop had witte
tekst op het accent, en in de donkere stand haalde dat 1,9:1. Daar is een token
voor — `accent-ink` — en `text-white` komt in geen enkel component meer voor.

Tegelijk is er ruim door de teksten heen gesnoeid: 41 ongebruikte sleutels weg
(restanten van de ACP/UCP-tijd zoals `noBlend` en `perProtocol`), en de rest
teruggebracht tot wat een merchant moet lezen om te kunnen handelen. Twee
feitelijke fouten zaten daar tussen: de FAQ noemde nog een grens van 20 MB
terwijl die op 50 staat, en het rapport zei bij een zelf aangeleverde lijst dat
er "vakkennis zonder sitepanel" gemeten was — dat is de terugval, niet hun eigen
lijst.

**Claude Haiku 4.5 achter `/api/mapping`, en dat is een andere orde.** Op
7 september is de eerste serverroute van deze app erbij gekomen. Gemeten op
dezelfde acht kenmerken: het browsermodel kwam op 1 van de 5 voorstellen goed,
Haiku 4.5 op **6 van de 6** — en liet `certificeringen` en `rafelgevoelig`
terecht weg, want daar is geen kolom voor. Op het volledige scherm ging de
koppeling van 2 naar 11 van de 34.

De volgorde is: Claude eerst, browsermodel als er geen sleutel is (503), en het
scherm zegt welke van de twee het deed. Wat de deur uit gaat zijn kenmerknamen,
kolomnamen en een paar voorbeeldwaarden per kolom — die waarden zijn nodig
(`gordijn_dichtheid` is zonder "dicht, transparant" niet te plaatsen) maar het ís
productdata, en dat staat op het scherm. Nooit een productrij, prijs of aantal.

Het antwoord komt als tekst terug en gaat door `parseMappingAnswer`, die elke
kolomnaam tegen de catalogus van déze merchant controleert: een verzonnen kolom
is een fout en geen koppeling die nooit iets vindt. De waarschuwing "één kolom
aan drie of meer kenmerken" staat nu in beeld — Haiku hing er vier aan
`wasvoorschrift`, wat kán kloppen bij een vrij onderhoudsveld maar ook de manier
is waarop een cijfer omhoog kruipt zonder dat er een vraag meer beantwoord wordt.

*De sleutel staat in `.env.local` (gitignored) en op Render als `sync: false`.
Een sleutel zonder workspace moet `ANTHROPIC_WORKSPACE_ID` als header meesturen;
de route doet dat als de variabele er is.*

**Het aggregatieniveau volgt de vragen, niet de categorieboom.** Een rij
`Gordijnstoffen › Effen` die exact dezelfde 56 vragen meet als `Gordijnstoffen`
is geen tweede meting maar dezelfde meting op minder producten, en suggereert
een onderscheid dat de vragenlijst niet maakt. Een subcategorie krijgt daarom
alleen een eigen niveau als `overlayFor` er een ándere vragenset voor vindt
(`QuestionSet.distinguishes`). Heeft de catalogus wél subcategorieën en de lijst
niet, dan staat dat als zin onder de kaart — anders lijkt een ontbrekend niveau
een gebrek in de app in plaats van een eigenschap van de lijst. De toepassings-
profielen (`critical_in_profiles`: verduisterend, kamerhoog, banengordijn) zijn
de plek waar dat niveau vandaan komt zodra we per profiel gaan meten.

**Algemene vragen worden één keer bevestigd, categorie-eigen per categorie.**
Vier keer dezelfde 34 vragen voorleggen levert vier keer hetzelfde oordeel op, en
wie dat moet doen leest de vierde keer niet meer. `baseValidated` staat naast
`QuestionSet.validated`; een categorie zonder eigen vragen vraagt niet om een
tweede bevestiging. Een algemene vraag bewerken of uitzetten werkt meteen op élke
categorie — anders meten twee categorieën verschillende dingen onder hetzelfde
id. Herwegingen verdwijnen niet: ze staan als aantekening onder de ene rij
("weegt zwaarder in Gordijnstoffen").

**De koppeling wordt bewaard bij de vragenlijst.** `StoredBank.mapping` en
`StoredBank.categories`, bij elke wijziging weggeschreven. Alleen namen —
kenmerksleutel, kolomnaam, categorienaam — dus de belofte dat de catalogus het
apparaat niet verlaat blijft overeind. Een nieuwe lijst wist de categoriekeuzes
(die wijzen naar sets die er niet meer zijn) en houdt de kenmerkkoppeling (die
hangt aan kolomnamen, en die zijn niet veranderd).

**Categoriekoppeling gebeurt vanzelf, niet na een klik.** Stond hij achter de
knop, dan kreeg elke categorie stilzwijgend alleen de algemene vragen zodra
iemand die knop niet indrukte — en dan valt het cijfer te gunstig uit. Claude
legt de vier categorieën van de testmerchant goed; het browsermodel haalt er 2
van de 4 (Decoratiestoffen en Outdoorstoffen, waar een verwant woord bestaat) en
laat de rest los in plaats van te gokken.

**Wat het model kost en duurt, gemeten op de echte catalogus.** Het lokale werk
is verwaarloosbaar: 182 ms voor intake plus vragensets over 3.552 producten, 0 ms
voor het samenstellen van de opdracht. Die opdracht is 78 kenmerknamen tegen 56
kolomnamen en groeit niet mee met het aantal producten — een merchant met
350.000 producten stuurt exact evenveel als een met 60.

| | tijd |
|---|---|
| Claude via `/api/mapping` | 2,6 s |
| Browsermodel, gecachet | 0,5 s laden + 2,2 s rekenen |
| Browsermodel, eerste keer | 113 MB downloaden |

Kosten: 4.563 invoertokens, ~100 uitvoertokens, ~$0,005 per aanroep. Twee
aanroepen per keer (categorieën, dan kenmerken) is **ongeveer een dollarcent per
scan**, of $10 per duizend scans. Ter vergelijking: de afgewezen richting — een
model per SKU — was $450 per catalogus.

*Twee dingen die daarbij bleken. De strenge opdracht ("laat weg wat je niet zeker
weet") maakt hem vier keer sneller én vijf keer goedkoper dan een slappe: 100
uitvoertokens tegen 1.162. En meer rekenkernen aanzetten voor het browsermodel
levert niets op — het rekenen is 2,2 van de 60 seconden, en het zou wel kosten
dat twee machines een ander voorstel geven.*

**Een taalmodel in de browser, en wat het echt oplevert.** Op 7 september is
`src/semantic/` erbij gekomen: een embeddingmodel (`Xenova/multilingual-e5-small`,
~120 MB, gekwantiseerd, via transformers.js van een CDN) dat in de browser van
de merchant kolomnamen én hun waarden vergelijkt met de kenmerken uit zijn
vragenlijst. Bewust embeddings en geen genererend model: de vraag is "welke
kolom betekent hetzelfde als dit kenmerk", en dat is naaste-buur zoeken.

Twee dingen bleken bij het meten dragend:

*Centreren is niet optioneel.* Alle namen in een stoffencatalogus gaan over
stof, dus alle vectoren wijzen dezelfde kant op — gemeten lagen álle
gelijkenissen tussen 0,81 en 0,86, en een algemene kolom als `main_purpose` won
het van de juiste. De centroïde eraf trekken bracht dat van vier op zes goed
naar vijf op vijf.

*Wederzijds beste match is de enige filter die werkt.* Zonder hem krijgt élk
kenmerk een voorstel, ook de tientallen waar niets bij past: 4 goed tegen 7 fout.
Mét: 4 goed tegen 1 fout, zonder een juiste te verliezen. Een z-score-drempel
voegde niets toe (4 goed tegen 6 fout) en is niet gebouwd.

**Maar op het volledige scherm is de kwaliteit mager, en dat staat er ook.** Met
34 concurrerende basiskenmerken tegen 16 kolommen kwam het uit op vijf
voorstellen waarvan er één klopte. In de geïsoleerde test was het beter, en het
verschil is precies de concurrentie: een verkeerd kenmerk kaapt de kolom van het
juiste. Een klein gekwantiseerd model op korte veldnamen is nu eenmaal een zwak
signaal. Het scherm zegt daarom hardop "reken op een eerste gok, ongeveer een op
de vijf", en elk voorstel staat gemarkeerd tot de merchant het laat staan.

*Wil dit echt agent-waardig worden, dan is een serverzijdige aanroep naar een
groot model de weg — dezelfde opdracht die in `src/spec/mapping.ts` al staat.
Dan gaan er nog steeds alleen namen de deur uit, en de kwaliteit is een andere
orde. Dat wacht op dezelfde backend als de accounts.*

**De koppeling van kenmerk naar kolom is een eigen stap geworden.** De keten is
nu: data aanleveren → vragenlijst → **kenmerken koppelen** → vragensets → rapport.
Dat scherm bestaat omdat de mappinglaag de grootste blokkade was en niemand hem
kon oplossen: de app zei wél dat 79 attributen nergens op uitkwamen, maar bood
geen enkele manier om er iets aan te doen.

Twee wegen op het scherm: schrijfwijze en generieke taal doet `spec/match.ts`
gratis en offline, en de merchant wijst de rest zelf aan. Het scherm zegt er
eerlijk bij dat een AI-agent die zijn catalogus leest deze koppeling niet nodig
heeft — die snapt `rol_breedte` zelf — en dat wij hem wél nodig hebben omdat de
scan zonder taalmodel rekent.

*De knip-en-plak-opdracht voor een agent is er op 7 september weer uitgehaald.
Hij was een omweg om een ontbrekende serverroute, en die omweg werd het handwerk
van de merchant — die staat dan een markdownblok te kopiëren omdat wij geen
backend hebben. `src/spec/mapping.ts` blijft staan, getest en al: zodra er een
serverroute is, wordt dit één knop die de aanroep zelf doet.* "Geen kolom" is een geldig antwoord — dan legt de catalogus dit
kenmerk niet vast, en dát is de bevinding. Een koppeling naar een niet-bestaande
kolom is een fout en geen waarschuwing: die zou nooit iets vinden en het gat zou
stil blijven staan.

**Een model mag op precies één plek, en het is niet de scan.** Dit is een
uitzondering op "geen model" die op 7 september bewust is gemaakt, nadat de
meting liet zien dat de laatste ~8 koppelbare kenmerken állemaal betekenis
vragen en geen spelling: `rapport_hoogte_cm` ↔ `patroon_hoogte` (vakterm),
`vezelsamenstelling` ↔ `material` (hyponiem), `lichtdoorlatendheid` ↔
`gordijn_dichtheid` (omgekeerd begrip), `geschikt_voor_toepassing` ↔
`main_purpose` (parafrase, nul letters gemeen). Geen stringtruc haalt die.

De afgewezen richting hieronder ging over iets anders: een model over 3.552
producten, ~$450 per catalogus. Dit is één opdracht over een schema — 99
kenmerknamen tegen 53 kolomnamen — en de drie voorwaarden die eraan hangen zijn
niet onderhandelbaar: het model raakt geen SKU, het draait één keer per catalogus
en niet per product, en de uitkomst is een tabel die de merchant bevestigt en
geen oordeel. De opdracht gaat knip-en-plak de deur uit; er is geen serverroute
en geen sleutel in de browser. De scan zelf blijft model-vrij en deterministisch.

**Kleur heeft één betekenis, en die staat in `DESIGN.md`.** Elk scherm koos
zijn eigen toon voor hetzelfde ding: basisgeschikt stond amber, een
categorielabel accent, herkomst accent. Daar zit geen regel achter, alleen de
vraag hoe belangrijk de bouwer dat onderdeel op dat moment vond. De regel is nu:
`ok` is gehaald, `warn` is werk dat er ligt, `danger` blokkeert, `accent` is de
handeling die je van iemand wilt, `neutral` oordeelt niet. Daaruit volgt dat
basisgeschikt groen is *ook als het nul is* — het is een prestatie en geen
waarschuwing, en de lengte van de balk zegt al hoe ver je bent. Amber zeggen
omdat een getal laag is, maakt van de meting een mening.

**Bevestigen van een vragenset is terugdraaibaar** en verhoogt de versie niet;
het is een oordeel over de set, geen wijziging eraan.

**Elke scan draagt twee versienummers**: spec-snapshot en vragenset-versie.
Zonder allebei is vergelijken over tijd betekenisloos.

## Bewust afgevallen

Niet opnieuw voorstellen zonder dat er iets veranderd is.

| Richting | Waarom afgevallen |
|---|---|
| LLM-laag in de scan | ~$450 modelkosten per catalogus van 3.500 producten; geen basis voor een productfunctie. Harnas is verwijderd. Blijft staan: het model raakt nooit een SKU. Wat hier expliciet buiten valt en op 7 september wél gebouwd is: het koppelen van kenmerk aan kolom. Dat is één opdracht over een schema, niet per product, en de uitkomst is een tabel die de merchant bevestigt. Zie de beslissing hierboven. |
| Bank genereren per merchant-upload | Levert de bank van één winkel op, inclusief zijn blinde vlekken, zonder frequentiemaat en zonder domeinreview. Twee merchants in dezelfde markt zijn dan niet meer vergelijkbaar. De aanvraag hangt daarom aan de vertical. |
| Vindbaar op een gewogen drempel ("80 van de 100 punten") | Introduceert precies de scoredrempel die hieronder bewust is afgewezen. Het gewicht krijgt een eigen trede in plaats van een grens. |
| Proza als antwoordbron (attributen uit titel/omschrijving halen) | De opdrachtgever koos voor attributen als enige bron. Onderbouwing staat in Drive, map *Bespreken met Google*. |
| Website scrapen voor categorieën | Onnodig — de catalogusexport heeft de echte boom. Zou bovendien een serverroute vereisen; de analyse draait nu volledig client-side. |
| De kanaalfeed als analysebron | Een feed is een afgeleide van de catalogus: dunner, en met een afgevlakte categorieboom. Op de echte data verdween er een hoofdcategorie in en werd "Outdoorstoffen > Gestreept" tot los "Gestreept". Los je het in de catalogus op, dan is elk kanaal daarna een instelling. |
| Titel gebruiken om andere vragen te beantwoorden | Titel is retrieval, geen filtering. En de grens naar "dan de omschrijving ook" is niet te verdedigen. |
| De generatie als agent, in een cloud-routine of in Cowork | Een agent die elk kwartier wakker wordt om te concluderen dat de wachtrij leeg is, kost ~96 sessies per dag aan niets. En een agentische generatie kan niet hervatten: valt hij om bij site vier, dan begint hij bij nul. De methode ís een vaste reeks, dus hem als reeks draaien geeft hervatten, een prijs per stap en een model per fase. Pollen hoort goedkoop te zijn en werken duur; die twee in één ding stoppen was de fout. |
| Een eigen agentlus op Render die de bank zelf schrijft | Dat is dezelfde pijplijn plus onderhoud: een gereedschapslus, herhalingen, en hetzelfde hervattingsprobleem opnieuw oplossen. De fasenreeks doet het met minder code en met de tussenstand in de database. |

---

## Open

**De generatie hangt aan een laptop** — 11 september. De geplande taak staat in
`render.yaml` (`vragenbank-generator`, `starter`-plan), maar cron zit niet in het
gratis plan en hij is voor zover bekend nooit aangemaakt. De reeks wordt nu
aangestuurd door een lus in een terminal die elke minuut `POST /api/bank-run`
doet. Slaapt de laptop, dan staat de reeks stil. Oplossing: de taak in Render
aanzetten (betaald; `APP_URL` en `BANK_EXECUTOR_KEY` in het dashboard), of een
geplande GitHub Action met dezelfde twee als secret.

**Wat een markt kost** — woontextiel v2 ging volledig direct: rond de zeven
dollar. v3 is de eerste via de batchroute; verwacht ongeveer de helft. Het echte
getal staat per run in `bank_runs` (`input_tokens`, `output_tokens`). Let op bij
het lezen: de eerste batchrun telde door een fout het antwoord van de
consolidatie twaalf keer mee; de tellers zijn daarna met de hand gecorrigeerd.

**De mail** — `notified_at` staat klaar, een mailprovider niet. Het wachtscherm
belooft een bericht dat nu niet komt.

**De indeling reist niet mee naar de merchant** — 11 september. Welke categorie
een profiel is van welke overlay ("Windscherm" bij "Schaduwdoek") staat in
`question_banks.grouping` maar niet in de tabel die de merchant krijgt. Een
profiel valt daardoor onder zijn plek in de boom, niet onder zijn overlay. Veilige
variant om te bouwen: een profiel krijgt de vragen van zijn overlay alleen als
het in de catalogus ook onder die overlay hangt, of als de categorie erboven zelf
geen eigen vragen heeft. Blind volgen gaat mis: de bank zette "Kussens" onder
Decoratiestoffen, en bij De Groot hangt Kussens onder Meubelstoffen.

**Subcategorieën landen alleen op de volle naam** — 11 september. Een
subcategorie krijgt automatisch een eigen vragenset als de bank precies die naam
kent (spaties en koppeltekens daargelaten). Voor de winkel waarvoor de bank
gemaakt is klopt dat altijd; een tweede winkel die "Lampenkap stof" schrijft
waar de bank "Lampenkapstoffen" heeft, krijgt geen eigen set. Op hoofdniveau kan
de merchant zelf een set kiezen, op subniveau nog niet.

**Een vraag zonder kenmerken is niet te redden op het beoordeelscherm** — de
beheerder kan hem alleen overslaan. Vaak is het een goede vraag waar het model
de kenmerken bij vergat ("Hoeveel meter heb ik nodig voor mijn fauteuil?", MEU-02,
kritiek). Kenmerken en een beslisregel kunnen toevoegen op het beoordeelscherm
zou die vragen redden in plaats van ze weg te gooien.

**Dekking is een telling van het model** — "komt voor op 3 van de onderzochte
sites" wordt niet nagerekend. Elke gevonden vraag draagt het adres van de pagina,
maar dat staat niet op het beoordeelscherm en niemand controleert of de vraag er
staat. Handmatig nagelopen op v3: getal en genoemde sites kloppen overal, geen
verzonnen sites, een onleesbare site telt nergens mee. Te bouwen: adressen tonen,
en de app laten natellen.

**De scan weegt niet per toepassingsprofiel** — 9 september. De app stuurt elke
categorie die de merchant bevestigde mee in de aanvraag, en dat zijn er bij De
Groot 29. Het merendeel is geen marktsegment maar een toepassing binnen een
segment: banken, eetkamerstoelen en poefs stellen dezelfde vragen als
meubelstoffen, met een andere drempel. De uitvoerder groepeert ze nu zelf
(`plugin/vragenbank/skills/`, stap 2b) en legt ze vast in
`toepassingsprofielen_kritiek`. De lezer neemt die kolom over, maar `evaluate`
doet er niets mee, dus geen enkel profiel verschuift een score en de strengste
drempel van de groep blijft gelden voor de hele groep. Twee dingen ontbreken:
een drempel per profiel in het model (nu staat hij in `toelichting`, als tekst),
en een manier om een product aan zijn profiel te koppelen. Dat laatste is het
lastige — de catalogus zegt zelden waarvoor een stof bedoeld is.

**Beslisregels uitvoeren** — een regel wordt nu getoond en niet gerekend. "Is
deze stof sterk genoeg voor mijn bank" vraagt eigenlijk Martindale ≥ drempel, niet
alleen of het veld gevuld is. Dat vereist waarden parsen uit `attr:`-kolommen
(getal plus eenheid) en per toepassingsprofiel een drempel. Het model draagt de
regels en de profielen al; alleen de uitvoering ontbreekt. Doe dit pas als er een
bank met gepubliceerde drempels ligt — anders reken je met verzonnen getallen.

**Mappinglaag bij een ingelezen bank** — de grootste openstaande blokkade, en op
7 september van theorie naar meting gegaan. De echte lijst voor interieurstoffen
leest nu foutloos in — als tabel 34 basisvragen, 5 overlays, 95 categorievragen
en 99 attributen — maar geen van die attributen draagt een `velden:`-koppeling. De bank benoemt ze in het
Nederlands (`rolbreedte_cm`, `vezelsamenstelling`, `gewicht_gm2`) en de
Magento-export in het Engels (`fabric_width`, `composition_info`,
`weight_per_m2`). Geen enkele gok overbrugt dat, en het resultaat is een rapport
van 0 van de 52 vragen op een catalogus die de antwoorden gewoon bevat.

De app zegt dat nu hardop: `QuestionSetState.blindAttributes` telt de attributen
die op geen enkele kolom uitkomen, en dat staat als waarschuwing bovenaan het
rapport. Dat voorkomt de verkeerde conclusie, maar lost hem niet op.

*Sinds 7 september ligt er een eerste laag: `src/spec/match.ts` legt de
attributen van de bank op de échte kolommen van de catalogus, met
`src/spec/lexicon.ts` als woordenlijst. Drie trappen, oplopend in gewaagdheid —
schrijfwijze (`rolbreedte_cm` = `rol_breedte`), taal (`gewicht` = `weight`), en
woordvergelijking. De grens ligt bewust streng: élk woord van het attribuut moet
terugkomen in de kolom. Zonder die eis koppelde de matcher `staal_beschikbaar`
aan `availability` en `kwaliteit_id` aan `id`, en dán verdwijnt er een gat dat er
wél is. Dat is de enige fout die dit product niet mag maken; een gemiste
koppeling toont hooguit een gat dat er niet is, en dat ziet een merchant meteen.
Op de echte data: 3 koppelingen, 0 verkeerd, en de trechter van 0,0 naar 2,4 van
de 52 vragen. De rest is vaktaal (`vezelsamenstelling` ↔ `material`,
`rapport_hoogte_cm` ↔ `patroon_hoogte`) en die hoort niet in de motor maar bij de
markt: daarvoor is er een kolom `synoniemen` in de vragenlijst. Wat de app zelf
koppelt staat als controleerbare lijst op het vragensetscherm.*

*Beide wegen liggen er nu: het koppelscherm (stap 3) met de agent-opdracht als
versneller, en `applyMapping` dat het resultaat in dezelfde vorm op de bank legt
als een `velden:`-lijst uit de YAML. De koppeling wordt bewaard bij de bank in
`BankStore`, samen met de keuze van vragenset per categorie.*

*Op 8 september begint het koppelen vanzelf, zodra het scherm er is. Een
merchant hoorde niet te moeten weten dát er een knop bestond voordat zijn scan
klopte: wie doorklikte kreeg een cijfer dat te laag was, met tientallen
kenmerken ongekoppeld terwijl het antwoord in zijn data stond. Het loopt in twee
fases en dat is een afhankelijkheid, geen voorkeur — eerst de categorieën, dan
pas de kenmerken, want een andere vragenset vraagt andere kenmerken. Tegelijk
laten lopen liet twee stromen allebei hun eigen kijk op de staat terugschrijven
en won de laatste; de categoriekoppeling verdween dan zonder spoor. De knop
blijft over als "opnieuw proberen", want een mislukte modeldownload mag geen
reden zijn om de rest met de hand te koppelen.*

*De marge voor categorievoorstellen staat sindsdien apart en strenger
(`MIN_MARGIN_CATEGORIES`, 0,15). Gemeten op de vier categorieën van de
testmerchant: de twee juiste hadden 0,248 en 0,442, de twee onjuiste 0,024 en
0,087. Vier punten is weinig om op te ijken, maar de kant waarop je fout mag
zitten is duidelijk — een verkeerd gekoppeld kenmerk kost één klik, een verkeerd
gekoppelde categorie zet de verkeerde vragenset op alles wat eronder hangt.*

**Prijzen op de site** — het model staat (zie de beslissing van 10 september),
maar de prijzenpagina draagt nog een zichtbare TODO. Hetzelfde geldt voor wie er
achter de scan zit op de over-pagina.

**Mechanisme per veld** — de grootste. Leg per veld vast of het om *filtering*,
*vergelijking* of *begrip* gaat. Alleen bij de eerste twee is er een mechanisme
dat aan een klant uit te leggen is; begrip is een aanname en hoort buiten de
trechter, in een eigen blok (besloten: optie B). Ontworpen, nooit gebouwd.
Vraagt geen model. Volgende stap: classificatie van alle 51 velden mét motivering
per veld, ter review.

**Stoplicht** — gemerged (PR #5). Bij te stellen: de grens rood/oranje (nu op de
helft), de teksten, en of de labels de meting noemen of een oordeel.

**Papa Parse** — het bouwplan schrijft streamend parsen voor. De eigen parser
haalt de randgevallen (BOM, puntkomma, quotes met scheidingstekens en newlines,
CRLF, rafelige regels) en staat onder test, maar leest het hele bestand in het
geheugen. Gemeten in de browser: 27 MB met 160.000 producten gaat goed in de
worker, zonder dat de hoofddraad ook maar één tik mist.

De grens stond op 20 MB en is op 7 september naar 50 gegaan. Reden: toen de
invoer een kanaalfeed was, was 20 MB een uitzondering. Een catalogusexport draagt
élke kolom die het PIM kent — bij deze merchant 157 kolommen tegen 34 in de feed
— en is daarmee structureel groter. Hun Magento-export is 20 MB en de
samengevoegde catalogus 27 MB, dus de oude grens blokkeerde het normale geval in
plaats van de uitzondering. Die 20 MB-export scant in 1,4 seconde. De
waarschuwing met de uitweg blijft staan voor wat daarboven komt, want dáár is
niets gemeten. Streamend lezen wordt pas een echte vraag als 50 MB knelt of als
het serverzijdig moet.

**Echte kwaliteitscontroles** — nu een woordentelling op titel en omschrijving
en de GTIN-checksum. Kandidaten: schijn-volledigheid (veld overal dezelfde
waarde), ontbrekende eenheden, en enum-controle op availability en condition.

**Herkomst op het rapport** — een rapport noemt zijn spec-snapshot en
vragensetversie, maar niet de bestanden waarop het draaide. Dat maakte het
verschil hieronder onnodig lang onverklaarbaar; `Dataset.filename` ligt al klaar
in `report.sources`, het staat alleen niet in het stempelblok van `ReportView`.

**Serverzijdige scan** — voor bestanden boven de 50 MB. Vereist objectopslag met
een signed URL en een achtergrondtaak; dezelfde motor, andere aanroeper.

**Delen van een rapport** — `/rapport/[id]` bestaat nog niet echt: een deelbaar
adres vereist opslag, en opslag betekent dat productdata ons systeem in gaat.
Snapshots lossen dat deels op — daar zit geen productdata in — maar een gedeeld
adres vereist nog steeds authenticatie. Tot die tijd is afdrukken naar pdf de
deelweg, en die verlaat het apparaat niet.

---

## Tests

`npm test` draait `node --test` op een esbuild-bundel; geen browser nodig. Wat de
suite bewaakt: de randgevallen van de intake, de beloftes van de motor (vindbaar
is alles-of-niets, verrijkbaar vereist een catalogus, geen categorie betekent
geteld maar niet gescoord), determinisme, en dat de motor puur blijft — die
laatste test scant de bron op `new Date()`, `Date.now()`, `Math.random()`,
`fetch` en `node:`-imports.

De tests vonden twee echte fouten die niemand had gezien:

- **Scheidingstekendetectie telde binnen aanhalingstekens.** Een puntkomma-feed
  met een komma in een kolomnaam viel als één kolom uit de parser.
- **De XML-fallback leverde lege rijen.** De blokregex matchte `<item>…</item>`
  in zijn geheel, sloeg die over als gelijknamig, en kwam nooit bij de
  kindknopen. Alleen zichtbaar buiten de browser, want daar draait de DOMParser.

Beide gerepareerd. De uitkomst op de echte feed is ongewijzigd — 3.557 producten,
zes categorieën, gemiddeld 5,3 tot 5,5 — dus `SCAN_VERSION` bleef toen op 1.0.0.

Sinds 7 september staat `SCAN_VERSION` op **4.0.0**: de modus volgt nu de
beslisregel en de attributen worden op de kolommen van de catalogus gelegd. Beide
verschuiven de uitkomst op ongewijzigde data omhoog, en zonder die versiesprong
zou dat op vooruitgang lijken.

Daarvoor stond hij op **2.0.0**. Het gemiddelde beweegt van
"van de 12" naar "van de 14" doordat woontextiel er twee vragen bij kreeg die de
onomkeerbare fout raken: de meterage (baanbreedte én patroonrapport) en de
schuurweerstand. Het aantal beantwoorde vragen blijft 5,4 — er is niets aan de
data veranderd, alleen aan wat er gevraagd wordt. Precies waarom die versiesprong
er moet zijn.

## Testdata

De opdrachtgever leverde echte data van een stoffenwinkel:

```
~/Documents/Productdata De Groot Stoffen/merged_feed.json   3.552 producten (Magento)
```

De Channable-feeds in dezelfde map zijn sinds 4 september niet meer de invoer van
de scan. Ze blijven bruikbaar om te laten zien wat een kanaalfeed van een
catalogus overhoudt: de feed geeft zes categorieën in plaats van vier, doordat
"Outdoorstoffen > Gestreept" onderweg tot los "Gestreept" wordt en er losse
enkelvouden als "Decoratiestof" naast de echte categorie komen te staan.

Verwachte uitkomst op `merged_feed.json` (regressiecontrole):

- 3.552 producten, 4 vragensets: Meubelstoffen 2.198, Gordijnstoffen 878,
  Decoratiestoffen 302, Outdoorstoffen 153
- 21 producten zonder categorie
- Trechter 3.552 → 0 basisgeschikt → 0 volledig, gemiddeld ~5,5 van de 14
  vragen en ~13,2 van de 41 gewichtspunten
- Modelwerk (geen kolom in de export): patroonrapport, toepassing,
  lichtdoorlatendheid, keuringen, schuurweerstand, onderhoud — elk bij 3.531
  producten. Dit is de kern van hun opgave: zes kenmerken die het datamodel niet
  kent, en waar de vragenbank vijf kritieke vragen op laat leunen.
- Invulwerk (kolom bestaat, staat leeg): merk 2.777, titel 2.383, gewicht 2.238,
  samenstelling 640, baanbreedte 608

Draaien — het tweede argument mag een tabel of de YAML zijn, `scan-cli` kiest
net als de app op inhoud:

```
npx esbuild scripts/scan-cli.ts --bundle --platform=node --format=esm --outfile=/tmp/scan-cli.mjs
node --max-old-space-size=4096 /tmp/scan-cli.mjs <catalogus> [vragenlijst.csv|vragenbank.yaml]
```

Met de echte vragenlijst voor interieurstoffen erbij is de uitkomst 0 van de 52
vragen op 3.552 producten. Dat is niet de catalogus maar de mappinglaag: de lijst
schrijft `rolbreedte_cm` en de Magento-export `fabric_width`. Zie het open punt
hierboven; de app zegt het zelf ook, bovenaan het rapport.

## Achtergrond

De ontwerprationale en de veldreferenties staan in Google Drive, map
*Product Catalog Readiness Scan*. De bevindingen op deze merchant plus de open
vragen voor Google staan in de map *Bespreken met Google*.
