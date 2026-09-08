# Ontwerp — van upload tot vragenbank en terug

Hoe een merchant die zijn catalogus aanlevert uiteindelijk een scan krijgt die op
de vragen van zíjn markt meet, zonder dat hij ooit een vragenlijst uploadt.

Status: ontwerp. Nog niets hiervan is gebouwd behalve waar dat expliciet staat.
Geschreven op 8 september 2026.

---

## 1. Wat er vandaag werkt, en wat niet

| Onderdeel | Staat |
|---|---|
| Catalogus inlezen, scannen, rapport | **werkt**, gemeten op twee echte catalogi |
| Categoriescherm: categorie of kenmerk | **werkt**, met sitecrawl en modelvoorstel |
| Vragenbank inlezen uit een CSV | **werkt**, tweetalig, nul fouten op twee banken |
| Inloggen, registreren, wachtwoord vergeten | **werkt** tegen het echte Supabase-project |
| Wachtscherm in plaats van uploadvraag | **werkt** |
| Wachtrij: tabel en route | **geschreven, niet in gebruik** — migratie niet gedraaid, niets roept de route aan |
| De generatie zelf | **handwerk** — een mens draait de methode |
| Resultaat terug in de app | **bestaat niet** |
| Mail naar de merchant | **bestaat niet** |

---

## 2. De beperking die het ontwerp bepaalt

**Cowork kan niet van buitenaf gestart worden.** Er is geen adres waar de app
naartoe kan bellen om een sessie te beginnen; daar zit altijd een mens die begint.

Er bestaat wel een geplande taak, maar die draait alleen terwijl de desktop-app
openstaat. Dat maakt hem bruikbaar als hulpje en ongeschikt als belofte aan een
betalende klant: dan hangt zijn levertijd aan een laptopdeksel.

Daaruit volgt de kern van dit ontwerp:

> **De instructies staan op één plek. De uitvoerder is inwisselbaar.**

De plugin in `plugin/vragenbank/` is die ene plek. Wie hem uitvoert — jij in
Cowork, een geplande taak op je Mac, of straks een achtergrondproces op Render —
verandert niets aan wát er gebeurt. Dat is de reden om nu geen keuze te forceren
die je later duur moet terugdraaien.

---

## 3. De keten, stap voor stap

### Stap 1 — De merchant levert aan en bevestigt zijn categorieën

Bestaat al. Aan het eind van het categoriescherm weet de app:

- de categoriepaden met aantallen, en welke daarvan een **kenmerk** zijn
- de **marktsegmenten** die overblijven (facetten eruit)
- de URL van zijn webshop, als hij die gaf

### Stap 2 — De app bepaalt of er iets te doen is

Twee vragen, in deze volgorde:

1. **Welke markt is dit?** Eén kleine modelaanroep over alleen de categorienamen,
   met de merchant die bevestigt. Zelfde patroon als het koppelscherm.
2. **Kennen we die markt al?** Ligt er een bevroren bank voor `woontextiel`, dan
   is er niets aan te vragen: hij scant meteen en dit hele ontwerp slaat over.

Alleen als het antwoord op 2 nee is, ontstaat er een aanvraag.

### Stap 3 — De aanvraag komt in de wachtrij

Tabel `bank_requests`, al geschreven in `supabase/migrations/0002_bank_requests.sql`.

Wat erin gaat: markt, segmenten met aantallen, de URL van de winkel, het account
dat hem aanvroeg. Wat er **niet** in gaat: productrijen, kolomnamen, prijzen.
Dat is fase 3 van de methode en tegelijk de privacybelofte.

Eén openstaande aanvraag per markt, afgedwongen door een index. Komen er drie
woontextiel-merchants in dezelfde week, dan wachten ze op dezelfde taak.

De merchant ziet het wachtscherm en kan weg.

### Stap 4 — De uitvoerder pakt de aanvraag op

