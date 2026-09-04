# Werknotities

Sessiestand: wat er staat, wat er besloten is, wat er open is.
Laatst bijgewerkt: 2026-09-04 (tweede sessie).

Structurele regels die altijd gelden staan **niet** hier maar in `CLAUDE.md`.

---

## Wat dit is

Een tweetalige (NL/EN) webapp die meet of de **productcatalogus** van een
merchant de vragen kan beantwoorden die een koper in zijn markt stelt. Niet
attribuutcompleetheid, maar beantwoordbaarheid van consumentenvragen.

Live: https://agentic-commerce-discovery-readiness-scan.onrender.com
Elke merge naar `main` deployt automatisch naar Render (gratis plan, koude start ~50s).

De keten is: **catalogus aanleveren → vragenbank → vragensets valideren →
rapport**, plus een uitlegpagina op `/methode` in merchant-taal.

## Architectuur in het kort

| Map | Wat er staat |
|---|---|
| `src/intake/` | formaatdetectie (CSV/TSV/JSON/NDJSON/XML) en kolomherkenning |
| `src/spec/` | veldenregister: kolomaliassen en eigenaar per veld |
| `src/questions/` | vragenbanken (model, banken, composer), generator, import, aanvraag |
| `src/engine/` | join, evaluatie, checklists, rapportaggregatie |
| `src/i18n/` | alle teksten, NL en EN naast elkaar |
| `src/storage/` | bewaarde scans en ingelezen banken achter een interface; nu de browser, later de server |
| `src/worker/` | de zware kant van de scan, weg van de hoofddraad |
| `components/` | UI: upload, vragenbank, validatie, rapport, verkenner, dashboard |
| `kennis/_methode/` | de methode en de promptreeks; de constante kant, niet in code |

---

## Genomen beslissingen

Deze zijn met de opdrachtgever doorgesproken. Niet terugdraaien zonder overleg.

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
is. De site van de merchant is één van de vijf à acht panelsites.

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

**Bevestigen van een vragenset is terugdraaibaar** en verhoogt de versie niet;
het is een oordeel over de set, geen wijziging eraan.

**Elke scan draagt twee versienummers**: spec-snapshot en vragenset-versie.
Zonder allebei is vergelijken over tijd betekenisloos.

## Bewust afgevallen

Niet opnieuw voorstellen zonder dat er iets veranderd is.

| Richting | Waarom afgevallen |
|---|---|
| LLM-laag in de scan | ~$450 modelkosten per catalogus van 3.500 producten; geen basis voor een productfunctie. Harnas is verwijderd. Blijft staan: het model raakt nooit een SKU. Een bank bouwen is iets anders — dat gebeurt op categorieniveau, één keer per markt, buiten de scan om. |
| Bank genereren per merchant-upload | Levert de bank van één winkel op, inclusief zijn blinde vlekken, zonder frequentiemaat en zonder domeinreview. Twee merchants in dezelfde markt zijn dan niet meer vergelijkbaar. De aanvraag hangt daarom aan de vertical. |
| Vindbaar op een gewogen drempel ("80 van de 100 punten") | Introduceert precies de scoredrempel die hieronder bewust is afgewezen. Het gewicht krijgt een eigen trede in plaats van een grens. |
| Proza als antwoordbron (attributen uit titel/omschrijving halen) | De opdrachtgever koos voor attributen als enige bron. Onderbouwing staat in Drive, map *Bespreken met Google*. |
| Website scrapen voor categorieën | Onnodig — de catalogusexport heeft de echte boom. Zou bovendien een serverroute vereisen; de analyse draait nu volledig client-side. |
| De kanaalfeed als analysebron | Een feed is een afgeleide van de catalogus: dunner, en met een afgevlakte categorieboom. Op de echte data verdween er een hoofdcategorie in en werd "Outdoorstoffen > Gestreept" tot los "Gestreept". Los je het in de catalogus op, dan is elk kanaal daarna een instelling. |
| Titel gebruiken om andere vragen te beantwoorden | Titel is retrieval, geen filtering. En de grens naar "dan de omschrijving ook" is niet te verdedigen. |

---

## Open

