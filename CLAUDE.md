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

De analyse draait **client-side**; er zijn geen serverroutes en productdata
verlaat de browser niet.

## Mapstructuur

| Map | Wat er hoort |
|---|---|
| `src/intake/` | formaatdetectie en kolomherkenning |
| `src/spec/` | veldenregister: kolomaliassen en eigenaar per veld |
| `src/questions/` | vragenbanken, composer, generator, import en aanvraag |
| `src/engine/` | join, evaluatie, checklists, rapportaggregatie |
| `src/i18n/` | alle teksten, NL en EN naast elkaar |
| `components/` | UI; `ui.tsx` draagt de gedeelde bouwstenen |
| `app/` | routes |
| `scripts/` | headless testharnas, geen productiecode |
| `kennis/_methode/` | de methode en de promptreeks; documentatie, geen code |

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
volgens `kennis/_methode/`. Vier regels die altijd gelden:

- **Een bank hoort bij een vertical, niet bij een merchant.** Nooit een bank
  genereren uit de site of de catalogus van één winkel: dan meet je zijn blinde
  vlekken mee en zijn twee merchants in dezelfde markt niet meer vergelijkbaar.
  Zijn site is één van de vijf à acht panelsites.
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

`belang` weegt mee in de trechter via een eigen trede: **basisgeschikt** is elke
kritieke vraag beantwoord, **volledig** blijft élke gescoorde vraag. Geen gewogen
percentagedrempel — zie de afgevallen richtingen in `NOTES.md`.

Een gat draagt zijn oorzaak, en die volgt uit één bron: `unfilled` (de kolom
bestaat, staat leeg — invulwerk), `unmodelled` (geen kolom — modelwerk) of
`no-source` (komt uit een systeem dat een catalogus niet draagt). Elk gat draagt
ook de vragen die het blokkeert.

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
- Elk resultaat draagt scanversie, spec-snapshot én vragenset-versie.

## Zwaar werk

De intake en de scan draaien in een Web Worker (`src/worker/`). De worker houdt
de datasets vast; ze gaan één keer naar de pagina. Terugsturen om te kunnen
scannen zou dezelfde duizenden producten nog een keer door de structured clone
duwen. Is er geen worker beschikbaar, dan valt `ScanClient` terug op de
hoofddraad en zegt de UI dat erbij — stil falen is hier het slechtste van twee
werelden.

## Opslag

Bewaarde scans gaan via `SnapshotStore` in `src/storage/`, nooit rechtstreeks via
`localStorage` vanuit een component. Er wordt een **snapshot** bewaard en geen
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
  node --max-old-space-size=4096 /tmp/scan-cli.mjs <feed> [catalogus]
  ```
- Push naar `main` deployt automatisch naar Render.
