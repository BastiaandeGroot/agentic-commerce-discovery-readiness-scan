// Het JSON-object uit een modelantwoord halen.
//
// Puur, en apart van de aanroeper: dit is de enige plek waar het antwoord van
// een model wordt uitgepakt, en juist die hoort na te spelen te zijn zonder dat
// er een model aan te pas komt.

/**
 * Het JSON-object uit een antwoord halen.
 *
 * De prompt vraagt om één object en niets eromheen, maar een model dat net vijf
 * sites gelezen heeft zet er soms toch een zin voor. Daarom zoeken we het eerste
 * gebalanceerde object in plaats van de hele tekst te parsen — en falen we als
 * dat er niet is, in plaats van de helft te raden. Een halve fase is erger dan
 * een herkansing.
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;

  const start = body.indexOf('{');
  if (start === -1) throw new Error('Het antwoord bevatte geen JSON-object.');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let at = start; at < body.length; at++) {
    const character = body[at];
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (character === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (character === '{') depth++;
    if (character === '}') {
      depth--;
      if (depth === 0) return JSON.parse(body.slice(start, at + 1));
    }
  }
  throw new Error('Het JSON-object in het antwoord was niet afgesloten.');
}
