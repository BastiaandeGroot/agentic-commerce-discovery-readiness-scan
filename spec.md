# Wat dit product is

Dit document beantwoordt één vraag: *wat bouwen we, voor wie, en waarom?*
Techniek staat er alleen in voor zover die uit die vraag volgt.

- Hoe het gebouwd is → `CLAUDE.md` (regels) en `NOTES.md` (stand en beslissingen)
- Hoe het eruitziet → `DESIGN.md`

Laatst bijgewerkt: 11 september 2026.

---

## Het probleem

Agentic commerce komt eraan: koopassistenten die namens een consument producten
zoeken, vergelijken en uitkiezen. De verwachting is dat dit in Nederland rond
2027 realiteit wordt. Zo'n assistent kiest niet op basis van een mooie
productpagina, maar op basis van **productdata die zijn vraag kan beantwoorden**.

MKB-webshops — gebouwd op Shopify, Magento of een ander platform — zijn daar
vrijwel zeker niet klaar voor. Niet omdat ze slecht werk leveren, maar omdat hun
productdata is ingericht op een mens die een pagina leest, niet op een agent die
een vraag stelt. Het probleem is bovendien onzichtbaar: je merkt pas dat je niet
gevonden wordt als het al gebeurt, en dan is er geen foutmelding die zegt waarom.

**Het moment waarop iemand vastloopt:** een webshop-eigenaar hoort dat agentic
commerce eraan komt, wil weten of hij klaar is, en heeft geen enkele manier om
dat vast te stellen. Hij kan niet zien welke vragen zijn data wél en niet kan
beantwoorden, en dus ook niet wat hij zou moeten aanvullen.

## Voor wie

Eigenaren en e-commercemanagers van MKB-webshops in Nederland, met een catalogus
van honderden tot tienduizenden producten. Geen developers: ze kunnen een export
uit hun systeem trekken, maar ze schrijven geen code en lezen geen JSON.

**Bouwstatus:** dit wordt een product voor **betalende gebruikers**. Geen
intern gereedschap en geen opdracht voor één klant. Dat betekent dat accounts,
opslag en betaling erbij horen — zie *Wat er nog moet gebeuren*.

## Wat de app doet

De merchant levert één catalogusexport aan. De app meet daarop of de
**consumentenvragen uit zijn markt** te beantwoorden zijn uit die data, en laat
zien welke data ontbreekt om ze alsnog te kunnen beantwoorden.

Vier eigenschappen die het product definiëren. Geen daarvan is een detail:

**Beantwoordbaarheid, geen compleetheid.** Een leeg veld is geen bevinding. Een
bevinding is een vraag die onbeantwoord blijft. Een gevuld veld dat de vraag niet
beantwoordt telt wél mee. Dat onderscheid is het hele verschil met de
data-kwaliteitstools die er al zijn.

**De vragen komen van de vraagkant.** Uit een vragenbank per markt, samengesteld
uit meerdere bronnen — nooit afgeleid uit de kolommen van de merchant zelf. Dat
hij iets bijhoudt zegt niets over wat een koper vraagt.

**De catalogus verlaat het apparaat niet.** De hele analyse draait in de browser.
De enige uitzondering is het koppelscherm, dat kenmerknamen en kolomnamen naar
een model stuurt — nooit een productrij, prijs of aantal. Het scherm zegt dat.

**De uitkomst is reproduceerbaar.** Geen model in de scan zelf: dezelfde
catalogus geeft altijd hetzelfde rapport, en een scan kost niets. Elk rapport
draagt zijn versienummers, zodat twee metingen over tijd te vergelijken zijn.

## Hoe we er geld mee verdienen

Besloten op 10 september: **een dienst, geen zelfbedieningsabonnement.** Een
meting van de catalogus met een rapport en een gesprek, voor **€950 tot €1.500**
per winkel. Het gesprek is geen toegift maar het product: een webshop-eigenaar
koopt geen lijst met gaten, hij koopt weten wat hij eerst moet doen.

De aanleiding die we gebruiken: veel ondernemers weten dat agentic commerce
eraan komt, maar niet dat de kwaliteit van hun productdata daardoor zwaarder
gaat wegen dan hun productpagina. Die kloof maken we zichtbaar vóórdat er een
catalogus op tafel ligt, met **winkel doormeten** (zie hieronder): een meting van
buitenaf op de gestructureerde data van zijn productpagina's, als pdf die hij
kan lezen. Dat is de opening van het gesprek, niet de meting zelf — die gaat
altijd over zijn catalogus.

