// Meetopstelling voor de koppelvoorstellen: wat stelt het model voor op een
// echte catalogus met een echte vragenlijst?
//
// Bootst het koppelscherm na — dezelfde kenmerken, dezelfde beschrijvingen,
// dezelfde opdracht, dezelfde blokken — en schrijft per voorstel de vraag en de
// kolomwaarden eronder, zodat een mens kan zien of het klopt. Geen productiecode.
//
//   npx esbuild scripts/mapping-eval.ts --bundle --platform=node --format=esm --outfile=<tmp>/mapping-eval.mjs
//   node --env-file=.env.local <tmp>/mapping-eval.mjs <catalogus> <vragenlijst> [model]

import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';
import { importQuestionList } from '../src/questions/list';
import { attributeInventory } from '../src/questions/mapping';
import { profileCatalog, shapeMisfit } from '../src/engine/profile';
import { describeAttribute, describeColumn } from '../src/semantic/describe';
import { PROPOSALS_SCHEMA, SYSTEM, prompt, readProposals } from '../src/semantic/prompt';

const [catalogPath, bankPath, model = 'claude-haiku-4-5', effort] = process.argv.slice(2);

const catalog = ingest(catalogPath, readFileSync(catalogPath, 'utf8'));
const imported = importQuestionList([{ name: bankPath, text: readFileSync(bankPath, 'utf8') }]);
if (!imported.bank) throw new Error(imported.errors.join('\n'));
const state = generateQuestionSets(catalog, [imported.bank]);

const rows = attributeInventory(state);
const open = rows.filter((row) => row.fields.length === 0);
const profiles = profileCatalog(catalog, 0, new Set(), new Set());
const free = [...catalog.columns].sort((a, b) => a.localeCompare(b))
  .filter((column) => !rows.some((row) => row.fields.includes(column)))
  .filter((column) => (profiles[column]?.filled ?? 0) > 0)
  .slice(0, 300);

const attributes = open.map((row) => ({
  key: row.key,
  text: describeAttribute({ key: row.key, shape: row.shape, questions: row.questions.map((q) => q.nl) }),
}));
const columns = free.map((column) => ({ key: column, text: describeColumn(column, catalog, profiles[column]) }));

console.log(`MODEL ${model} — ${attributes.length} open kenmerken, ${columns.length} kolommen`);

const client = new Anthropic();
const pairs: { key: string; columns: string[]; evidence: string; reason: string }[] = [];
const rejected: string[] = [];
let input = 0;
let output = 0;
for (let start = 0; start < attributes.length; start += 100) {
  const payload = { attributes: attributes.slice(start, start + 100), columns, kind: 'attributes' as const };
  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt(payload) }],
    output_config: {
      format: { type: 'json_schema', schema: PROPOSALS_SCHEMA as unknown as Record<string, unknown> },
      ...(effort ? { effort: effort as 'low' } : {}),
    },
  });
  input += response.usage.input_tokens;
  output += response.usage.output_tokens;
  const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
  const read = readProposals(text, payload.attributes, payload.columns);
  rejected.push(...read.rejected);
  pairs.push(...read.proposals.map((p) => ({ key: p.key, columns: [p.column], evidence: p.evidence, reason: p.reason })));
}

const byKey = new Map(rows.map((row) => [row.key, row]));
for (const pair of pairs) {
  const row = byKey.get(pair.key)!;
  const column = pair.columns[0];
  const profile = profiles[column];
  const misfit = row.shape && profile && shapeMisfit(row.shape, profile) ? '  [VORM PAST NIET]' : '';
  console.log(`\n${pair.key} -> ${column}${misfit}`);
  console.log(`  vraag:  ${row.questions[0]?.nl ?? ''}`);
  console.log(`  kolom:  ${describeColumn(column, catalog, profile).slice(0, 160)}`);
  console.log(`  bewijs: ${pair.evidence} — ${pair.reason}`);
}
for (const r of rejected) console.log(`AFGEVALLEN ${r}`);
console.log(`\n${pairs.length} voorstellen; ${input} invoer- en ${output} uitvoertokens`);
