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

## Werken in deze repo

- Imports **zonder** `.ts`/`.tsx`-extensie; Next lost ze zelf op en TypeScript
  weigert ze anders.
- Controleren doe je met `npx tsc --noEmit` en `npm run build`.
- De motor headless draaien op echte bestanden:
  ```
  npx esbuild scripts/scan-cli.ts --bundle --platform=node --format=esm --outfile=/tmp/scan-cli.mjs
  node --max-old-space-size=4096 /tmp/scan-cli.mjs <feed> [catalogus]
  ```
- Push naar `main` deployt automatisch naar Render.