## Wat er werkt

De keten staat en draait live: catalogus aanleveren → categorieën bevestigen →
een vragenbank kiezen (of aanvragen) → kenmerken aan kolommen koppelen →
vragensets bevestigen → rapport, plus een uitlegpagina op `/methode`. Tweetalig
NL/EN. Gemeten: een export van 20 MB met duizenden producten scant in 1,4
seconde.

Daaromheen:

- **Accounts en opslag** op Supabase, met scheiding per account.
- **Een wachtrij** voor markten die nog geen vragenbank hebben.
- **De generatie van een vragenbank**, als vaste reeks stappen in de app zelf.
  De stappen die niet het web op gaan lopen via de batch-API van Anthropic, voor
  de halve prijs. Zie `ONTWERP-vragenbank-keten.md`.
- **Een beheerscherm** waar de beheerder een nieuwe bank per categorie, per vraag
  beoordeelt: meenemen of overslaan. Overgeslagen vragen blijven in de bank maar
  tellen bij geen enkele merchant mee.
- **Een overzicht van alle vragenbanken**, per markt en versie, met panel,
  indeling en bevindingen.
- **De vrijgegeven bank terug bij de merchant.** Na het categoriescherm ziet hij
  welke banken er al liggen, met versie en vijf voorbeeldvragen, en kiest hij er
  één. Hij hoeft niets te uploaden en niet te wachten als zijn markt al bestaat.
- **Winkel doormeten** (alleen voor de beheerder): een vragenbank kiezen, een
  webshopadres invullen, en de app leest een steekproef van productpagina's —
  via robots.txt en de sitemap, alleen wat de winkel toestaat. Per pagina staat
  welke vragen gesteld zijn, welke te beantwoorden waren en uit welke gegevens.
  De uitkomst is een pdf om te delen met de eigenaar.

**Hoe een product gemeten wordt.** Een product hangt vaak op meer plekken in de
boom: een stof die als gordijnstof én als lampenkapstof verkocht wordt. Het
wordt gemeten op élke plek waar het hangt, en op elke plek zo specifiek als de
vragenbank het kent — lampenkapstoffen krijgen de lampenkapvragen en niet de
algemene decoratievragen. Wat de merchant op het categoriescherm als kenmerk
liet staan ("Motieven > Lente") krijgt geen eigen vragen. Sinds 11 september,
scanversie 5.0.0.

## Wat er nog moet gebeuren

In deze volgorde.

1. **Bericht als de bank klaar is** — het wachtscherm belooft dat hij het hoort,
   en dat gebeurt nu niet. `notified_at` ligt klaar; een mailprovider ontbreekt.
2. **De generatie zonder laptop** — de reeks wordt nu aangestuurd door een lus in
   een terminal op de laptop van de beheerder. Slaapt die, dan staat de reeks
   stil (er gaat niets verloren, het kost alleen tijd). De geplande taak die dat
   oplost staat al in `render.yaml`; hij moet in Render worden aangezet, voor
   een paar dollar per maand.
3. **Betaling en facturatie voor de dienst** — het model staat (zie boven), de
   uitvoering niet.

*Af sinds de vorige versie van dit document: de vrijgegeven bank terug bij de
merchant.*

## Vragenbanken die vanzelf ontstaan

De merchant leverde eerst zelf een vragenlijst aan. Dat is een drempel die geen
webshop-eigenaar kan nemen: hij weet niet welke vragen zijn markt stelt — dat is
juist wat hij van ons komt halen. Het doel is dat de upload van zijn catalogus
het proces aftrapt en hij er verder niets voor hoeft te doen.

Vier keuzes bepalen de opzet. Ze zijn op 8 september gemaakt en volgen uit
`kennis/_methode/`.

**De upload trápt af, maar voedt niet.** Het generatieproces krijgt alleen
categorienamen met aantallen en de URL van de webshop — precies wat
`src/questions/request.ts` nu al oplevert, met een test die bewaakt dat er geen
producttitel, veldwaarde of kolomnaam in terechtkomt. Het onderzoek gaat over de
**markt** (een panel van vijf sites), niet over deze winkel. Zo blijft
fase 3 van de methode overeind — blinderen — en kan de app eerlijk blijven
melden dat een vraag onbeantwoordbaar is.