Hier zit de enige plek waar de uitvoerders van elkaar verschillen.

**Uitvoerder A — jij in Cowork, met of zonder geplande taak**

De plugin krijgt er een vaardigheid bij: *aanvraag oppakken*. Die doet:

1. `GET /api/bank-queue` met een uitvoerderssleutel → de oudste openstaande
   aanvraag, of leeg.
2. Zet hem op `running` zodat een tweede sessie hem niet ook oppakt.
3. Draait *vragenbank maken* met die markt, die segmenten en die URL.
4. Draait *vragenbank controleren* over de uitkomst.
5. `POST /api/bank-result` met de CSV en de bevindingen.

Zonder geplande taak zeg jij in Cowork "pak de openstaande aanvraag op". Met een
geplande taak gebeurt dat elke ochtend vanzelf, zolang de app openstaat.

**Uitvoerder B — een achtergrondproces op Render**

Een cron die elk kwartier dezelfde twee endpoints aanroept en tussendoor de
Claude API gebruikt met de markdown uit de plugin als systeeminstructie. Draait
zonder mens en zonder laptop. Kosten: ongeveer twaalf dollarcent per maand aan
rekentijd, plus de modelaanroepen per markt.

Beide uitvoerders praten met dezelfde twee endpoints en gebruiken dezelfde
instructies. Overstappen van A naar B is een nieuwe aanroeper en geen verbouwing.

### Stap 5 — Het resultaat komt binnen

`POST /api/bank-result` doet, in deze volgorde:

1. **Authenticeren** op de uitvoerderssleutel. Zonder geldige sleutel: 401.
2. **Inlezen** met `importQuestionList`. Levert dat fouten op, dan wordt er niets
   opgeslagen: de aanvraag gaat naar `failed` met de foutmelding erbij. Een bank
   die de app niet kan lezen is geen bank.
3. **Poortcontrole**: draagt elke drempel een bron, en elke dekking zijn
   panelsites? Wat dat niet doet wordt gedegradeerd tot beredeneerd en telt niet
   mee in de score. Dit gebeurt serverzijdig en niet op het woord van de
   uitvoerder.
4. **Opslaan** in `question_banks`, op markt en niet op account.
5. **Status** naar `review` als er bevindingen zijn, anders naar `ready`.

### Stap 6 — Vrijgeven

Staat de aanvraag op `review`, dan kijk jij ernaar in het beheerscherm en geef je
hem vrij. Staat hij op `ready`, dan is die stap al gedaan.

Vrijgeven is één handeling en die veroorzaakt stap 7.

### Stap 7 — De merchant krijgt bericht

Elke account met een openstaande aanvraag voor deze markt krijgt een mail: je
scan staat klaar. Niet alleen de aanvrager — ook de twee andere merchants die
intussen op dezelfde bank wachtten.

`notified_at` staat los van `finished_at`, zodat een mail die niet aankwam
opnieuw verstuurd kan worden zonder de taak te herstarten.

### Stap 8 — De merchant komt terug

Hij logt in, de app vindt de bank op zijn markt, en de keten loopt verder waar
hij hem verliet: kenmerken koppelen, vragensets bevestigen, rapport.

---

## 4. Wat er aan de app bij moet

### Twee endpoints

| Route | Wie | Wat |
|---|---|---|
| `GET /api/bank-queue` | uitvoerder | oudste openstaande aanvraag, en zet hem op `running` |
| `POST /api/bank-result` | uitvoerder | de CSV plus de bevindingen; valideert, degradeert, slaat op |

Beide op een **uitvoerderssleutel** in een header, niet op een gebruikerssessie.
Die sleutel staat in de omgeving van de app en in de plugin-instellingen. Hij is
niet dezelfde als de servicesleutel van Supabase en mag minder.

### Eén tabel erbij

