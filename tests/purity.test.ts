// De motor moet in de browser en straks op de server hetzelfde doen. Dat kan
// alleen als hij nergens van afhangt. Deze test bewaakt die regel uit CLAUDE.md,
// want een import glipt er makkelijker in dan uit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MOTOR = ['src/intake', 'src/spec', 'src/questions', 'src/engine'];

const VERBODEN: [RegExp, string][] = [
  [/\bnew Date\(\)/, 'new Date() — geef de tijd mee als argument'],
  [/\bDate\.now\(\)/, 'Date.now() — geef de tijd mee als argument'],
  [/\bMath\.random\(\)/, 'Math.random() — de uitkomst moet reproduceerbaar zijn'],
  [/\bfetch\(/, 'fetch() — de motor haalt niets op'],
  [/\blocalStorage\b/, 'localStorage — geen browseropslag in de motor'],
  [/\bfrom ['"]node:/, "node: — geen Node-specifieke API's in de motor"],
];

// DOMParser mag: parse.ts gebruikt hem als hij bestaat en valt anders terug op
// een regex. Dat is een optimalisatie met een pad zonder DOM ernaast.
const TOEGESTAAN = /typeof DOMParser !== 'undefined'/;

function bestanden(dir: string): string[] {
  return readdirSync(dir).flatMap((naam) => {
    const pad = join(dir, naam);
    return statSync(pad).isDirectory() ? bestanden(pad) : pad.endsWith('.ts') ? [pad] : [];
  });
}

test('de motor blijft puur', () => {
  const overtredingen: string[] = [];
  for (const map of MOTOR) {
    for (const pad of bestanden(map)) {
      const regels = readFileSync(pad, 'utf8').split('\n');
      regels.forEach((regel, index) => {
        if (TOEGESTAAN.test(regel)) return;
        for (const [patroon, reden] of VERBODEN) {
          if (patroon.test(regel)) overtredingen.push(`${pad}:${index + 1} — ${reden}`);
        }
      });
    }
  }
  assert.deepEqual(overtredingen, []);
});
