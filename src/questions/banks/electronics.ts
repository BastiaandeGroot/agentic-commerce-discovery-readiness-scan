// Elektronica — voorlopig, zonder panel.

import type { QuestionBank } from '../bank';
import { attribute, provisional, question } from './shared';

export const ELECTRONICS_BANK: QuestionBank = provisional({
  meta: {
    vertical: 'electronics',
    label: { nl: 'Elektronica', en: 'Electronics' },
    version: '0.1.0',
    match: 'elektronica|electronic|computer|laptop|telefoon|phone|audio|tv|camera|monitor|koptelefoon|headphone',
  },
  context: {
    unitOfSale: 'piece',
    irreversibleMistake: {
      nl: 'Beredeneerd, nog niet gemeten: incompatibiliteit blijkt meestal pas na installatie, en een apparaat dat geïnstalleerd of geactiveerd is gaat vaak niet meer als nieuw terug. De vragen die dat voorkomen — welk exact model, waarmee werkt het, welke aansluiting — dragen daarom het hoogste gewicht.',
      en: 'Reasoned, not yet measured: incompatibility usually only shows after installation, and a device that has been installed or activated often cannot go back as new. The questions that prevent this — which exact model, what does it work with, which connector — therefore carry the highest weight.',
    },
  },
  attributes: [
    attribute('device', { nl: 'Wat voor apparaat', en: 'Type of device' }, ['title']),
    attribute('brand', { nl: 'Merk', en: 'Brand' }, ['brand']),
    attribute('model', { nl: 'Modelnummer', en: 'Model number' }, ['mpn']),
    attribute('connections', { nl: 'Aansluitingen', en: 'Connections' }, ['attr:aansluiting|connect|poort|port|interface'], { type: 'enum' }),
    attribute('power', { nl: 'Vermogen of accuduur', en: 'Power or battery life' }, ['attr:vermogen|power|watt|voltage|accu|battery'], { type: 'number' }),
    attribute('compatibility', { nl: 'Compatibiliteit', en: 'Compatibility' }, ['attr:compatib|geschikt_voor|works_with'], { type: 'relation' }),
    attribute('dimensions', { nl: 'Afmetingen', en: 'Dimensions' }, ['dimensions', 'attr:afmeting|dimension'], { type: 'number' }),
    attribute('weight', { nl: 'Gewicht', en: 'Weight' }, ['weight'], { type: 'number' }),
    attribute('warranty', { nl: 'Garantie', en: 'Warranty' }, ['attr:garantie|warranty']),
    attribute('specifications', { nl: 'Specificaties', en: 'Specifications' }, ['product_detail', 'q_and_a']),
    attribute('appearance', { nl: 'Beeld', en: 'Image' }, ['image']),
    attribute('purpose', { nl: 'Waarvoor het dient', en: 'What it is for' }, ['description']),
  ],
  rules: [],
  questions: [
    question('e3', { nl: 'Welk exact modelnummer is het?', en: 'What exact model number is it?' }, ['model'], 'critical', 'fit', {
      weightNote: {
        nl: 'Zonder modelnummer kan een agent niet vaststellen dat dit hetzelfde apparaat is als waar de koper naar vroeg, en dus ook niet of het bij zijn bestaande spullen past.',
        en: 'Without a model number an agent cannot establish that this is the same device the buyer asked about, and therefore cannot tell whether it fits what they already own.',
      },
    }),
    question('e6', { nl: 'Waarmee is het compatibel?', en: 'What is it compatible with?' }, ['compatibility'], 'critical', 'fit', { mode: 'any', answerType: 'relation' }),
    question('e4', { nl: 'Welke aansluitingen heeft het?', en: 'What connections does it have?' }, ['connections'], 'high', 'fit', { mode: 'any', answerType: 'enum' }),
    question('e1', { nl: 'Wat voor apparaat is dit?', en: 'What kind of device is this?' }, ['device'], 'high', 'fit'),
    question('e5', { nl: 'Wat is het vermogen of de accuduur?', en: 'What is its power or battery life?' }, ['power'], 'high', 'expectation', { mode: 'any', answerType: 'number' }),
    question('e10', { nl: 'Welke specificaties heeft het?', en: 'What are its specifications?' }, ['specifications'], 'high', 'fit', { mode: 'any' }),
    question('e2', { nl: 'Van welk merk is het?', en: 'What brand is it?' }, ['brand'], 'medium', 'purchase-certainty'),
    question('e7', { nl: 'Welke afmetingen heeft het?', en: 'What are its dimensions?' }, ['dimensions'], 'medium', 'fit', { mode: 'any', answerType: 'number' }),
    question('e9', { nl: 'Welke garantie zit erop?', en: 'What warranty does it carry?' }, ['warranty'], 'medium', 'purchase-certainty', { mode: 'any' }),
    question('e11', { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' }, ['appearance'], 'medium', 'expectation'),
    question('e12', { nl: 'Wat kan ik ermee?', en: 'What can I do with it?' }, ['purpose'], 'medium', 'fit'),
    question('e8', { nl: 'Hoe zwaar is het?', en: 'How heavy is it?' }, ['weight'], 'low', 'expectation', { answerType: 'number' }),
  ],
  overlays: [],
});
