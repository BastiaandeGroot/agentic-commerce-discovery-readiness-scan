# Kennis — methode

Hier staat de **constante** kant van het vragenbankwerk: hoe je een bank bouwt,
en met welke prompts. Die twee bestanden veranderen zelden en horen daarom in
git en niet in de code van de app.

| Bestand | Wat het is |
|---|---|
| `methode-vragenbank-genereren.md` | de volgorde: fase 0 tot en met de domeinreview |
| `prompt-vragenbank-genereren.md` | de zes prompts, in volgorde te draaien |

De **variabele** kant — welke vertical, welk panel, welke categorieboom — komt
uit de app. Die stelt per merchant een bankaanvraag samen (`src/questions/request.ts`)
en verwijst daarin naar deze twee bestanden. Zo staat de methode één keer
vastgelegd in plaats van ook nog eens in een TypeScript-string.

## De volgorde

1. De app stelt de aanvraag samen en levert hem af als markdown.
2. Je draait de promptreeks in een **aparte sessie**, zonder de productexport van
   de merchant erbij. Dat is fase 3, blinderen: zie je zijn attributen eerst, dan
   sturen die je denken en meet je alleen nog of er staat wat er staat.
3. De uitkomst is YAML. Die lees je in via het scherm *Vragenbank* in de app.
4. De app valideert, versienummert en gebruikt hem in plaats van de terugval.

## Wat er nooit in een aanvraag hoort

Productdata. De aanvraag draagt de categorienamen met hun aantallen en de URL
van de merchant, en verder niets — ook geen kolomnamen uit zijn catalogus. Dat is geen voorzichtigheid maar twee harde
eisen tegelijk: fase 3 van de methode, en de belofte dat de catalogus het
apparaat van de merchant niet verlaat. Het type in `request.ts` kan productrijen
domweg niet dragen, en er staat een test op.

## Een bank hoort bij een markt, niet bij een winkel

De verleiding is om per merchant een bank te laten genereren uit zijn eigen site.
Dat is het anti-patroon dat de methode bovenaan zet: dan bouw je de bank van één
winkel inclusief zijn blinde vlekken, heb je geen frequentiemaat, en zijn twee
merchants in dezelfde markt niet meer met elkaar te vergelijken. De site van de
merchant is één van de vijf à acht panelsites, nooit de enige.
