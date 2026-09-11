@AGENTS.md

# Projectregels

Lees bij het oppakken van een sessie eerst `NOTES.md` — daar staan de stand, de
genomen beslissingen en wat er open is.

## Wat deze app is

De scan meet **beantwoordbaarheid van consumentenvragen, geen
attribuutcompleetheid**. Een gat bestaat alleen als er een vraag door
onbeantwoord blijft; een leeg veld waar geen vraag op leunt komt niet in de
lijst, en een gevuld veld dat de vraag niet beantwoordt komt er wél in.

De **catalogus is de enige bron**: één export uit het PIM of MDM, of anders uit
Magento of Shopify. Geen kanaalfeed — dat is een afgeleide met een afgevlakte
categorieboom. Er wordt niet tegen ACP of UCP gemeten; die zijn feedspecificaties
en hebben zonder feed geen anker.

De scan is **volledig deterministisch**. Vragen worden beantwoord uit
gestructureerde attributen, niet uit lopende tekst, en er komt geen model aan te
pas. Dezelfde catalogus geeft altijd hetzelfde rapport en een scan kost niets.

Er zijn **twee plekken waar een model wél mag komen**, en op allebei gelden
dezelfde drie voorwaarden: het model raakt geen SKU, het draait één keer per
catalogus of per markt en niet per product, en de uitkomst is een tabel die een
mens ziet en bevestigt — geen oordeel dat stilzwijgend doorwerkt.

1. Het **koppelscherm** (`components/MappingStep.tsx`, met `src/semantic/` en
   `app/api/mapping/`). Daar bepaalt een model welk kenmerk in welke kolom staat:
   Claude Haiku 4.5 via de serverroute, en anders een embeddingmodel in de
   browser. Er gaan kenmerknamen, vraagteksten en kolomnamen de deur uit, geen
   productrij en geen veldwaarde.
2. De **generatie van een vragenbank** (`src/generation/`, met
   `src/server/generator.ts` en `app/api/bank-run/`). Daar bouwt een model de
   vragenlijst voor een markt volgens de methode in `kennis/_methode/`. Er gaan
   categorienamen met aantallen en een URL de deur uit — geen kolomnamen, geen
   productrijen, geen prijzen. Het gebeurt één keer per markt en niet per
   merchant, en wat eruit komt gaat door dezelfde poorten als een bank van
   buiten: de app gelooft haar eigen pijplijn net zomin op haar woord.

Daarna draait de scan er deterministisch op. **Zet nooit een model in de scan
zelf** — zie de afgevallen richtingen in `NOTES.md`.

De generatie is geen agent maar een **vaste reeks stappen**, en dat is een
beslissing en geen implementatiedetail. De methode is al een reeks; hem als reeks
uitvoeren geeft hervatten na een storing, een bekende prijs per stap, en een bank
die raar uitvalt is terug te voeren op één stap. Eén beurt zet één fase. Zie
`ONTWERP-vragenbank-keten.md`.

De analyse draait **client-side**: de catalogus wordt in de browser gelezen,
gescand en beoordeeld, en het bestand verlaat het apparaat nooit. `/api/mapping`
is de enige uitzondering waar productdata langskomt — die stuurt kenmerknamen,
kolomnamen en een handvol voorbeeldwaarden per kolom. Dat ís productdata, dus het
scherm zegt het, en er gaat nooit een productrij, een prijs of een aantal mee.
Zonder `ANTHROPIC_API_KEY` geeft de route 503 en valt het scherm terug op het
browsermodel, met dat verschil in beeld.

## Mapstructuur

