// Het veldenregister: ACP en UCP naast elkaar, één regel per veld.
//
// Dit bestand is de enige plek waar veldkennis staat. Het stuurt drie dingen aan:
//   - de intake (welke bronkolom hoort bij welk veld)
//   - de tier-indeling (Core / Selection / Out)
//   - de gap-attributie (welk systeem is eigenaar)
//
// LET OP: de tier-kolom is onze eigen lijn. Geen van beide specificaties kent een
// categorie "discovery"; die grens trekken wij, en daarom is hij versie-gestempeld.
//
// UCP is een delta bovenop de Merchant Center-basisspec. Waar een veld hieronder
// een ucp-regel heeft, is dat óf de Merchant Center-naam óf een echt UCP-attribuut.

import type { FieldDef } from '../domain/types';

export const FIELDS: FieldDef[] = [
  // --- Identificatie & vindbaarheid: CORE ---------------------------------
  {
    key: 'item_id',
    label: { nl: 'Product-ID', en: 'Item ID' },
    owner: 'pim',
    aliases: ['item_id', 'id', 'sku', 'product_id', 'artikelnummer', 'artikelcode', 'productcode'],
    acp: { name: 'item_id', tier: 'core', required: true },
    ucp: { name: 'id', tier: 'core', required: true },
  },
  {
    key: 'title',
    label: { nl: 'Titel', en: 'Title' },
    owner: 'pim',
    aliases: ['title', 'name', 'product_title', 'productnaam', 'naam', 'titel'],
    acp: { name: 'title', tier: 'core', required: true },
    ucp: { name: 'title', tier: 'core', required: true },
  },
  {
    key: 'description',
    label: { nl: 'Omschrijving', en: 'Description' },
    owner: 'content',
    aliases: ['description', 'omschrijving', 'beschrijving', 'product_description', 'long_description'],
    acp: { name: 'description', tier: 'core', required: true },
    ucp: { name: 'description', tier: 'core', required: true },
    note: {
      nl: 'Aanwezigheid is niet hetzelfde als bruikbaarheid: een omschrijving van vijf woorden vult het veld maar beantwoordt geen enkele vraag.',
      en: 'Presence is not usability: a five-word description fills the field but answers no question.',
    },
  },
  {
    key: 'url',
    label: { nl: 'Product-URL', en: 'Product URL' },
    owner: 'ecommerce',
    aliases: ['url', 'link', 'product_url', 'product_link', 'permalink'],
    acp: { name: 'url', tier: 'core', required: true },
    ucp: { name: 'link', tier: 'core', required: true },
  },
  {
    key: 'brand',
    label: { nl: 'Merk', en: 'Brand' },
    owner: 'pim',
    aliases: ['brand', 'merk', 'manufacturer', 'fabrikant'],
    acp: { name: 'brand', tier: 'core', required: true },
    ucp: { name: 'brand', tier: 'core', required: true },
  },
  {
    key: 'image',
    label: { nl: 'Hoofdafbeelding', en: 'Main image' },
    owner: 'content',
    aliases: ['image_url', 'image_link', 'image', 'main_image', 'afbeelding', 'hoofdafbeelding'],
    acp: { name: 'image_url', tier: 'core', required: true },
    ucp: { name: 'image_link', tier: 'core', required: true },
  },
  {
    key: 'additional_images',
    label: { nl: 'Extra afbeeldingen', en: 'Additional images' },
    owner: 'content',
    aliases: ['additional_image_urls', 'additional_image_link', 'additional_images', 'extra_afbeeldingen'],
    acp: { name: 'additional_image_urls', tier: 'core', required: false },
    ucp: { name: 'additional_image_link', tier: 'core', required: false },
  },
  {
    key: 'video',
    label: { nl: 'Productvideo', en: 'Product video' },
    owner: 'content',
    aliases: ['video_url', 'video_link', 'video'],
    acp: { name: 'video_url', tier: 'core', required: false },
  },
  {
    key: 'product_category',
    label: { nl: 'Google-productcategorie', en: 'Google product category' },
    owner: 'pim',
    aliases: ['product_category', 'google_product_category', 'googlecategorie'],
    acp: { name: 'product_category', tier: 'core', required: false },
    ucp: { name: 'google_product_category', tier: 'core', required: false },
  },
  {
    key: 'product_type',
    label: { nl: 'Eigen categorie', en: 'Own category' },
    owner: 'pim',
    aliases: ['product_type', 'category', 'categorie', 'categorypath', 'category_path', 'hoofdcategorie'],
    ucp: { name: 'product_type', tier: 'core', required: false },
    note: {
      nl: 'De eigen categorie-indeling bepaalt welke vragenset op het product wordt toegepast.',
      en: 'The own category determines which question set applies to the product.',
    },
  },
  {
    key: 'condition',
    label: { nl: 'Staat', en: 'Condition' },
    owner: 'pim',
    aliases: ['condition', 'staat', 'conditie'],
    acp: { name: 'condition', tier: 'core', required: false },
    ucp: { name: 'condition', tier: 'core', required: false },
  },
  {
    key: 'material',
    label: { nl: 'Materiaal', en: 'Material' },
    owner: 'pim',
    aliases: ['material', 'materiaal', 'materials', 'fabric', 'samenstelling'],
    acp: { name: 'material', tier: 'core', required: false },
    ucp: { name: 'material', tier: 'core', required: false },
  },
  {
    key: 'dimensions',
    label: { nl: 'Afmetingen', en: 'Dimensions' },
    owner: 'pim',
    aliases: ['dimensions', 'afmetingen', 'afmeting', 'size_cm', 'maten', 'length', 'width', 'height', 'lengte', 'breedte', 'hoogte', 'diepte'],
    acp: { name: 'dimensions', tier: 'core', required: false },
  },
  {
    key: 'weight',
    label: { nl: 'Gewicht', en: 'Weight' },
    owner: 'pim',
    aliases: ['weight', 'gewicht', 'shipping_weight', 'product_weight'],
    acp: { name: 'weight', tier: 'core', required: false },
    ucp: { name: 'shipping_weight', tier: 'core', required: false },
  },
  {
    key: 'color',
    label: { nl: 'Kleur', en: 'Colour' },
    owner: 'pim',
    aliases: ['color', 'colour', 'kleur'],
    acp: { name: 'color', tier: 'core', required: false },
    ucp: { name: 'color', tier: 'core', required: false },
  },
  {
    key: 'size',
    label: { nl: 'Maat', en: 'Size' },
    owner: 'pim',
    aliases: ['size', 'maat', 'maatvoering', 'size_system'],
    acp: { name: 'size', tier: 'core', required: false },
    ucp: { name: 'size', tier: 'core', required: false },
  },
  {
    key: 'age_group',
    label: { nl: 'Leeftijdsgroep', en: 'Age group' },
    owner: 'pim',
    aliases: ['age_group', 'leeftijdsgroep', 'doelgroep'],
    acp: { name: 'age_group', tier: 'core', required: false },
    ucp: { name: 'age_group', tier: 'core', required: false },
  },
  {
    key: 'gender',
    label: { nl: 'Geslacht', en: 'Gender' },
    owner: 'pim',
    aliases: ['gender', 'geslacht'],
    acp: { name: 'gender', tier: 'core', required: false },
    ucp: { name: 'gender', tier: 'core', required: false },
  },
  {
    key: 'item_group_id',
    label: { nl: 'Variantgroep', en: 'Variant group' },
    owner: 'pim',
    aliases: ['item_group_id', 'group_id', 'variant_group', 'parent_sku', 'variantgroep'],
    acp: { name: 'group_id', tier: 'core', required: false },
    ucp: { name: 'item_group_id', tier: 'core', required: false },
  },
  {
    key: 'q_and_a',
    label: { nl: 'Vraag en antwoord', en: 'Q&A' },
    owner: 'content',
    aliases: ['q_and_a', 'question_and_answer', 'faq', 'vraag_en_antwoord'],
    acp: { name: 'q_and_a', tier: 'core', required: false },
    ucp: { name: 'question_and_answer', tier: 'core', required: false },
    note: {
      nl: 'Beide specificaties willen inhoud die een vraag beantwoordt zonder sitebezoek. Geen van beide maakt het verplicht.',
      en: 'Both specs want content that answers a question without a site visit. Neither requires it.',
    },
  },
  {
    key: 'product_detail',
    label: { nl: 'Productdetails', en: 'Product details' },
    owner: 'content',
    aliases: ['product_detail', 'product_details', 'product_highlight', 'highlights', 'specificaties', 'specs'],
    ucp: { name: 'product_detail', tier: 'core', required: false },
  },
  {
    key: 'related_product',
    label: { nl: 'Gerelateerde producten', en: 'Related products' },
    owner: 'pim',
    aliases: ['related_product_id', 'related_product', 'gerelateerd', 'accessoires'],
    acp: { name: 'related_product_id', tier: 'core', required: false },
    ucp: { name: 'related_product', tier: 'core', required: false },
  },
  {
    key: 'target_countries',
    label: { nl: 'Doellanden', en: 'Target countries' },
    owner: 'ops',
    aliases: ['target_countries', 'target_country', 'doellanden', 'countries'],
    acp: { name: 'target_countries', tier: 'core', required: true },
  },

  // --- SELECTION: word ik gekozen boven een gelijkwaardig alternatief? ----
  {
    key: 'price',
    label: { nl: 'Prijs', en: 'Price' },
    owner: 'erp',
    aliases: ['price', 'prijs', 'regular_price', 'list_price'],
    acp: { name: 'price', tier: 'selection', required: true },
    ucp: { name: 'price', tier: 'selection', required: true },
  },
  {
    key: 'sale_price',
    label: { nl: 'Actieprijs', en: 'Sale price' },
    owner: 'erp',
    aliases: ['sale_price', 'actieprijs', 'special_price', 'discount_price'],
    acp: { name: 'sale_price', tier: 'selection', required: false },
    ucp: { name: 'sale_price', tier: 'selection', required: false },
  },
  {
    key: 'availability',
    label: { nl: 'Beschikbaarheid', en: 'Availability' },
    owner: 'erp',
    aliases: ['availability', 'beschikbaarheid', 'stock_status', 'voorraadstatus', 'in_stock'],
    acp: { name: 'availability', tier: 'selection', required: true },
    ucp: { name: 'availability', tier: 'selection', required: true },
  },
  {
    key: 'gtin',
    label: { nl: 'GTIN / EAN', en: 'GTIN / EAN' },
    owner: 'pim',
    aliases: ['gtin', 'ean', 'upc', 'barcode', 'isbn'],
    acp: { name: 'gtin', tier: 'selection', required: false },
    ucp: { name: 'gtin', tier: 'selection', required: false },
  },
  {
    key: 'mpn',
    label: { nl: 'MPN', en: 'MPN' },
    owner: 'pim',
    aliases: ['mpn', 'manufacturer_part_number', 'fabrikantcode'],
    acp: { name: 'mpn', tier: 'selection', required: false },
    ucp: { name: 'mpn', tier: 'selection', required: false },
  },
  {
    key: 'star_rating',
    label: { nl: 'Productbeoordeling', en: 'Product rating' },
    owner: 'reviews',
    aliases: ['star_rating', 'rating', 'product_rating', 'review_score', 'beoordeling', 'waardering'],
    acp: { name: 'star_rating', tier: 'selection', required: false },
    note: {
      nl: 'UCP kent dit niet als feed-attribuut: Google regelt reviews via losse reviewprogramma\'s. Het grootste structurele verschil tussen de twee specificaties.',
      en: 'UCP has no such feed attribute: Google handles reviews through separate programmes. The single biggest structural difference between the two specs.',
    },
  },
  {
    key: 'review_count',
    label: { nl: 'Aantal reviews', en: 'Review count' },
    owner: 'reviews',
    aliases: ['review_count', 'number_of_ratings', 'reviews_count', 'aantal_reviews', 'aantal_beoordelingen'],
    acp: { name: 'review_count', tier: 'selection', required: false },
  },
  {
    key: 'reviews',
    label: { nl: 'Reviewteksten', en: 'Review entries' },
    owner: 'reviews',
    aliases: ['reviews', 'review_entries', 'recensies'],
    acp: { name: 'reviews[]', tier: 'selection', required: false },
  },
  {
    key: 'store_star_rating',
    label: { nl: 'Winkelbeoordeling', en: 'Store rating' },
    owner: 'reviews',
    aliases: ['store_star_rating', 'store_rating', 'winkelbeoordeling'],
    acp: { name: 'store_star_rating', tier: 'selection', required: false },
  },
  {
    key: 'store_review_count',
    label: { nl: 'Aantal winkelreviews', en: 'Store review count' },
    owner: 'reviews',
    aliases: ['store_review_count', 'store_reviews', 'aantal_winkelreviews'],
    acp: { name: 'store_review_count', tier: 'selection', required: false },
  },
  {
    key: 'accepts_returns',
    label: { nl: 'Retour mogelijk', en: 'Accepts returns' },
    owner: 'returns',
    aliases: ['accepts_returns', 'returns', 'retour', 'retourneren', 'return_accepted'],
    acp: { name: 'accepts_returns', tier: 'selection', required: false },
    ucp: { name: 'returns', tier: 'selection', required: false },
  },
  {
    key: 'return_deadline',
    label: { nl: 'Retourtermijn', en: 'Return window' },
    owner: 'returns',
    aliases: ['return_deadline_in_days', 'return_window', 'retourtermijn', 'bedenktijd'],
    acp: { name: 'return_deadline_in_days', tier: 'selection', required: false },
  },
  {
    key: 'return_policy',
    label: { nl: 'Retourbeleid', en: 'Return policy' },
    owner: 'returns',
    aliases: ['return_policy', 'retourbeleid', 'return_policy_label', 'retourvoorwaarden'],
    acp: { name: 'return_policy', tier: 'selection', required: false },
    ucp: { name: 'return_policy_label', tier: 'selection', required: false },
  },
  {
    key: 'return_rate',
    label: { nl: 'Retourpercentage', en: 'Return rate' },
    owner: 'returns',
    aliases: ['return_rate', 'retourpercentage', 'retourratio'],
    acp: { name: 'return_rate', tier: 'selection', required: false },
    note: {
      nl: 'Het meest ontblotende veld in beide specificaties: de merchant publiceert hoe vaak zijn eigen product terugkomt.',
      en: 'The most exposing field in either spec: the merchant publishes how often their own product comes back.',
    },
  },
  {
    key: 'popularity',
    label: { nl: 'Populariteit', en: 'Popularity' },
    owner: 'marketing',
    aliases: ['popularity_score', 'popularity_rank', 'populariteit', 'bestseller_rank'],
    acp: { name: 'popularity_score', tier: 'selection', required: false },
    ucp: { name: 'popularity_rank', tier: 'selection', required: false },
  },
  {
    key: 'pricing_trend',
    label: { nl: 'Prijsontwikkeling', en: 'Pricing trend' },
    owner: 'erp',
    aliases: ['pricing_trend', 'prijsontwikkeling', 'lowest_price'],
    acp: { name: 'pricing_trend', tier: 'selection', required: false },
  },
  {
    key: 'shipping',
    label: { nl: 'Verzending', en: 'Shipping' },
    owner: 'ops',
    aliases: ['shipping', 'verzending', 'verzendkosten', 'shipping_cost', 'delivery'],
    acp: { name: 'shipping', tier: 'selection', required: false },
    ucp: { name: 'shipping', tier: 'selection', required: false },
  },
  {
    key: 'delivery_time',
    label: { nl: 'Levertijd', en: 'Delivery time' },
    owner: 'ops',
    aliases: ['delivery_time', 'levertijd', 'transit_time', 'shipping_min_transit_time', 'min_handling_time'],
    ucp: { name: 'transit_time_label', tier: 'selection', required: false },
  },
  {
    key: 'seller_name',
    label: { nl: 'Verkopersnaam', en: 'Seller name' },
    owner: 'ecommerce',
    aliases: ['seller_name', 'verkoper', 'merchant_name', 'winkelnaam'],
    acp: { name: 'seller_name', tier: 'selection', required: true },
  },

  // --- OUT: buiten de score, wel gerapporteerd (§3) -----------------------
  {
    key: 'is_eligible_search',
    label: { nl: 'Zichtbaar in zoeken', en: 'Eligible for search' },
    owner: 'ecommerce',
    aliases: ['is_eligible_search', 'eligible_search'],
    acp: { name: 'is_eligible_search', tier: 'out', required: true },
  },
  {
    key: 'is_eligible_checkout',
    label: { nl: 'Afrekenbaar in ChatGPT', en: 'Eligible for checkout' },
    owner: 'ecommerce',
    aliases: ['is_eligible_checkout', 'eligible_checkout'],
    acp: { name: 'is_eligible_checkout', tier: 'out', required: true },
  },
  {
    key: 'checkout_eligibility',
    label: { nl: 'UCP checkout-eligibility', en: 'UCP checkout eligibility' },
    owner: 'ecommerce',
    aliases: ['native_commerce', 'checkout_eligibility', 'native_commerce_checkout_eligibility'],
    ucp: { name: 'native_commerce(checkout_eligibility)', tier: 'out', required: true },
    note: {
      nl: 'Ontbreekt dit attribuut, dan is de waarde FALSE en verschijnt er geen koopknop — zonder foutmelding. Er is geen gedocumenteerde waarschuwing per product voor dit geval.',
      en: 'If this attribute is absent it defaults to FALSE and no Buy button appears — with no error. No per-product warning is documented for this case.',
    },
  },
  {
    key: 'consumer_notice',
    label: { nl: 'Wettelijke waarschuwing', en: 'Consumer notice' },
    owner: 'legal',
    aliases: ['consumer_notice', 'notice_message', 'legal_disclaimer', 'waarschuwing'],
    ucp: { name: 'consumer_notice', tier: 'out', required: false },
  },
  {
    key: 'warning',
    label: { nl: 'Productwaarschuwing', en: 'Product warning' },
    owner: 'legal',
    aliases: ['warning', 'warning_url', 'safety_warning'],
    acp: { name: 'warning', tier: 'out', required: false },
  },
  {
    key: 'age_restriction',
    label: { nl: 'Leeftijdsbeperking', en: 'Age restriction' },
    owner: 'legal',
    aliases: ['age_restriction', 'leeftijdsbeperking', 'minimum_age'],
    acp: { name: 'age_restriction', tier: 'out', required: false },
  },
  {
    key: 'seller_privacy_policy',
    label: { nl: 'Privacybeleid verkoper', en: 'Seller privacy policy' },
    owner: 'legal',
    aliases: ['seller_privacy_policy', 'privacy_policy', 'privacybeleid'],
    acp: { name: 'seller_privacy_policy', tier: 'out', required: false },
  },
  {
    key: 'seller_tos',
    label: { nl: 'Voorwaarden verkoper', en: 'Seller terms' },
    owner: 'legal',
    aliases: ['seller_tos', 'terms_of_service', 'voorwaarden', 'algemene_voorwaarden'],
    acp: { name: 'seller_tos', tier: 'out', required: false },
  },
  {
    key: 'merchant_item_id',
    label: { nl: 'Checkout-ID', en: 'Checkout item ID' },
    owner: 'ecommerce',
    aliases: ['merchant_item_id', 'checkout_id'],
    ucp: { name: 'merchant_item_id', tier: 'out', required: false },
  },
];

/** Snelle opzoektabel op canonieke sleutel. */
export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f]),
);

export function fieldsForProtocol(protocol: 'acp' | 'ucp'): FieldDef[] {
  return FIELDS.filter((f) => f[protocol] !== undefined);
}

export function tierOf(field: FieldDef, protocol: 'acp' | 'ucp') {
  return field[protocol]?.tier;
}
