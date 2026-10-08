// Het profiel per kolom: wat er in een kolom staat, over de hele catalogus.
//
// De fout die hier bewaakt wordt: een kolom beoordelen op zijn eerste regels.
// Bij een export die op categorie gesorteerd is, lijkt een kolom die alleen bij
// tafelkleedstoffen gevuld is dan leeg.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { carriesCharacteristic, filledIn, isSensitiveName, profileCatalog, shapeMisfit } from '../src/engine/profile';
import { describeColumn } from '../src/semantic/describe';

const catalogus = () => ingest('c.csv', [
  'sku;categorie;hittebestendig;coating;waterdicht;certificaat;omschrijving',
  '1;Meubelstoffen;;;nee;;Zachte velours voor banken',
  '2;Meubelstoffen;;;nee;;Stevige chenille met structuur',
  '3;Meubelstoffen;;;ja;;Geweven stof voor stoelen',
  '4;Tafelkleedstoffen;120 °C;PU;ja;OT-12345;Afwasbaar tafellinnen',
  '5;Tafelkleedstoffen;90 °C;acryl;ja;OT-67890;Gecoat katoen met bloemen',
  '6;Tafelkleedstoffen;120 °C;PU;nee;OT-24680;Linnenlook voor buiten',
].join('\n'));

test('de vorm van een kolom volgt uit al zijn waarden', () => {
  const profiel = profileCatalog(catalogus());
  assert.equal(profiel.waterdicht?.kind, 'boolean');
  assert.equal(profiel.hittebestendig?.kind, 'number');
  assert.equal(profiel.hittebestendig?.unit, '°c');
  assert.equal(profiel.coating?.kind, 'list');
  assert.equal(profiel.certificaat?.kind, 'code');
  assert.equal(profiel.omschrijving?.kind, 'text');
});

test('de vaakste waarde staat voorop', () => {
  assert.deepEqual(profileCatalog(catalogus()).coating?.samples, ['PU', 'acryl']);
});

test('een kolom die maar in één categorie gevuld is, noemt die categorie', () => {
  const profiel = profileCatalog(catalogus());
  assert.equal(profiel.coating?.filled, 3);
  assert.deepEqual(filledIn(profiel.coating!), ['Tafelkleedstoffen']);
  // Overal gevuld onderscheidt niets, en dan staat er geen lijst.
  assert.deepEqual(filledIn(profiel.waterdicht!), []);
});

test('het model krijgt de vorm en de categorieën, en geen aantal', () => {
  const data = catalogus();
  const tekst = describeColumn('hittebestendig', data, profileCatalog(data).hittebestendig);
  assert.match(tekst, /getal \(°c\)/);
  assert.match(tekst, /gevuld in Tafelkleedstoffen/);
  assert.doesNotMatch(tekst, /%|\b3\b/);
});

test('hetzelfde bestand geeft hetzelfde profiel', () => {
  assert.deepEqual(profileCatalog(catalogus()), profileCatalog(catalogus()));
});

test('duizendtallen zijn een getal, een kolom vol nullen geen ja/nee', () => {
  const data = ingest('c.csv', ['sku;martindale;gewicht', '1;100.000;0', '2;18.000;0', '3;25.000;3.402.000'].join('\n'));
  const profiel = profileCatalog(data);
  assert.equal(profiel.martindale?.kind, 'number');
  assert.notEqual(profiel.gewicht?.kind, 'boolean');
});

test('een meervoudige keuze is een vaste lijst met losse waarden', () => {
  const data = ingest('c.csv', ['sku;samenstelling', '1;Cotton | Polyester', '2;Cotton', '3;Polyester | Linen', '4;Cotton'].join('\n'));
  const profiel = profileCatalog(data).samenstelling!;
  assert.equal(profiel.kind, 'list');
  assert.equal(profiel.multi, true);
  assert.deepEqual(profiel.samples, ['Cotton', 'Polyester', 'Linen']);
});

test('van een prijskolom gaat alleen de naam naar het model', () => {
  const data = ingest('c.csv', ['sku;special_price', '1;19.95', '2;24.50'].join('\n'));
  const profiel = profileCatalog(data).special_price!;
  assert.equal(profiel.sensitive, true);
  assert.equal(describeColumn('special_price', data, profiel), 'special price');
});

// --- Andere systemen en andere verticals -----------------------------------
//
// Er is maar één echte export (Magento, stoffen). Deze catalogi zijn nagebouwd
// op hoe de andere systemen hun export schrijven, zodat het profiel niet
// ongemerkt op die ene winkel afgestemd raakt.