| Map | Wat er hoort |
|---|---|
| `src/intake/` | formaatdetectie en kolomherkenning |
| `src/spec/` | veldenregister, plus de woordenlijst en de matcher die bankattributen op catalogus­kolommen leggen |
| `src/semantic/` | de modellen die koppelingen vóórstellen; nooit importeren vanuit de motor |
| `src/generation/` | de vragenbankgeneratie als vaste reeks fasen; puur, het modelantwoord komt binnen als argument |
| `app/api/` | de serverroutes: `/api/mapping`, `/api/site`, `/api/bank-request`, `/api/bank-queue`, `/api/bank-run`, `/api/bank-result` en `/api/admin/queue` |
| `src/server/` | wat alleen serverzijdig mag draaien: de uitvoerderssleutel, de servicecliënt, de modelaanroep van de generatie en het aannemen van een bank. Nooit importeren vanuit een component. |
| `src/questions/` | vragenbanken, composer, generator, import (tabel én YAML) en aanvraag |
| `src/engine/` | categoriekeuze, evaluatie, rapportaggregatie, vergelijken |
| `src/i18n/` | alle teksten, NL en EN naast elkaar |
| `components/` | UI; `ui.tsx` draagt de gedeelde bouwstenen |
| `app/` | routes |
| `scripts/` | headless testharnas, geen productiecode |
| `kennis/_methode/` | de methode en de promptreeks; documentatie, geen code |
| `plugin/vragenbank/` | de Cowork-plugin die banken maakt, controleert en voorlegt; de naslag erin is een kopie uit `kennis/_methode/` en moet meeveranderen |

## Design

`DESIGN.md` is de bron voor elke UI-beslissing. Elke wijziging aan de interface
houdt zich daaraan.

- **Nooit een hardgecodeerde kleur, spacing of tekstgrootte in een component.**
  Geen `#`, geen `rgb()`, geen losse pixelwaarde. Alles komt uit de tokens in
  `app/globals.css`. Heb je een waarde nodig die er niet is, voeg hem daar toe
  met zijn donkere tegenhanger en reken het contrast na.
- Voeg je een kleurpaar toe, dan haalt het WCAG AA in beide standen.
- Kleur draagt nooit alleen de betekenis; er staat altijd vorm of tekst naast.
- **Dichtheid is een keuze per scherm, geen smaak.** Instap en uitleg zijn ruim,
  rapport en verkenner zijn dicht. Maak een rapportscherm nooit luchtiger zonder
  dat erom gevraagd is — dat kost vergelijkbaarheid.
- Elk component dat data toont, dekt vier toestanden af: laden, leeg, fout,
  gevuld. Een foutmelding zegt wat er mis is én wat de merchant nu moet doen.
- Iconen via `lucide-react`, nooit een emoji als icoon.
- Alle tekst komt uit `src/i18n/`, in beide talen. Nooit een string in een
  component.

## Vragenbanken

De vragen komen uit een **vragenbank** (`src/questions/bank.ts`), opgebouwd
volgens `kennis/_methode/`. De merchant levert hem aan als één vragenlijst; die
komt binnen als tabel (`src/questions/list.ts`, één regel per vraag) of als de
YAML uit de methode (`src/questions/import.ts`, basislaag plus overlays).
`importQuestionList` kiest op inhoud, niet op extensie — het scherm vraagt om een
vragenlijst en niet om een bestandsformaat. Vier regels die altijd gelden:

- **Een bank hoort bij een vertical, niet bij een merchant.** Nooit een bank
  genereren uit de site of de catalogus van één winkel: dan meet je zijn blinde
  vlekken mee en zijn twee merchants in dezelfde markt niet meer vergelijkbaar.
  Zijn site is één van de vijf panelsites.
- **Een bankaanvraag draagt geen productdata.** Categorienamen met aantallen en
  een URL, verder niets — ook geen kolomnamen. Dat is fase 3 van de methode
  (blinderen) én de privacybelofte. Het type kan het niet dragen; houd het zo.
- **Herkomst staat bij elk getal.** Een gepubliceerde drempel noemt zijn site,
  een beredeneerde zijn onderbouwing, en `dekking: 0` (niemand behandelt dit)
  is iets anders dan niet-onderzochte dekking (`null`). Verzin nooit een
  drempel, een certificering of een normnummer.
- **Een overlay herweegt, maar herschrijft niet.** Zou een categorie de tekst
  van een basisvraag mogen veranderen, dan meten twee categorieën verschillende
  dingen onder hetzelfde id.

