---
name: aanvraag-oppakken
description: Haalt de eerstvolgende openstaande aanvraag voor een vragenbank op uit de readiness-scan, maakt de bank en levert hem terug. Gebruik dit wanneer iemand vraagt om openstaande aanvragen te verwerken, de wachtrij te legen of te kijken of er werk klaarstaat — bijvoorbeeld "pak de openstaande aanvraag op", "is er werk voor me", "verwerk de wachtrij". Wordt ook aangeroepen door de geplande taak die drie keer per dag draait.
---

# Een aanvraag uit de wachtrij oppakken

Je bent de uitvoerder. De app zet aanvragen klaar, jij maakt de vragenbank en
levert hem terug. Er zit geen mens tussen die de opdracht overtypt.

**Is er niets te doen, zeg dan niets.** Deze vaardigheid draait drie keer per dag;
elke keer melden dat de wachtrij leeg is levert alleen ruis op. Stop stil.

## Wat je nodig hebt

Twee instellingen. Vraag ze één keer en onthoud ze voor het vervolg:

- **Het adres van de app.** In ontwikkeling `http://localhost:3000`, live het
  adres van de Render-service.
- **De uitvoerderssleutel.** Die staat bij de app onder `BANK_EXECUTOR_KEY`.
  Stuur hem mee als header `x-executor-key`.

Ontbreekt er een, vraag erom en stop. Ga nooit zelf een sleutel verzinnen of
zoeken.

## Stap 1 — Kijken of er werk is

```
GET {adres}/api/bank-queue
x-executor-key: {sleutel}
```

Drie mogelijke antwoorden:

| Antwoord | Wat je doet |
|---|---|
| `{"request": null}` | Niets te doen. **Stop, en meld niets.** |
| Een aanvraag | Ga door naar stap 2. Hij staat nu op `running`; niemand anders pakt hem. |
| 401 of 503 | De sleutel klopt niet of de app is niet ingericht. Meld dat en stop. |

Wat er in een aanvraag zit: `id`, `vertical` (de markt), `segments` (de
marktsegmenten met hun aantallen), `merchantSite` (de winkel van de aanvrager) en
`suggestedSites` (webshops die hij aandroeg).

Pak er **één** per keer. Loopt er nog een taak, dan is die van jou.

## Stap 2 — De bank maken

Draai de vaardigheid **vragenbank-maken** met wat je kreeg:

- de markt uit `vertical`
- de categorieën uit `segments`. **Dat zijn nog geen marktsegmenten.** De app
  stuurt alles door wat de merchant als categorie bevestigde — vaak tientallen,
  en het merendeel is een toepassing binnen een segment (banken, eetkamerstoelen,
  poefs binnen meubelstoffen). Groepeer ze eerst, volgens stap 2b van
  **vragenbank-maken**. Wat een toepassing is krijgt geen eigen overlay maar een
  toepassingsprofiel; alleen wat een eigen vragenset verdient wordt een overlay.
  Meld in je oplevering welke groepering je koos — dat is een oordeel over de
  markt en de merchant moet het kunnen tegenspreken.
- `merchantSite` als **één** panelsite, nooit als enige bron
- `suggestedSites` worden **toegevoegd** aan het panel dat jij samenstelt, niet
  overgenomen. De panelregels blijven gelden: vijf sites van verschillende
  soorten. Zou de aanvrager het panel bepalen, dan meet hij zichzelf rijk.

**Leg elke bezochte site vast** met naam, URL, type en de datum waarop je hem
raadpleegde, en stuur dat panel mee terug. Dat is niet optioneel: zonder panel is
de dekking per vraag niet reproduceerbaar, en dan blijft er een bevinding op de
bank staan die niemand meer kan wegnemen. De merchant krijgt deze lijst bovendien
te zien — hij moet kunnen beoordelen of hij deze meetlat vertrouwt.

Kijk **niet** naar de productdata van de aanvrager. Die krijg je ook niet
aangeleverd, en dat is met opzet.

## Stap 3 — Controleren

Draai de vaardigheid **vragenbank-controleren** over je eigen uitkomst. Wat de
poorten markeren gaat mee terug als bevindingen; de app zet de bank dan op review
in plaats van hem meteen vrij te geven.

Herstel wat je zelf kunt herstellen voordat je opstuurt. Een bevinding die je met
tien minuten werk had kunnen wegnemen, is geen bevinding maar luiheid.

## Stap 4 — Terugsturen

```
POST {adres}/api/bank-result
x-executor-key: {sleutel}
content-type: application/json

{
  "requestId": "...",
  "csv": "de volledige vragenlijst",
  "panel": [{ "name": "...", "url": "...", "type": "...", "consultedAt": "JJJJ-MM-DD" }],
  "findings": ["wat een mens moet nalopen"]
}
```

De app leest je lijst in met dezelfde lezer die de merchant gebruikt.

| Antwoord | Wat het betekent |
|---|---|
| `stored: true` | Binnen. Meld hoeveel vragen en overlays er zijn en of er bevindingen waren. |
| 422 met `errors` | **Je lijst is niet ingelezen en er is niets bewaard.** Repareer wat de fouten noemen en stuur opnieuw. Verzin geen omweg. |
| 401 of 503 | Sleutel of inrichting. Meld het en stop. |

Een 422 is geen mislukking van de app maar van de lijst. De foutmeldingen zeggen
precies wat er mis is — meestal een ontbrekende kolom of een laag die nergens
`base` heet.

## Wanneer je wél iets meldt

- Er is een bank aangeleverd: hoeveel vragen, hoeveel overlays, hoeveel
  bevindingen, en welke sites in het panel zaten.
- Er ging iets mis waar een mens naar moet kijken.

En verder niet. Een lege wachtrij is geen nieuws.
