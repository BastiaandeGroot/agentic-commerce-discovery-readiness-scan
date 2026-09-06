// Woontextiel — voorlopig, zonder panel, maar mét de onomkeerbare fout.
//
// Deze vertical is de reden dat de methode bestaat, en de onomkeerbare fout is er
// scherp: stof wordt van de rol geknipt, dus er is geen herroepingsrecht en
// verkeerd geknipt is totaalverlies. Daaruit volgt de weging. Niet "samenstelling
// is commercieel belangrijk", maar: welke vragen voorkomen dat er verkeerd
// geknipt wordt.
//
// Dat maakt de hoeveelheidsvraag hier kritiek, en die vraag laat meteen zien
// waarom bewijs twee lagen heeft: hoeveel meter je nodig hebt vraagt baanbreedte
// ÉN patroonrapport, en elk van die twee kan uit meerdere kolommen komen.
//
// Wat hier nog niet staat zijn de beslisregels — de meteragetabel en de
// schuurweerstandsdrempels per toepassing. Die zijn gepubliceerd bij marktpartijen
// en horen dus mét bron uit fase 2 te komen, niet uit onze duim. Ze staan bij de
// open punten.

import type { QuestionBank } from '../bank';
import { attribute, provisional, question } from './shared';

export const HOME_TEXTILES_BANK: QuestionBank = provisional({
  meta: {
    vertical: 'home-textiles',
    label: { nl: 'Woontextiel', en: 'Home textiles' },
    version: '0.1.0',
    match: 'stof|textiel|textile|gordijn|curtain|fabric|meubel|bekleding|upholstery|kussen',
  },
  context: {
    unitOfSale: 'measure',
    irreversibleMistake: {
      nl: 'Stof wordt op maat van de rol geknipt. Daarmee vervalt het herroepingsrecht: verkeerd geknipt is totaalverlies, en te weinig besteld betekent bijbestellen uit een ander verfbad. De vragen die dat voorkomen wegen daarom het zwaarst, ook als ze commercieel niet de meest besproken vragen zijn.',
      en: 'Fabric is cut to length from the roll. That removes the right of withdrawal: cut wrong is a total loss, and ordering too little means reordering from a different dye lot. The questions that prevent this therefore carry the most weight, even where they are not the most discussed questions commercially.',
    },
    consequence: {
      nl: 'Vragen die deze fout voorkomen krijgen belang kritiek.',
      en: 'Questions that prevent this mistake are weighted critical.',
    },
  },
  attributes: [
    attribute('textile-type', { nl: 'Soort textiel', en: 'Type of textile' }, ['title']),
    attribute('collection', { nl: 'Merk of collectie', en: 'Brand or collection' }, ['brand']),
    attribute('composition', { nl: 'Samenstelling', en: 'Composition' }, ['material']),
    attribute('grammage', { nl: 'Gewicht per m²', en: 'Weight per m²' }, ['weight', 'attr:gsm|g_m2|grammage|gewicht'], { type: 'number' }),
    attribute('roll-width', { nl: 'Baanbreedte', en: 'Roll width' }, ['attr:breedte|width|baanbreedte|rolbreedte'], { type: 'number' }),
    attribute('pattern-repeat', { nl: 'Patroonrapport', en: 'Pattern repeat' }, ['attr:rapport|patroonherhaling|repeat|raccord'], { type: 'number' }),
    attribute('colour', { nl: 'Kleur', en: 'Colour' }, ['color'], { type: 'enum', level: 'variant' }),
    attribute('opacity', { nl: 'Lichtdoorlatendheid', en: 'Light transmission' }, ['attr:lichtdoorlat|transparant|verduister|blackout|opacity'], { type: 'enum' }),
    attribute('abrasion', { nl: 'Schuurweerstand', en: 'Abrasion resistance' }, ['attr:schuurtoer|martindale|slijtage'], {
      type: 'number',
      standard: 'EN ISO 12947-2 (Martindale)',
    }),
    attribute('fire-rating', { nl: 'Brandveiligheidskeuring', en: 'Fire safety certification' }, ['attr:brandvertrag|fire|bs_5867|brandklasse'], {
      legal: {
        nl: 'In openbare ruimten gelden dwingende eisen aan brandgedrag van textiel. Welke, hangt af van het land en het gebruik.',
        en: 'Public spaces impose mandatory requirements on the fire behaviour of textiles. Which ones depends on country and use.',
      },
    }),
    attribute('care', { nl: 'Onderhoud', en: 'Care' }, ['attr:onderhoud|wasvoorschrift|care|reinig']),
    attribute('application', { nl: 'Toepassing', en: 'Application' }, ['attr:toepassing|gebruik|application|geschikt'], { type: 'enum' }),
    attribute('appearance', { nl: 'Beeld', en: 'Image' }, ['image']),
    attribute('distinction', { nl: 'Onderscheid', en: 'Distinguishing detail' }, ['description']),
    // Bewust zonder bewijsvelden: stalen zijn een dienst en geen productkenmerk.
    // De lege lijst is de bevinding, niet een omissie.
    attribute('sampling', { nl: 'Staalservice', en: 'Sample service' }, [], { type: 'process' }),
  ],
  rules: [],
  questions: [
    question('h13', { nl: 'Hoeveel meter heb ik nodig?', en: 'How many metres do I need?' }, ['roll-width', 'pattern-repeat'], 'critical', 'quantity', {
      mode: 'all',
      answerType: 'derived',
      answerable: 'partial',
      weightNote: {
        nl: 'Dit is de vraag achter de onomkeerbare fout. Hij vraagt baanbreedte én patroonrapport: zonder het rapport klopt de berekening niet zodra er een dessin in zit, en dan valt er te weinig van de rol.',
        en: 'This is the question behind the irreversible mistake. It needs both roll width and pattern repeat: without the repeat the calculation is wrong as soon as there is a design, and too little comes off the roll.',
      },
    }),
    question('h5', { nl: 'Hoe breed is de baan?', en: 'How wide is the roll?' }, ['roll-width'], 'critical', 'quantity', { mode: 'any', answerType: 'number' }),
    question('h10', { nl: 'Waarvoor is het geschikt?', en: 'What is it suitable for?' }, ['application'], 'critical', 'fit', {
      mode: 'any',
      answerType: 'enum',
      weightNote: {
        nl: 'Een stof die niet tegen het bedoelde gebruik kan, is na het knippen niet meer terug te brengen. Geschiktheid is hier dus geen nuance maar een poort.',
        en: 'A fabric that cannot take the intended use cannot be returned once it is cut. Suitability is therefore not a nuance here but a gate.',
      },
    }),
    question('h3', { nl: 'Wat is de samenstelling?', en: 'What is the composition?' }, ['composition'], 'high', 'material'),
    question('h7', { nl: 'Hoeveel licht laat het door?', en: 'How much light does it let through?' }, ['opacity'], 'high', 'expectation', { mode: 'any', answerType: 'enum' }),
    question('h8', { nl: 'Welke technische keuringen heeft het?', en: 'What technical certifications does it have?' }, ['fire-rating'], 'high', 'safety', { mode: 'any' }),
    question('h14', { nl: 'Hoeveel slijtage kan het hebben?', en: 'How much wear can it take?' }, ['abrasion'], 'high', 'durability', { mode: 'any', answerType: 'number' }),
    question('h9', { nl: 'Hoe onderhoud ik het?', en: 'How do I care for it?' }, ['care'], 'high', 'care', { mode: 'any' }),
    question('h1', { nl: 'Wat voor textiel is dit?', en: 'What kind of textile is this?' }, ['textile-type'], 'medium', 'fit'),
    question('h6', { nl: 'Welke kleur heeft het?', en: 'What colour is it?' }, ['colour'], 'medium', 'expectation', { answerType: 'enum' }),
    question('h4', { nl: 'Wat is het gewicht per m²?', en: 'What is the weight per m²?' }, ['grammage'], 'medium', 'material', { mode: 'any', answerType: 'number' }),
    question('h11', { nl: 'Hoe ziet het eruit?', en: 'What does it look like?' }, ['appearance'], 'medium', 'expectation'),
    question('h2', { nl: 'Van welk merk of welke collectie?', en: 'What brand or collection?' }, ['collection'], 'low', 'purchase-certainty'),
    question('h12', { nl: 'Wat onderscheidt het?', en: 'What sets it apart?' }, ['distinction'], 'low', 'expectation'),
    // Uit attributen niet te beantwoorden: dit is een dienst, geen kenmerk. Blijft
    // staan omdat er advies in zit, telt niet mee in de score.
    question('h15', { nl: 'Kan ik eerst een staal krijgen?', en: 'Can I get a sample first?' }, ['sampling'], 'high', 'purchase-certainty', {
      mode: 'any',
      answerType: 'process',
      answerable: 'no',
      weightNote: {
        nl: 'Een staal is het enige dat de onomkeerbare fout écht afdekt, maar het is een dienst en geen productkenmerk. Daarom staat de vraag hier wel en telt hij niet mee.',
        en: 'A sample is the only thing that really covers the irreversible mistake, but it is a service and not a product attribute. That is why the question stands here yet does not count.',
      },
    }),
  ],
  overlays: [
    {
      id: 'meubelstoffen',
      label: { nl: 'Meubelstoffen', en: 'Upholstery fabrics' },
      match: 'meubel|bekleding|upholstery',
      reweight: {
        h14: {
          importance: 'critical',
          why: {
            nl: 'Op een bank of stoel bepaalt de schuurweerstand of de stof het jarenlang uithoudt. Te licht gekozen en de bekleding is binnen een seizoen op — en dan zit hij er al op.',
            en: 'On a sofa or chair the abrasion resistance decides whether the fabric lasts for years. Choose too light and the upholstery is worn within a season — and by then it is already on.',
          },
        },
        h9: { importance: 'critical', why: {
          nl: 'Een meubelstof die niet gereinigd kan worden, is bij de eerste vlek verloren.',
          en: 'An upholstery fabric that cannot be cleaned is lost at the first stain.',
        } },
        h7: { importance: 'low' },
      },
      profiles: [
        {
          id: 'banken',
          label: { nl: 'Banken', en: 'Sofas' },
          match: 'bank|sofa|zitmeubel',
          criticalQuestions: ['h14', 'h13'],
          note: {
            nl: 'Dagelijks intensief gebruik. De drempel voor schuurweerstand ligt hier hoger dan bij een fauteuil; welk getal precies, moet uit het panel komen.',
            en: 'Intensive daily use. The abrasion threshold is higher here than for an armchair; the exact figure has to come from the panel.',
          },
        },
        {
          id: 'eetkamerstoelen',
          label: { nl: 'Eetkamerstoelen', en: 'Dining chairs' },
          match: 'eetkamer|stoel|chair',
          criticalQuestions: ['h9', 'h14'],
          note: {
            nl: 'Aan tafel wordt gemorst; reinigbaarheid weegt hier zwaarder dan elders.',
            en: 'Spills happen at the table; cleanability weighs more heavily here than elsewhere.',
          },
        },
      ],
    },
    {
      id: 'gordijnstoffen',
      label: { nl: 'Gordijnstoffen', en: 'Curtain fabrics' },
      match: 'gordijn|curtain|raambekleding',
      reweight: {
        h7: {
          importance: 'critical',
          why: {
            nl: 'Bij een gordijn is lichtdoorlatendheid de reden van aanschaf. Verduisterend of transparant verkeerd inschatten betekent opnieuw kopen, en de eerste baan is al geknipt.',
            en: 'For a curtain, light transmission is the reason for buying. Misjudging blackout versus sheer means buying again, and the first drop has already been cut.',
          },
        },
        h14: { importance: 'low' },
      },
      profiles: [
        {
          id: 'overgordijnen',
          label: { nl: 'Overgordijnen', en: 'Full-length curtains' },
          match: 'overgordijn|gordijn',
          criticalQuestions: ['h13', 'h7'],
        },
        {
          id: 'vouwgordijnen',
          label: { nl: 'Vouwgordijnen', en: 'Roman blinds' },
          match: 'vouwgordijn|roman',
          criticalQuestions: ['h13'],
          note: {
            nl: 'De hoeveelheidsberekening werkt hier anders dan bij een overgordijn: geen plooifactor maar baanhoogte plus vouwtoeslag.',
            en: 'The quantity calculation works differently here than for a curtain: no fullness factor but drop height plus a fold allowance.',
          },
        },
      ],
    },
    {
      id: 'outdoorstoffen',
      label: { nl: 'Outdoorstoffen', en: 'Outdoor fabrics' },
      match: 'outdoor|buiten|tuinmeubel',
      attributes: [
        attribute('weather-resistance', { nl: 'Weer- en UV-bestendigheid', en: 'Weather and UV resistance' }, ['attr:uv|weerbestendig|lichtecht|kleurecht|outdoor'], { type: 'enum' }),
      ],
      questions: [
        question('o1', { nl: 'Kan het tegen zon en regen?', en: 'Can it take sun and rain?' }, ['weather-resistance'], 'critical', 'durability', {
          mode: 'any',
          answerType: 'enum',
          weightNote: {
            nl: 'Buiten is dit de vraag die de aankoop bepaalt, en een stof die verschiet of beschimmelt is na één seizoen weg.',
            en: 'Outdoors this is the question that decides the purchase, and a fabric that fades or grows mould is gone after one season.',
          },
        }),
      ],
      reweight: {
        h7: { importance: 'low' },
      },
    },
  ],
  openPoints: [
    {
      id: 'meteragetabel',
      kind: 'gap',
      weight: 'critical',
      question: {
        nl: 'De meteragetabel ontbreekt: hoeveel stof heb je nodig bij een gegeven baanbreedte, rapport en toepassing? Marktpartijen publiceren die tabel; hij hoort mét bron uit de bronoogst te komen en niet uit een eigen berekening.',
        en: 'The meterage table is missing: how much fabric do you need at a given roll width, repeat and application? Market parties publish this table; it should come from the source harvest with its source, not from a calculation of our own.',
      },
    },
    {
      id: 'schuurweerstand-drempels',
      kind: 'reasoned-threshold',
      weight: 'high',
      question: {
        nl: 'Welke schuurweerstand hoort bij welke toepassing? Er circuleren gepubliceerde drempels per toepassing; die horen met bron vastgelegd te worden, inclusief de afwijkingen tussen sites. Nu staat er geen enkel getal, en dat is beter dan een verzonnen getal.',
        en: 'Which abrasion resistance belongs to which application? Published thresholds per application do circulate; they should be recorded with their source, including where sites disagree. Right now there is no figure at all, which is better than an invented one.',
      },
    },
  ],
});
