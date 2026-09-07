// Een attribuut uit de vragenbank op de kolommen van deze merchant leggen.
//
// Dit is de mappingstap die de methode bewust ná het bevriezen plaatst: eerst
// vaststellen wat een koper vraagt, dán pas kijken waar het antwoord staat. Zou
// je het andersom doen, dan sturen de bestaande kolommen de vragen en meet je of
// een catalogus zijn eigen velden draagt.
//
// Een agent doet dit stapje moeiteloos — die leest `rol_breedte` en snapt dat
// het over baanbreedte gaat. Deze scan mag daar geen model voor gebruiken: hij
// is deterministisch, kost niets en geeft op dezelfde catalogus altijd hetzelfde
// rapport. Wat overblijft is dit: zo ver komen als je kunt zonder te raden, en
// hardop zeggen wat er niet gekoppeld is.
//
// De grens ligt bewust aan de strenge kant. Een gemiste koppeling toont een gat
// dat er niet is — vervelend, maar zichtbaar en te herstellen. Een verkeerde
// koppeling laat een gat verdwijnen dat er wél is, en dat is precies de fout die
// dit hele product hoort te voorkomen. Bij twijfel dus niet koppelen.

import { glued, meaningfulWords } from './lexicon';

/** Eén attribuut met de kolommen die het volgens de matcher kunnen dragen. */
export interface AttributeMatch {
  key: string;
  columns: string[];
  /** Waarom deze koppeling gemaakt is; hoort in beeld, niet alleen in de code. */
  basis: 'identiek' | 'schrijfwijze' | 'woorden';
}

/** Waar een naam over gaat, in de vorm waarin er vergeleken wordt. */
interface Shape {
  name: string;
  glued: string;
  words: string[];
  /** Het laatste betekenisdragende woord: in beide talen de kern van de naam. */
  head?: string;
}

function shapeOf(name: string): Shape {
  const words = meaningfulWords(name);
  return { name, glued: glued(name), words, head: words[words.length - 1] };
}

/** Kandidaatscore, of 0 als deze kolom dit attribuut niet kan dragen. */
function score(attribute: Shape, column: Shape): { score: number; basis: AttributeMatch['basis'] } {
  if (attribute.glued === '' || column.glued === '') return { score: 0, basis: 'woorden' };

  // Letterlijk dezelfde naam op de schrijfwijze na. Geen gok.
  if (attribute.glued === column.glued) return { score: 12, basis: 'identiek' };

  // De ene naam zit in de andere: `rolbreedte` in `stof_rolbreedte`. Twee eisen.
  // Lengte, anders koppelt `val` aan `interval`. En verhouding: `status` zit ook
  // in `collectiestatus`, maar een collectiestatus is geen productstatus — het
  // weggelaten deel is juist het deel dat het kenmerk onderscheidt.
  const short = Math.min(attribute.glued.length, column.glued.length);
  const long = Math.max(attribute.glued.length, column.glued.length);
  if (short >= 6 && short / long >= 0.6
      && (attribute.glued.includes(column.glued) || column.glued.includes(attribute.glued))) {
    return { score: 8, basis: 'schrijfwijze' };
  }

  if (attribute.head === undefined || column.words.length === 0) return { score: 0, basis: 'woorden' };

  const shared = attribute.words.filter((word) => column.words.includes(word));
  // Élk woord van het attribuut moet terug te vinden zijn, niet alleen de kern.
  //
  // Dit is de regel die de gevaarlijke treffers tegenhoudt, en hij is duur
  // betaald: zonder hem koppelde `staal_beschikbaar` aan `availability` en
  // `kwaliteit_id` aan `id`. Allebei delen ze hun kern met de kolom en gaan ze
  // over iets heel anders — en een verkeerde koppeling laat een gat verdwijnen
  // dat er wél is. Dat is erger dan een gemiste koppeling: die toont een gat dat
  // er niet is, en dat ziet een merchant meteen.
  if (shared.length < attribute.words.length) return { score: 0, basis: 'woorden' };

  const extraInColumn = column.words.filter((word) => !attribute.words.includes(word));
  // Elk overtollig woord in de kolom verzwakt: een kolom die méér aanwijst dan
  // het attribuut vraagt, gaat waarschijnlijk ergens anders over.
  return { score: 3 + 2 * (shared.length - 1) - extraInColumn.length, basis: 'woorden' };
}

/** Een attribuut zoals de matcher het aangeleverd krijgt. */
export interface Attribute {
  key: string;
  /** Vakwoorden uit de vragenlijst zelf; die wegen mee als extra naam. */
  namedAs?: string[];
}

/**
 * Leg alle attributen tegelijk op alle kolommen.
 *
 * Tegelijk en niet één voor één, omdat de kolommen om elkaar concurreren.
 * `rapport_breedte_cm` en `rolbreedte_cm` hebben allebei "breedte" als kern; zou
 * je ze los behandelen, dan grijpen ze allebei naar `rol_breedte` en wordt
 * "heeft deze stof een rapport" beantwoord met de baanbreedte. Een kolom gaat
 * daarom naar het attribuut dat er het best op past en naar geen ander.
 *
 * Puur en deterministisch: dezelfde attributen en kolommen geven dezelfde
 * uitkomst, ongeacht de volgorde waarin ze binnenkomen.
 */
export function matchAttributes(
  attributes: Attribute[],
  columns: string[],
  minimumScore = 3,
): AttributeMatch[] {
  const columnShapes = columns.map(shapeOf);

  interface Candidate { key: string; column: string; score: number; basis: AttributeMatch['basis'] }
  const candidates: Candidate[] = [];

  for (const attribute of attributes) {
    // De sleutel plus de vakwoorden uit de lijst: elk van die namen mag de
    // treffer opleveren, en de beste telt.
    const names = [attribute.key, ...(attribute.namedAs ?? [])].map(shapeOf);
    for (const column of columnShapes) {
      let best = { score: 0, basis: 'woorden' as AttributeMatch['basis'] };
      for (const name of names) {
        const result = score(name, column);
        if (result.score > best.score) best = result;
      }
      if (best.score >= minimumScore) {
        candidates.push({ key: attribute.key, column: column.name, score: best.score, basis: best.basis });
      }
    }
  }

  // Aflopend op score; bij gelijke score op naam, zodat de uitkomst niet van de
  // invoervolgorde afhangt.
  candidates.sort((a, b) =>
    b.score - a.score || a.column.localeCompare(b.column) || a.key.localeCompare(b.key));

  const taken = new Map<string, string>();
  const out = new Map<string, AttributeMatch>();
  for (const candidate of candidates) {
    const owner = taken.get(candidate.column);
    // Een kolom is al vergeven aan een attribuut dat er beter op paste.
    if (owner !== undefined && owner !== candidate.key) continue;
    taken.set(candidate.column, candidate.key);

    const entry = out.get(candidate.key);
    if (entry) {
      entry.columns.push(candidate.column);
    } else {
      out.set(candidate.key, { key: candidate.key, columns: [candidate.column], basis: candidate.basis });
    }
  }

  // In de volgorde van de attributen, niet van de scores: een lijst die met de
  // invoer meeloopt is na te lopen.
  return attributes
    .map((attribute) => out.get(attribute.key))
    .filter((match): match is AttributeMatch => match !== undefined);
}
