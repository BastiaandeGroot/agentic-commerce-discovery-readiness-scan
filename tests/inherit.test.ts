// Eerdere keuzes overnemen als een kenmerk onder een andere naam terugkomt.
//
// De fout die hier bewaakt wordt, aan twee kanten. Niets overnemen: bij elke
// nieuwe vragenbank loopt de merchant dezelfde lijst opnieuw na. Te veel
// overnemen: een keuze landt op een kenmerk dat iets anders betekent, of op een
// kolom die niet meer bestaat — en dan verdwijnt een gat dat er wél is.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inheritMapping, visibleMapping } from '../src/questions/mapping';
import { siteKey } from '../src/collect/answers';
import { spellingKey } from '../src/spec/lexicon';

test('dezelfde naam op schrijfwijze en eenheid na, en niet meer dan dat', () => {
  assert.equal(spellingKey('bestelstap_cm'), spellingKey('bestelstap'));
  assert.equal(spellingKey('gewicht_g_per_m2'), spellingKey('gewicht_gm2'));
  assert.equal(spellingKey('Rol-Breedte (cm)'), spellingKey('rolbreedte_cm'));
  // Verwant is niet hetzelfde: dat is een gok, en die hoort hier niet.
  assert.notEqual(spellingKey('materiaal'), spellingKey('samenstelling'));
  assert.notEqual(spellingKey('waterdicht'), spellingKey('waterbestendigheid'));
});

test('een hernoemd kenmerk neemt de eerdere keuze over, ook "geen kolom"', () => {
  const eerder = { bestelstap: ['order_step'], gewicht_gm2: ['weight'], dikte: [], martindale: ['martindale'] };
  const { mapping, inherited } = inheritMapping(
    { ...eerder },
    ['bestelstap_cm', 'gewicht_g_per_m2', 'dikte_mm', 'wrijfechtheid'],
    [],
    ['order_step', 'weight', 'martindale'],
  );
  assert.deepEqual(mapping.bestelstap_cm, ['order_step']);
  assert.deepEqual(mapping.gewicht_g_per_m2, ['weight']);
  assert.deepEqual(mapping.dikte_mm, [], 'geen kolom was de bevinding en blijft dat');
  assert.equal('wrijfechtheid' in mapping, false, 'wat nooit beslist is, blijft open');
  assert.deepEqual(inherited.sort(), ['bestelstap_cm', 'dikte_mm', 'gewicht_g_per_m2']);
});

test('wat nu al gekozen is blijft staan, en een verdwenen kolom komt niet mee', () => {
  const { mapping, inherited } = inheritMapping(
    { bestelstap_cm: ['eigen_keuze'], bestelstap: ['order_step'], rolbreedte: ['oude_kolom'] },
    ['bestelstap_cm', 'rolbreedte_cm'],
    [],
    ['order_step', 'eigen_keuze'],
  );
  assert.deepEqual(mapping.bestelstap_cm, ['eigen_keuze']);
  assert.equal('rolbreedte_cm' in mapping, false, 'een kolom die er niet meer is, is geen keuze');
  assert.deepEqual(inherited, []);
});

test('een andere markt van hetzelfde account telt mee, de meest recente eerst', () => {
  const { mapping, inherited } = inheritMapping(
    {},
    ['pilling', 'lichtechtheid'],
    [{ pilling: ['pilling_new'] }, { pilling: ['pilling_old'], lichtechtheid: ['lightfastness'] }],
    ['pilling_new', 'pilling_old', 'lightfastness'],
  );
  assert.deepEqual(mapping.pilling, ['pilling_new']);
  assert.deepEqual(mapping.lichtechtheid, ['lightfastness']);
  assert.deepEqual(inherited.sort(), ['lichtechtheid', 'pilling']);
});

test('een ander account van dezelfde webshop ziet alleen koppelingen naar kolommen die het zelf noemt', () => {
  const vanDeEigenaar = { martindale: ['martindale'], samenstelling: ['composition_info', 'interne_notitie'], dikte: [], prijsgroep: ['geheime_kolom'] };
  // Een collega met dezelfde catalogus noemt dezelfde kolommen.
  assert.deepEqual(visibleMapping(vanDeEigenaar, ['martindale', 'composition_info', 'weight']), {
    martindale: ['martindale'],
    samenstelling: ['composition_info'],
    dikte: [],
  });
  // Wie alleen het adres intikt en een andere catalogus heeft, leert geen kolomnaam.
  const vreemde = visibleMapping(vanDeEigenaar, ['titel', 'prijs']);
  assert.deepEqual(vreemde, { dikte: [] });
  assert.ok(!JSON.stringify(vreemde).includes('geheime_kolom'));
});

test('het adres van een webshop is één sleutel, hoe het ook getypt is', () => {
  for (const typed of ['https://www.degrootstoffen.nl/', 'www.degrootstoffen.nl', 'DeGrootStoffen.nl/meubelstoffen?x=1', 'http://degrootstoffen.nl']) {
    assert.equal(siteKey(typed), 'degrootstoffen.nl', typed);
  }
  assert.equal(siteKey('geen adres'), '');
  assert.equal(siteKey(''), '');
});
