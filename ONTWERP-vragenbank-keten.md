# Ontwerp — van upload tot vragenbank en terug

Hoe een merchant die zijn catalogus aanlevert uiteindelijk een scan krijgt die op
de vragen van zíjn markt meet, zonder dat hij ooit een vragenlijst uploadt.

Status: gebouwd, op de mail na. Geschreven op 8 september 2026; op 9 september
bijgewerkt toen de generatie zelf in de app kwam te draaien — zie paragraaf 3a,
die de keuze voor uitvoerder A en B vervangt. Op 11 september bijgewerkt na de
eerste echte markt: paragraaf 3a (hoe de reeks werkelijk draait, de batchroute,
de lat voor een overlay), 3b (wat er bij de merchant gebeurt) en 6 (wat er in
de eerste week misging).

---

## 1. Wat er vandaag werkt, en wat niet

| Onderdeel | Staat |
|---|---|
| Catalogus inlezen, scannen, rapport | **werkt**, gemeten op twee echte catalogi |
| Categoriescherm: categorie of kenmerk | **werkt**, met sitecrawl en modelvoorstel |
| Vragenbank inlezen uit een CSV | **werkt**, tweetalig, nul fouten op twee banken |
| Inloggen, registreren, wachtwoord vergeten | **werkt** tegen het echte Supabase-project |
| Wachtscherm in plaats van uploadvraag | **werkt** |
| Wachtrij: tabel en route | **werkt** |
| De generatie zelf | **werkt**, als vaste reeks in de app — zie paragraaf 3a. Woontextiel v1 en v2 zijn zo gemaakt. |
| Beheerscherm met vrijgeven | **werkt**, per categorie en per vraag te beoordelen |
| Overzicht van alle banken | **werkt**, per markt en versie |
| Resultaat terug bij de merchant | **werkt** — hij kiest een vrijgegeven bank na het categoriescherm, zie 3b |
| Aansturing zonder laptop | **beschreven, niet aan** — staat in `render.yaml`, maar is niet aangemaakt in Render; zie 3a |
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

### Stap 1b — De merchant mag panelsites aandragen

Voordat er iets onderzocht wordt, vraagt de app: **welke webshops moeten we
bekijken?** Hij kent zijn markt en weet wie de serieuze spelers zijn.

Drie regels eromheen, want zijn inbreng mag het panel niet kapen:

1. **Wat hij aandraagt wordt toegevoegd, niet overgenomen.** De panelregels
   blijven gelden: vijf sites, van verschillende soorten
   (categorieleiders, een specialist, merk- of fabrikantsites, één tot twee
   buitenlandse). Zou een merchant het panel volledig bepalen, dan kiest hij zijn
   zwakste concurrenten en meet hij zichzelf rijk.
2. **Geeft hij niets op, dan zoeken wij ze.** Dat is de normale gang; de vraag is
   een uitnodiging en geen voorwaarde.
3. **Zijn eigen winkel is één panelsite**, nooit de enige.

**Hoe wij een site kiezen als de merchant niets aandraagt.** Niet op gevoel, maar
op na te lopen signalen, in deze volgorde:

| Signaal | Waarom het telt |
|---|---|
| Reviews **onder een keurmerk** — WebwinkelKeur, Thuiswinkel Waarborg, Trusted Shops | Aantallen die een derde partij bijhoudt zijn niet zelf te schrijven. Reviews op de site zelf tellen niet mee. |
| Aantal reviews, niet het cijfer | Een winkel met 4,7 uit 12 reviews zegt niets over marktomvang; 4,3 uit 4.000 wel. |
| Breedte van het assortiment | Een site die de hele markt voert dekt meer vragen dan een nichespeler — maar één specialist hoort er juist bij voor de diepte. |
| Diepte van de productinformatie | Sites die specificaties, testnormen en beslisregels publiceren zijn waardevoller als bron, ook als ze kleiner zijn. |
| Fysieke aanwezigheid of leeftijd | Een keten met winkels of een bedrijf dat er tien jaar is, is zelden een eendagsvlieg. |
| Land | Eén tot twee Duitse of Britse sites; die publiceren in vrijwel elke markt meer technische data. |

