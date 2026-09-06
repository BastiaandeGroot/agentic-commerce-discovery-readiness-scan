// Het veldenregister: de vocabulaire waarin bewijs wordt uitgedrukt.
//
// Dit bestand is de enige plek waar veldkennis staat. Het stuurt twee dingen aan:
//   - de intake (welke bronkolom hoort bij welk veld)
//   - de gap-attributie (welk systeem is eigenaar, en dus wie het werk doet)
//
// Wat hier NIET meer staat is een tier of een protocolnaam. Dit register meet
// geen compleetheid tegen een kanaalspecificatie; het benoemt alleen de velden
// waarin een vraag uit de vragenbank beantwoord kan worden. Of een veld ertoe
// doet, volgt uit de vraag die erop leunt — niet uit een lijst met verplichte
// attributen.

import type { FieldDef } from '../domain/types';

export const FIELDS: FieldDef[] = [
  // --- Identificatie en herkenning ----------------------------------------
  {
    key: 'item_id',
    label: { nl: 'Product-ID', en: 'Item ID' },
    owner: 'pim',
    aliases: ['item_id', 'id', 'sku', 'product_id', 'artikelnummer', 'artikelcode', 'productcode'],
  },
  {
    key: 'title',
    label: { nl: 'Titel', en: 'Title' },
    owner: 'pim',
    aliases: ['title', 'name', 'product_title', 'productnaam', 'naam', 'titel'],
  },
  {
    key: 'description',
    label: { nl: 'Omschrijving', en: 'Description' },
    owner: 'content',
    aliases: ['description', 'omschrijving', 'beschrijving', 'product_description', 'long_description'],
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
  },
  {
    key: 'brand',
    label: { nl: 'Merk', en: 'Brand' },
    owner: 'pim',
    aliases: ['brand', 'merk', 'manufacturer', 'fabrikant'],
  },
  {
    key: 'image',
    label: { nl: 'Hoofdafbeelding', en: 'Main image' },
    owner: 'content',
    aliases: ['image_url', 'image_link', 'image', 'main_image', 'afbeelding', 'hoofdafbeelding'],
  },
  {
    key: 'additional_images',
    label: { nl: 'Extra afbeeldingen', en: 'Additional images' },
    owner: 'content',
    aliases: ['additional_image_urls', 'additional_image_link', 'additional_images', 'extra_afbeeldingen'],
  },
  {
    key: 'video',
    label: { nl: 'Productvideo', en: 'Product video' },
    owner: 'content',
    aliases: ['video_url', 'video_link', 'video'],
  },
  {
    key: 'product_category',
    label: { nl: 'Google-productcategorie', en: 'Google product category' },
    owner: 'pim',
    aliases: ['product_category', 'google_product_category', 'googlecategorie'],
  },
  {
    key: 'product_type',
    label: { nl: 'Eigen categorie', en: 'Own category' },
    owner: 'pim',
    aliases: ['product_type', 'category', 'categorie', 'categorypath', 'category_path', 'hoofdcategorie'],
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
  },
  {
    key: 'material',
    label: { nl: 'Materiaal', en: 'Material' },
    owner: 'pim',
    aliases: ['material', 'materiaal', 'materials', 'fabric', 'samenstelling'],
  },
  {
    key: 'dimensions',
    label: { nl: 'Afmetingen', en: 'Dimensions' },
    owner: 'pim',
    aliases: ['dimensions', 'afmetingen', 'afmeting', 'size_cm', 'maten', 'length', 'width', 'height', 'lengte', 'breedte', 'hoogte', 'diepte'],
  },
  {
    key: 'weight',
    label: { nl: 'Gewicht', en: 'Weight' },
    owner: 'pim',
    aliases: ['weight', 'gewicht', 'shipping_weight', 'product_weight'],
  },
  {
    key: 'color',
    label: { nl: 'Kleur', en: 'Colour' },
    owner: 'pim',
    aliases: ['color', 'colour', 'kleur'],
  },
  {
    key: 'size',
    label: { nl: 'Maat', en: 'Size' },
    owner: 'pim',
    aliases: ['size', 'maat', 'maatvoering', 'size_system'],
  },
  {
    key: 'age_group',
    label: { nl: 'Leeftijdsgroep', en: 'Age group' },
    owner: 'pim',
    aliases: ['age_group', 'leeftijdsgroep', 'doelgroep'],
  },
  {
    key: 'gender',
    label: { nl: 'Geslacht', en: 'Gender' },
    owner: 'pim',
    aliases: ['gender', 'geslacht'],
  },
  {
    key: 'item_group_id',
    label: { nl: 'Variantgroep', en: 'Variant group' },
    owner: 'pim',
    aliases: ['item_group_id', 'group_id', 'variant_group', 'parent_sku', 'variantgroep'],
  },
  {
    key: 'q_and_a',
    label: { nl: 'Vraag en antwoord', en: 'Q&A' },
    owner: 'content',
    aliases: ['q_and_a', 'question_and_answer', 'faq', 'vraag_en_antwoord'],
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
  },
  {
    key: 'related_product',
    label: { nl: 'Gerelateerde producten', en: 'Related products' },
    owner: 'pim',
    aliases: ['related_product_id', 'related_product', 'gerelateerd', 'accessoires'],
  },
  {
    key: 'target_countries',
    label: { nl: 'Doellanden', en: 'Target countries' },
    owner: 'ops',
    aliases: ['target_countries', 'target_country', 'doellanden', 'countries'],
  },

  // --- SELECTION: word ik gekozen boven een gelijkwaardig alternatief? ----
  {
    key: 'price',
    label: { nl: 'Prijs', en: 'Price' },
    owner: 'erp',
    aliases: ['price', 'prijs', 'regular_price', 'list_price'],
  },
  {
    key: 'sale_price',
    label: { nl: 'Actieprijs', en: 'Sale price' },
    owner: 'erp',
    aliases: ['sale_price', 'actieprijs', 'special_price', 'discount_price'],
  },
  {
    key: 'availability',
    label: { nl: 'Beschikbaarheid', en: 'Availability' },
    owner: 'erp',
    aliases: ['availability', 'beschikbaarheid', 'stock_status', 'voorraadstatus', 'in_stock'],
  },
  {
    key: 'gtin',
    label: { nl: 'GTIN / EAN', en: 'GTIN / EAN' },
    owner: 'pim',
    aliases: ['gtin', 'ean', 'upc', 'barcode', 'isbn'],
  },
  {
    key: 'mpn',
    label: { nl: 'MPN', en: 'MPN' },
    owner: 'pim',
    aliases: ['mpn', 'manufacturer_part_number', 'fabrikantcode'],
  },
  {
    key: 'star_rating',
    label: { nl: 'Productbeoordeling', en: 'Product rating' },
    owner: 'reviews',
    aliases: ['star_rating', 'rating', 'product_rating', 'review_score', 'beoordeling', 'waardering'],
    note: {
      nl: 'Een beoordeling komt uit je reviewplatform en niet uit je PIM. Ontbreekt hij, dan is dat geen tekortkoming van je catalogus maar een keuze over welke systemen je koppelt.',
      en: 'A rating comes from your reviews platform, not from your PIM. If it is missing, that is not a shortcoming of your catalogue but a choice about which systems you connect.',
    },
  },
  {
    key: 'review_count',
    label: { nl: 'Aantal reviews', en: 'Review count' },
    owner: 'reviews',
    aliases: ['review_count', 'number_of_ratings', 'reviews_count', 'aantal_reviews', 'aantal_beoordelingen'],
  },
  {
    key: 'reviews',
    label: { nl: 'Reviewteksten', en: 'Review entries' },
    owner: 'reviews',
    aliases: ['reviews', 'review_entries', 'recensies'],
  },
  {
    key: 'store_star_rating',
    label: { nl: 'Winkelbeoordeling', en: 'Store rating' },
    owner: 'reviews',
    aliases: ['store_star_rating', 'store_rating', 'winkelbeoordeling'],
  },
  {
    key: 'store_review_count',
    label: { nl: 'Aantal winkelreviews', en: 'Store review count' },
    owner: 'reviews',
    aliases: ['store_review_count', 'store_reviews', 'aantal_winkelreviews'],
  },
  {
    key: 'accepts_returns',
    label: { nl: 'Retour mogelijk', en: 'Accepts returns' },
    owner: 'returns',
    aliases: ['accepts_returns', 'returns', 'retour', 'retourneren', 'return_accepted'],
  },
  {
    key: 'return_deadline',
    label: { nl: 'Retourtermijn', en: 'Return window' },
    owner: 'returns',
    aliases: ['return_deadline_in_days', 'return_window', 'retourtermijn', 'bedenktijd'],
  },
  {
    key: 'return_policy',
    label: { nl: 'Retourbeleid', en: 'Return policy' },
    owner: 'returns',
    aliases: ['return_policy', 'retourbeleid', 'return_policy_label', 'retourvoorwaarden'],
  },
  {
    key: 'return_rate',
    label: { nl: 'Retourpercentage', en: 'Return rate' },
    owner: 'returns',
    aliases: ['return_rate', 'retourpercentage', 'retourratio'],
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
  },
  {
    key: 'pricing_trend',
    label: { nl: 'Prijsontwikkeling', en: 'Pricing trend' },
    owner: 'erp',
    aliases: ['pricing_trend', 'prijsontwikkeling', 'lowest_price'],
  },
  {
    key: 'shipping',
    label: { nl: 'Verzending', en: 'Shipping' },
    owner: 'ops',
    aliases: ['shipping', 'verzending', 'verzendkosten', 'shipping_cost', 'delivery'],
  },
  {
    key: 'delivery_time',
    label: { nl: 'Levertijd', en: 'Delivery time' },
    owner: 'ops',
    aliases: ['delivery_time', 'levertijd', 'transit_time', 'shipping_min_transit_time', 'min_handling_time'],
  },
  {
    key: 'seller_name',
    label: { nl: 'Verkopersnaam', en: 'Seller name' },
    owner: 'ecommerce',
    aliases: ['seller_name', 'verkoper', 'merchant_name', 'winkelnaam'],
  },

  // --- OUT: buiten de score, wel gerapporteerd (§3) -----------------------
  {
    key: 'is_eligible_search',
    label: { nl: 'Zichtbaar in zoeken', en: 'Eligible for search' },
    owner: 'ecommerce',
    aliases: ['is_eligible_search', 'eligible_search'],
  },
  {
    key: 'is_eligible_checkout',
    label: { nl: 'Afrekenbaar in ChatGPT', en: 'Eligible for checkout' },
    owner: 'ecommerce',
    aliases: ['is_eligible_checkout', 'eligible_checkout'],
  },
  {
    key: 'checkout_eligibility',
    label: { nl: 'UCP checkout-eligibility', en: 'UCP checkout eligibility' },
    owner: 'ecommerce',
    aliases: ['native_commerce', 'checkout_eligibility', 'native_commerce_checkout_eligibility'],
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
  },
  {
    key: 'warning',
    label: { nl: 'Productwaarschuwing', en: 'Product warning' },
    owner: 'legal',
    aliases: ['warning', 'warning_url', 'safety_warning'],
  },
  {
    key: 'age_restriction',
    label: { nl: 'Leeftijdsbeperking', en: 'Age restriction' },
    owner: 'legal',
    aliases: ['age_restriction', 'leeftijdsbeperking', 'minimum_age'],
  },
  {
    key: 'seller_privacy_policy',
    label: { nl: 'Privacybeleid verkoper', en: 'Seller privacy policy' },
    owner: 'legal',
    aliases: ['seller_privacy_policy', 'privacy_policy', 'privacybeleid'],
  },
  {
    key: 'seller_tos',
    label: { nl: 'Voorwaarden verkoper', en: 'Seller terms' },
    owner: 'legal',
    aliases: ['seller_tos', 'terms_of_service', 'voorwaarden', 'algemene_voorwaarden'],
  },
  {
    key: 'merchant_item_id',
    label: { nl: 'Checkout-ID', en: 'Checkout item ID' },
    owner: 'ecommerce',
    aliases: ['merchant_item_id', 'checkout_id'],
  },
];

/** Snelle opzoektabel op canonieke sleutel. */
export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f]),
);

/** De velden per eigenaar: wie moet er aan de bak als hier een gat zit. */
export function fieldsByOwner(): Map<FieldDef['owner'], FieldDef[]> {
  const grouped = new Map<FieldDef['owner'], FieldDef[]>();
  for (const field of FIELDS) {
    grouped.set(field.owner, [...(grouped.get(field.owner) ?? []), field]);
  }
  return grouped;
}
