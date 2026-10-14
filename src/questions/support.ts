// Klantvragen uit de klantenservice van één winkel.
//
// Een retailer kan naast zijn catalogus een analyse van zijn klantenservice
// aanleveren: welke vragen kopers hem mailen, met hoe vaak. Die vragen gaan
// níet de vragenbank in — een bank hoort bij een markt, en de mail van één
// winkel zou de meetlat voor alle andere zetten. Ze werken alleen in zijn eigen
// rapport:
//
//   - staat een vraag ook in de bank, dan ziet hij dat zijn klanten hem echt
//     stellen, en hoe vaak;
//   - staat hij er niet in, dan toetst de sitetoets of zijn website hem
//     beantwoordt.
//
// Van het bestand blijft alleen de vraag, het thema en het aantal over. Een
// antwoordkolom, een status of wat er verder in staat wordt niet gelezen: het
// is werk van de retailer, en de scan heeft het niet nodig. Een e-mailadres of
// telefoonnummer in een vraag wordt weggepoetst voordat er iets mee gebeurt.
//
// Puur: de tekst komt binnen als argument.

import { detectDelimiter, parseDelimited } from '../intake/parse';
import { isStockQuestion } from '../collect/answers';

export interface SupportQuestion {
  /** Afgeleid van de tekst, zodat dezelfde vraag in een nieuw bestand hetzelfde id houdt. */
  id: string;
  question: string;
  theme?: string;
  /** De groep waar het aantal bij hoort, als het bestand dat per groep telt. */
  group?: string;
  /** Hoeveel mails, voor de vraag of voor zijn groep. */
  count?: number;
  /**
   * De vraag uit de vragenbank die hetzelfde vraagt, als die er is. Bij de scan
   * vastgelegd, zodat een bewaarde analyse hetzelfde laat zien.
   */
  match?: { questionId: string; label: string; scored: boolean };
}

export interface SupportList {
  name: string;
  questions: SupportQuestion[];
}

export interface SupportRead {
  list?: SupportList;
  /** Wat de retailer moet weten; blokkeert niet. */
  warnings: SupportWarning[];
  /** Waarom er niets van te maken was. */
  error?: 'no-question-column' | 'empty';
}

export type SupportWarning = { kind: 'redacted'; count: number } | { kind: 'capped'; max: number };

const MAX_QUESTIONS = 200;

/** Kolomnamen, in kleine letters, zonder leestekens. Op inhoud, niet op positie. */
const QUESTION = ['vraag', 'klantvraag', 'question', 'customer question', 'vragen', 'questions'];
const THEME = ['thema', 'theme', 'categorie', 'category', 'onderwerp', 'topic'];
const COUNT = ['aantal', 'count', 'frequentie', 'frequency', 'aantal vragen', 'number', 'komt voort uit'];

const plain = (name: string) => name.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9à-ÿ ]+/g, ' ').replace(/\s+/g, ' ').trim();

function findColumn(columns: string[], names: string[]): string | undefined {
  return columns.find((column) => names.includes(plain(column)))
    ?? columns.find((column) => names.some((name) => plain(column).startsWith(`${name} `)));
}

/** Een getal in de cel, los of tussen haakjes: "159", "Levering en status (159)". */
function readCount(cell: string): { count?: number; group?: string } {
  const between = /^(.*?)\s*\((\d[\d.]*)\)\s*$/.exec(cell.trim());
  if (between) return { group: between[1].trim() || undefined, count: Number(between[2].replace(/\./g, '')) };
  const alone = /^\s*(\d[\d.]*)\s*$/.exec(cell);
  return alone ? { count: Number(alone[1].replace(/\./g, '')) } : {};
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+|00)?\d[\d\s-]{8,}\d/g;

/** Een korte, vaste vingerafdruk van de tekst. Geen klok, geen toeval. */
export function supportId(question: string): string {
  let hash = 5381;
  for (const char of plain(question)) hash = ((hash * 33) ^ char.charCodeAt(0)) >>> 0;
  return `KS-${hash.toString(36)}`;
}

export function readSupportQuestions(text: string, name: string): SupportRead {
  const clean = text.replace(/^﻿/, '');
  const rows = parseDelimited(clean, detectDelimiter(clean).char);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const questionColumn = findColumn(columns, QUESTION);
  if (!questionColumn) return { warnings: [], error: rows.length === 0 ? 'empty' : 'no-question-column' };
  const themeColumn = findColumn(columns, THEME);
  const countColumn = findColumn(columns, COUNT);

  const warnings: SupportWarning[] = [];
  let redacted = 0;
  const seen = new Set<string>();
  const questions: SupportQuestion[] = [];
  for (const row of rows) {
    let question = (row[questionColumn] ?? '').trim();
    if (question === '') continue;
    const before = question;
    question = question.replace(EMAIL, '[e-mailadres]').replace(PHONE, '[telefoonnummer]');
    if (question !== before) redacted += 1;
    const id = supportId(question);
    if (seen.has(id)) continue;
    seen.add(id);
    const counted = countColumn ? readCount(row[countColumn] ?? '') : {};
    questions.push({
      id,
      question,
      ...(themeColumn && row[themeColumn]?.trim() ? { theme: row[themeColumn].trim() } : {}),
      ...counted,
    });
  }
  if (questions.length === 0) return { warnings: [], error: 'empty' };
  if (redacted > 0) warnings.push({ kind: 'redacted', count: redacted });
  if (questions.length > MAX_QUESTIONS) warnings.push({ kind: 'capped', max: MAX_QUESTIONS });
  return { list: { name, questions: questions.slice(0, MAX_QUESTIONS) }, warnings };
}