Wat we **niet** gebruiken: advertenties, zoekpositie en verkooppraat op de site
zelf. Wie bovenaan Google staat heeft daarvoor betaald.

Het gekozen panel wordt vastgelegd met naam, URL, type en de datum waarop het
geraadpleegd is — en het gaat mee naar de merchant, zie paragraaf 4b.

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

**De geplande taak draait om 08:00, 12:00 en 17:00**, elke dag. Jij hoeft niets
aan te klikken. Vindt hij niets, dan stopt hij meteen en meldt hij niets — anders
krijg je drie berichten per dag over niets.

Vijf dingen die je van deze opzet moet weten, want ze bijten pas als het misgaat:

1. **Hij draait alleen terwijl de app openstaat.** Staat je Mac uit om 08:00, dan
   draait die beurt bij de eerstvolgende start. "Drie keer per dag" is dus in de
   praktijk "hoogstens drie keer per dag". De vertragingsmails in paragraaf 6
   bestaan precies hiervoor.
2. **Een generatie duurt langer dan een beurt.** Het onderzoek gaat over vijf à
   acht sites. Sluit je de app halverwege, dan blijft de aanvraag op `running`
   staan; na 24 uur zet de volgende beurt hem terug op `queued`. Er gaat niets
   verloren, maar er gaat wel een dag overheen.
3. **Meerdere beurten tegelijk kan niet misgaan.** Elke beurt pakt hoogstens één
   aanvraag en zet hem meteen op `running`; de index laat één openstaande
   aanvraag per markt toe. Was de app een dag dicht en lopen er drie beurten
   achter elkaar in, dan pakken ze drie verschillende aanvragen of ze vinden
   niets.
4. **De uitvoerderssleutel staat op jouw laptop.** Dat is nu goed genoeg — jij
   bent de enige uitvoerder — maar het betekent dat je machine toegang heeft tot
   het aanleveren van banken. Bij een tweede uitvoerder krijgt die zijn eigen
   sleutel, zodat je er één kunt intrekken.
5. **Het crawlen gebeurt vanaf jouw verbinding.** Panelsites zien jouw IP. Bij
   een handvol markten per maand valt dat binnen normaal bezoek; bij tientallen
   hoort het naar een server.

**Wat het kost om dit later te vervangen.** De taak is een prompt die twee
endpoints aanroept. Uitvoerder B roept dezelfde twee endpoints aan met dezelfde
instructies. Wat je dan schrijft is de aanroeper — de plugin, de endpoints, de
tabellen en de poorten blijven staan. Reken op een dag werk, niet op een
verbouwing. Dat is de hele reden dat het zo ontworpen is.

**Uitvoerder B — een achtergrondproces op Render**

Een cron die elk kwartier dezelfde twee endpoints aanroept en tussendoor de
Claude API gebruikt met de markdown uit de plugin als systeeminstructie. Draait
zonder mens en zonder laptop. Kosten: ongeveer twaalf dollarcent per maand aan
rekentijd, plus de modelaanroepen per markt.

Beide uitvoerders praten met dezelfde twee endpoints en gebruiken dezelfde
instructies. Overstappen van A naar B is een nieuwe aanroeper en geen verbouwing.

## 3a. De uitvoerder is de app zelf geworden

Paragraaf 2 hierboven ging ervan uit dat de generatie buiten de app gebeurt,
omdat Cowork niet van buitenaf te starten is. Dat klopt nog steeds, maar de vraag
bleek verkeerd gesteld: de methode in `kennis/_methode/` is **geen open
onderzoeksopdracht maar een vaste reeks van acht stappen**. Zoiets hoef je niet
aan een agent uit te besteden; dat kun je zelf draaien.

