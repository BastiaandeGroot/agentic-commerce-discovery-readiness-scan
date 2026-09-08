# Wat dit product is

Dit document beantwoordt één vraag: *wat bouwen we, voor wie, en waarom?*
Techniek staat er alleen in voor zover die uit die vraag volgt.

- Hoe het gebouwd is → `CLAUDE.md` (regels) en `NOTES.md` (stand en beslissingen)
- Hoe het eruitziet → `DESIGN.md`

Laatst bijgewerkt: 8 september 2026.

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

## Wat er nog moet gebeuren

In deze volgorde, want ze bouwen op elkaar.

1. **Accounts en opslag** — nu wordt niets bewaard. Een merchant die morgen
   terugkomt begint opnieuw, en de koppeling die hij maakte is weg. Zonder dit
   is er geen product om voor te betalen. De database-migratie ligt klaar,
   inclusief scheiding per account; alleen de dienst ontbreekt nog.
2. **Echte vragenbanken per markt** — de meegeleverde banken zijn voorlopig en
   dragen bewust geen drempels. Een bank per markt is handwerk: één tot twee
   dagen. Eerste kandidaat is woontextiel. Hier hangt het vertrouwen in de
   uitkomst aan.
3. **Prijs en betaling** — de bedragen staan nog niet vast en er is nog geen
   betaalprovider gekozen. Die keuze komt pas als 1 en 2 staan.

## Techniekkeuzes

| Keuze | Waarom |
|---|---|
| Next.js + Tailwind | standaard voor dit type app; één framework voor pagina's en de enkele serverroute |
| Analyse in de browser | de privacybelofte is een productkenmerk, geen implementatiedetail |
| Vijf dependencies | minder om te onderhouden en minder dat onverwacht breekt |
| Render als hosting | elke merge naar `main` deployt vanzelf |
| Supabase (voorzien) | database met scheiding per account; nog niet aangesloten |
| Betaalprovider | nog niet gekozen — bewust uitgesteld |

## Bewust niet

Dingen die logisch lijken en het niet zijn. De onderbouwing staat in
`NOTES.md` onder *Bewust afgevallen*.

- Een vragenbank genereren uit de site of catalogus van één merchant
- Een kanaalfeed als bron in plaats van de catalogus
- Een taalmodel in de scan zelf
- Antwoorden uit lopende tekst halen in plaats van uit velden
- Scoredrempels en percentages in plaats van benoemde uitkomsten
