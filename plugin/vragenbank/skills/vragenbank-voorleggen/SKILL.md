---
name: vragenbank-voorleggen
description: Maakt van een vragenbank een leesbaar document om aan een domeinexpert of vakspecialist voor te leggen, met gerichte vragen waar hun oordeel nodig is. Gebruik dit wanneer iemand een vragenbank wil laten nakijken door iemand uit het vak — bijvoorbeeld "leg dit voor aan een expert", "maak er een leesbare versie van", "ik wil dit laten reviewen door een stoffenspecialist".
---

# Een vragenbank voorleggen aan een domeinexpert

Zonder review heb je plausibel advies, niet goed advies — en dat is precies wat
een generiek taalmodel ook levert. Deze stap is niet optioneel.

Je maakt een document dat een vakmens in twintig minuten kan doorlopen. Niet de
CSV: die is voor de machine. Een expert die naar een tabel met eenentwintig
kolommen kijkt, leest hem niet.

## Wat het document is

Markdown, leesbaar, met deze opbouw:

**1. Waar dit over gaat.** Twee alinea's: welke markt, welk panel is bekeken
(met de sites erbij en wanneer), en waarvoor deze lijst gebruikt wordt. Noem
expliciet dat vragen gemeten worden tegen de productdata van webshops.

**2. De onomkeerbare fout.** Eén alinea over de aankoopfout die de koper in deze
markt niet kan terugdraaien, en dat de vragen die die fout voorkomen het hoogste
gewicht krijgen. Vraag of dat klopt — dit is de belangrijkste vraag van het hele
document, want er hangt een weging aan.

**3. De vragen per laag en segment.** Per vraag: de tekst zoals een klant hem
stelt, het belang, en welke kenmerken nodig zijn om te antwoorden. Geen id's in
beeld tenzij het nodig is om naar iets te verwijzen. Groepeer per segment, en
zet binnen een segment de kritieke vragen bovenaan.

**4. Wat we onzeker weten.** De open punten, en dat is waar de expert het meest
voor terugkomt:

- beredeneerde drempels — getallen die wij kozen en die niet gepubliceerd zijn
- tegenspraak tussen sites, met beide waarden erbij
- vragen met `dekking: 0` — niemand in de markt behandelt dit, en wij denken dat
  het wel leeft
- kenmerken waarvan we de naam in het vak niet zeker weten

**5. Vier vragen aan de expert.** Letterlijk deze, want ze halen op wat een
model niet kan weten:

- Kloppen de beredeneerde drempels?
- Zijn de vragen geformuleerd zoals klanten ze werkelijk stellen?
- Welke vraag ontbreekt die jullie dagelijks krijgen?
- Hoort een kenmerk op product- of op variantniveau?

## Toon en vorm

Schrijf voor iemand die het vak kent en ons product niet. Gebruik zijn woorden,
niet die van ons: "schuurweerstand" en niet "attribuutdekking".

Zet geen jargon uit de scan in het document — geen "overlay", geen "modus", geen
"attribuutschuld". Waar zo'n begrip toch nodig is, leg het in één bijzin uit.

Markeer elk getal dat wij zelf gekozen hebben zichtbaar als zodanig. Een expert
die niet kan zien wat gepubliceerd is en wat wij bedachten, kan er ook niets over
zeggen — en ongemarkeerde eigen getallen zijn de snelste manier om zijn
vertrouwen te verliezen.

Houd het onder de tien pagina's. Krijg je het niet korter, zet de volledige lijst
dan achterin als bijlage en de kritieke vragen vooraan.

## Wat je oplevert

Het document, plus één korte notitie voor de opdrachtgever: hoeveel vragen erin
staan, hoeveel open punten er zijn, en welke drie het belangrijkst zijn om
beantwoord te krijgen.