Sinds 9 september doet de app dat. `POST /api/bank-run` zet **één fase** en stopt
dan: panel, oogst per site (vijf), consolidatie, basislaag, overlay per
categorie, facetanalyse, samenstellen. Met negen overlays is een markt negentien
stappen.

Waarom één fase per beurt en niet één lange aanroep:

- **Hervatten.** Valt het om bij site vier, dan begint de volgende beurt bij site
  vier. In de agentische opzet kostte elke storing het hele onderzoek opnieuw, en
  dat was het open punt waar paragraaf 8 op eindigde.
- **Kosten.** Per fase staat er wat hij aan tokens kostte, en het model per fase
  is een tabel in `src/server/generator.ts`: lezen op Sonnet, wegen op Opus. De
  bronoogst is het leeuwendeel van de tokens en het minste denkwerk.
- **Pollen is gescheiden van werken.** Een lege wachtrij kost een HTTP-verzoek en
  geen modelaanroep. Dat was de denkfout in de eerste opzet: elk kwartier een
  cloud-sessie starten om te concluderen dat er niets te doen is.

### Hoe een beurt werkelijk loopt

- **Antwoord eerst, werk daarna.** De route antwoordt meteen en doet de fase in
  `after()`. Een fase die vijf minuten duurt, werd anders door de proxy van
  Render na een minuut afgekapt met een 502.
- **Een grendel per run.** `leased_until` in `bank_runs` zegt dat er een beurt
  loopt; een tweede beurt die tegelijk aankomt pakt hem niet. De grendel staat los
  van `updated_at`, anders wachtte elke fase twintig minuten op de vorige.
- **Drie keer dezelfde fase stuk** zet de aanvraag op `blocked`: dan hoort er een
  mens naar te kijken in plaats van dat het model het een vierde keer probeert.

### De batchroute: de helft van de prijs

Elke fase die niet het web op hoeft — consolidatie, basislaag, elke overlay en de
facetanalyse — gaat via de batch-API van Anthropic. Zelfde model, zelfde prompt,
zelfde antwoord, voor de halve prijs, alleen later: meestal binnen een paar
minuten, soms een uur. Dat is precies wat je kunt missen bij werk waar de
merchant één tot twee werkdagen voor krijgt.

De fasen die wel het web op gaan (panel en oogst) lopen direct. Niet omdat de
batch dat niet kan, maar omdat een oogstfase die stil faalt een herkansing kost
die we niet op een echte markt wilden uitproberen.

Hoe het loopt: de beurt dient de fase in en schrijft `batch_id` weg; volgende
beurten kijken of hij klaar is en antwoorden intussen `{"request":null}`. Is hij
klaar, dan wordt het antwoord opgenomen, gaat `batch_id` eraf en volgt de
volgende fase. Twee regels die elk een echte fout vangen (zie paragraaf 6):

- De batch draagt **de naam van zijn fase** als label. Een antwoord met een ander
  label is een fout en wordt nooit stil opgenomen.
- Een basislaag of overlay die zonder één vraag terugkomt, is een **mislukte
  stap** en geen magere uitkomst.

### De lat voor een eigen vragenset

Het model moet voor elke categorie die het een eigen vragenset wil geven
(`overlay`) **drie vragen noemen die daar gesteld worden en in geen enkele andere
categorie van de markt**. Noemt het er geen, dan wordt het een toepassingsprofiel
— dezelfde vragen, andere drempels. Noemt het er één of twee, dan blijft het een
overlay maar staat het als bevinding op het beoordeelscherm. Die drie vragen
staan erbij, zodat de beheerder kan zien waarop de keuze rust.

De reden: een overlay zonder eigen vragen geeft de producten eronder een
dúnnere vragenset dan hun moedercategorie, en het rapport krijgt een rij die een
onderscheid suggereert dat er niet is. Het is ook de grootste kostenpost: elke
overlay is een stap op Opus.

### Wie de reeks aanstuurt

