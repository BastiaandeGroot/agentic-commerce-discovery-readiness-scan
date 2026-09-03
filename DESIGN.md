# Design system

De bron voor elke UI-beslissing in dit project. Wat hier niet staat, gebruik je niet.
De tokens staan in `app/globals.css` en zijn daarmee afdwingbaar, niet slechts beschreven.

## De richting in drie zinnen

Dit is gereedschap voor iemand die zijn eigen productdata niet dagelijks in handen
heeft, dus het moet uitnodigen in plaats van imponeren: warme, papierachtige vlakken,
zachte randen, een rustige groene accentkleur en teksten die uitleggen voordat ze
oordelen. Tegelijk is de uitkomst een diagnose met duizenden producten erachter, en
die verdient dichtheid — het rapport mag geen folder worden waarin je moet scrollen
om drie getallen te vinden. De oplossing is niet één gemiddelde: de instap is ruim
en geduldig, het rapport is compact en feitelijk, en beide gebruiken exact dezelfde
tokens zodat het één product blijft.

## Dichtheid: twee standen, één systeem

Dit is de belangrijkste regel van dit document, want hij is het makkelijkst te
overtreden.

| | Waar | Hoe |
|---|---|---|
| **Ruim** | landingspagina, `/methode`, uploadstap, lege en foutstaten | `text-base`, ruime regelafstand, veel verticale ruimte, hooguit één idee per blok |
| **Dicht** | rapport, verkenner, tabellen, vragensets | `text-sm` en `text-xs`, compacte regelhoogte, tabellen met veel rijen in beeld |

Toegankelijk en warm slaat op *toon en vorm*, niet op ruimte per pixel. Een rapport
luchtiger maken door rijen uit elkaar te trekken is geen verbetering maar verlies:
de merchant kan dan minder in één oogopslag vergelijken. Maak een rapportscherm
nooit ruimer zonder dat er expliciet om gevraagd is.

## Kleur

Semantisch benoemd. Nooit een letterlijke kleur in een component — geen `#`,
geen `blue-500`, geen `rgb()`.

| Token | Betekenis |
|---|---|
| `bg` | de pagina zelf |
| `surface` | een kaart of tabel die op de pagina ligt |
| `surface-2` | een vlak binnen een kaart: uitleg, detailpaneel, tabelkop |
| `line` | randen en scheidingslijnen |
| `ink` | lopende tekst |
| `muted` | bijschriften, kolomkoppen, uitleg |
| `accent` | de handeling die je wilt dat iemand doet, en "uit je feed" |
| `ok` / `warn` / `danger` | status, los van de accentkleur |
| `*-soft` | de bijbehorende achtergrond voor een badge of blok |

De statuskleuren staan bewust los van `accent`: groen betekent hier "beantwoord",
niet "klik hier". Zouden ze samenvallen, dan leest elke knop als een goedkeuring.

**Dark mode is geen variant maar een tweede volwaardige set.** Beide staan in
`globals.css`. Elke nieuwe kleur krijgt meteen zijn donkere tegenhanger.

### Contrast

Alle tekst-op-achtergrond combinaties voldoen aan WCAG AA (≥ 4.5:1), in beide
standen. Nagerekend, laagste waarden: `warn` op `warn-soft` 4.81 licht,
`accent` op `accent-soft` 5.17 licht, `muted` op `surface-2` 5.22 licht en 5.84
donker. Voeg je een kleurpaar toe, reken het na voordat je het gebruikt.

**Kleur draagt nooit alleen de betekenis.** Ernst en status zijn altijd ook af te
lezen aan vorm of tekst — een badge met een woord erin, een stoplicht met drie
posities, een label naast een balk.

## Typografie

Twee families, allebei uit `globals.css`:

- `font-sans` — alles.
- `font-mono` — waarden die je onder elkaar moet kunnen vergelijken: product-id's,
  veldnamen, zoekpatronen. Niet voor sier.

Zes tekstgroottes, en daar wijk je niet van af: `text-xs`, `text-sm`, `text-base`,
`text-lg`, `text-xl`, `text-2xl`. De regelhoogtes lopen mee: lopende tekst ruimer
dan getallen in een tabel.

Getallen die je vergelijkt krijgen `.tnum` (tabellarische cijfers), zodat kolommen
niet gaan dansen als een waarde verandert.

## Ruimte, radii, diepte

- **Spacing op een 4px-grid.** `--spacing` staat op `0.25rem`; elke Tailwind-maat
  leidt daarvan af. Geen losse pixelwaarden.
- **Drie radii:** `rounded-md` voor badges en invoervelden, `rounded-lg` voor
  knoppen en blokken binnen een kaart, `rounded-xl` voor de kaart zelf.
- **Twee schaduwen:** `shadow-raised` en `shadow-overlay`. Diepte is zeldzaam —
  het rapport leunt op randen en vlakken. Een kaart heeft een rand, geen schaduw.
  Schaduw is voor wat écht boven de pagina hangt: een dialoog, een melding.

## Vier toestanden

Elk component dat data toont, dekt er vier af. Geen enkele mag een leeg scherm zijn.

1. **Laden** — skeleton in de vorm van wat er komt, geen spinner in het midden.
2. **Leeg** — zegt waaróm het leeg is en wat de volgende stap is.
3. **Fout** — zegt wat er mis is én wat de merchant nu moet doen. Nooit
   "Er is iets misgegaan". Als we kunnen raden wat hij bedoelde, bieden we dat aan.
4. **Gevuld** — het normale geval.

## Beweging

Feedback, geen show. Transities van 150–200 ms op toestandswisselingen: een
uitleg die openklapt, een knop die indrukt, een rij die verschijnt. Geen
scroll-reveals, geen binnenzwevende kaarten, geen parallax.
`prefers-reduced-motion` wordt gerespecteerd; dat staat globaal in `globals.css`
en je omzeilt het niet per component.

## Iconen

Echte SVG's via `lucide-react`. Nooit een emoji als icoon — die rendert per
platform anders, schaalt niet mee met de tekst en is niet te kleuren met tokens.
Een icoon staat nooit alleen: er hoort een label of een `aria-label` bij.

## Teksten

- Knoppen zeggen wat er gebeurt: "Scan starten", niet "Verder". "Set bevestigen",
  niet "OK".
- Uitleg gaat aan het oordeel vooraf. Een merchant die "verrijkingsgat" leest
  zonder te weten wat dat hem kost, kan er niets mee.
- Geen jargon zonder vertaling. Staat er een term uit een specificatie, dan staat
  er in gewone taal bij wat hij betekent — desnoods achter een `i`.
- Beide talen zijn volwaardig. Alle tekst komt uit `src/i18n/`, nooit uit een
  component.

## Wat we niet doen

Paarse gradients, glassmorphism, kaarten met een gloed eromheen, iedere sectie in
dezelfde afgeronde doos, emoji als illustratie, een spinner als enige laadstaat,
percentages die een verzonnen drempel verbergen. Deze app oordeelt op benoemde
checklists, en het uiterlijk hoort daar niet omheen te draaien.
