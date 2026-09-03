@AGENTS.md

# Projectregels

Lees bij het oppakken van een sessie eerst `NOTES.md` — daar staan de stand, de
genomen beslissingen en wat er open is.

## Wat deze app is

De scan is **volledig deterministisch**. Klantvragen worden beantwoord uit
gestructureerde attributen, niet uit lopende tekst, en er komt geen model aan te
pas. Dezelfde feed geeft altijd hetzelfde rapport en een scan kost niets.

De analyse draait **client-side**; er zijn geen serverroutes en productdata
verlaat de browser niet.

Volgorde van de analyse: eerst de feed (dat is wat de agent leest), dan pas de
catalogus om te bepalen of een gat een mappingfout is of een echt gat.

## Mapstructuur

| Map | Wat er hoort |
|---|---|
| `src/intake/` | formaatdetectie en kolomherkenning |
| `src/spec/` | veldenregister ACP + UCP, met tier en eigenaar per veld |
| `src/questions/` | archetypen, generator, mutaties met changelog |
| `src/engine/` | join, evaluatie, checklists, rapportaggregatie |
| `src/i18n/` | alle teksten, NL en EN naast elkaar |
| `components/` | UI; `ui.tsx` draagt de gedeelde bouwstenen |
| `app/` | routes |
| `scripts/` | headless testharnas, geen productiecode |

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
