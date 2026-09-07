// De woordenlijst waarmee een attribuutnaam op een kolomnaam wordt gelegd.
//
// Dit bestaat omdat de vragenbank en de catalogus twee verschillende talen
// spreken, en niet alleen in de zin van Nederlands en Engels. De bank noemt een
// kenmerk zoals het vak het noemt (`rolbreedte_cm`); de catalogus noemt het zoals
// het systeem het opsloeg (`rol_breedte`). Dat is dezelfde uitspraak in een
// andere schrijfwijze, en een merchant afrekenen op dat verschil meet zijn
// exportinstellingen in plaats van zijn productkennis.
//
// Drie lagen, oplopend in gewaagdheid:
//
//   1. **Schrijfwijze.** Scheidingstekens, hoofdletters en een eenheid achter de
//      naam dragen geen betekenis. `rolbreedte_cm` en `rol_breedte` zijn hetzelfde
//      woord. Dit is geen gok en levert de meeste treffers.
//   2. **Taal.** `gewicht` en `weight` zijn hetzelfde begrip. De lijst hieronder
//      blijft bewust generiek — de woorden die élke productcatalogus gebruikt —
//      want een vakwoordenlijst per markt hoort niet in code te staan.
//   3. **Vakwoorden.** Die horen bij de vertical en dus bij de vragenlijst zelf,
//      in een kolom `synoniemen`. Wat daar niet staat en niet generiek is, blijft
//      ongekoppeld, en dat is eerlijker dan het te raden.
//
// De module is puur en kent geen catalogus: hij krijgt namen binnen en geeft
// namen terug.

/**
 * Eenheden achter een naam. `rolbreedte_cm` en `rolbreedte_mm` gaan over
 * hetzelfde kenmerk; de eenheid zegt iets over de waarde, niet over het begrip.
 */
const UNITS = new Set([
  'cm', 'mm', 'm', 'm2', 'gm2', 'g', 'gr', 'kg', 'gram', 'pct', 'perc', 'percent',
  'procent', 'percentage', 'n', 'tex', 'nm', 'ml', 'l', 'c', 'celsius', 'uren',
  'hours', 'hrs', 'uur', 'min', 'sec', 'stuks', 'pcs', 'eur', 'euro', 'inch',
]);

/**
 * Woorden zonder onderscheidend vermogen.
 *
 * `composition_info` en `composition` wijzen hetzelfde aan; `info` is ruis. Ze
 * eruit halen voorkomt dat een kolom lager scoort omdat zijn naam netter is.
 */
const FILLER = new Set([
  'de', 'het', 'een', 'van', 'voor', 'en', 'met', 'per', 'op', 'bij',
  'the', 'a', 'an', 'of', 'for', 'and', 'or', 'with', 'is', 'has', 'heeft',
  'info', 'information', 'informatie', 'value', 'waarde', 'data', 'veld', 'field',
  'attribute', 'attribuut', 'kenmerk', 'product', 'artikel', 'item', 'custom',
  'extra', 'main', 'general', 'algemeen', 'specifiek', 'specifieke', 'specific',
  'advies', 'advice', 'indicatie', 'indication',
]);

/**
 * Hetzelfde begrip in twee talen, teruggebracht tot één sleutel.
 *
 * Bewust generiek: dit zijn de woorden waarmee elke productcatalogus zijn
 * kenmerken benoemt. Vakwoorden staan hier niet — `rapport` is voor een
 * stoffenwinkel een patroonherhaling en voor een accountant iets heel anders, en
 * die kennis hoort bij de vragenbank van die markt en niet in de motor.
 */
