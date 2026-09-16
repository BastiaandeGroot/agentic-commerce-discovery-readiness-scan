# De kolomvorm die de scan inleest

De uitkomst van een vragenbank is één CSV-bestand. De scan herkent kolommen op
**naam** en nooit op positie, in het Nederlands en het Engels. Volgorde maakt
dus niet uit; spelling wel.

Scheidingsteken: puntkomma. Codering: UTF-8.

## Verplicht

| Kolom | Wat erin staat |
|---|---|
| `id` | Uniek per vraag, bijvoorbeeld `BAS-H01` of `MEU-A03`. Stabiel houden: de scan vergelijkt metingen over tijd op dit id. |
| `vraag_nl` en `vraag_en` | Dezelfde vraag in beide talen, zoals een klant hem stelt. Nooit een attribuutnaam: "Is deze stof sterk genoeg voor mijn bank", niet "Martindale-waarde". Eén rij per vraag, twee kolommen — nooit twee bestanden. |

## Sterk aanbevolen

| Kolom | Wat erin staat |
|---|---|
| `laag` | `base` voor vragen die voor elk product in de markt gelden, `overlay` voor vragen die alleen in één segment spelen, `standalone` voor een productgroep met een eigen leven (naaigaren naast stoffen). |
| `categorie` | Het marktsegment waar een overlay bij hoort. Bij `base` mag hij leeg. |
| `belang` | `kritiek`, `hoog`, `middel` of `laag`. `kritiek` alleen als alle vier gelden: een fout antwoord maakt het product ongeschikt, de koper kan het na levering niet terugdraaien, de vraag gaat over het product en niet over retour, levering of voorraad, en het antwoord staat in een kenmerk in plaats van in een berekening met maten van de koper. Niet "commercieel belangrijk". Een kritieke vraag over koopzekerheid, een procesvraag of een vraag met antwoordtype `afgeleid` leest de scan als `hoog`. |
| `kritiek_toets` | Alleen bij `kritiek`: één zin per criterium, als `beslissend: … \| onherstelbaar: … \| product: … \| uit de catalogus: …`. Zonder deze kolom staat de vraag op het beoordeelscherm als "kritiek zonder toets". Bij een herweging naar kritiek komt de toets tussen haken achter het belang: `Gordijnstoffen: kritiek [beslissend: … \| onherstelbaar: … \| product: … \| uit de catalogus: …]`. |
| `benodigde_attributen` | Komma-gescheiden kenmerknamen die nodig zijn om te antwoorden, bijvoorbeeld `rolbreedte_cm, rapport_hoogte_cm`. |
| `modus` | `alle` als álle genoemde attributen nodig zijn (een som heeft al zijn termen), `een` als er één volstaat (bewijs stapelt). Laat je hem leeg, dan leidt de scan hem af uit de beslisregel. |
| `dekking` | Op hoeveel panelsites dit onderwerp voorkomt. **Laat leeg als je het niet hebt onderzocht.** Nul betekent iets anders: niemand behandelt dit, en dat is een vondst. |
| `bron` | Waar de vraag vandaan komt: `faq`, `categorietekst`, `review`, `vakkennis`. |
| `beslisregel` | Naam van de regel plus de drempel, als een site die publiceert: `martindale >= 30000`. Alleen met bron. |
| `antwoordtype` | `getal`, `enum`, `boolean`, `tekst`, `lijst`, `relatie`, `proces`, of `afgeleid_*`. |
| `telt_mee_in_score` | `nee` voor vragen die geen enkel attribuut kunnen dragen — procesvragen als "kan ik een staal krijgen". Die blijven in de bank om het advies, maar buiten de score. |
| `synoniemen` | Hoe de markt dit kenmerk nog meer noemt. Dit is de plek voor vaktaal; de scan koppelt kenmerken aan kolommen en kan generieke taal aan, maar geen vakwoorden. |
| `waarschuwing` | Wat er misgaat als dit antwoord verkeerd getoond wordt. "Alleen bij aantoonbare leveranciersverklaring, nooit afleiden." |
| `toelichting` | Waarom deze vraag ertoe doet, voor de domeinexpert. |
| `toepassingsprofielen_kritiek` | De toepassingen binnen dit segment waarin deze vraag kritiek is, komma-gescheiden: `banken, eetkamerstoelen`. Zo blijft één vraag staan waar tien overlays zouden ontstaan. Alleen op een `overlay`-rij — een basisrij heeft geen categorie om een profiel aan te hangen, en de lezer laat hem dan vallen met een waarschuwing. De scan weegt nog niet per profiel; de kolom legt de parametrisering vast en de drempel per profiel hoort in `toelichting` tot dat er wel is. |

## Overige kolommen die de scan kent

`geldt_voor`, `intentie`, `gewicht`, `herweging`, `aantal_attributen`,
`beantwoordbaar_uit_attributen`, `wettelijk`, `commerciele_waarde`,
`onomkeerbare_fout`, `vertical`.

## Wat je nooit doet

- **Een getal verzinnen.** Geen drempel, geen certificering, geen normnummer
  zonder bron. Een ongemarkeerd eigen getal is de snelste manier om vertrouwen
  te verliezen bij de domeinexpert.
- **`dekking` invullen zonder panel.** Leeg is "niet onderzocht" en `0` is
  "niemand behandelt dit". Die twee mogen nooit samenvallen.
- **Een gewicht meegeven dat afwijkt van het belang.** De weging hoort bij de
  scanregels: kritiek 5, hoog 3, middel 2, laag 1. Zou elke lijst zijn eigen
  gewichten meebrengen, dan zijn twee merchants niet meer vergelijkbaar.
