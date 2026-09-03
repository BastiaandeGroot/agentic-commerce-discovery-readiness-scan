// Randgevallen op de intake. Een merchant levert aan wat zijn systeem uitspuugt,
// en dat is zelden schoon: Excel plakt er een BOM voor, een Duitse export
// gebruikt puntkomma's, en er staan komma's binnen aanhalingstekens.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat, detectDelimiter, parseDelimited, parseAny } from '../src/intake/parse';
import { ingest, IntakeError } from '../src/intake/index';

test('BOM van een Excel-export verdwijnt uit de kopregel', () => {
  const rows = parseDelimited('﻿id,titel\n1,Stof\n');
  assert.deepEqual(Object.keys(rows[0]), ['id', 'titel']);
  assert.equal(rows[0].id, '1');
});

test('puntkomma en tab worden herkend als scheidingsteken', () => {
  assert.equal(detectDelimiter('id;titel;prijs\n').char, ';');
  assert.equal(detectDelimiter('id\ttitel\tprijs\n').char, '\t');
  assert.equal(detectDelimiter('id,titel,prijs\n').char, ',');
});

test('zonder scheidingsteken in de kop valt hij terug op komma', () => {
  assert.equal(detectDelimiter('alleen_een_kolom\n').char, ',');
});

test('een scheidingsteken binnen aanhalingstekens splitst niet', () => {
  const rows = parseDelimited('id,titel\n1,"Stof, gestreept"\n');
  assert.equal(rows[0].titel, 'Stof, gestreept');
});

test('een newline binnen aanhalingstekens breekt de regel niet', () => {
  const rows = parseDelimited('id,omschrijving\n1,"Regel een\nRegel twee"\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].omschrijving, 'Regel een\nRegel twee');
});

test('ontsnapte aanhalingstekens komen als één teken terug', () => {
  const rows = parseDelimited('id,titel\n1,"Stof ""Anker"""\n');
  assert.equal(rows[0].titel, 'Stof "Anker"');
});

test('CRLF-regeleindes leveren geen achterblijvende \\r op', () => {
  const rows = parseDelimited('id,titel\r\n1,Stof\r\n');
  assert.equal(rows[0].titel, 'Stof');
  assert.equal(rows.length, 1);
});

test('lege regels halverwege worden overgeslagen', () => {
  const rows = parseDelimited('id,titel\n1,Stof\n\n2,Linnen\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].id, '2');
});

test('een regel met te weinig kolommen levert lege waarden, geen crash', () => {
  const rows = parseDelimited('id,titel,prijs\n1,Stof\n');
  assert.equal(rows[0].prijs, '');
});

test('de kopregel bepaalt het scheidingsteken, ook met komma\'s in een titel', () => {
  // Een puntkomma-bestand waarvan de eerste kolomnaam zelf een komma bevat.
  const text = '"naam, volledig";prijs\n"Stof, gestreept";10\n';
  const { rows } = parseAny('feed.csv', text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].prijs, '10');
});

test('NDJSON en een JSON-array worden allebei herkend', () => {
  assert.equal(detectFormat('a.json', '{"id":1}\n{"id":2}\n'), 'ndjson');
  assert.equal(detectFormat('a.json', '[{"id":1}]'), 'json');
  assert.equal(parseAny('a.json', '{"id":1}\n{"id":2}\n').rows.length, 2);
});

test('een JSON-document met de lijst een niveau dieper wordt gevonden', () => {
  const { rows } = parseAny('c.json', '{"meta":{"n":2},"products":[{"id":"a"},{"id":"b"}]}');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 'a');
});

test('geneste JSON wordt platgeslagen met puntnotatie', () => {
  const { rows } = parseAny('c.json', '[{"id":"a","shipping":{"price":"4,95"}}]');
  assert.equal(rows[0]['shipping.price'], '4,95');
});

test('XML met g:-namespace levert rijen op zonder DOMParser', () => {
  const xml = `<rss><channel>
    <item><g:id>1</g:id><g:title>Stof</g:title></item>
    <item><g:id>2</g:id><g:title>Linnen</g:title></item>
  </channel></rss>`;
  const { rows } = parseAny('feed.xml', xml);
  assert.equal(rows.length, 2);
  assert.equal(rows[1]['g:title'], 'Linnen');
});

test('een leeg bestand en een bestand zonder regels geven een leesbare fout', () => {
  assert.throws(() => ingest('leeg.csv', '   ', 'feed'), IntakeError);
  assert.throws(() => ingest('kop.csv', 'id,titel\n', 'feed'), IntakeError);
});

test('getallen worden niet geïnterpreteerd, dus komma of punt maakt niet uit', () => {
  const rows = parseDelimited('id,prijs\n1,"1.234,50"\n');
  assert.equal(rows[0].prijs, '1.234,50');
});