// --- Koppelen aan de vragenbank ------------------------------------------------

/** Woorden die in elke vraag staan en niets zeggen over het onderwerp. */
const FILLER = new Set(`
de het een en of maar als dan dat die dit deze wat welk welke wie waar wanneer hoe
hoeveel waarom is zijn ben bent was waren wordt worden word kan kun kunt kunnen mag
mogen moet moeten wil wilt willen heb hebt heeft hebben ik je jij jullie u we wij
mijn jouw uw ons onze hun er ook nog al niet geen wel om te van voor met op aan in
bij uit tot naar over door na toe zo zich zelf eerst goed veel meer alle iets
the a an and or is are can do does how what which when where my your this that to of for
in on with be it
`.trim().split(/\s+/));

/** Een grove stam: genoeg om "stoffen" en "stof", "bestelling" en "bestellen" samen te nemen. */
function stem(word: string): string {
  return word
    .replace(/(ingen|ing|en|es|s|e|t)$/, '')
    .replace(/(.)\1$/, '$1');
}

function words(text: string): Set<string> {
  return new Set(plain(text).split(' ')
    .filter((word) => word.length > 2 && !FILLER.has(word))
    .map(stem)
    .filter((word) => word.length > 2));
}

/** Boven dit aandeel van de bankvragen telt een woord niet meer als onderscheidend. */
const COMMON_SHARE = 0.08;

export interface BankQuestionRef {
  id: string;
  label: string;
  scored: boolean;
}

/**
 * Welke vraag uit de bank hetzelfde vraagt.
 *
 * Deterministisch, op woorden, en streng: twee betekenisdragende woorden
 * gedeeld, minstens de helft van de woorden van de klantvraag, en wederzijds de
 * beste. Bij twijfel geen koppeling — dan gaat de vraag door de sitetoets, en
 * dat is een omweg, geen fout. Een verkeerde koppeling zou zeggen dat de bank
 * iets meet wat hij niet meet.
 */
export function matchSupport(support: SupportQuestion[], bank: BankQuestionRef[]): SupportQuestion[] {
  // Een woord dat in veel bankvragen staat ("stof" in een stoffenbank) zegt
  // niets over welke vraag het is. Gemeten: zonder deze zeef viel "Is die stof
  // nog te krijgen?" op de vraag naar de stofbreedte.
  const raw = bank.map((question) => words(question.label));
  const frequency = new Map<string, number>();
  for (const set of raw) for (const word of set) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  const common = (word: string) => (frequency.get(word) ?? 0) > Math.max(2, bank.length * COMMON_SHARE);
  const telling = (set: Set<string>) => new Set([...set].filter((word) => !common(word)));
  const bankWords = bank.map((question, index) => ({ question, words: telling(raw[index]) }));
  const supportWords = support.map((question) => telling(words(question.question)));

  const score = (a: Set<string>, b: Set<string>) => {
    let shared = 0;
    for (const word of a) if (b.has(word)) shared += 1;
    return shared >= 2 && shared / Math.max(a.size, 1) >= 0.5 ? shared / Math.max(a.size, b.size, 1) : 0;
  };

  const best = supportWords.map((own) => {
    let top: { index: number; value: number } | undefined;
    bankWords.forEach((entry, index) => {
      const value = score(own, entry.words);
      if (value > 0 && (!top || value > top.value)) top = { index, value };
    });
    return top;
  });

  return support.map((question, index) => {
    const top = best[index];
    if (!top) return withoutMatch(question);
    // Wederzijds: geen andere klantvraag lijkt méér op deze bankvraag.
    const rival = best.some((other, at) => at !== index && other?.index === top.index && other.value > top.value);
    if (rival) return withoutMatch(question);
    const target = bankWords[top.index].question;
    return { ...question, match: { questionId: target.id, label: target.label, scored: target.scored } };
  });
}

/**
 * De klantvragen die de bank niet kent, als vragen voor de sitetoets. Voorraad
 * valt eruit, net als bij de vragen uit de bank.
 */
export function unmatchedSupport(list: SupportList | undefined): { id: string; label: string }[] {
  return (list?.questions ?? [])
    .filter((question) => !question.match && !isStockQuestion(question.question))
    .map((question) => ({ id: question.id, label: question.question }));
}

function withoutMatch(question: SupportQuestion): SupportQuestion {
  if (!question.match) return question;
  const { match: _match, ...rest } = question;
  return rest;
}
