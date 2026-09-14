# Agentic Commerce Readiness Scan

Meet of de productcatalogus van een webshop de vragen kan beantwoorden die
kopers in zijn markt stellen — de vragen waar een koopassistent straks op
selecteert. Niet hoeveel velden gevuld zijn, maar welke vragen onbeantwoord
blijven en welke data daarvoor ontbreekt.

Live: https://agentic-commerce-discovery-readiness-scan.onrender.com

## Waar staat wat

| Document | Waarover |
|---|---|
| [`spec.md`](spec.md) | Wat het product is, voor wie, hoe het geld verdient, en wat er nog moet gebeuren |
| [`NOTES.md`](NOTES.md) | De stand: genomen beslissingen, afgevallen richtingen, open punten, testdata |
| [`ONTWERP-vragenbank-keten.md`](ONTWERP-vragenbank-keten.md) | Hoe een vragenbank ontstaat, wordt beoordeeld en bij de merchant terechtkomt |
| [`CLAUDE.md`](CLAUDE.md) | De regels waar de code zich aan houdt |
| [`DESIGN.md`](DESIGN.md) | De regels waar de interface zich aan houdt |
| [`kennis/_methode/`](kennis/_methode/) | De methode waarmee een vragenbank wordt opgebouwd |

## Werken in deze repo

```bash
npm install
npm run dev        # lokaal op http://localhost:3000
npm test           # de tests, zonder browser
npm run typecheck
npm run build
```

Elke merge naar `main` deployt automatisch naar Render. De sleutels staan in
`.env.local` (lokaal) en in het Render-dashboard (live); welke er zijn staat in
`render.yaml`.
