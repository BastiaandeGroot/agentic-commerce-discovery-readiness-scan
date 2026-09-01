// De Selection-checklist en het Out-blok, per protocol apart.
//
// Per protocol apart, omdat de beschikbare velden verschillen (§5). Het duidelijkste
// voorbeeld: ACP trekt reviews de feed in, UCP kent ze daar helemaal niet — die
// lopen via losse Google-reviewprogramma's. Eén gedeelde checklist zou dat verschil
// wegpoetsen en UCP onterecht laten zakken.

import type { Bilingual, Protocol } from '../domain/types';

export interface ChecklistItem {
  id: string;
  label: Bilingual;
  /** Canonieke sleutels; één gevuld veld volstaat. */
  requires: string[];
  note?: Bilingual;
}

const PRICE: ChecklistItem = {
  id: 'price',
  label: { nl: 'Prijs', en: 'Price' },
  requires: ['price'],
};
const AVAILABILITY: ChecklistItem = {
  id: 'availability',
  label: { nl: 'Beschikbaarheid', en: 'Availability' },
  requires: ['availability'],
};
const IDENTITY: ChecklistItem = {
  id: 'identity',
  label: { nl: 'Identificatie (GTIN of MPN)', en: 'Identity (GTIN or MPN)' },
  requires: ['gtin', 'mpn'],
};

export const SELECTION_CHECKLIST: Record<Protocol, ChecklistItem[]> = {
  acp: [
    PRICE,
    AVAILABILITY,
    IDENTITY,
    {
      id: 'trust',
      label: { nl: 'Vertrouwenssignaal (beoordeling of reviews)', en: 'Trust signal (rating or reviews)' },
      requires: ['star_rating', 'review_count', 'reviews', 'store_star_rating', 'store_review_count'],
    },
    {
      id: 'returns',
      label: { nl: 'Retourbeleid', en: 'Return policy' },
      requires: ['accepts_returns', 'return_deadline', 'return_policy'],
    },
  ],
  ucp: [
    PRICE,
    AVAILABILITY,
    IDENTITY,
    {
      id: 'returns',
      label: { nl: 'Retourbeleid', en: 'Return policy' },
      requires: ['accepts_returns', 'return_policy'],
      note: {
        nl: 'UCP vereist een retourbeleid op accountniveau; op productniveau is het een optionele overschrijving.',
        en: 'UCP requires a return policy at account level; at product level it is an optional override.',
      },
    },
  ],
};

/** Vertrouwenssignalen bestaan niet als UCP-feedattribuut. Dat zeggen we hardop. */
export const UCP_TRUST_NOTE: Bilingual = {
  nl: 'Vertrouwenssignalen tellen niet mee voor UCP: reviews zijn daar geen feedattribuut maar lopen via aparte Google-programma\'s. Voor ACP tellen ze wél mee.',
  en: 'Trust signals do not count towards UCP: reviews are not a feed attribute there but run through separate Google programmes. For ACP they do count.',
};

export interface OutCheck {
  id: string;
  label: Bilingual;
  /** Veld dat op waar moet staan. */
  field: string;
  note?: Bilingual;
}

/** Out-tier: buiten de score, maar wel gerapporteerd als apart waarschuwingsblok (§3). */
export const OUT_CHECKS: Record<Protocol, OutCheck[]> = {
  acp: [
    {
      id: 'eligible_checkout',
      label: { nl: 'Afrekenbaar in ChatGPT', en: 'Eligible for checkout' },
      field: 'is_eligible_checkout',
    },
    {
      id: 'eligible_search',
      label: { nl: 'Zichtbaar in ChatGPT-zoeken', en: 'Eligible for search' },
      field: 'is_eligible_search',
    },
  ],
  ucp: [
    {
      id: 'checkout_eligibility',
      label: { nl: 'UCP checkout-eligibility', en: 'UCP checkout eligibility' },
      field: 'checkout_eligibility',
      note: {
        nl: 'Ontbreekt het attribuut, dan staat het op FALSE en verschijnt er geen koopknop — zonder foutmelding en zonder waarschuwing per product. Een schoon Merchant Center-account betekent dus niet dat je catalogus afrekenbaar is.',
        en: 'If the attribute is absent it is FALSE and no Buy button appears — with no error and no per-product warning. A clean Merchant Center account therefore does not mean your catalogue is checkout-eligible.',
      },
    },
  ],
};
