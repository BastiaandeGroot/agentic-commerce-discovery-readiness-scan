// Lezen wat een webshop zelf een categorie noemt en wat een filter.
//
// Generiek bedoeld: de HTML hieronder is nagemaakt naar conventies die
// platformen delen, niet gekopieerd uit één winkel. Elke test legt vast waaróm
// een signaal gekozen is, want dat is wat bij de volgende winkel moet houden.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanFilterLabel, filterBlocks, readSiteEvidence, textOf } from '../src/intake/sitescan';

const has = (list: string[], value: string) =>
  list.some((entry) => entry.toLowerCase() === value.toLowerCase());

test('een querystring maakt een link een filter', () => {
  // Het hardste signaal: filteren gebeurt overal via de querystring, navigeren
  // via een pad. Magento, Shopify en WooCommerce doen dit alle drie.
  const html = `
    <a href="/meubelstoffen/banken">Banken</a>
    <a href="/meubelstoffen?color=Grijs">Grijs</a>
    <a href="/collections/stof?filter.v.option.weefsel=Bouclé">Bouclé</a>`;
  const site = readSiteEvidence(html, 'winkel.nl');
  assert.ok(has(site.navigation, 'Banken'));
  assert.ok(has(site.filters, 'Grijs'));
  assert.ok(has(site.filters, 'color'), 'de naam van de parameter is zelf marktkennis');
  assert.ok(has(site.filters, 'weefsel'), 'Shopify zet de as achter puntjes; die hoort eraf');
  assert.ok(!has(site.navigation, 'Grijs'));
});

test('technische parameters zijn geen kenmerk', () => {
  const html = `<a href="/c?p=2">2</a><a href="/c?utm_source=nieuwsbrief">x</a><a href="/c?sort=price">Prijs</a>`;
  const site = readSiteEvidence(html, 'winkel.nl');
  for (const junk of ['p', 'utm source', 'sort']) assert.ok(!has(site.filters, junk));
});

test('een filterpaneel wordt herkend aan zijn attribuut, niet aan zijn thema', () => {
  // filter-options (Magento), facets (Shopify), widget_layered_nav (Woo).
  for (const attribuut of ['class="filter-options"', 'class="facets"', 'data-role="refine"']) {
    const html = `<div ${attribuut}><button>Vlekwerend</button></div>`;
    assert.equal(filterBlocks(html).length, 1, attribuut);
    assert.ok(has(readSiteEvidence(html, 'winkel.nl').filters, 'Vlekwerend'));
  }
});

test('het woord "filter" hoort bij de knop en niet bij het kenmerk', () => {
  // Een toegankelijk paneel labelt zijn knop "Vlekwerend filter". Zonder dat
  // woord eraf te halen matcht het kenmerk nergens op — gemeten op een echte
  // winkel, en het was daar het verschil tussen twee en vijf gevonden facetten.
  assert.equal(cleanFilterLabel('Vlekwerend filter'), 'Vlekwerend');
  assert.equal(cleanFilterLabel('Kleur filteren'), 'Kleur');
  assert.equal(cleanFilterLabel('Filter options'), undefined);
});

test('meegelekte opmaak telt niet als kenmerk', () => {
  // Sjabloonmotoren zetten expressies in attributen; elke regex vist die mee.
  assert.equal(cleanFilterLabel('0" style="display: none;">'), undefined);
  assert.equal(cleanFilterLabel(':for="attribute.id" @click="toggle()"'), undefined);
  assert.equal(cleanFilterLabel('Rolbreedte (cm)'), 'Rolbreedte (cm)');
});

test('links naar buiten zeggen niets over deze winkel', () => {
  const html = `<a href="https://elders.nl/stoffen">Stoffen</a><a href="https://www.winkel.nl/banken">Banken</a>`;
  const site = readSiteEvidence(html, 'winkel.nl');
  assert.ok(has(site.navigation, 'Banken'));
  assert.ok(!has(site.navigation, 'Stoffen'));
});

test('tekst uit html komt er leesbaar uit', () => {
  assert.equal(textOf('<span>Caf&eacute;  <b>stof</b></span>'), 'Caf&eacute; stof');
  assert.equal(textOf('<b>Wol</b> &amp; <i>linnen</i>'), 'Wol & linnen');
});
