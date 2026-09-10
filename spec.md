# Wat dit product is

Dit document beantwoordt één vraag: *wat bouwen we, voor wie, en waarom?*
Techniek staat er alleen in voor zover die uit die vraag volgt.

- Hoe het gebouwd is → `CLAUDE.md` (regels) en `NOTES.md` (stand en beslissingen)
- Hoe het eruitziet → `DESIGN.md`

Laatst bijgewerkt: 10 september 2026.

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

## Wat er werkt

De keten staat en draait live: catalogus aanleveren → vragenlijst → kenmerken
aan kolommen koppelen → vragensets bevestigen → rapport, plus een uitlegpagina
op `/methode`. Tweetalig NL/EN. Gemeten: een export van 20 MB met duizenden
producten scant in 1,4 seconde.

Daaromheen staat sinds 9 september de rest van het product: **accounts en
opslag** op Supabase, met scheiding per account; een **wachtrij** voor markten
die nog geen vragenbank hebben; en de **generatie zelf**, die de methode als
vaste reeks fasen draait en de uitkomst voorlegt ter vrijgave.

## Wat er nog moet gebeuren

In deze volgorde, want ze bouwen op elkaar.

1. **De vrijgegeven bank terug bij de merchant** — een bank die is vrijgegeven
   staat in de database, maar niets aan de merchantkant leest hem. Hij levert
   zijn vragenlijst vandaag nog zelf aan. Dit is het laatste gat in de keten.
2. **Bericht als de bank klaar is** — het wachtscherm belooft dat hij het hoort,
   en dat gebeurt nu niet. `notified_at` ligt klaar; een mailprovider ontbreekt.
3. **Prijs en betaling** — de bedragen staan nog niet vast en er is nog geen
   betaalprovider gekozen. Die keuze komt pas als 1 en 2 staan.

*Punten die hier stonden en inmiddels af zijn: accounts en opslag, de markt
herkennen na de upload, en vragenbanken die vanzelf ontstaan.*

## Vragenbanken die vanzelf ontstaan

Vandaag levert de merchant zelf een vragenlijst aan. Dat is een drempel die geen
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
machinaal wat machinaal te controleren is:

| Poort | Wat het tegenhoudt |
|---|---|
| Herkomst afdwingen | Een vraag zonder panelbronnen of een drempel zonder gepubliceerde bron wordt niet afgekeurd maar gedegradeerd: hij komt binnen als beredeneerd, telt niet mee in de score en staat bij de open punten. Een verzonnen norm kan zo nooit als feit het rapport in. |
| De bron terugvragen | De genoemde URL wordt opgehaald en gecontroleerd op het onderwerp. Een dode link of een pagina die er niet over gaat, valt af. Vangt de belangrijkste faalvorm van een model: een plausibele bron die niet bestaat. |
| Twee onafhankelijke runs | Genereren met twee verschillende sitepanels; wat beide vinden is stevig, waar ze verschillen gaat naar de open punten. Zelfde logica als `dekking` in de methode. |
| Criticus tegen de anti-patronen | Een tweede modelaanroep vinkt de concrete fouten af die de methode benoemt: attribuutnaam in plaats van klantvraag, norm zonder bron, duurzaamheidsclaim zonder certificering, bank op één site gebaseerd. |

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
| Betaalprovider | nog niet gekozen — bewust uitgesteld |

## Bewust niet

Dingen die logisch lijken en het niet zijn. De onderbouwing staat in
`NOTES.md` onder *Bewust afgevallen*.

- Een vragenbank genereren uit de site of catalogus van één merchant
- Een kanaalfeed als bron in plaats van de catalogus
- Een taalmodel in de scan zelf
- Antwoorden uit lopende tekst halen in plaats van uit velden
- Scoredrempels en percentages in plaats van benoemde uitkomsten