Het **aggregatieniveau volgt de vragen**. Een subcategorie krijgt alleen een
eigen vragenset — en daarmee een eigen rij — als de vragenlijst er op de volle
naam een ándere vragenset voor kent (`QuestionSet.parent`, `ownOverlayFor`);
anders is het dezelfde meting op minder producten en suggereert de rij een
onderscheid dat de lijst niet maakt. Zelfde regel voor elk niveau dat je ooit
toevoegt.

Een product wordt gemeten op **élke plek waar het hangt** (`placeProduct` in
`src/engine/join.ts`): per tak de diepste categorie met een eigen set, over
takken heen allemaal, elke vraag één keer. Nooit alleen de eerste categorie
nemen — een export zet ze vaak op alfabet. Paden die de merchant als kenmerk
liet staan krijgen geen set (`QuestionSetState.facetPaths`); een product dat
alleen onder kenmerken hangt telt mee maar wordt niet gescoord.

De **algemene vragen worden één keer bevestigd** (`QuestionSetState.baseValidated`),
de categorie-eigen per categorie. Een algemene vraag bewerken werkt op élke
categorie tegelijk — anders meten twee categorieën verschillende dingen onder
hetzelfde id.

`belang` weegt mee in de trechter via een eigen trede: **basisgeschikt** is elke
kritieke vraag beantwoord, **volledig** blijft élke gescoorde vraag. Geen gewogen
percentagedrempel — zie de afgevallen richtingen in `NOTES.md`.

De vragenlijsten komen in het Engels; kolomnamen én waarden worden op **alias**
herkend en nooit op positie, in beide talen. De modus van een vraag volgt zijn
beslisregel: mét regel zijn alle attributen nodig (een som heeft al zijn termen),
zonder regel volstaat er één (bewijs stapelt, en een agent antwoordt met wat hij
heeft). Een kolom `modus` gaat daarvoor.

Wat een lijst niet draagt, vult de lezer niet aan: geen sitepanel betekent
`dekking: null` en status `in-review`, en een beslisregel zonder bron blijft
beredeneerd en wordt niet gerekend. Elke aanname die de lezer wél doet — het
zoekpatroon per attribuut, de weging uit de methode boven een eigen `gewicht`,
`modus: alle` als de lijst geen modus noemt — staat als waarschuwing in de
uitkomst.

Een gat draagt zijn oorzaak, en die volgt uit één bron: `unfilled` (de kolom
bestaat, staat leeg — invulwerk), `unmodelled` (geen kolom — modelwerk) of
`no-source` (komt uit een systeem dat een catalogus niet draagt). Elk gat draagt
ook de vragen die het blokkeert.

## Attributen op kolommen leggen

De bank noemt een kenmerk zoals het vak het noemt (`rolbreedte_cm`), de catalogus
zoals het systeem het opsloeg (`rol_breedte`). `src/spec/match.ts` legt die twee
op elkaar met `src/spec/lexicon.ts` als woordenlijst, deterministisch en zonder
model.

- **Bij twijfel niet koppelen.** Een gemiste koppeling toont een gat dat er niet
  is: zichtbaar en te herstellen. Een verkeerde koppeling laat een gat verdwijnen
  dat er wél is, en dat is de enige fout waaraan dit product zijn bestaansrecht
  verliest. Élk woord van het attribuut moet in de kolom terugkomen — zonder die
  eis koppelt `staal_beschikbaar` aan `availability`.
- **De woordenlijst blijft generiek.** Alleen de woorden die élke catalogus
  gebruikt (breedte/width, gewicht/weight). Vaktaal hoort bij de markt en dus bij
  de vragenlijst, in een kolom `synoniemen`. Zet nooit een vakwoordenlijst per
  vertical in de motor.
- **Een voorstel van het model is nooit een koppeling.** Het staat gemarkeerd in
  de lijst tot de merchant het laat staan of wijzigt. Twee regels houden het
  bruikbaar, allebei gemeten en beide onmisbaar: vectoren worden **gecentreerd**
  (anders lijken alle namen in één catalogus op elkaar) en een voorstel vraagt
  een **wederzijds beste match** (anders krijgt élk kenmerk er een, ook de
  tientallen waar niets bij past).
- **Wat gekoppeld is, is controleerbaar.** `QuestionSetState.attributeMatches`
  draagt attribuut, kolom en de reden, en dat staat op het vragensetscherm.