**Echte vragenbanken** — de grootste. Alles eromheen staat: het model, de
composer, de import met validatie, de aanvraag, en de schermen. Wat ontbreekt
zijn de banken zelf, en die zijn handwerk per vertical: panel samenstellen,
bronoogst, consolidatie, domeinreview, bevriezen. Reken op één tot twee dagen per
vertical. De vijf meegeleverde banken zijn `provisional` en dragen bewust geen
drempels; ze houden de zelfbedieningsscan overeind en meer niet. Eerste kandidaat
is woontextiel, want daar ligt de merchant en is de onomkeerbare fout scherp.

**De wachtrij achter de bankaanvraag** — nu is de overdracht handmatig: de app
levert de aanvraag af als markdown, jij of een agent draait de promptreeks, en de
YAML komt terug via het importscherm. De naad ligt klaar: `BankStore` in
`src/storage/banks.ts` is dezelfde vorm als `SnapshotStore`, dus een echte
jobtabel plus een agent die een aanvraag oppakt is een tweede implementatie van
vier methodes. Wacht op hetzelfde Supabase-account als de rest.

**Beslisregels uitvoeren** — een regel wordt nu getoond en niet gerekend. "Is
deze stof sterk genoeg voor mijn bank" vraagt eigenlijk Martindale ≥ drempel, niet
alleen of het veld gevuld is. Dat vereist waarden parsen uit `attr:`-kolommen
(getal plus eenheid) en per toepassingsprofiel een drempel. Het model draagt de
regels en de profielen al; alleen de uitvoering ontbreekt. Doe dit pas als er een
bank met gepubliceerde drempels ligt — anders reken je met verzonnen getallen.

**Mappinglaag bij een ingelezen bank** — draagt een attribuut geen `velden:`,
dan bouwt de importeur een zoekpatroon uit `benoemd_als` en zegt dat erbij als
waarschuwing. Dat werkt, maar het is een gok. Een scherm waarin de merchant per
attribuut zijn eigen kolom aanwijst zou hem wegnemen — en dat is precies de stap
die de methode ná het bevriezen plaatst.

**Prijzen** — de bedragen en de exacte bestandsgrens staan nog niet vast. De
prijzenpagina draagt daar een zichtbare TODO in plaats van een verzonnen bedrag.
Hetzelfde geldt voor wie er achter de scan zit op de over-pagina.

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
worker, zonder dat de hoofddraad ook maar één tik mist. De grens ligt nu op
20 MB met een uitweg ("toch proberen"); streamend lezen wordt pas een echte
vraag als die grens knelt of als het serverzijdig moet.

**Echte kwaliteitscontroles** — nu alleen een woordentelling op titel en
omschrijving. Kandidaten: schijn-volledigheid (veld overal dezelfde waarde),
de GTIN-checksum die al in `isValidGtin()` staat maar nergens wordt aangeroepen,
ontbrekende eenheden, en enum-controle op availability en condition.

**Herkomst op het rapport** — een rapport noemt zijn spec-snapshot en
vragensetversie, maar niet de bestanden waarop het draaide. Dat maakte het
verschil hieronder onnodig lang onverklaarbaar; `Dataset.filename` ligt al klaar
in `report.sources`, het staat alleen niet in het stempelblok van `ReportView`.

**Accounts aansluiten** — alles eromheen staat, alleen de dienst niet. Wat er ligt:
`ScanSnapshot` als opslagbare vorm, `compareSnapshots()` met de
meetlat-waarschuwing, `SnapshotStore` als interface met een browser-implementatie,
de drie dashboardschermen, en `supabase/migrations/0001_snapshots.sql` met
`account_id` en row level security. Wat ontbreekt is een Supabase- of
Clerk-project: dat vraagt een account en sleutels van de opdrachtgever. Zodra die
er zijn is het een tweede implementatie van drie methodes, geen verbouwing van
de schermen.

**Serverzijdige scan** — voor bestanden boven de 20 MB. Vereist objectopslag met
een signed URL en een achtergrondtaak; dezelfde motor, andere aanroeper. Wacht op
hetzelfde account als hierboven.

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

Sinds de vragenbank staat `SCAN_VERSION` op **2.0.0**. Het gemiddelde beweegt van
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

Draaien:

```
npx esbuild scripts/scan-cli.ts --bundle --platform=node --format=esm --outfile=/tmp/scan-cli.mjs
node --max-old-space-size=4096 /tmp/scan-cli.mjs <catalogus> [vragenbank.yaml]
```

## Achtergrond

De ontwerprationale en de veldreferenties staan in Google Drive, map
*Product Catalog Readiness Scan*. De bevindingen op deze merchant plus de open
vragen voor Google staan in de map *Bespreken met Google*.
