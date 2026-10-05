// De generatiereeks met de hand aansturen: één stap vragen, één antwoord geven.
//
// Dezelfde reeks als de app (`src/generation/`), dezelfde opdrachten en dezelfde
// poorten — alleen komt het antwoord niet van de API maar uit een bestand. Zo
// kan een Claude-sessie op een abonnement het werk van het model doen zonder dat
// er per token betaald wordt, en blijft de bank toch terug te voeren op één stap.
// De toestand staat na elke stap op schijf: wie halverwege stopt, gaat verder
// waar hij was. Geen productiecode.
//
//   npx esbuild scripts/generate-local.ts --bundle --platform=node --format=esm --outfile=<tmp>/gen.mjs
//
//   node <tmp>/gen.mjs init   <run.json> --vertical=woontextiel --segments=<segmenten.json> [--site=https://…] [--suggested=a.nl,b.nl]
//   node <tmp>/gen.mjs prompt <run.json> [--out=<opdracht.md>]     wat deze stap vraagt
//   node <tmp>/gen.mjs answer <run.json> <antwoord.json> [--at=JJJJ-MM-DD]   het antwoord verwerken
//   node <tmp>/gen.mjs status <run.json>
//
// `segmenten.json` is `[{ "name": "...", "count": 0 }]`: categorienamen met
// aantallen, verder niets. De stap `assemble` vraagt geen model; `answer` zonder
// bestand zet hem. Daarna staan er naast `run.json` een `.csv`, en een
// `.bijlagen.json` met panel, indeling en bevindingen.

import { readFileSync, writeFileSync } from 'node:fs';
import { applyReply, EmptyPhase, taskFor } from '../src/generation/pipeline';
import { extractJson } from '../src/generation/json';
import { GENERATION_VERSION } from '../src/generation/prompts';
import {
  decodePhase, emptyState, encodePhase, FIRST_PHASE, phaseNumber, totalPhases, type RunState,
} from '../src/generation/state';

interface Run {
  generation: string;
  phase: string;
  state: RunState;
}

const [command, runPath, ...rest] = process.argv.slice(2);
const flag = (name: string) => rest.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const positional = rest.filter((arg) => !arg.startsWith('--'));

if (!command || !runPath) {
  console.error('Gebruik: init | prompt | answer | status, gevolgd door het pad van de run.');
  process.exit(1);
}

const load = (): Run => JSON.parse(readFileSync(runPath, 'utf8')) as Run;
const save = (run: Run) => writeFileSync(runPath, JSON.stringify(run, null, 1));

function where(run: Run): string {
  const phase = decodePhase(run.phase);
  return phase.kind === 'done'
    ? 'klaar'
    : `stap ${phaseNumber(phase, run.state)} van ${totalPhases(run.state)}: ${run.phase}`;
}

if (command === 'init') {
  const vertical = flag('vertical');
  const segmentsPath = flag('segments');
  if (!vertical || !segmentsPath) {
    console.error('init vraagt --vertical en --segments.');
    process.exit(1);
  }
  const segments = JSON.parse(readFileSync(segmentsPath, 'utf8')) as { name: string; count: number }[];
  const run: Run = {
    generation: GENERATION_VERSION,
    phase: encodePhase(FIRST_PHASE),
    state: emptyState({
      vertical,
      segments: segments.map((segment) => ({ name: String(segment.name), count: Number(segment.count) || 0 })),
      merchantSite: flag('site'),
      suggestedSites: (flag('suggested') ?? '').split(',').map((one) => one.trim()).filter(Boolean),
    }),
  };
  save(run);
  console.log(`Run aangemaakt voor ${vertical} (generatie ${GENERATION_VERSION}), ${segments.length} categorieën als afbakening. ${where(run)}`);
} else if (command === 'status') {
  const run = load();
  console.log(where(run));
  console.log(`panel: ${run.state.panel.length} · oogst: ${run.state.harvest.length} · onderwerpen: ${run.state.topics.length} · segmenten: ${run.state.grouping.length} · basisvragen: ${run.state.base?.questions.length ?? 0} · vragensets: ${run.state.overlays.length} · bevindingen: ${run.state.findings.length}`);
} else if (command === 'prompt') {
  const run = load();
  const task = taskFor(run.state, decodePhase(run.phase));
  if (task === null) {
    console.log(`${where(run)} — deze stap vraagt geen model. Zet hem met: answer ${runPath}`);
  } else {
    const text = [
      `# ${where(run)}`,
      `web: ${task.web ? 'ja' : 'nee'} · model in de app: ${task.model} · antwoord als één JSON-object`,
      '',
      '## Systeem',
      task.system,
      '',
      '## Opdracht',
      task.prompt,
    ].join('\n');
    const out = flag('out');
    if (out) {
      writeFileSync(out, text);
      console.log(`${where(run)} — opdracht in ${out} (${text.length} tekens, web: ${task.web ? 'ja' : 'nee'})`);
    } else {
      console.log(text);
    }
  }
} else if (command === 'answer') {
  const run = load();
  const phase = decodePhase(run.phase);
  const at = flag('at') ?? new Date().toISOString().slice(0, 10);
  const needsModel = taskFor(run.state, phase) !== null;
  const answerPath = positional[0];
  if (needsModel && !answerPath) {
    console.error(`${where(run)} vraagt een antwoordbestand.`);
    process.exit(1);
  }
  try {
    const reply = needsModel
      // Dezelfde lezer als de app: een antwoord met een zin ervoor of in een
      // codeblok is nog steeds een antwoord.
      ? { json: extractJson(readFileSync(answerPath as string, 'utf8')), usage: { input: 0, output: 0, cached: 0 } }
      : undefined;
    const before = run.state.findings.length;
    const result = applyReply(run.state, phase, reply, at);
    const next: Run = { ...run, phase: encodePhase(result.next), state: result.state };
    save(next);
    for (const finding of result.state.findings.slice(before)) console.log(`BEVINDING ${finding}`);
    if (result.next.kind === 'done' && result.state.csv) {
      const base = runPath.replace(/\.json$/, '');
      writeFileSync(`${base}.csv`, result.state.csv);
      writeFileSync(`${base}.bijlagen.json`, JSON.stringify({
        generation: run.generation,
        panel: result.state.panel,
        grouping: result.state.grouping,
        facets: result.state.facets,
        findings: result.state.findings,
      }, null, 1));
      console.log(`Klaar. Tabel in ${base}.csv, panel en indeling in ${base}.bijlagen.json.`);
    } else {
      console.log(`Verwerkt. Volgende: ${where(next)}`);
    }
  } catch (caught) {
    // Een lege of scheve stap telt in de app als mislukte poging; hier blijft de
    // run staan waar hij stond en kan het antwoord opnieuw.
    const kind = caught instanceof EmptyPhase ? 'De stap leverde niets bruikbaars op' : 'Het antwoord is niet verwerkt';
    console.error(`${kind}: ${caught instanceof Error ? caught.message : String(caught)}`);
    process.exit(1);
  }
} else {
  console.error(`Onbekende opdracht: ${command}`);
  process.exit(1);
}