Bedoeld is een geplande taak op Render die elk kwartier aanbelt. Hij staat
beschreven in `render.yaml` (`vragenbank-generator`, op het `starter`-plan), maar
cron jobs zitten niet in het gratis plan en hij is voor zover bekend nooit
aangemaakt. De reeks wordt nu aangestuurd door een lus in een terminal op de
laptop van de beheerder, die elke minuut aanbelt. Slaapt de laptop, dan staat de
reeks stil; er gaat niets verloren, want elke stap staat in de database, maar het
kost tijd. De taak in Render aanzetten (een paar dollar per maand, plus
`APP_URL` en `BANK_EXECUTOR_KEY` in het dashboard) lost dat op.

### De indeling is wat je vaststelt

De generatie stelt per categorie voor of hij een eigen vragenset verdient
(`overlay`), dezelfde vragen met andere drempels krijgt (`profiel`), of eigenlijk
een eigenschap is (`facet`). Dat is het enige echte oordeel in de hele keten: het
bepaalt op welk niveau het rapport meet. Het staat daarom op het beheerscherm,
boven de vragen — klopt het niveau niet, dan is beoordelen wélke vragen erin
staan zinloos werk.

Wijzigen kan niet ter plekke: een categorie alsnog tot overlay promoveren
betekent vragen schrijven die er niet zijn. Klopt de indeling niet, dan is het
antwoord niet vrijgeven en de generatie opnieuw draaien.

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

Vrijgeven zet de aanvragen voor die markt op `ready` — behalve een aanvraag
waarvoor op dat moment een nieuwe versie loopt (`running`). Die raakte het
vrijgeven eerst wel, en dan legde het de lopende generatie stil, zie paragraaf 6.

### Stap 7 — De merchant krijgt bericht

Alleen accounts met een **openstaande aanvraag** voor deze markt krijgen een
mail: je scan staat klaar. Dat is meer dan alleen de aanvrager — ook de twee
andere merchants die intussen op dezelfde bank wachtten — en minder dan iedereen
in die markt. Wie al een bank had en gewoon scant, krijgt niets; wie in een
andere markt zit al helemaal niet. De aanvraag is de enige reden om iemand te
mailen.

`notified_at` staat los van `finished_at`, zodat een mail die niet aankwam
opnieuw verstuurd kan worden zonder de taak te herstarten.

### Stap 8 — De merchant komt terug

Hij logt in, de app vindt de bank op zijn markt, en de keten loopt verder waar
hij hem verliet: kenmerken koppelen, vragensets bevestigen, rapport.

## 3b. Wat er bij de merchant gebeurt met een vrijgegeven bank

Na het categoriescherm ziet hij de banken die er al liggen (`GET /api/banks`, op
zijn eigen token, dus row level security bepaalt wat hij ziet: alleen wat is
vrijgegeven). Per markt alleen de nieuwste versie, op versienummer, met vijf
algemene vragen als voorproefje. Kiest hij er één, dan komt die binnen langs
dezelfde weg als een lijst die hij zelf inleest: dezelfde lezer, dezelfde
opslag.

**Wat de beheerder oversloeg, blijft staan maar telt niet mee.** Het
beoordeelscherm belooft dat, en `excludeFromScore` doet het: de overgeslagen
vragen krijgen `answerable: 'no'`, bij de merchant én bij winkel doormeten. Tot
11 september werd het overslaan wel opgeslagen en nergens toegepast.

**Hoe de bank op zijn boom landt.** Een product wordt gemeten op elke plek waar
het hangt, per plek zo specifiek als de bank het kent: een subcategorie met een
eigen vragenset in de bank ("Lampenkapstoffen" onder "Decoratiestoffen") krijgt
die vragen, een subcategorie zonder eigen vragen valt onder haar categorie. Zie
`placeProduct` in `src/engine/join.ts` en de beslissing van 11 september in
`NOTES.md`.

