// Fietsbanden — voorlopig, zonder panel.

import type { QuestionBank } from '../bank';
import { attribute, provisional, question } from './shared';

export const BIKE_TYRE_BANK: QuestionBank = provisional({
  meta: {
    vertical: 'bike-tyres',
    label: { nl: 'Fietsbanden', en: 'Bicycle tyres' },
    version: '0.1.0',
    match: 'band|tyre|tire|fiets|bicycle|bike',
  },
  context: {
    unitOfSale: 'piece',
    irreversibleMistake: {
      nl: 'Beredeneerd, nog niet gemeten: een band die verkeerd besteld is mag terug, maar een band die gemonteerd en gereden is niet meer. De maatvraag moet dus vóór de montage kloppen, en dat maakt hem kritiek.',
      en: 'Reasoned, not yet measured: a tyre ordered in the wrong size may be returned, but one that has been fitted and ridden may not. The sizing question therefore has to be right before fitting, which is what makes it critical.',
    },
  },
  attributes: [
    attribute('tyre-type', { nl: 'Soort band', en: 'Type of tyre' }, ['title']),
    attribute('brand', { nl: 'Merk', en: 'Brand' }, ['brand']),
    attribute('etrto', { nl: 'Bandenmaat (ETRTO)', en: 'Tyre size (ETRTO)' }, ['size', 'attr:bandenmaat|etrto|iso_maat|diameter'], { standard: 'ETRTO / ISO 5775' }),
    attribute('section-width', { nl: 'Bandbreedte', en: 'Section width' }, ['attr:breedte|width|section'], { type: 'number' }),
    attribute('wheel-size', { nl: 'Wielmaat', en: 'Wheel size' }, ['attr:wielmaat|wheel_size|inch'], { type: 'enum' }),
    attribute('intended-use', { nl: 'Gebruik of terrein', en: 'Use or terrain' }, ['attr:type|soort|gebruik|terrein|use'], { type: 'enum' }),
    attribute('pressure', { nl: 'Drukbereik', en: 'Pressure range' }, ['attr:druk|pressure|bar|psi'], { type: 'number' }),
    attribute('puncture', { nl: 'Antilekbescherming', en: 'Puncture protection' }, ['attr:antilek|puncture|protection|bescherming']),
    attribute('valve', { nl: 'Tubeless of binnenband', en: 'Tubeless or tubed' }, ['attr:tubeless|ventiel|valve'], { type: 'enum' }),
    attribute('colour', { nl: 'Kleur', en: 'Colour' }, ['color'], { type: 'enum' }),
    attribute('appearance', { nl: 'Beeld', en: 'Image' }, ['image']),
    attribute('distinction', { nl: 'Onderscheid', en: 'Distinguishing detail' }, ['description']),
  ],
  rules: [],
  questions: [
    question('b3', { nl: 'Welke bandenmaat (ETRTO) is het?', en: 'What tyre size (ETRTO) is it?' }, ['etrto'], 'critical', 'fit', { mode: 'any' }),
    question('b5', { nl: 'Op welke wielmaat past hij?', en: 'What wheel size does it fit?' }, ['wheel-size'], 'critical', 'fit', { mode: 'any', answerType: 'enum' }),
    question('b4', { nl: 'Hoe breed is de band?', en: 'How wide is the tyre?' }, ['section-width'], 'high', 'fit', { mode: 'any', answerType: 'number' }),
    question('b6', { nl: 'Voor welk gebruik is hij bedoeld?', en: 'What use is it intended for?' }, ['intended-use'], 'high', 'fit', { mode: 'any', answerType: 'enum' }),
    question('b1', { nl: 'Wat voor band is dit?', en: 'What kind of tyre is this?' }, ['tyre-type'], 'high', 'fit'),
    question('b9', { nl: 'Is hij tubeless of met binnenband?', en: 'Is it tubeless or tubed?' }, ['valve'], 'high', 'fit', { mode: 'any', answerType: 'enum' }),
    question('b2', { nl: 'Van welk merk is de band?', en: 'What brand is the tyre?' }, ['brand'], 'medium', 'purchase-certainty'),
    question('b7', { nl: 'Welk drukbereik heeft hij?', en: 'What pressure range does it take?' }, ['pressure'], 'medium', 'processing', { mode: 'any', answerType: 'number' }),
    question('b8', { nl: 'Heeft hij antilekbescherming?', en: 'Does it have puncture protection?' }, ['puncture'], 'medium', 'durability', { mode: 'any' }),
    question('b11', { nl: 'Hoe ziet hij eruit?', en: 'What does it look like?' }, ['appearance'], 'medium', 'expectation'),
    question('b10', { nl: 'Welke kleur heeft hij?', en: 'What colour is it?' }, ['colour'], 'low', 'expectation', { answerType: 'enum' }),
    question('b12', { nl: 'Waarin verschilt hij van andere banden?', en: 'How does it differ from other tyres?' }, ['distinction'], 'low', 'expectation'),
  ],
  overlays: [],
});
