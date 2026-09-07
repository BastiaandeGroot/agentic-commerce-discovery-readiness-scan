// De koppeling van kenmerk naar kolom, door een agent voorgesteld.
//
// `match.ts` komt met schrijfwijze en generieke taal een eind, en dan houdt het
// op. Wat overblijft is betekenis: dat `rapport_hoogte_cm` en `patroon_hoogte`
// hetzelfde kenmerk zijn, dat `vezelsamenstelling` in `material` staat, dat
// `lichtdoorlatendheid` en `gordijn_dichtheid` over hetzelfde gaan maar
// omgekeerd. Daar is geen stringvergelijking tegen opgewassen, en een
// vakwoordenlijst per markt in de motor zetten lost het voor één vertical op en
// voor geen enkele volgende.
//
// Een agent doet dit wél. En dat mag hier, om drie redenen die alle drie moeten
// gelden:
//
//   1. **Hij raakt geen SKU.** Wat de deur uit gaat zijn kenmerknamen, de vragen
//      die erop leunen, en de kolomnamen van de catalogus. Geen productrij, geen
//      veldwaarde, geen aantal. Het type hieronder kan het niet dragen.
//   2. **Eén keer, niet per product.** De afgewezen richting was een model over
//      3.552 producten; dit is één opdracht over een schema. Wat eruit komt geldt
//      voor elke volgende scan op dezelfde catalogus.
//   3. **De uitkomst is data, geen oordeel.** Het model levert een tabel op die
//      de merchant ziet en bevestigt. Daarna draait de scan er deterministisch
//      op: dezelfde catalogus plus dezelfde koppeling geeft hetzelfde rapport.
//      Het model komt niet in de score, alleen in de vertaling ervoor.
//
// Let op het verschil met `questions/request.ts`. Die aanvraag draagt bewust
// géén kolomnamen, omdat de vragenbank gebouwd hoort te zijn vóórdat iemand de
// catalogus opent — anders sturen de bestaande velden de vragen. Deze opdracht
// is precies de stap dáárna, en kán niet zonder kolomnamen. Ze zijn geen
// varianten van elkaar en horen nooit samengevoegd te worden.
//
// De module is puur: geen klok, geen netwerk. Hij stelt de opdracht samen en
// leest het antwoord; versturen doet iemand anders.

/** Eén kenmerk waarvoor nog geen kolom gevonden is. */
export interface OpenAttribute {
  key: string;
  /** De vragen die erop leunen; dat is de context die het antwoord stuurt. */
  questions: string[];
}

export interface MappingRequest {
  attributes: OpenAttribute[];
  /** Alleen de namen. Nooit waarden, nooit aantallen, nooit een voorbeeldrij. */
  columns: string[];
}

/** Eén voorgestelde koppeling. */
export interface MappingPair {
  key: string;
  columns: string[];
}

export interface MappingResult {
  pairs: MappingPair[];
  errors: string[];
  warnings: string[];
}

/**
 * Stel de opdracht samen uit wat er nog open staat.
 *
 * Alleen de ongekoppelde kenmerken en de nog vrije kolommen: wat `match.ts` al
 * zonder model kon, hoeft niet opnieuw en mag ook niet overschreven worden.
 */
export function buildMappingRequest(
  attributes: OpenAttribute[],
  columns: string[],
  taken: string[] = [],
): MappingRequest {
  const used = new Set(taken);
  return {
    attributes: [...attributes].sort((a, b) => a.key.localeCompare(b.key)),
    columns: columns.filter((column) => !used.has(column)).sort((a, b) => a.localeCompare(b)),
  };
}

const NL = {
  heading: 'Koppel kenmerken aan kolommen',
  intro: 'Hieronder staan kenmerken uit een vragenlijst en de kolomnamen van één productcatalogus. Zeg per kenmerk in welke kolom het antwoord staat.',
  rulesHeading: 'Regels',
  rules: [
    'Koppel alleen wat je zeker weet. Een verkeerde koppeling laat een gat verdwijnen dat de merchant wél heeft, en dat is erger dan geen koppeling: die toont hooguit een gat dat er niet is.',
    'Laat een kenmerk weg als er geen kolom voor is. Niets is een geldig antwoord, en vaak het juiste.',
    'Gebruik uitsluitend kolomnamen die letterlijk in de lijst staan. Verzin er nooit een bij.',
    'Een kolom mag twee kenmerken dragen als dat echt zo is, maar wees daar terughoudend in.',
    'Let op omgekeerde begrippen: een kolom die dichtheid meet, beantwoordt een vraag over doorlatendheid. Koppel die, en noem het in je toelichting.',
  ],
  attributesHeading: 'De kenmerken, met de vragen die erop leunen',
  columnsHeading: 'De kolommen van deze catalogus',
  answerHeading: 'Antwoord in dit formaat',
  answerNote: 'Eén regel per kenmerk: de sleutel, een dubbele punt, en de kolomnaam of -namen gescheiden door komma\'s. Verder geen tekst.',
  privacy: 'Deze opdracht bevat geen productdata: alleen kenmerknamen, vraagteksten en kolomnamen.',
};

