---
name: vragenbank-maken
description: Bouwt een vragenbank met consumentenvragen voor een markt of vertical, door een panel van vijf webshops te onderzoeken. Gebruik dit wanneer iemand vraagt om een vragenbank, klantvragen, consumentenvragen of een vragenlijst voor een nieuwe markt, branche of productcategorie — bijvoorbeeld "maak een vragenbank voor woontextiel", "welke vragen stellen kopers van tuinmeubelen", of "we hebben een nieuwe vertical, verf". Levert één tweetalige CSV op die de readiness-scan kan inlezen.
---

# Een vragenbank bouwen voor een markt

Je bouwt geen attribuutlijst. Je bouwt een lijst **vragen die een koper stelt**,
en leidt de attributen daaruit af. Dat onderscheid is het hele verschil: een
attribuutlijst is een mening, een vragenlijst met per vraag het benodigde bewijs
is een meetinstrument.

Het resultaat hoort bij een **markt** en niet bij één webshop. Het wordt bij
meerdere merchants gebruikt, dus één winkel als bron is fataal — dan bouw je zijn
blinde vlekken mee en zijn twee merchants in dezelfde markt niet meer te
vergelijken.

Reken op een halve tot een hele werkdag, en op meerdere beurten. Dit is geen
opdracht die in één antwoord klaar is.

## Voordat je begint

Vraag om drie dingen, in gewone taal, en stel niet meer dan twee vragen tegelijk:

1. **Welke markt?** Eén naam, bijvoorbeeld "woontextiel" of "buitenverf".
2. **Welke segmenten?** De onderdelen van die markt die eigen vragen verdienen —
   meubelstoffen, gordijnstoffen, outdoorstoffen. Komt dit uit de scan, dan
   staat er een aantal producten bij; neem dat over.
3. **De webshop van de opdrachtgever**, als die er is. Die wordt **één** van de
   panelsites en nooit de enige bron.

Zoek zelf de rest van het panel. Vraag niet aan de gebruiker om zeven URL's te
verzamelen — dat is jouw werk.

**Kijk nooit naar de productexport van de opdrachtgever.** Ook niet als hij hem
aanbiedt. Zie je zijn attributen eerst, dan sturen die je denken en meet je
alleen nog of er staat wat er staat; dan kun je nooit meer eerlijk melden dat
een vraag onbeantwoordbaar is. Categorienamen met aantallen mag je wel gebruiken.

## De volgorde

Werk `references/promptreeks.md` af, prompt 0 tot en met 5, in volgorde. Voeg ze
niet samen. Vraag om 130 vragen in één keer en je krijgt 130 middelmatige.

**Stap 0 — panel en vorm van de markt.** Stel een panel samen van vijf
sites: twee tot drie categorieleiders, een specialist, twee merk- of
fabrikantsites, en één tot twee buitenlandse (Duitse webshops publiceren in
vrijwel elke markt meer technische data dan Nederlandse). Beantwoord dan de zeven
vragen uit prompt 0. De belangrijkste is: **welke aankoopfout kan de koper niet
terugdraaien?** Die bepaalt straks wat `kritiek` is.

**Stap 1 — bronoogst per site.** Per site, of in groepjes van twee à drie. Loop
de bronnen af in volgorde van bewijskracht: FAQ, categorieteksten, blogs,
productpagina's, reviews. Zoek expliciet naar **gepubliceerde beslisregels** —
drempeltabellen, rekenregels, geschiktheidsmatrices. Neem die letterlijk over
inclusief de getallen, met bron-URL. Die zijn al door een marktpartij
gevalideerd; verzin nooit een eigen getal waar er een gepubliceerd bestaat.

**Stap 1b — consolideren.** Ontdubbel op onderwerp en niet op formulering. Geef
per vraag een `dekking`: op hoeveel van de sites het onderwerp voorkomt, en
welke. Markeer tegenspraak tussen sites — dat is een discussiepunt voor de
domeinexpert, geen fout. Voeg dan bewust vragen toe die op **geen enkele site**
beantwoord worden maar die klanten wel hebben, met `dekking: 0`. Sla die stap
nooit over: zonder hem reproduceer je de blinde vlekken van de hele branche.