Drie wegen naar een koppeling, van goedkoop naar duur, en ze vullen elkaar aan.
`match.ts` doet schrijfwijze en generieke taal gratis en offline. Wat overblijft
is betekenis — `vezelsamenstelling` in `material`, `lichtdoorlatendheid` in
`gordijn_dichtheid` — en dat stelt een agent voor via `src/spec/mapping.ts`. De
merchant wijst zelf aan op het koppelscherm, en die keuze wint van beide andere.
`applyMapping` in `src/questions/mapping.ts` legt het resultaat op de bank, in
dezelfde vorm als een `velden:`-lijst uit de YAML.

Een lege keuze ("geen kolom") is een geldig en vaak juist antwoord: dan legt de
catalogus dit kenmerk niet vast, en dát is de bevinding. Een koppeling die naar
een niet-bestaande kolom wijst is een **fout** en geen waarschuwing — die zou
nooit iets vinden en het gat zou stilzwijgend blijven staan.

## Scanlogica

De motor is `src/intake`, `src/spec`, `src/questions` en `src/engine`. Die blijft
**puur**: geen DOM, geen `fetch`, geen `fs`, geen datum-van-nu, geen database.
Alles wat de scan nodig heeft komt binnen als argument. Zo draait dezelfde code
in de browser en straks serverzijdig.

- **Nooit scanlogica in een component.** Zie je het toch gebeuren, breng het
  terug naar de motor en importeer het.
- **De motor heeft geen klok.** Tijd komt binnen als argument: `runScan` krijgt
  `scannedAt` mee, de mutaties krijgen `at` mee. Anders geeft dezelfde invoer
  twee keer een ander rapport.
- Verandert een regel die de uitkomst op ongewijzigde data kan veranderen, dan
  gaat `SCAN_VERSION` in `src/engine/version.ts` omhoog. Zonder dat lijkt een
  verschoven definitie op vooruitgang.
- Elk resultaat draagt scanversie, veldenregister, vragenbank én vragenset-versie.

## Zwaar werk

De intake en de scan draaien in een Web Worker (`src/worker/`). De worker houdt
de datasets vast; ze gaan één keer naar de pagina. Terugsturen om te kunnen
scannen zou dezelfde duizenden producten nog een keer door de structured clone
duwen. Is er geen worker beschikbaar, dan valt `ScanClient` terug op de
hoofddraad en zegt de UI dat erbij — stil falen is hier het slechtste van twee
werelden.

## Opslag

Bewaarde scans gaan via `SnapshotStore` in `src/storage/`, nooit rechtstreeks via
`localStorage` vanuit een component. Hetzelfde geldt voor het oordeel van de
merchant over zijn categorieboom (`VerdictStore`): dat blijft bewaard omdat een
modelvoorstel niet elke keer hetzelfde is, en twee scans anders op verschillende
definities zouden kunnen rusten. Er wordt een **snapshot** bewaard en geen
rapport: tellingen, categorienamen en veldnamen, geen productdata en geen
bronbestand. Dat houdt de belofte overeind dat de catalogus het apparaat niet
verlaat, ook zodra er serverzijdig bewaard wordt.

## Merchant-data

Elke tabel die merchant-data raakt krijgt een `account_id`, ook nu er nog geen
login is. Achteraf toevoegen betekent een migratie op data die er al staat.

## Werken in deze repo

- Imports **zonder** `.ts`/`.tsx`-extensie; Next lost ze zelf op en TypeScript
  weigert ze anders.
- Controleren doe je met `npm test`, `npm run typecheck` en `npm run build`.
  De tests draaien op `node --test` via een esbuild-bundel; ze hebben geen
  browser nodig en bewaken onder meer dat de motor puur blijft.
- De motor headless draaien op echte bestanden:
  ```
  npx esbuild scripts/scan-cli.ts --bundle --platform=node --format=esm --outfile=/tmp/scan-cli.mjs
  node --max-old-space-size=4096 /tmp/scan-cli.mjs <catalogus> [vragenbank.yaml]
  ```
- Push naar `main` deployt automatisch naar Render.