const EN = {
  heading: 'Link characteristics to columns',
  intro: 'Below are characteristics from a question list and the column names of one product catalogue. For each characteristic, say which column holds the answer.',
  rulesHeading: 'Rules',
  rules: [
    'Only link what you are sure of. A wrong link makes a gap disappear that the merchant does have, and that is worse than no link: a missing link at most shows a gap that is not there.',
    'Leave a characteristic out if no column carries it. Nothing is a valid answer, and often the right one.',
    'Use only column names that appear literally in the list. Never invent one.',
    'A column may carry two characteristics if that is genuinely the case, but be reluctant.',
    'Watch for inverted concepts: a column measuring density answers a question about transmission. Link it, and say so in your note.',
  ],
  attributesHeading: 'The characteristics, with the questions that lean on them',
  columnsHeading: 'The columns of this catalogue',
  answerHeading: 'Answer in this format',
  answerNote: 'One line per characteristic: the key, a colon, and the column name or names separated by commas. No other text.',
  privacy: 'This request contains no product data: characteristic names, question texts and column names only.',
};

/** De opdracht als markdown, klaar om aan een agent te geven. */
export function renderMappingRequest(request: MappingRequest, locale: 'nl' | 'en'): string {
  const t = locale === 'en' ? EN : NL;
  const lines: string[] = [
    `# ${t.heading}`,
    '',
    t.intro,
    '',
    `> ${t.privacy}`,
    '',
    `## ${t.rulesHeading}`,
    '',
    ...t.rules.map((rule) => `- ${rule}`),
    '',
    `## ${t.attributesHeading}`,
    '',
  ];

  for (const attribute of request.attributes) {
    lines.push(`- \`${attribute.key}\``);
    for (const question of attribute.questions.slice(0, 3)) lines.push(`  - ${question}`);
  }

  lines.push('', `## ${t.columnsHeading}`, '');
  for (const column of request.columns) lines.push(`- \`${column}\``);

  lines.push('', `## ${t.answerHeading}`, '', t.answerNote, '', '```', 'kenmerk: kolom', 'ander_kenmerk: kolom_a, kolom_b', '```', '');
  return lines.join('\n');
}

/**
 * Lees het antwoord terug.
 *
 * Streng op één punt: een kolom die niet in de catalogus bestaat is een fout en
 * geen waarschuwing. Een verzonnen kolomnaam zou stilzwijgend nooit matchen, en
 * dan lijkt het kenmerk gekoppeld terwijl het gat gewoon blijft staan — de
 * onzichtbaarste fout die deze stap kan maken.
 */
export function parseMappingAnswer(
  text: string,
  knownAttributes: string[],
  knownColumns: string[],
): MappingResult {
  const attributes = new Set(knownAttributes);
  const columns = new Map(knownColumns.map((column) => [column.toLowerCase(), column]));
  const pairs: MappingPair[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    // Codehekken, kopjes en opsommingstekens horen bij de opmaak van een
    // antwoord en niet bij de inhoud; ze weigeren zou elk agentantwoord afkeuren.
    if (line === '' || line.startsWith('```') || line.startsWith('#') || line.startsWith('>')) continue;
    const stripped = line.replace(/^[-*]\s*/, '').replace(/`/g, '');
    const at = stripped.indexOf(':');
    if (at === -1) continue;

    const key = stripped.slice(0, at).trim();
    if (key === '') continue;
    if (!attributes.has(key)) {
      warnings.push(`"${key}" staat niet als kenmerk in je vragenlijst; die regel is overgeslagen.`);
      continue;
    }
    if (seen.has(key)) {
      warnings.push(`"${key}" komt twee keer voor in het antwoord; alleen de eerste regel telt.`);
      continue;
    }

    const named = stripped.slice(at + 1).split(',').map((part) => part.trim()).filter((part) => part !== '');
    const resolved: string[] = [];
    for (const name of named) {
      if (/^(geen|none|-|n\.v\.t\.|na)$/i.test(name)) continue;
      const column = columns.get(name.toLowerCase());
      if (column === undefined) {
        errors.push(`"${key}" wijst naar kolom "${name}", en die staat niet in je catalogus.`);
        continue;
      }
      resolved.push(column);
    }
    if (resolved.length === 0) continue;

    seen.add(key);
    pairs.push({ key, columns: resolved });
  }

  if (pairs.length === 0 && errors.length === 0) {
    errors.push('Er staat geen enkele koppeling in dit antwoord. Verwacht wordt: één regel per kenmerk, als `kenmerk: kolom`.');
  }

  // Eén kolom die van alles moet dragen is bijna altijd een agent die te graag
  // wil koppelen. Geen fout — soms draagt een omschrijvingsveld echt meerdere
  // kenmerken — maar wel iets om zelf naar te kijken.
  const perColumn = new Map<string, number>();
  for (const pair of pairs) {
    for (const column of pair.columns) perColumn.set(column, (perColumn.get(column) ?? 0) + 1);
  }
  for (const [column, count] of perColumn) {
    if (count >= 3) {
      warnings.push(`Kolom "${column}" is aan ${count} kenmerken gekoppeld. Loop die na: één kolom die alles draagt, beantwoordt meestal niets.`);
    }
  }

  return { pairs, errors, warnings };
}