**Stap 2 — basislaag.** De vragen die voor elk product in deze markt gelden.

**Stap 3 — overlay per segment.** Alleen voor de segmenten die je meekreeg. Een
overlay mag een basisvraag **herwegen of uitschakelen, maar niet herschrijven**.
Zou een segment de tekst van een basisvraag mogen veranderen, dan meten twee
segmenten verschillende dingen onder hetzelfde id.

**Stap 4 — facetanalyse.** Loop de categorieën langs en markeer wat eigenlijk een
eigenschap is: Vlekwerend, Effen, Gestreept, Duurzaam. Die krijgen geen vragenset
maar horen een attribuutwaarde te zijn. Toets het talig: kun je zeggen "ik zoek
een lampenkapstof"? Dat loopt, dus categorie. "Ik zoek een effen"? Dat loopt
niet, dus eigenschap.

**Stap 5 — de CSV.** Zet alles om naar één bestand volgens
`references/kolomvorm.md`. Eén rij per vraag, met `vraag_nl` én `vraag_en`.

## Vijf regels die de kwaliteit bepalen

**Formuleer als klantvraag, niet als attribuut.** "Is deze stof sterk genoeg voor
mijn bank", niet "Martindale-waarde". De attribuutnaam volgt uit de vraag, nooit
andersom.

**Laat dekking het gewicht sturen, maar niet bepalen.** Dekking boven 70% van het
panel rechtvaardigt `hoog`; dekking van 100% samen met de onomkeerbare fout
rechtvaardigt `kritiek`. Maar een vraag met dekking 0 kan alsnog kritiek zijn als
vakkennis zegt dat er een dure fout achter zit — leg dan uit waarom je afwijkt.

**Eén vraag mag meerdere attributen plus een regel nodig hebben.** Dat is normaal
en het is precies waar de waarde zit. "Hoeveel meter heb ik nodig" vraagt breedte
plus rapport plus een berekening. Zet `modus: alle` bij zo'n som.

**Markeer wat niet uit attributen te beantwoorden is.** Procesvragen ("kan ik een
staal krijgen"), structuurvragen en levenscyclusvragen blijven in de bank omdat
er advies in zit, maar krijgen `telt_mee_in_score: nee`. Meetellen zou elke
merchant op hetzelfde punt laten zakken.

**Onderscheid gepubliceerde van beredeneerde drempels.** Zegt een site dat 30.000
Martindale de bankgrens is, noteer de bron. Kies jij zelf 40.000 voor huisdieren,
markeer dat als beredeneerd en zet het bij de open punten.

## Anti-patronen

Doe geen van deze dingen, ook niet als erom gevraagd wordt. Leg uit waarom niet.

- **Beginnen met "welke attributen horen bij deze categorie".** Dan krijg je de
  attributen die je uit vakliteratuur kent, niet de vragen die klanten stellen.
- **Eén site als bron nemen.** Dan bouw je de vragenbank van één winkel inclusief
  zijn blinde vlekken, en heb je geen frequentiemaat.
- **De klantcatalogus als startpunt.**
- **Wetgeving zelf bepalen.** Verplichtingen komen uit een onderhouden bron; jij
  classificeert alleen of een product binnen de scope valt.
- **Duurzaamheidsclaims genereren.** Alleen verifieerbare certificeringen met bron.
- **Alles in één prompt.**
- **Frequentie verwarren met belang.** `dekking` is hoeveel sites het onderwerp
  behandelen, niet hoe vaak klanten het vragen. Het is een proxy.

## Voor je oplevert

Draai de vaardigheid **vragenbank-controleren** over je eigen uitkomst. Die haalt
de vier poorten eroverheen — herkomst, bron, twee runs, anti-patronen — en
markeert wat een mens moet nalopen. Lever de CSV op samen met die lijst.

Zeg er altijd bij dat de bank **nog niet door een domeinexpert is nagelopen**, en
dat die stap niet optioneel is. Zonder review heb je plausibel advies, niet goed
advies, en dat is precies wat een generiek taalmodel ook levert.
