// Kleding en schoenen — voorlopig, zonder panel.

import type { QuestionBank } from '../bank';
import { attribute, provisional, question } from './shared';

export const APPAREL_BANK: QuestionBank = provisional({
  meta: {
    vertical: 'apparel',
    label: { nl: 'Kleding en schoenen', en: 'Apparel and footwear' },
    version: '0.1.0',
    match: 'kleding|apparel|shirt|broek|jas|schoen|shoe|jurk|dress|trui|sock|sok|jeans|clothing',
  },
  context: {
    unitOfSale: 'piece',
    irreversibleMistake: {
      nl: 'Beredeneerd, nog niet gemeten: de meeste kleding gaat terug, dus de onomkeerbare fout zit aan de randen — bedrukt of op maat gemaakt, en hygiëneartikelen waarbij het herroepingsrecht vervalt zodra de verpakking open is. Daarnaast kost een maatfout die wél terug mag alsnog een retour, en dat is de fout die het vaakst voorkomt.',
      en: 'Reasoned, not yet measured: most clothing can be returned, so the irreversible mistake sits at the edges — printed or made to measure, and hygiene items where the right of withdrawal lapses once the packaging is opened. Beyond that, a sizing mistake that may be returned still costs a return, and that is the most common mistake.',
    },
  },
  attributes: [
    attribute('garment', { nl: 'Wat voor kledingstuk', en: 'Type of garment' }, ['title']),
    attribute('brand', { nl: 'Merk', en: 'Brand' }, ['brand']),
    attribute('size', { nl: 'Maat', en: 'Size' }, ['size'], { type: 'enum', level: 'variant' }),
    attribute('size-system', { nl: 'Maatsysteem of pasvorm', en: 'Size system or fit' }, ['attr:size_system|maatsysteem|maattabel|fit|pasvorm'], { type: 'enum' }),
    attribute('colour', { nl: 'Kleur', en: 'Colour' }, ['color'], { type: 'enum', level: 'variant' }),
    attribute('composition', { nl: 'Samenstelling', en: 'Composition' }, ['material']),
    attribute('audience', { nl: 'Doelgroep', en: 'Intended wearer' }, ['gender', 'age_group'], { type: 'enum' }),
    attribute('appearance', { nl: 'Beeld', en: 'Image' }, ['image']),
    attribute('extra-images', { nl: 'Extra beeld', en: 'Additional images' }, ['additional_images']),
    attribute('care', { nl: 'Wasvoorschrift', en: 'Care instructions' }, ['attr:wasvoorschrift|washing|care|onderhoud']),
    attribute('variant-group', { nl: 'Variantgroep', en: 'Variant group' }, ['item_group_id'], { level: 'variant' }),
    attribute('use', { nl: 'Waarvoor geschikt', en: 'What it suits' }, ['description']),
  ],
  rules: [],
  questions: [
    question('a3', { nl: 'In welke maat is het beschikbaar?', en: 'What size is it available in?' }, ['size'], 'critical', 'fit', { answerType: 'enum' }),
    question('a4', { nl: 'Welk maatsysteem of welke pasvorm?', en: 'Which size system or fit?' }, ['size-system'], 'critical', 'fit', {
      mode: 'any',
      answerType: 'enum',
      weightNote: {
        nl: 'Een maat zonder maatsysteem is geen maat: een 38 betekent per merk en per land iets anders. Dit is de vraag achter de meeste maatretouren.',
        en: 'A size without a size system is not a size: a 38 means something different per brand and per country. This is the question behind most sizing returns.',
      },
    }),
    question('a1', { nl: 'Wat voor kledingstuk is dit?', en: 'What garment is this?' }, ['garment'], 'high', 'fit'),
    question('a5', { nl: 'Welke kleur is het?', en: 'What colour is it?' }, ['colour'], 'high', 'expectation', { answerType: 'enum' }),
    question('a6', { nl: 'Van welk materiaal is het gemaakt?', en: 'What material is it made of?' }, ['composition'], 'high', 'material'),
    question('a8', { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' }, ['appearance'], 'high', 'expectation'),
    question('a7', { nl: 'Voor wie is het bedoeld?', en: 'Who is it intended for?' }, ['audience'], 'medium', 'fit', { mode: 'any', answerType: 'enum' }),
    question('a2', { nl: 'Van welk merk is het?', en: 'What brand is it?' }, ['brand'], 'medium', 'purchase-certainty'),
    question('a10', { nl: 'Hoe was ik het?', en: 'How do I wash it?' }, ['care'], 'medium', 'care', { mode: 'any' }),
    question('a11', { nl: 'Welke varianten horen bij elkaar?', en: 'Which variants belong together?' }, ['variant-group'], 'medium', 'fit', { answerType: 'relation' }),
    question('a9', { nl: 'Kan ik het van meerdere kanten zien?', en: 'Can I see it from several angles?' }, ['extra-images'], 'low', 'expectation'),
    question('a12', { nl: 'Waarvoor is het geschikt?', en: 'What is it suitable for?' }, ['use'], 'low', 'fit'),
  ],
  overlays: [],
});
