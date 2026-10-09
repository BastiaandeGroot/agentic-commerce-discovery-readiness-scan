// Voorbeelden van gevulde kenmerken ophalen bij onderzochte winkels.
//
// Leest per winkel een steekproef productpagina's (dezelfde weg als "winkel
// doormeten"), legt de kenmerken van een vragenbank op de specificaties die de
// winkel publiceert, en schrijft per kenmerk de waarden op die er werkelijk
// staan, met het adres van de productpagina. Geen model: de koppeling doet de
// matcher uit `src/spec/match.ts`, met de synoniemen van de bank.
//
// De uitkomst is een tabel om na te lopen, geen bron om blind over te nemen:
// een kenmerk kan op de verkeerde specificatie landen. Wat een mens goedkeurt
// gaat in de kolommen `voorbeeld` en `voorbeeld_bron` van de vragenlijst.
//
//   node harvest-examples.mjs <vragenbank.csv> <uit.json> <site> [site…]

import { readFileSync, writeFileSync } from 'node:fs';
import { importQuestionList } from '../src/questions/list';
import { matchAttributes } from '../src/spec/match';
import { collectShop } from '../src/server/collect';

const [bankPath, outPath, ...sites] = process.argv.slice(2);
const read = importQuestionList([{ name: bankPath, text: readFileSync(bankPath, 'utf8') }]);
if (!read.bank) {
  console.error(read.errors.join('\n'));
  process.exit(1);
}
const attributes = [...read.bank.attributes, ...read.bank.overlays.flatMap((overlay) => overlay.attributes ?? [])];
const unique = [...new Map(attributes.map((attribute) => [attribute.key, attribute])).values()];

const found: Record<string, { value: string; url: string; column: string; basis: string }[]> = {};
const unmatched: Record<string, { column: string; value: string; url: string }[]> = {};
for (const site of sites) {
  try {
    const shop = await collectShop(site);
    const columns = [...new Set(shop.rows.flatMap((row) => Object.keys(row)))];
    const matches = matchAttributes(unique.map((attribute) => ({ key: attribute.key, namedAs: attribute.namedAs })), columns);
    console.log(`${site}: ${shop.rows.length} productpagina's, ${columns.length} specificaties, ${matches.length} kenmerken herkend`);
    // Wat de winkel publiceert en niet herkend is, staat erbij: de naloper ziet
    // dan ook wat de matcher liet liggen.
    const taken = new Set(matches.flatMap((match) => match.columns));
    for (const column of columns.filter((one) => !taken.has(one) && one !== 'url')) {
      const sample = shop.rows.find((row) => (row[column] ?? '').trim() !== '');
      if (sample) (unmatched[site] ??= []).push({ column, value: sample[column].slice(0, 80), url: sample.url });
    }
    for (const match of matches) {
      for (const column of match.columns) {
        const seen = new Set<string>();
        for (const row of shop.rows) {
          const value = (row[column] ?? '').trim();
          if (value === '' || value.length > 80 || seen.has(value) || !row.url) continue;
          seen.add(value);
          (found[match.key] ??= []).push({ value, url: row.url, column, basis: match.basis });
          if (seen.size >= 3) break;
        }
      }
    }
  } catch (caught) {
    console.log(`${site}: niet gelezen (${(caught as Error).message})`);
  }
}
writeFileSync(outPath, JSON.stringify({ found, unmatched }, null, 1));
console.log(`${Object.keys(found).length} van de ${unique.length} kenmerken met een voorbeeld -> ${outPath}`);