test('Shopify: prijs- en voorraadkolommen met spaties gaan zonder waarden naar het model', () => {
  const data = ingest('shopify.csv', [
    'Handle,Title,Variant SKU,Variant Price,Variant Compare At Price,Cost per item,Variant Inventory Qty,Tags',
    'lamp-a,Lamp A,LA-1,49.95,59.95,21.00,12,"Modern, Messing"',
    'lamp-b,Lamp B,LB-1,39.95,,18.00,4,"Modern, Zwart"',
    'lamp-c,Lamp C,LC-1,79.00,99.00,35.00,0,"Industrieel, Zwart"',
  ].join('\n'));
  const profiel = profileCatalog(data);
  for (const kolom of ['Variant Price', 'Variant Compare At Price', 'Cost per item', 'Variant Inventory Qty']) {
    assert.equal(profiel[kolom]?.sensitive, true, kolom);
    assert.doesNotMatch(describeColumn(kolom, data, profiel[kolom]), /\d/, kolom);
  }
  assert.equal(profiel['Variant SKU']?.sensitive, false);
});

test('WooCommerce en Akeneo: hun prijskolommen worden ook herkend', () => {
  for (const naam of ['Regular price', 'Sale price', 'Stock', 'price-EUR', 'salePrice', 'inkoopprijs_excl', 'verzendkosten']) {
    assert.equal(isSensitiveName(naam), true, naam);
  }
  // Wat geen prijs is, blijft gewoon beschreven.
  for (const naam of ['Variant SKU', 'material', 'kleur', 'weight_per_m2']) {
    assert.equal(isSensitiveName(naam), false, naam);
  }
});

test('Akeneo en Shopify: een meervoudige keuze met komma wordt een lijst', () => {
  const data = ingest('akeneo.csv', [
    'sku;materials;description',
    '1;cotton,polyester;Soft cotton blend, ideal for summer',
    '2;cotton;A heavy weave, made to last for years',
    '3;polyester,linen;Crisp linen look, easy to care for',
    '4;cotton,linen;Relaxed fit, washed for softness',
  ].join('\n'));
  const profiel = profileCatalog(data);
  assert.equal(profiel.materials?.kind, 'list');
  assert.equal(profiel.materials?.multi, true);
  assert.deepEqual(profiel.materials?.samples, ['cotton', 'polyester', 'linen']);
  // Gewone tekst met komma's valt niet uit elkaar.
  assert.equal(profiel.description?.multi, false);
  assert.equal(profiel.description?.kind, 'text');
});

test('een decimale komma is geen scheidingsteken', () => {
  const data = ingest('c.csv', ['sku;gewicht', '1;"1,5 kg"', '2;"2,25 kg"', '3;"1,5 kg"', '4;"0,75 kg"'].join('\n'));
  const profiel = profileCatalog(data).gewicht!;
  assert.equal(profiel.kind, 'number');
  assert.equal(profiel.unit, 'kg');
  assert.equal(profiel.multi, false);
});

test('een verlichtingswinkel: vermogen, lichtstroom en kleurtemperatuur zijn getallen met eenheid', () => {
  const data = ingest('licht.csv', [
    'sku;vermogen;lichtstroom;kleurtemperatuur;dimbaar',
    '1;8 W;806 lm;2700K;ja',
    '2;4.5 W;470 lm;3000K;nee',
    '3;12 W;1.521 lm;2700K;ja',
  ].join('\n'));
  const profiel = profileCatalog(data);
  assert.equal(profiel.vermogen?.unit, 'w');
  assert.equal(profiel.lichtstroom?.unit, 'lm');
  assert.equal(profiel.kleurtemperatuur?.unit, 'k');
  assert.equal(profiel.dimbaar?.kind, 'boolean');
});

test('een Duitse en een Engelse export: ja/nein en duizendtallen met komma of spatie', () => {
  const data = ingest('de.csv', [
    'sku;wasserdicht;gewicht;fuellmenge',
    '1;ja;"1,000.5 g";1 000 ml',
    '2;nein;"2,500 g";500 ml',
    '3;ja;"750 g";1 500 ml',
  ].join('\n'));
  const profiel = profileCatalog(data);
  assert.equal(profiel.wasserdicht?.kind, 'boolean');
  assert.equal(profiel.gewicht?.kind, 'number');
  assert.equal(profiel.fuellmenge?.kind, 'number');
});

test('een verkoopwijze onder een prijsnaam is geen prijs, een bedrag onder een andere naam wel', () => {
  const data = ingest('c.csv', [
    'sku;custom_price_type;bedrag;enable_qty_preset',
    '1;Per meter;€ 19,95;No',
    '2;Per piece;€ 24,50;Yes',
    '3;Per meter;€ 9,95;No',
  ].join('\n'));
  const profiel = profileCatalog(data);
  assert.equal(profiel.custom_price_type?.sensitive, false);
  assert.equal(profiel.enable_qty_preset?.sensitive, false);
  assert.equal(profiel.bedrag?.sensitive, true);
  assert.equal(describeColumn('bedrag', data, profiel.bedrag), 'bedrag');
});

