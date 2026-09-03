# Werknotities

Sessiestand: wat er staat, wat er besloten is, wat er open is.
Laatst bijgewerkt: 2026-09-02.

Structurele regels die altijd gelden staan **niet** hier maar in `CLAUDE.md`.

---

## Wat dit is

Een tweetalige (NL/EN) webapp die meet of de productdata van een merchant de
vragen kan beantwoorden die een koper in zijn categorie stelt, gemeten tegen
OpenAI ACP en Google UCP.

Live: https://agentic-commerce-discovery-readiness-scan.onrender.com
Elke merge naar `main` deployt automatisch naar Render (gratis plan, koude start ~50s).

De keten is: **data aanleveren → vragensets valideren → rapport**, plus een
uitlegpagina op `/methode` in merchant-taal.

## Architectuur in het kort

| Map | Wat er staat |
|---|---|
| `src/intake/` | formaatdetectie (CSV/TSV/JSON/NDJSON/XML) en kolomherkenning |
| `src/spec/` | veldenregister ACP + UCP, met tier en eigenaar per veld |
| `src/questions/` | archetypenbibliotheek, generator, mutaties met changelog |
| `src/engine/` | join, evaluatie, checklists, rapportaggregatie |
| `src/i18n/` | alle teksten, NL en EN naast elkaar |
| `components/` | UI: upload, validatie, rapport, verkenner |

---

## Genomen beslissingen

Deze zijn met de opdrachtgever doorgesproken. Niet terugdraaien zonder overleg.

**De feed is de analysebron, de catalogus verklaart.** Vragen worden beantwoord
uit de feed — dat is wat de agent leest. Lukt dat niet, dan wordt dezelfde vraag
aan het gejoinde catalogusrecord gesteld; lukt het daar wel, dan is het geen
ontbrekende maar onbenutte informatie (`enrichable`).

**Vragen komen van de vraagkant.** Alleen uit de archetypenbibliotheek. Nooit
afleiden uit de kolommen van de merchant: dat hij iets bijhoudt zegt niets over
wat een koper vraagt, en dan meet je of zijn feed zijn eigen velden draagt.
De merchant mag zelf vragen toevoegen — dat is zijn keuze, niet ons voorstel.

**Categorieën komen uit de catalogus als die er is**, met de feed als terugval.
De feed vlakt de boom af: bij de testmerchant werd `Outdoorstoffen > Gestreept`
tot los "Gestreept" en verdween een hele hoofdcategorie.

**Core en Selection worden nooit samengevoegd**, en alles wordt per protocol
apart berekend omdat de beschikbare velden verschillen.

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
| LLM-laag in de scan | ~$450 modelkosten per catalogus van 3.500 producten; geen basis voor een productfunctie. Harnas is verwijderd. |
| Proza als antwoordbron (attributen uit titel/omschrijving halen) | De opdrachtgever koos voor attributen als enige bron. Onderbouwing staat in Drive, map *Bespreken met Google*. |
| Website scrapen voor categorieën | Onnodig — de PIM-export heeft de echte boom. Zou bovendien een serverroute vereisen; de analyse draait nu volledig client-side. |
| Titel gebruiken om andere vragen te beantwoorden | Titel is retrieval, geen filtering. En de grens naar "dan de omschrijving ook" is niet te verdedigen. |

---

## Open

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

**Snapshot-opslag** — rapporten worden nergens bewaard. De rapportvorm is er wel
op voorbereid, dus dat kan later zonder migratie.

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
zes categorieën, gemiddeld 5,3 tot 5,5 van de 12 — dus `SCAN_VERSION` blijft op
1.0.0.

## Testdata

De opdrachtgever leverde echte data van een stoffenwinkel:

```
~/Documents/Productdata De Groot Stoffen/ChannableFeed-DeGrootStoffen.csv   3.557 producten
~/Documents/Productdata De Groot Stoffen/merged_feed.json                   3.552 producten (Magento)
```

Verwachte uitkomst op die bestanden (regressiecontrole):

- 6 vragensets, 4 echte categorieën: Meubelstoffen 2.197, Gordijnstoffen 878,
  Decoratiestoffen 302, Outdoorstoffen 153
- 21 producten zonder categorie
- Trechter 3.557 → 0 vindbaar → 0 concurrerend, gemiddeld ~5,4 van de 12
- Grootste mappinggaten: samenstelling en baanbreedte staan bij duizenden
  producten wél in Magento en niet in de feed
- Lichtdoorlatendheid, keuringen en onderhoud staan in geen van beide bronnen
- Geen enkel product is checkout-eligible in ACP of UCP

### Er zijn twee feeds, en dat verklaarde het "onverklaarde verschil"

In dezelfde map staat ook `ChannableFeedDeGrootStoffenverrijkt - ...csv`: dezelfde
3.557 producten, maar met breedte, samenstelling, lichtdoorlatendheid en keuringen
aangevuld. Die feed geeft 23 producten zonder categorie en gemiddeld 7,4 van de 12,
tegen 21 en 5,4 voor de originele feed. De 23 die de opdrachtgever zag was dus geen
afwijking maar een ander bestand — nagerekend, beide reproduceren exact.

De 10 kan de motor niet zelf produceren. `applicableTo()` kijkt alleen naar de
protocolspec en niet naar de data, dus het archetype woontextiel levert altijd 12
vragen, in ACP en in UCP, bij elke feed en in elke commit sinds `40d030d`. De enige
plek die een vraag laat vervallen is `question.disabled` in `evaluate.ts`, en dat
zet de merchant zelf om in stap 2. Twee uitgezette vragen dus.

Daarmee valt de tegenstrijdigheid weg: het gemiddelde stéég niet. Het zakte van 7,4
naar 6,2, en dat is precies wat uitzetten van beantwoorde vragen doet. Welke twee is
uit de cijfers niet hard te maken (baanbreedte plus samenstelling of gewicht komt
uit op 6,2, maar per set uitzetten geeft meer combinaties); de changelog van die run
zegt het exact, en de vragensetversie zou v3 hebben gestaan in plaats van v1.

## Achtergrond

De ontwerprationale en de veldreferenties staan in Google Drive, map
*Product Catalog Readiness Scan*. De bevindingen op deze merchant plus de open
vragen voor Google staan in de map *Bespreken met Google*.