`question_banks`: markt, versie, status, de CSV zelf, de bevindingen, wie hem
vrijgaf en wanneer. Op markt en niet op account — dat is de beslissing van
paragraaf 5. Row level security: iedereen die is ingelogd mag een **bevroren**
bank van zijn eigen markt lezen; schrijven mag alleen de uitvoerderssleutel.

### Eén beheerscherm

Een lijst met openstaande aanvragen en banken die op review wachten, met per
bank de bevindingen van de poorten en één knop: vrijgeven. Alleen voor jou.

### Mail

Eén sjabloon, tweetalig: *je scan staat klaar*. Verstuurd bij vrijgave. Vereist
een mailprovider; Resend is de eenvoudigste en gratis tot 3.000 per maand.

---

## 5. Beslissingen die vastliggen

**De bank hoort bij de markt, niet bij het account.** De aanvraag hoort bij een
account, de uitkomst niet. Twee merchants in dezelfde markt moeten langs dezelfde
meetlat, anders is vergelijken zinloos — en dat vergelijken is het bestaansrecht
van de bank. Gevolg: de tiende merchant in woontextiel kost niets en wacht niet.

**De uitvoerder is inwisselbaar.** Eén bron van instructies, twee mogelijke
aanroepers, dezelfde twee endpoints.

**De app vertrouwt de uitvoerder niet op zijn woord.** Inlezen, poorten en
degraderen gebeuren serverzijdig. Een uitvoerder die een verzonnen drempel
meestuurt, krijgt hem gedegradeerd terug.

**Er gaat geen productdata naar de uitvoerder.** Categorienamen met aantallen en
een URL. Het type kan niet meer dragen en er staat een test op.

---

## 6. Wat er misgaat, en wat er dan gebeurt

| Wat | Gevolg |
|---|---|
| Uitvoerder valt uit tijdens het werk | Aanvraag blijft op `running`. Na 24 uur zet de volgende ophaal hem terug op `queued`. |
| Twee uitvoerders tegelijk | De index laat één openstaande aanvraag per markt toe; de tweede krijgt niets. |
| De geleverde CSV leest niet in | Niets opgeslagen, status `failed` met de foutmelding. Zichtbaar in je beheerscherm. |
| Drempels zonder bron | Gedegradeerd tot beredeneerd, buiten de score, zichtbaar bij de open punten. |
| De mail komt niet aan | `notified_at` blijft leeg; opnieuw versturen zonder de taak te herstarten. |
| Er komt nooit een bank | De merchant blijft op het wachtscherm. Na een week hoort daar een bericht bij dat het langer duurt. Nog te ontwerpen. |

---

## 7. Volgorde van bouwen

1. **Migratie draaien** en de wachtrij aansluiten op het wachtscherm. Dan is de
   aanvraag echt en zie je hem staan.
2. **De twee endpoints** plus de uitvoerderssleutel.
3. **De vaardigheid *aanvraag oppakken*** in de plugin. Vanaf hier werkt de keten
   met jou als uitvoerder.
4. **Het beheerscherm** met vrijgeven.
5. **De mail.**
6. *Later, als het volume erom vraagt:* het achtergrondproces op Render.

Stap 1 tot en met 3 maken de keten sluitend. Stap 4 en 5 maken hem bruikbaar voor
iemand anders dan jij.

---

## 8. Wat ik nog niet weet

- **Draait een geplande taak in Cowork op dezelfde manier als hier?** Dat bepaalt
  of stap 3 al zonder klik werkt of pas met uitvoerder B.
- **Hoe lang mag een merchant wachten voordat de app iets zegt?** Nu staat er
  "één tot twee werkdagen" op het scherm. Er is nog geen bericht als dat niet
  gehaald wordt.
- **Wat gebeurt er met een bank die al bevroren is en herzien moet worden?**
  Een nieuwe versie, en dan waarschuwt de app bij het vergelijken. Het pad
  eromheen — wie dat mag starten, en wat er met lopende scans gebeurt — is nog
  niet ontworpen.
