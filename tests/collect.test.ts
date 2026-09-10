// De openbare meting: wat er van een productpagina te halen valt.
//
// De twee fouten die de eerste echte meting op degrootstoffen.nl opleverde staan
// hier als test, want het waren allebei fouten die stil doorwerken: een FAQ die
// als product wordt geteld, en een steekproef die uit één hoek van het
// assortiment komt. Geen van beide geeft een foutmelding — ze geven een getal
// dat er goed uitziet en niet klopt.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { breadcrumb, extractProduct, jsonLdBlocks, specTable } from '../src/collect/extract';
import { linksFrom, productUrlsFromItemList, spread, urlsFromSitemap } from '../src/collect/discover';
import { importQuestionList } from '../src/questions/list';

const PRODUCT = `<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Beret Reed Blush",
 "brand":{"@type":"Brand","name":"Beret"},"sku":"BR-01","material":"katoen",
 "offers":{"@type":"Offer","price":"39.95","priceCurrency":"EUR","availability":"https://schema.org/InStock"},
 "additionalProperty":[{"@type":"PropertyValue","name":"Baanbreedte","value":"140 cm"}]}
</script>
<script type="application/ld+json">
{"@type":"BreadcrumbList","itemListElement":[
 {"@type":"ListItem","name":"Home"},{"@type":"ListItem","name":"Meubelstoffen"},
 {"@type":"ListItem","name":"Banken"},{"@type":"ListItem","name":"Beret Reed Blush"}]}
</script></head><body>
<table><tr><th>Schuurweerstand</th><td>30.000 Martindale</td></tr>
<tr><th>Samenstelling</th><td>100% polyester</td></tr></table>
</body></html>`;

test('een productpagina levert zijn kenmerken op', () => {
  const row = extractProduct(PRODUCT, 'https://winkel.nl/product/beret');

  assert.equal(row?.titel, 'Beret Reed Blush');
  assert.equal(row?.merk, 'Beret');
  assert.equal(row?.prijs, '39.95');
  assert.equal(row?.materiaal, 'katoen');
  // Uit `additionalProperty`, de plek waar schema.org vaktaal toelaat.
  assert.equal(row?.baanbreedte, '140 cm');
  // En uit de tabel op de pagina, waar de meeste winkels hun specificaties zetten.
  assert.equal(row?.schuurweerstand, '30.000 Martindale');
  assert.equal(row?.samenstelling, '100% polyester');
});

test('de categorie komt uit de kruimelbaan, zonder Home en zonder het product zelf', () => {
  assert.equal(breadcrumb(jsonLdBlocks(PRODUCT)), 'Meubelstoffen > Banken');
});

test('een FAQ-pagina is geen product', () => {
  // Dit ging op de eerste echte meting mis: de veelgestelde vragen kwamen als
  // zeventien "kenmerken" binnen, en die telden mee alsof het productdata was.
  const faq = `<html><body><h1>Veelgestelde vragen</h1>
    <dl><dt>Wat zijn de verzendkosten?</dt><dd>Gratis boven de 50 euro.</dd>
    <dt>Hoe bestel ik een staal?</dt><dd>Via de knop op de productpagina.</dd></dl>
  </body></html>`;

  assert.equal(extractProduct(faq, 'https://winkel.nl/faq'), null);
  // De uitpakker zelf werkt wel — het is de poort ervoor die hem tegenhoudt.
  assert.ok(Object.keys(specTable(faq)).length > 0);
});

test('de winkel wijst zijn producten zelf aan via ItemList', () => {
  const category = `<script type="application/ld+json">
    {"@type":"ItemList","itemListElement":[
      {"@type":"ListItem","position":1,"url":"https://winkel.nl/product/a"},
      {"@type":"ListItem","position":2,"url":"https://winkel.nl/product/b"}]}
  </script>`;

  assert.deepEqual(productUrlsFromItemList(jsonLdBlocks(category)), [
    'https://winkel.nl/product/a',
    'https://winkel.nl/product/b',
  ]);
});

test('een steekproef beslaat het hele assortiment en niet de eerste hoek', () => {
  // Alles onder één segment, zoals bij vrijwel elke winkel: dan zegt het pad
  // niets en moet de spreiding over de lijst lopen. Nemen we de eerste tien,
  // dan meten we één categorie en noemen dat de winkel.
  const urls = Array.from({ length: 100 }, (_, index) => `https://winkel.nl/product/${index}`);
  const sample = spread(urls, 10);

  assert.equal(sample.length, 10);
  assert.equal(sample[0], 'https://winkel.nl/product/0');
  assert.equal(sample[9], 'https://winkel.nl/product/90');
});

test('dezelfde winkel geeft twee keer dezelfde steekproef', () => {
  const urls = Array.from({ length: 60 }, (_, index) => `https://winkel.nl/product/${index}`);
  assert.deepEqual(spread(urls, 12), spread(urls, 12));
});

test('links buiten het domein tellen niet mee', () => {
  const html = `<a href="/product/a">a</a><a href="https://anders.nl/x">x</a>
    <a href="mailto:info@winkel.nl">mail</a><a href="/foto.jpg">plaatje</a>`;

  assert.deepEqual(linksFrom(html, 'https://winkel.nl/'), ['https://winkel.nl/product/a']);
});

test('een sitemap levert zijn adressen', () => {
  const xml = '<urlset><url><loc>https://winkel.nl/a</loc></url><url><loc>https://winkel.nl/b</loc></url></urlset>';
  assert.deepEqual(urlsFromSitemap(xml), ['https://winkel.nl/a', 'https://winkel.nl/b']);
});

test('een drempel met bron telt als gepubliceerd, zonder bron als beredeneerd', () => {
  // Dit was de oorzaak van 105 bezwaren op één bank: de tabel had geen plek
  // voor de herkomst van een drempel, dus zette de lezer élke regel op
  // "beredeneerd" en stond elke vraag met een regel als bezwaar op het scherm.
  const csv = [
    'id,vraag,belang,benodigde_attributen,beslisregel,beslisregel_bron',
    'A-01,Is dit sterk genoeg?,hoog,schuurweerstand,martindale_bank,https://voorbeeld.nl/advies',
    'A-02,Hoeveel heb ik nodig?,hoog,baanbreedte,meterage,',
  ].join('\n');

  const read = importQuestionList([{ name: 'markt.csv', text: csv }]);
  const rules = new Map((read.bank?.rules ?? []).map((rule) => [rule.id, rule]));

  assert.equal(rules.get('martindale_bank')?.source.kind, 'published');
  assert.equal(rules.get('martindale_bank')?.source.url, 'https://voorbeeld.nl/advies');
  assert.equal(rules.get('meterage')?.source.kind, 'reasoned');

  // En de waarschuwing telt alleen wat werkelijk zonder bron staat.
  assert.ok(read.warnings.some((warning) => warning.includes('1 beslisregel zonder bron')));
});