**Wat de bank niet meestuurt: de indeling.** De bank bepaalt ook welke categorie
een toepassingsprofiel is van welke overlay ("Windscherm" hoort bij
"Schaduwdoek"). Dat staat in `question_banks.grouping` maar niet in de tabel die
bij de merchant aankomt, dus een profiel valt nu onder zijn plek in de boom en
niet onder de overlay waar de bank hem bij zette. Open punt.

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

## 4b. Herkomst is zichtbaar voor de merchant

Elke bank draagt zijn panel, en dat panel is voor de merchant te zien — niet
weggestopt in een exportbestand maar op het scherm, naast zijn rapport:

| Site | Type | Geraadpleegd |
|---|---|---|
| voorbeeld.nl | categorieleider | 8 september 2026 |
| specialist.nl | specialist | 8 september 2026 |
| merk.de | buitenlands merk | 8 september 2026 |

Waarom dit niet optioneel is: de merchant moet kunnen beoordelen of hij deze
meetlat vertrouwt. Een bank die op zijn drie kleinste concurrenten leunt verdient
zijn twijfel, en dan hoort hij dat te kunnen zien in plaats van het te moeten
raden. Het is bovendien de enige manier waarop hij kan zeggen "jullie zijn de
grootste speler vergeten".

Per vraag is daarnaast te zien op hoeveel van die sites het onderwerp voorkwam en
op welke. Dat is `dekking` met zijn bronsites, en die kolom bestaat sinds
8 september in de lezer.

## 4c. Een nieuwe versie van een bank

Een bevroren bank verandert nooit. Wordt hij herzien, dan is dat een **nieuwe
versie** naast de oude, en de merchant beslist zelf of hij overstapt.

**Wat hij ziet bij het inloggen.** Een melding boven zijn dashboard: er is een
nieuwe versie van de vragenlijst voor jouw markt. Geen automatische overstap —
dat zou zijn volgende rapport onvergelijkbaar maken met zijn vorige, zonder dat
hij het merkte.

**Wat hij kan bekijken voordat hij beslist**, en dit is de kern van het scherm:

| | |
|---|---|
| **Wat erbij komt** | vragen die de nieuwe versie stelt en de oude niet |
| **Wat vervalt** | vragen die eruit gaan, met de reden |
| **Wat zwaarder of lichter weegt** | een vraag die van hoog naar kritiek gaat verandert zijn trechter |
| **Wat er aan drempels verandert** | een gepubliceerde norm die is bijgesteld, met de bron |
| **Het panel** | welke sites zijn geraadpleegd, en wat er verschilt met de vorige keer |
| **Het gevolg voor hem** | hoeveel van zijn producten er anders scoren, gerekend op zijn laatste scan |

Die laatste regel is het belangrijkst. "Er komen vier vragen bij" zegt hem niets;
"hierdoor zakt 60% van je producten uit basisgeschikt" zegt hem alles.

**Wat er gebeurt met wat er al ligt.** Zijn oude scans blijven staan op de versie
waarop ze draaiden — een rapport verandert nooit met terugwerkende kracht. Stapt
hij over, dan meet de eerstvolgende scan op de nieuwe versie en waarschuwt de app
bij het vergelijken dat de meetlat verschoven is. Die waarschuwing bestaat al.

**Wie een herziening start:** wij, niet de merchant. Een merchant die zijn eigen
bank mag herzien, herziet hem naar zijn eigen data toe.

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
| **Eén werkdag verstreken zonder resultaat** | Mail naar de beheerder (bastiaandegroot92@gmail.com) met de markt en sinds wanneer hij openstaat. De merchant merkt nog niets. |
| **Twee werkdagen verstreken** | Mail naar de merchant: het duurt langer dan verwacht, er wordt aan gewerkt, hij hoort het zodra het klaar is. Eén keer, niet elke dag opnieuw. |
| Geplande taak draait niet omdat de app dicht is | Geen taak gemist maar uitgesteld: hij draait bij de eerstvolgende start. De vertragingsmails hierboven vangen dit op — dat is precies waarvoor ze er zijn. |

