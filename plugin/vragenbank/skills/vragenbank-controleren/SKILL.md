---
name: vragenbank-controleren
description: Controleert een bestaande vragenbank of vragenlijst op herkomst, verzonnen getallen, dode bronnen en de bekende anti-patronen. Gebruik dit wanneer iemand vraagt om een vragenbank na te kijken, te valideren, te controleren of te beoordelen — bijvoorbeeld "klopt deze vragenlijst", "check deze vragenbank", "zijn deze drempels onderbouwd" — en ook als laatste stap nadat een vragenbank net gemaakt is.
---

# Een vragenbank controleren

Je beoordeelt niet of de vragen *goed* zijn — dat kan alleen een domeinexpert.
Je controleert of de bank **zijn bewijs draagt**. Dat is machinaal na te lopen en
het vangt de faalvormen die een taalmodel structureel vertoont.

De uitkomst is geen cijfer maar een lijst: wat is er mis, waar, en wat moet er
gebeuren. Keur nooit iets af zonder te zeggen wat de uitweg is.

## Vier poorten

Loop ze in deze volgorde af. Elke poort levert bevindingen op; ga altijd door
naar de volgende, ook als de eerste er veel oplevert.

### 1. Herkomst afdwingen

Per vraag:

- Draagt hij een `dekking` **met** de sites erbij? Dekking zonder sitepanel is
  niet reproduceerbaar en hoort leeg te zijn.
- Is `dekking` leeg waar het onderzocht had moeten zijn? Leeg betekent "niet
  onderzocht"; `0` betekent "geen enkele site behandelt dit" en dat is een
  vondst. Vallen die twee samen, dan is de meting waardeloos.
- Noemt een `beslisregel` een drempel? Dan hoort daar een bron bij. **Een drempel
  zonder bron wordt niet afgekeurd maar gedegradeerd**: markeer hem als
  beredeneerd, haal hem uit de score en zet hem bij de open punten. Zo kan een
  verzonnen norm nooit als feit in een rapport belanden.
- Staat er een certificering, norm of normnummer? Controleer of die bestaat en of
  hij op dit producttype slaat. Een gordijnnorm is geen meubelnorm.

### 2. De bron terugvragen

Voor elke vraag met een bron-URL: haal de pagina op en controleer of het
onderwerp er werkelijk in voorkomt. Een dode link of een pagina die er niet over
gaat, is een afwijzing. Dit vangt de belangrijkste faalvorm van een model — een
plausibele bron die niet bestaat.

Kun je niet bij de pagina, meld dat als "niet te controleren" en niet als "fout".
Dat verschil telt.

### 3. Twee onafhankelijke lezingen

Lees de bank een tweede keer met een ander vertrekpunt: stel per vraag vast welk
bewijs je zélf zou verwachten, zonder naar de ingevulde attributen te kijken.
Waar jouw lijst en de bank uiteenlopen, is dat een bevinding — niet
noodzakelijk een fout, wel iets om na te lopen.

### 4. Criticus tegen de anti-patronen

Vink deze concrete fouten af. Dit zijn er zes en ze zijn hard:

| Fout | Waaraan je hem herkent |
|---|---|
| Attribuutnaam in plaats van klantvraag | "Martindale-waarde" waar "is deze stof sterk genoeg voor mijn bank" hoort |
| Bank op één site gebaseerd | alle bronnen wijzen naar hetzelfde domein |
| Verzonnen norm of getal | een drempel zonder bron, of een normnummer dat niet bestaat |
| Duurzaamheidsclaim zonder certificering | "milieuvriendelijk" zonder verifieerbaar label |
| Gewicht dat afwijkt van het belang | de weging hoort vast te liggen: kritiek 5, hoog 3, middel 2, laag 1 |
| Overlay die een basisvraag herschrijft | dezelfde `id` met een andere tekst; herwegen mag, herschrijven niet |

## Twee dingen die géén fout zijn

**Tegenspraak tussen sites.** Hanteert de ene site 30.000 Martindale en de andere
40.000, dan horen beide vastgelegd te worden met het verschil bij de open punten.
Dat is een inhoudelijke discussie voor de domeinexpert.

**Een vraag die niets kan dragen.** Procesvragen als "kan ik een staal krijgen"
horen in de bank te staan met `telt_mee_in_score: nee`. Ontbreekt die markering,
dán is het een bevinding.

## Wat je oplevert

Een lijst, gesorteerd op ernst, met per bevinding:

- welke vraag (het id), en wat er mis is
- of het **blokkerend** is (een verzonnen getal), **te herstellen** (een
  ontbrekende bron) of **ter beoordeling** (tegenspraak tussen sites)
- wat er moet gebeuren

Sluit af met één zin: hoeveel vragen zijn gecontroleerd, hoeveel bevindingen, en
of de bank wat jou betreft naar de domeinexpert kan.

Zeg nooit dat een bank "goedgekeurd" is. Jij controleert de herkomst; de inhoud
blijft mensenwerk.