**Een bank hoort bij een markt en wordt hergebruikt.** De eerste merchant in
woontextiel zet de generatie in gang; elke volgende merchant in die markt krijgt
de bank uit de cache. Dat is tegelijk het antwoord op de kosten: het model draait
één keer per markt, niet per merchant en al helemaal niet per product. Het wordt
goedkoper naarmate er meer klanten bijkomen, niet duurder.

**De eerste merchant in een onbekende markt wacht.** Hij krijgt bericht zodra de
bank er is, in plaats van meteen een voorlopige uitkomst. Bewuste keuze voor
kwaliteit boven snelheid: een rapport dat op een ongecontroleerde bank leunt,
kost meer vertrouwen dan het wachten kost.

**Kwaliteit wordt bewaakt met poorten, niet met leeswerk.** Om te voorkomen dat
elke nieuwe markt op één paar menselijke ogen wacht, controleert de app
machinaal wat machinaal te controleren is. Vier poorten staan er, twee zijn
ontworpen en nog niet gebouwd:

| Poort | Wat het tegenhoudt | Staat |
|---|---|---|
| Herkomst afdwingen | Een drempel zonder gepubliceerde bron wordt niet afgekeurd maar gedegradeerd: hij komt binnen als beredeneerd en telt niet mee. Een verzonnen norm kan zo nooit als feit het rapport in. | **gebouwd** |
| De lat voor een eigen vragenset | Een categorie krijgt alleen eigen vragen als het model er drie kan noemen die nergens anders in de markt gesteld worden. Noemt hij er geen, dan wordt het een toepassingsprofiel. | **gebouwd** |
| Een stap zonder uitkomst faalt | Een basislaag of categorie die zonder één vraag terugkomt, is een mislukte stap en geen magere uitkomst. | **gebouwd** |
| Beoordelen per vraag | De beheerder loopt de bank per categorie door en slaat over wat er niet in hoort; overgeslagen vragen tellen nergens mee. | **gebouwd** |
| De bron terugvragen | De genoemde URL wordt opgehaald en gecontroleerd op het onderwerp. Vangt de belangrijkste faalvorm van een model: een plausibele bron die niet bestaat. Nu kan alleen de beheerder dat met de hand nalopen. | ontworpen |
| Twee onafhankelijke runs | Genereren met twee verschillende sitepanels; wat beide vinden is stevig. | ontworpen |

Wat er dan voor menselijke review overblijft is de handvol vragen die een poort
markeert — een half uur per markt in plaats van twee dagen.

**De merchants zijn de vijfde poort, en die is gratis.** Zij zijn de vakexperts
van hun eigen markt en passen vragen al aan op het vragensetscherm. Halen vier
van de vijf merchants in een markt dezelfde vraag weg, dan is dat sterker bewijs
dan één oordeel. Met de bestaande regel eroverheen: een merchant mag
**herwegen, niet herschrijven**, anders meten twee winkels verschillende dingen
onder hetzelfde id.

## Techniekkeuzes

| Keuze | Waarom |
|---|---|
| Next.js + Tailwind | standaard voor dit type app; één framework voor pagina's en de enkele serverroute |
| Analyse in de browser | de privacybelofte is een productkenmerk, geen implementatiedetail |
| Vijf dependencies | minder om te onderhouden en minder dat onverwacht breekt |
| Render als hosting | elke merge naar `main` deployt vanzelf |
| Supabase | database met scheiding per account, aangesloten sinds 9 september |
| Anthropic | Sonnet leest de panelsites, Opus weegt en schrijft; alleen voor de generatie van een bank en het koppelscherm, nooit in de scan |
| Betaalprovider | nog niet gekozen — een dienst van €950–1.500 kan voorlopig op factuur |

## Bewust niet

Dingen die logisch lijken en het niet zijn. De onderbouwing staat in
`NOTES.md` onder *Bewust afgevallen*.

- Een vragenbank genereren uit de site of catalogus van één merchant
- Een kanaalfeed als bron in plaats van de catalogus
- Een taalmodel in de scan zelf
- Antwoorden uit lopende tekst halen in plaats van uit velden
- Scoredrempels en percentages in plaats van benoemde uitkomsten
