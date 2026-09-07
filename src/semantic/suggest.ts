// Van betekenisvectoren naar voorstellen.
//
// Dit is de rekenkant van de semantische koppeling, los van het model dat de
// vectoren maakt. Los, omdat het model netwerk en tijd kost en dit deel gewoon
// rekenen is: dezelfde vectoren geven altijd dezelfde voorstellen, en dat is te
// testen zonder ooit een model te laden.
//
// Twee regels die het bruikbaar houden.
//
// **Een kolom hoort bij één kenmerk.** Zonder die concurrentie grijpen
// `rolbreedte_cm` en `rapport_breedte_cm` allebei naar de kolom die het meest op
// "breedte" lijkt, en wordt "heeft deze stof een rapport" beantwoord met de
// baanbreedte.
//
// **Lijken is niet hetzelfde als het zijn.** Een taalmodel geeft altijd een
// beste kandidaat, ook als er geen goede is: alle kolommen van een stoffenwinkel
// lijken op elkaar. Daarom telt niet alleen hoe hoog de beste scoort maar ook
// hoeveel hij van de tweede wegloopt. Staan de eerste twee tegen elkaar aan, dan
// weet het model het niet en zeggen wij dat ook.

/** Eén voorstel, met wat nodig is om het te beoordelen. */
export interface Suggestion {
  key: string;
  column: string;
  /** Cosinusgelijkenis met de gekozen kolom, 0–1. */
  score: number;
  /** Hoeveel de beste kolom van de eerstvolgende wegloopt. */
  margin: number;
}

/**
 * Hoeveel de beste kandidaat minstens van de tweede moet weglopen.
 *
 * Laag, en dat is een gemeten keuze. Op echte data blijkt dit model goed te
 * *rangschikken* en slecht in te schatten hóé zeker het is: van vijf juiste
 * koppelingen had de zwakste een marge van 0,002 en een onjuiste een marge van
 * 0,053. Er is dus geen grens die goed van fout scheidt, en een hoge drempel
 * gooit vooral juiste voorstellen weg.
 *
 * Daarom staat de drempel alleen op gelijkspel — dan weet het model het echt
 * niet — en ligt de veiligheid ergens anders: elk voorstel is gemarkeerd en de
 * merchant loopt ze na. Zou het model ongezien mogen koppelen, dan moest deze
 * grens juist hoog en zou hij bijna niets meer opleveren.
 */
export const MIN_MARGIN = 0.01;

/**
 * Haal de gemeenschappelijke richting uit een verzameling vectoren.
 *
 * Zonder dit is de uitkomst onbruikbaar. Alle namen in een stoffencatalogus
 * gaan over stof, dus alle vectoren wijzen grotendeels dezelfde kant op: gemeten
 * lagen álle gelijkenissen tussen 0,81 en 0,86, en een kolom met een algemene
 * naam als `main_purpose` won het dan van de juiste kolom. Trek je het gemiddelde
 * eraf, dan valt die gedeelde richting weg en blijft over waarin ze verschillen.
 * Op dezelfde meting ging dat van vier op zes goed naar vijf op vijf.
 *
 * Beide kanten door dezelfde centroïde, anders vergelijk je twee ruimtes.
 */
export function centre(vectors: readonly (readonly number[])[]): number[][] {
  if (vectors.length === 0) return [];
  const width = vectors[0].length;
  const mean = Array.from({ length: width }, (_, i) =>
    vectors.reduce((sum, vector) => sum + (vector[i] ?? 0), 0) / vectors.length);
  return vectors.map((vector) => vector.map((value, i) => value - mean[i]));
}

/** Cosinusgelijkenis. Beide vectoren worden genormaliseerd aangeleverd. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface Vectors {
  key: string;
  vector: readonly number[];
}

/**
 * Stel per kenmerk de kolom voor die er het meest op lijkt.
 *
 * Alleen als ze elkaars beste zijn: het kenmerk moet die kolom kiezen én die
 * kolom dit kenmerk. Zonder die eis krijgt élk kenmerk een voorstel, ook de
 * tientallen waar niets bij past.
 *
 * `taken` bevat de kolommen die al op een andere manier gekoppeld zijn — die
 * hoeven niet opnieuw voorgesteld te worden en mogen niet worden weggekaapt.
 */
