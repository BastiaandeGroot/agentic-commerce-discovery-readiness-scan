// Het vangnet: de bank voor een categorie waarvoor nog geen onderzochte bank ligt.
//
// Deze bank kent de onomkeerbare fout van de markt niet, want die stel je vast in
// fase 0 en dat is onderzoek. Wat er wél in staat zijn de twee vragen zonder welke
// een agent het product überhaupt niet aan een verzoek kan koppelen. Die dragen
// hier het kritieke gewicht, met de verantwoording erbij dat dat een redenering is
// en geen meting.

import type { QuestionBank } from '../bank';
import { attribute, provisional, question } from './shared';

export const GENERIC_BANK: QuestionBank = provisional({
  meta: {
    vertical: 'generic',
    label: { nl: 'Algemeen', en: 'Generic' },
    version: '0.1.0',
    // Geen match: dit is waar een categorie landt die nergens anders op uitkomt.
  },
  context: {
    irreversibleMistake: {
      nl: 'Nog niet vastgesteld voor deze markt. In elke vertical bestaat een aankoopfout die de koper niet kan terugdraaien — op maat gemaakt, verpakking open, partij uitverkocht — en die bepaalt welke vragen kritiek zijn. Zolang die fout niet benoemd is, wegen hier alleen de vragen zwaar zonder welke een agent het product niet kan herkennen.',
      en: 'Not yet established for this market. Every vertical has a purchase mistake the buyer cannot undo — made to measure, packaging opened, batch sold out — and that determines which questions are critical. Until that mistake is named, the only questions weighted heavily here are the ones without which an agent cannot recognise the product at all.',
    },
  },
  attributes: [
    attribute('identity', { nl: 'Wat het product is', en: 'What the product is' }, ['title']),
    attribute('purpose', { nl: 'Waarvoor het dient', en: 'What it is for' }, ['description']),
    attribute('brand', { nl: 'Merk', en: 'Brand' }, ['brand']),
    attribute('appearance', { nl: 'Beeld', en: 'Image' }, ['image']),
    attribute('product-group', { nl: 'Productgroep', en: 'Product group' }, ['product_category', 'product_type']),
    attribute('material', { nl: 'Materiaal', en: 'Material' }, ['material']),
    attribute('dimensions', { nl: 'Afmetingen', en: 'Dimensions' }, ['dimensions', 'attr:afmeting|dimension|lengte|breedte|hoogte']),
    attribute('weight', { nl: 'Gewicht', en: 'Weight' }, ['weight'], { type: 'number' }),
    attribute('colour', { nl: 'Kleur', en: 'Colour' }, ['color'], { type: 'enum' }),
    attribute('condition', { nl: 'Staat', en: 'Condition' }, ['condition'], { type: 'enum' }),
    attribute('specifications', { nl: 'Specificaties', en: 'Specifications' }, ['product_detail', 'q_and_a']),
    attribute('product-page', { nl: 'Productpagina', en: 'Product page' }, ['url']),
  ],
  rules: [],
  questions: [
    question('g1', { nl: 'Wat is dit product precies?', en: 'What exactly is this product?' }, ['identity'], 'critical', 'fit', {
      weightNote: {
        nl: 'Kritiek op redenering, niet op dekking: zonder te weten wát het is, kan een agent het product aan geen enkel verzoek koppelen. De echte kritieke vragen van deze markt volgen uit fase 0.',
        en: 'Critical by reasoning, not by coverage: without knowing what it is, an agent cannot match the product to any request. The real critical questions of this market follow from phase 0.',
      },
    }),
    question('g5', { nl: 'In welke productgroep valt het?', en: 'What product group is it in?' }, ['product-group'], 'critical', 'fit', {
      mode: 'any',
      answerType: 'enum',
      weightNote: {
        nl: 'Zonder productgroep valt het product buiten elke vergelijking die een agent maakt.',
        en: 'Without a product group the item falls outside every comparison an agent makes.',
      },
    }),
    question('g2', { nl: 'Wat kan ik ermee?', en: 'What can I use it for?' }, ['purpose'], 'high', 'fit'),
    question('g4', { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' }, ['appearance'], 'high', 'expectation'),
    question('g7', { nl: 'Welke afmetingen heeft het?', en: 'What are its dimensions?' }, ['dimensions'], 'high', 'fit', { answerType: 'number' }),
    question('g3', { nl: 'Van welk merk is het?', en: 'What brand is it?' }, ['brand'], 'medium', 'purchase-certainty'),
    question('g6', { nl: 'Waar is het van gemaakt?', en: 'What is it made of?' }, ['material'], 'medium', 'material'),
    question('g9', { nl: 'Welke kleur heeft het?', en: 'What colour is it?' }, ['colour'], 'medium', 'expectation', { answerType: 'enum' }),
    question('g10', { nl: 'Is het nieuw of gebruikt?', en: 'Is it new or used?' }, ['condition'], 'medium', 'purchase-certainty', { answerType: 'enum' }),
    question('g11', { nl: 'Welke specificaties heeft het?', en: 'What are its specifications?' }, ['specifications'], 'medium', 'fit', { mode: 'any' }),
    question('g8', { nl: 'Hoe zwaar is het?', en: 'How heavy is it?' }, ['weight'], 'low', 'expectation', { answerType: 'number' }),
    question('g12', { nl: 'Waar kan ik het bekijken?', en: 'Where can I view it?' }, ['product-page'], 'low', 'purchase-certainty'),
  ],
  overlays: [],
});
