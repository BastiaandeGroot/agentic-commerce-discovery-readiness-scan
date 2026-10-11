// De pagina's ophalen waar de voorbeeldenstap van de generatie naar verwijst.
//
// De generatie zelf is puur (`src/generation/`): zij krijgt de tekst van elke
// pagina als argument en houdt alleen de voorbeelden waarvan de waarde er
// letterlijk op staat. Hier wordt werkelijk opgehaald, zoals een AI-agent leest:
// kale html, platte tekst.
//
// Alleen serverzijdig. Nooit importeren vanuit een component.

import { agentText, pathAllowed } from '../collect/answers';
import { AGENT, AI_BOTS, allowed } from './collect';

/** Hoeveel pagina's één generatie hiervoor ophaalt. */
const MAX_PAGES = 24;
const DELAY_MS = 350;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': AGENT, accept: 'text/html,application/xhtml+xml,text/plain' },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  } finally {
    await sleep(DELAY_MS);
  }
}

/** Sluit deze winkel een AI-agent bij naam van de hele site uit? Dan lezen we hem niet. */
function refusesAgents(robots: string): boolean {
  return robots.split(/^\s*user-agent:\s*/im).slice(1).some((block) => {
    const [name, ...rest] = block.split('\n');
    if (!AI_BOTS.test(name)) return false;
    for (const line of rest) {
      if (/^\s*user-agent:/i.test(line)) break;
      if (/^\s*disallow:\s*\/\s*$/i.test(line)) return true;
    }
    return false;
  });
}

/**
 * De tekst van elke pagina die het antwoord van de voorbeeldenstap noemt, op adres.
 *
 * Een pagina die niet op te halen is of die de winkel afschermt, ontbreekt
 * gewoon; de generatie laat de voorbeelden die ernaar verwijzen dan vallen.
 */
export async function fetchExamplePages(json: unknown): Promise<Record<string, string>> {
  const examples = (json as { examples?: unknown } | null)?.examples;
  const urls = [...new Set((Array.isArray(examples) ? examples : [])
    .map((one) => (one as { url?: unknown } | null)?.url)
    .filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url)))].slice(0, MAX_PAGES);

  const robotsByOrigin = new Map<string, string | null>();
  const pages: Record<string, string> = {};
  for (const url of urls) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { continue; }
    if (!robotsByOrigin.has(parsed.origin)) {
      robotsByOrigin.set(parsed.origin, await get(new URL('/robots.txt', parsed.origin).toString()));
    }
    const robots = robotsByOrigin.get(parsed.origin) ?? '';
    if (robots !== '' && (!allowed(robots) || refusesAgents(robots) || !pathAllowed(robots, parsed.pathname))) continue;
    const html = await get(url);
    if (html) pages[url] = agentText(html, url).text;
  }
  return pages;
}