export function suggestMappings(
  attributes: Vectors[],
  columns: Vectors[],
  taken: string[] = [],
  { minMargin = MIN_MARGIN, centred = false } = {},
): Suggestion[] {
  const free = columns.filter((column) => !taken.includes(column.key));
  if (free.length === 0 || attributes.length === 0) return [];

  // Beide kanten door dezelfde centroïde; zie `centre`.
  const shifted = centred
    ? [...attributes.map((a) => a.vector), ...free.map((c) => c.vector)]
    : centre([...attributes.map((a) => a.vector), ...free.map((c) => c.vector)]);
  const attributeVectors = attributes.map((a, i) => ({ key: a.key, vector: shifted[i] }));
  const columnVectors = free.map((c, i) => ({ key: c.key, vector: shifted[attributes.length + i] }));

  // De volledige matrix, want een voorstel hangt van twee kanten af.
  const scores = attributeVectors.map((attribute) =>
    columnVectors.map((column) => cosine(attribute.vector, column.vector)));

  /** De index van de best passende kolom voor rij `i`, en de marge naar de tweede. */
  const bestColumn = (i: number) => {
    const ranked = scores[i]
      .map((score, j) => ({ j, score }))
      // Op naam bij gelijke score, zodat de uitkomst niet van de volgorde afhangt.
      .sort((a, b) => b.score - a.score || columnVectors[a.j].key.localeCompare(columnVectors[b.j].key));
    return { j: ranked[0].j, score: ranked[0].score, margin: ranked[0].score - (ranked[1]?.score ?? -1) };
  };

  const best: Suggestion[] = [];
  for (let i = 0; i < attributeVectors.length; i++) {
    const top = bestColumn(i);
    if (top.margin < minMargin) continue;

    // Wederzijds: deze kolom moet dit kenmerk óók als beste hebben.
    //
    // Dit is de regel die het verschil maakt tussen bruikbaar en onbruikbaar, en
    // hij is gemeten. Zonder hem stelde het model voor élk kenmerk iets voor —
    // ook voor de tientallen waar geen enkele kolom bij past — en kwam het uit
    // op 4 goede tegen 7 foute. Mét deze eis: 4 goede tegen 1 foute, zonder er
    // een juiste te verliezen. Een kenmerk dat nergens bij hoort vindt namelijk
    // nog steeds zijn beste kolom, maar die kolom hoort bij iets anders.
    const bestAttribute = scores
      .map((row, ii) => ({ ii, score: row[top.j] }))
      .sort((a, b) => b.score - a.score || attributeVectors[a.ii].key.localeCompare(attributeVectors[b.ii].key))[0];
    if (bestAttribute.ii !== i) continue;

    best.push({
      key: attributeVectors[i].key,
      column: columnVectors[top.j].key,
      score: top.score,
      margin: top.margin,
    });
  }

  // Op marge en niet op score: na het centreren heeft elk kenmerk zijn eigen
  // schaal, dus scores zijn onderling niet vergelijkbaar. Hoe zeker een kenmerk
  // van zijn kolom is, is dat wel — en dat hoort de volgorde te bepalen.
  best.sort((a, b) => b.margin - a.margin || a.key.localeCompare(b.key));

  const claimed = new Set(taken);
  const out: Suggestion[] = [];
  for (const suggestion of best) {
    if (claimed.has(suggestion.column)) continue;
    claimed.add(suggestion.column);
    out.push(suggestion);
  }

  // In de volgorde van de kenmerken, zodat de lijst met het scherm meeloopt.
  const order = new Map(attributes.map((attribute, index) => [attribute.key, index]));
  return out.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
}