// --- Wat geen kenmerk kan dragen -------------------------------------------
//
// De fout die hier bewaakt wordt: een omschrijving voorgesteld krijgen als bron
// voor een kenmerk. De scan beantwoordt vragen uit attributen, niet uit proza.

const metSysteemkolommen = () => ingest('c.csv', [
  'sku;categorie;omschrijving;samenstelling;afbeelding;aangemaakt;verschijnt;wasvoorschrift',
  ...Array.from({ length: 50 }, (_, i) => [
    i + 1,
    'Meubelstoffen',
    `Stof nummer ${i} is een heerlijk zachte velours voor banken, stoelen en kussens in huis.`,
    `${50 + (i % 40)}% Polyester ${50 - (i % 40)}% Katoen nr${i}`,
    `/m/e/meubelstof_${i}.jpg`,
    `2025-10-${String((i % 28) + 1).padStart(2, '0')} ${i % 24}:15:00`,
    `2026-0${(i % 9) + 1}-01`,
    'Wassen op 30 graden, niet in de droger en lauw strijken aan de binnenkant',
  ].join(';')),
].join('\n'));

test('lopende tekst, een bestand en een tijdstip dragen geen kenmerk', () => {
  const profiel = profileCatalog(metSysteemkolommen());
  assert.equal(profiel.omschrijving?.unfit, 'prose');
  assert.equal(profiel.afbeelding?.unfit, 'file');
  assert.equal(profiel.aangemaakt?.unfit, 'timestamp');
  assert.equal(carriesCharacteristic(profiel.omschrijving), false);
});

test('korte vrije tekst en een datum zonder tijd blijven kandidaat', () => {
  const profiel = profileCatalog(metSysteemkolommen());
  assert.equal(profiel.samenstelling?.kind, 'text');
  assert.equal(profiel.samenstelling?.unfit, undefined);
  // Een verschijningsdatum kan een kenmerk zijn; alleen een tijdstip schreef het systeem zelf.
  assert.equal(profiel.verschijnt?.unfit, undefined);
  assert.equal(carriesCharacteristic(profiel.samenstelling), true);
});

test('een lange zin die steeds terugkomt is een vaste lijst en geen lopende tekst', () => {
  const profiel = profileCatalog(metSysteemkolommen());
  assert.equal(profiel.wasvoorschrift?.kind, 'list');
  assert.equal(profiel.wasvoorschrift?.unfit, undefined);
});

test('een meervoudige keuze met lange cellen is geen lopende tekst', () => {
  // Acht namen, per product een andere greep eruit: veel verschillende cellen
  // vol korte, terugkerende stukken. Dat is een keuzelijst, geen omschrijving.
  const namen = ['Meubelstoffen Velours', 'Gordijnstoffen Linnenlook', 'Outdoorstoffen Gestreept', 'Decoratiestoffen Bloemen',
    'Tafelkleedstoffen Gecoat', 'Kussens Effen', 'Verduisterende Voering', 'Stoelen Chenille'];
  const data = ingest('c.csv', [
    'sku;collecties',
    ...Array.from({ length: 200 }, (_, i) => `${i + 1};${namen.filter((_, n) => ((i + 31) >> n) & 1).join(' | ')}`),
  ].join('\n'));
  const profiel = profileCatalog(data).collecties;
  assert.equal(profiel?.multi, true);
  assert.equal(profiel?.unfit, undefined);
});

test('een lege kolom draagt niets, maar is ook niet ongeschikt', () => {
  const profiel = profileCatalog(catalogus());
  assert.equal(profiel.hittebestendig?.unfit, undefined);
  assert.equal(carriesCharacteristic(undefined), false);
});

test('een klasse of een code past niet in een ja/nee-kolom, een tweedeling wel', () => {
  const vinkje = profileCatalog(catalogus()).waterdicht!;
  assert.equal(shapeMisfit({ kind: 'list', values: ['B1', 'M1', 'schwer entflammbar'] }, vinkje), true);
  assert.equal(shapeMisfit({ kind: 'code' }, vinkje), true);
  assert.equal(shapeMisfit({ kind: 'list', values: ['waterdicht', 'waterafstotend'] }, vinkje), false);
  // Zonder genoemde waarden weten we niet hoeveel klassen er zijn: dan niet afwijzen.
  assert.equal(shapeMisfit({ kind: 'list' }, vinkje), false);
  assert.equal(shapeMisfit({ kind: 'boolean' }, vinkje), false);
  assert.equal(shapeMisfit({ kind: 'text' }, vinkje), false);
});