const LEXICON: Record<string, string> = {
  // maatvoering
  breedte: 'width', wide: 'width', width: 'width',
  hoogte: 'height', height: 'height',
  lengte: 'length', length: 'length',
  diepte: 'depth', depth: 'depth',
  dikte: 'thickness', thickness: 'thickness', gauge: 'thickness',
  gewicht: 'weight', weight: 'weight', massa: 'weight', mass: 'weight',
  maat: 'size', size: 'size', afmeting: 'size', afmetingen: 'size',
  dimension: 'size', dimensions: 'size', maten: 'size',
  inhoud: 'volume', volume: 'volume', content: 'volume',
  // identiteit
  titel: 'title', title: 'title', naam: 'title', name: 'title',
  merk: 'brand', brand: 'brand', fabrikant: 'manufacturer', manufacturer: 'manufacturer',
  leverancier: 'supplier', supplier: 'supplier',
  omschrijving: 'description', beschrijving: 'description', description: 'description',
  categorie: 'category', category: 'category',
  soort: 'type', type: 'type', kind: 'type', sort: 'type',
  vorm: 'shape', shape: 'shape', form: 'shape',
  // materiaal en uiterlijk
  materiaal: 'material', material: 'material',
  samenstelling: 'material', composition: 'material',
  kleur: 'colour', colour: 'colour', color: 'colour',
  glans: 'shine', shine: 'shine', gloss: 'shine',
  // handel
  prijs: 'price', price: 'price',
  voorraad: 'stock', stock: 'stock',
  beschikbaar: 'available', available: 'available', availability: 'available',
  levering: 'delivery', delivery: 'delivery', levertijd: 'delivery',
  // eigenschappen die overal terugkomen
  land: 'country', country: 'country', herkomst: 'origin', origin: 'origin',
  productie: 'production', production: 'production',
  temperatuur: 'temperature', temperature: 'temperature', temp: 'temperature',
  minimum: 'minimum', minimaal: 'minimum', minimale: 'minimum', min: 'minimum',
  maximum: 'maximum', maximaal: 'maximum', maximale: 'maximum', max: 'maximum',
  stap: 'step', step: 'step', increment: 'step',
  aantal: 'count', count: 'count', number: 'count',
  status: 'status', staat: 'status',
  // veelgebruikte bijvoeglijke koppen
  bestendig: 'resistant', resistent: 'resistant', resistant: 'resistant',
  werend: 'resistant', proof: 'resistant', afstotend: 'repellent',
  repellent: 'repellent', dicht: 'tight', tight: 'tight',
  geschikt: 'suitable', suitable: 'suitable',
  toepassing: 'application', application: 'application', gebruik: 'use', use: 'use',
  behandeling: 'treatment', treatment: 'treatment',
  afwerking: 'finish', finish: 'finish',
  onderhoud: 'care', care: 'care', maintenance: 'care',
  veiligheid: 'safety', safety: 'safety',
  norm: 'standard', standaard: 'standard', standard: 'standard',
  certificering: 'certification', certificeringen: 'certification',
  certificate: 'certification', certification: 'certification',
  certifications: 'certification', keurmerk: 'certification', label: 'certification',
};

/** Splits op scheidingstekens én op camelCase, zodat `fabricWidth` ook uiteenvalt. */
function split(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part !== '');
}

/**
 * De betekenisdragende woorden van een naam, elk op zijn canonieke vorm.
 *
 * Eenheden en vulwoorden vallen weg; wat overblijft is waar de naam over gaat.
 * Levert een lege lijst als er niets betekenisvols overblijft — dan is er niets
 * om op te matchen, en dat is een uitkomst en geen fout.
 */
export function meaningfulWords(name: string): string[] {
  return split(name)
    .filter((word) => !UNITS.has(word) && !FILLER.has(word) && !/^\d+$/.test(word))
    .map((word) => LEXICON[word] ?? word);
}

/**
 * De naam zonder scheidingstekens en zonder eenheid.
 *
 * Dit is de sterkste vergelijking die geen gok is: `rolbreedte_cm` en
 * `rol_breedte` leveren allebei `rolbreedte`. Samenstellingen worden in het
 * Nederlands soms aan elkaar en soms los geschreven, en dat verschil zegt niets
 * over het kenmerk.
 */
export function glued(name: string): string {
  return split(name).filter((word) => !UNITS.has(word)).join('');
}
