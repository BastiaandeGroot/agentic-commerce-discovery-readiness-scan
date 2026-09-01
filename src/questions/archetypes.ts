// Archetypen: de bibliotheek waaruit vragensets worden opgebouwd.
//
// Dit zijn GEEN kant-en-klare sets. De sets zelf worden pas gegenereerd nadat de
// merchant zijn feed heeft aangeleverd, over zijn eigen categorieen (zie
// generate.ts) — anders meten we onze categorie-indeling in plaats van de zijne.
//
// Een archetype levert de vragen die in een soort categorie spelen. De generator
// koppelt het aan een echte categorie uit de data en vult aan met vragen die uit
// de data zelf komen. Daarna valideert de merchant, en pas dan telt de set (S6).
//
// De drempel is een benoemde checklist, geen percentage. Niet "vindbaar is Core
// boven de 70" — dat getal is willekeurig en het eerste waar een klant over gaat
// discussieren. Wel: DEZE vragen bepalen of het product bij een verzoek past, en
// jouw data beantwoordt er zoveel van.
//
// Een vraag verwijst naar canonieke velden, of met "attr:" naar een kolom die we
// niet konden plaatsen — daar zit juist de categoriespecifieke informatie.

import type { Question, Bilingual } from '../domain/types';

export interface Archetype {
  id: string;
  label: Bilingual;
  /** Regex op de categorienaam van de merchant. Ontbreekt hij, dan is dit het vangnet. */
  match?: string;
  questions: Question[];
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'generic',
    label: { nl: 'Algemeen', en: 'Generic' },
    // Geen match: vangnet voor categorieen waarvoor nog geen archetype bestaat.
    questions: [
      { id: 'g1', mode: 'all', requires: ['title'], label: { nl: 'Wat is dit product precies?', en: 'What exactly is this product?' } },
      { id: 'g2', mode: 'all', requires: ['description'], label: { nl: 'Wat kan ik ermee?', en: 'What can I use it for?' } },
      { id: 'g3', mode: 'all', requires: ['brand'], label: { nl: 'Van welk merk is het?', en: 'What brand is it?' } },
      { id: 'g4', mode: 'all', requires: ['image'], label: { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' } },
      { id: 'g5', mode: 'any', requires: ['product_category', 'product_type'], label: { nl: 'In welke productgroep valt het?', en: 'What product group is it in?' } },
      { id: 'g6', mode: 'all', requires: ['material'], label: { nl: 'Waar is het van gemaakt?', en: 'What is it made of?' } },
      { id: 'g7', mode: 'any', requires: ['dimensions', 'attr:afmeting|dimension|lengte|breedte|hoogte'], label: { nl: 'Welke afmetingen heeft het?', en: 'What are its dimensions?' } },
      { id: 'g8', mode: 'all', requires: ['weight'], label: { nl: 'Hoe zwaar is het?', en: 'How heavy is it?' } },
      { id: 'g9', mode: 'all', requires: ['color'], label: { nl: 'Welke kleur heeft het?', en: 'What colour is it?' } },
      { id: 'g10', mode: 'all', requires: ['condition'], label: { nl: 'Is het nieuw of gebruikt?', en: 'Is it new or used?' } },
      { id: 'g11', mode: 'any', requires: ['product_detail', 'q_and_a'], label: { nl: 'Welke specificaties heeft het?', en: 'What are its specifications?' } },
      { id: 'g12', mode: 'all', requires: ['url'], label: { nl: 'Waar kan ik het bekijken?', en: 'Where can I view it?' } },
    ],
  },
  {
    id: 'apparel',
    label: { nl: 'Kleding en schoenen', en: 'Apparel and footwear' },
    match: 'kleding|apparel|shirt|broek|jas|schoen|shoe|jurk|dress|trui|sock|sok|jeans|clothing',
    questions: [
      { id: 'a1', mode: 'all', requires: ['title'], label: { nl: 'Wat voor kledingstuk is dit?', en: 'What garment is this?' } },
      { id: 'a2', mode: 'all', requires: ['brand'], label: { nl: 'Van welk merk is het?', en: 'What brand is it?' } },
      { id: 'a3', mode: 'all', requires: ['size'], label: { nl: 'In welke maat is het beschikbaar?', en: 'What size is it available in?' } },
      { id: 'a4', mode: 'any', requires: ['attr:size_system|maatsysteem|maattabel|fit|pasvorm'], label: { nl: 'Welk maatsysteem of welke pasvorm?', en: 'Which size system or fit?' } },
      { id: 'a5', mode: 'all', requires: ['color'], label: { nl: 'Welke kleur is het?', en: 'What colour is it?' } },
      { id: 'a6', mode: 'all', requires: ['material'], label: { nl: 'Van welk materiaal is het gemaakt?', en: 'What material is it made of?' } },
      { id: 'a7', mode: 'any', requires: ['gender', 'age_group'], label: { nl: 'Voor wie is het bedoeld?', en: 'Who is it intended for?' } },
      { id: 'a8', mode: 'all', requires: ['image'], label: { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' } },
      { id: 'a9', mode: 'all', requires: ['additional_images'], label: { nl: 'Kan ik het van meerdere kanten zien?', en: 'Can I see it from several angles?' } },
      { id: 'a10', mode: 'any', requires: ['attr:wasvoorschrift|washing|care|onderhoud'], label: { nl: 'Hoe was ik het?', en: 'How do I wash it?' } },
      { id: 'a11', mode: 'all', requires: ['item_group_id'], label: { nl: 'Welke varianten horen bij elkaar?', en: 'Which variants belong together?' } },
      { id: 'a12', mode: 'all', requires: ['description'], label: { nl: 'Waarvoor is het geschikt?', en: 'What is it suitable for?' } },
    ],
  },
  {
    id: 'bike-tyres',
    label: { nl: 'Fietsbanden', en: 'Bicycle tyres' },
    match: 'band|tyre|tire|fiets|bicycle|bike',
    questions: [
      { id: 'b1', mode: 'all', requires: ['title'], label: { nl: 'Wat voor band is dit?', en: 'What kind of tyre is this?' } },
      { id: 'b2', mode: 'all', requires: ['brand'], label: { nl: 'Van welk merk is de band?', en: 'What brand is the tyre?' } },
      { id: 'b3', mode: 'any', requires: ['size', 'attr:bandenmaat|etrto|iso_maat|diameter'], label: { nl: 'Welke bandenmaat (ETRTO) is het?', en: 'What tyre size (ETRTO) is it?' } },
      { id: 'b4', mode: 'any', requires: ['attr:breedte|width|section'], label: { nl: 'Hoe breed is de band?', en: 'How wide is the tyre?' } },
      { id: 'b5', mode: 'any', requires: ['attr:wielmaat|wheel_size|inch'], label: { nl: 'Op welke wielmaat past hij?', en: 'What wheel size does it fit?' } },
      { id: 'b6', mode: 'any', requires: ['attr:type|soort|gebruik|terrein|use'], label: { nl: 'Voor welk gebruik is hij bedoeld?', en: 'What use is it intended for?' } },
      { id: 'b7', mode: 'any', requires: ['attr:druk|pressure|bar|psi'], label: { nl: 'Welk drukbereik heeft hij?', en: 'What pressure range does it take?' } },
      { id: 'b8', mode: 'any', requires: ['attr:antilek|puncture|protection|bescherming'], label: { nl: 'Heeft hij antilekbescherming?', en: 'Does it have puncture protection?' } },
      { id: 'b9', mode: 'any', requires: ['attr:tubeless|ventiel|valve'], label: { nl: 'Is hij tubeless of met binnenband?', en: 'Is it tubeless or tubed?' } },
      { id: 'b10', mode: 'all', requires: ['color'], label: { nl: 'Welke kleur heeft hij?', en: 'What colour is it?' } },
      { id: 'b11', mode: 'all', requires: ['image'], label: { nl: 'Hoe ziet hij eruit?', en: 'What does it look like?' } },
      { id: 'b12', mode: 'all', requires: ['description'], label: { nl: 'Waarin verschilt hij van andere banden?', en: 'How does it differ from other tyres?' } },
    ],
  },
  {
    id: 'electronics',
    label: { nl: 'Elektronica', en: 'Electronics' },
    match: 'elektronica|electronic|computer|laptop|telefoon|phone|audio|tv|camera|monitor|koptelefoon|headphone',
    questions: [
      { id: 'e1', mode: 'all', requires: ['title'], label: { nl: 'Wat voor apparaat is dit?', en: 'What kind of device is this?' } },
      { id: 'e2', mode: 'all', requires: ['brand'], label: { nl: 'Van welk merk is het?', en: 'What brand is it?' } },
      { id: 'e3', mode: 'all', requires: ['mpn'], label: { nl: 'Welk exact modelnummer is het?', en: 'What exact model number is it?' } },
      { id: 'e4', mode: 'any', requires: ['attr:aansluiting|connect|poort|port|interface'], label: { nl: 'Welke aansluitingen heeft het?', en: 'What connections does it have?' } },
      { id: 'e5', mode: 'any', requires: ['attr:vermogen|power|watt|voltage|accu|battery'], label: { nl: 'Wat is het vermogen of de accuduur?', en: 'What is its power or battery life?' } },
      { id: 'e6', mode: 'any', requires: ['attr:compatib|geschikt_voor|works_with'], label: { nl: 'Waarmee is het compatibel?', en: 'What is it compatible with?' } },
      { id: 'e7', mode: 'any', requires: ['dimensions', 'attr:afmeting|dimension'], label: { nl: 'Welke afmetingen heeft het?', en: 'What are its dimensions?' } },
      { id: 'e8', mode: 'all', requires: ['weight'], label: { nl: 'Hoe zwaar is het?', en: 'How heavy is it?' } },
      { id: 'e9', mode: 'any', requires: ['attr:garantie|warranty'], label: { nl: 'Welke garantie zit erop?', en: 'What warranty does it carry?' } },
      { id: 'e10', mode: 'any', requires: ['product_detail', 'q_and_a'], label: { nl: 'Welke specificaties heeft het?', en: 'What are its specifications?' } },
      { id: 'e11', mode: 'all', requires: ['image'], label: { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' } },
      { id: 'e12', mode: 'all', requires: ['description'], label: { nl: 'Wat kan ik ermee?', en: 'What can I do with it?' } },
    ],
  },
  {
    id: 'home-textiles',
    label: { nl: 'Woontextiel', en: 'Home textiles' },
    match: 'stof|textiel|textile|gordijn|curtain|fabric|meubel|bekleding|upholstery|kussen',
    questions: [
      { id: 'h1', mode: 'all', requires: ['title'], label: { nl: 'Wat voor textiel is dit?', en: 'What kind of textile is this?' } },
      { id: 'h2', mode: 'all', requires: ['brand'], label: { nl: 'Van welk merk of welke collectie?', en: 'What brand or collection?' } },
      { id: 'h3', mode: 'all', requires: ['material'], label: { nl: 'Wat is de samenstelling?', en: 'What is the composition?' } },
      { id: 'h4', mode: 'any', requires: ['weight', 'attr:gsm|g_m2|grammage|gewicht'], label: { nl: 'Wat is het gewicht per m²?', en: 'What is the weight per m²?' } },
      { id: 'h5', mode: 'any', requires: ['attr:breedte|width|baanbreedte|rolbreedte'], label: { nl: 'Hoe breed is de baan?', en: 'How wide is the roll?' } },
      { id: 'h6', mode: 'all', requires: ['color'], label: { nl: 'Welke kleur heeft het?', en: 'What colour is it?' } },
      { id: 'h7', mode: 'any', requires: ['attr:lichtdoorlat|transparant|verduister|blackout|opacity'], label: { nl: 'Hoeveel licht laat het door?', en: 'How much light does it let through?' } },
      { id: 'h8', mode: 'any', requires: ['attr:brandvertrag|fire|bs_5867|schuurtoer|martindale'], label: { nl: 'Welke technische keuringen heeft het?', en: 'What technical certifications does it have?' } },
      { id: 'h9', mode: 'any', requires: ['attr:onderhoud|wasvoorschrift|care|reinig'], label: { nl: 'Hoe onderhoud ik het?', en: 'How do I care for it?' } },
      { id: 'h10', mode: 'any', requires: ['attr:toepassing|gebruik|application|geschikt'], label: { nl: 'Waarvoor is het geschikt?', en: 'What is it suitable for?' } },
      { id: 'h11', mode: 'all', requires: ['image'], label: { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' } },
      { id: 'h12', mode: 'all', requires: ['description'], label: { nl: 'Wat onderscheidt het?', en: 'What sets it apart?' } },
    ],
  },
];