**Wat er in de eerste week werkelijk misging**, en wat er nu staat:

| Wat | Wat er nu gebeurt |
|---|---|
| Het antwoord van de panelfase liep tegen de tokenlimiet | Limieten per fase opgehoogd; een afgekapt antwoord is een mislukte stap met de betaalde tokens erbij. |
| Een lange fase kreeg een 502 van de proxy | De route antwoordt meteen en werkt in `after()`. |
| Een deploy tijdens een generatie brak de lopende fase af | Geen probleem meer dan één fase: de grendel verloopt en de volgende beurt pakt hem opnieuw. |
| Twee overlays kozen hetzelfde vraag-id | Hernoemd bij het inlezen in plaats van de hele bank af te keuren op de laatste stap. |
| Na een batch bleef `batch_id` staan, en elke volgende fase kreeg het antwoord van de consolidatie | `batch_id` gaat eraf na opnemen; een batch draagt het label van zijn fase; een lege stap faalt. De eerste batchrun leverde een lege bank op die bij het afleveren terecht werd geweigerd. |
| Vrijgeven van v2 zette de aanvraag op `ready` terwijl v3 op dezelfde aanvraag liep | Vrijgeven raakt `running` niet meer. |
| Elke regel stond als "beredeneerd" omdat de tabel geen plek had voor de bron van een drempel | Kolom `beslisregel_bron` erbij. |

---

## 7. Volgorde van bouwen

1. **Migratie draaien** en de wachtrij aansluiten op het wachtscherm. Dan is de
   aanvraag echt en zie je hem staan.
2. **De twee endpoints** plus de uitvoerderssleutel.
3. **De vaardigheid *aanvraag oppakken*** in de plugin. Vanaf hier werkt de keten
   met jou als uitvoerder.
4. **Het beheerscherm** met vrijgeven.
5. **De mail.**
6. **De geplande taak op Render aanzetten** die al in `render.yaml` staat, zodat
   de reeks niet meer van een laptop afhangt.

Stap 1 tot en met 4 staan. De generatie loopt sinds 9 september in de app zelf
en niet via de plugin; stap 3 is daarmee vervangen door paragraaf 3a.


---

## 8. Wat ik nog niet weet

- **Draait een geplande taak in Cowork precies zoals hier?** Het mechanisme is
  hetzelfde en de beperking "alleen terwijl de app openstaat" staat er expliciet
  bij. Of Cowork dezelfde taken toont en beheert, weten we pas als de taak er
  staat. Besloten: we bouwen hem, met de risico's uit stap 4 op tafel.
- **Wat een markt werkelijk kost.** Woontextiel v2 ging volledig direct en kostte
  rond de zeven dollar. v3 is de eerste die via de batchroute loopt; de
  verwachting is ongeveer de helft. Het echte getal staat in `bank_runs` zodra
  hij klaar is.
- **Kloppen de dekkingsgetallen?** "Komt voor op 3 van de onderzochte sites" is
  een telling van het model. Elke gevonden vraag draagt het adres van de pagina,
  maar niemand controleert of de vraag daar staat. Twee dingen zouden helpen: de
  adressen tonen op het beoordeelscherm, en de app zelf laten nagaan of het
  getal klopt met de genoemde sites.
- **Wanneer is een markt "dezelfde markt"?** Twee merchants noemen hun markt
  misschien anders terwijl het er één is. De sleutel is nu een genormaliseerde
  naam; dat gaat een keer botsen. Bij de eerste echte proef gebeurde het meteen:
  dezelfde winkel diende in twee minuten "woontextiel" en "meubelstoffen" in, en
  de index liet dat door omdat het voor de database twee markten zijn. Het scherm
  waarschuwt nu als de markt gelijk is aan een van zijn eigen categorieën, maar
  twee merchants die dezelfde markt anders noemen worden nog niet gevonden.
