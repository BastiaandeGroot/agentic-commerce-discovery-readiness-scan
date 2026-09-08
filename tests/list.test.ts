// De vragenlijst als tabel: één regel per vraag.
//
// Wat hier bewaakt wordt is niet dat het bestand parst — dat doet `parse.test` —
// maar dat de betekenis van de kolommen overeind blijft. Een laag die verkeerd
// landt, een herweging die nergens terechtkomt of een dekking die stilzwijgend 0
// wordt in plaats van "niet onderzocht": dat zijn de fouten die een rapport
// veranderen zonder dat er iets kapot lijkt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importQuestionCsv, importQuestionList, looksLikeQuestionList } from '../src/questions/list';
import { composeSet, overlayFor } from '../src/questions/compose';
import { applyMapping } from '../src/questions/mapping';
import {
  allValidated, baseQuestions, editBaseQuestion, hasOwnQuestions, toggleBaseValidated, toggleValidated,
} from '../src/questions/mutate';
import type { QuestionSetState } from '../src/domain/types';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';
import { catalogKnows, fieldState } from '../src/engine/evaluate';
import { buildMappingRequest, parseMappingAnswer, renderMappingRequest } from '../src/spec/mapping';

const HEADER = [
  'id', 'categorie', 'laag', 'geldt_voor', 'intentie', 'vraag', 'belang', 'gewicht',
  'herweging', 'benodigde_attributen', 'aantal_attributen', 'beslisregel', 'antwoordtype',
  'beantwoordbaar_uit_attributen', 'telt_mee_in_score', 'wettelijk', 'commerciele_waarde',
  'waarschuwing', 'toelichting', 'bron', 'toepassingsprofielen_kritiek',
].join(';');

/** Een rij in de volgorde van de kop; alles wat niet genoemd is blijft leeg. */
function row(values: Partial<Record<string, string>>): string {
  return HEADER.split(';').map((column) => values[column] ?? '').join(';');
}

const BASIS = row({
  id: 'BAS-H01', categorie: 'alle interieurstoffen', laag: 'basis',
  geldt_voor: 'meubelstoffen, gordijnstoffen', intentie: 'hoeveelheid',
  vraag: 'Hoe breed is deze stof?', belang: 'kritiek', gewicht: '5',
  herweging: 'gordijnstoffen: kritiek', benodigde_attributen: 'rolbreedte_cm',
  aantal_attributen: '1', antwoordtype: 'getal',
  beantwoordbaar_uit_attributen: 'ja', telt_mee_in_score: 'ja', bron: 'cat_paginas',
});

const OVERLAY = row({
  id: 'MEU-A01', categorie: 'meubelstoffen', laag: 'overlay', geldt_voor: 'meubelstoffen',
  intentie: 'geschiktheid', vraag: 'Is deze stof sterk genoeg voor mijn bank?',
  belang: 'kritiek', gewicht: '5', benodigde_attributen: 'slijtvastheid_martindale',
  aantal_attributen: '1', beslisregel: 'martindale >= 30000',
  antwoordtype: 'afgeleid_boolean', beantwoordbaar_uit_attributen: 'ja',
  telt_mee_in_score: 'ja', toepassingsprofielen_kritiek: 'banken, stoelen',
});

const STANDALONE = row({
  id: 'NAG-01', categorie: 'naaigarens', laag: 'standalone', geldt_voor: 'naaigarens',
  intentie: 'geschiktheid', vraag: 'Welk garen past bij mijn stof?', belang: 'kritiek',
  gewicht: '5', benodigde_attributen: 'garensoort, garendikte_tex', aantal_attributen: '2',
  antwoordtype: 'afgeleid_enum', beantwoordbaar_uit_attributen: 'ja', telt_mee_in_score: 'ja',
});

const LIJST = [HEADER, BASIS, OVERLAY, STANDALONE].join('\n');

function lees(text: string, name = 'vragenlijst.csv') {
  return importQuestionCsv([{ name, text }]);
}

test('een tabel met een id- en een vraagkolom is een vragenlijst', () => {
  assert.equal(looksLikeQuestionList(LIJST), true);
  // Een productexport is ook CSV en heeft ook een id, maar geen vraag.
  assert.equal(looksLikeQuestionList('id;title;price\n1;Stof;9,95'), false);
  assert.equal(looksLikeQuestionList('{"meta": {"vertical": "x"}}'), false);
});

test('de laag bepaalt waar een vraag landt', () => {
  const { bank, errors } = lees(LIJST);
  assert.deepEqual(errors, []);
  assert.ok(bank);
  assert.deepEqual(bank.questions.map((q) => q.id), ['BAS-H01']);

  const meubel = bank.overlays.find((o) => o.id === 'meubelstoffen');
  assert.deepEqual(meubel?.questions?.map((q) => q.id), ['MEU-A01']);
});

test('standalone erft de basislaag niet — naaigaren heeft geen baanbreedte', () => {
  const { bank } = lees(LIJST);
  const garen = bank?.overlays.find((o) => o.id === 'naaigarens');
  assert.deepEqual(garen?.suppress, ['BAS-H01']);

  // En dat werkt door tot in de samengestelde set, niet alleen in het model.
  const set = composeSet(bank!, { id: 'naaigarens', name: 'Naaigarens', count: 10 });
  assert.deepEqual(set.questions.map((q) => q.id), ['NAG-01']);
});

test('een herweging landt op de overlay van zijn categorie, niet op de basisvraag', () => {
  const { bank } = lees(LIJST);
  const gordijn = bank?.overlays.find((o) => o.id === 'gordijnstoffen');
  // De lijst zegt niets anders over gordijnstoffen dan deze herweging; de
  // overlay bestaat dus alleen daarvoor, en dat is precies de bedoeling.
  assert.equal(gordijn?.reweight?.['BAS-H01']?.importance, 'critical');
  assert.equal(bank?.questions[0].importance, 'critical');
});

test('een overlay herweegt maar herschrijft niet', () => {
  const tekst = [
    HEADER,
    row({
      id: 'BAS-01', categorie: 'basis', laag: 'basis', geldt_voor: 'meubelstoffen',
      vraag: 'Hoe breed is deze stof?', belang: 'middel',
      herweging: 'meubelstoffen: kritiek', benodigde_attributen: 'rolbreedte_cm',
    }),
  ].join('\n');
  const { bank } = lees(tekst);
  const set = composeSet(bank!, { id: 'meubelstoffen', name: 'Meubelstoffen', count: 5 });
  const vraag = set.questions.find((q) => q.id === 'BAS-01');
  assert.equal(vraag?.importance, 'critical');
  // Herwogen, niet herschreven: dezelfde tekst onder hetzelfde id.
  assert.equal(vraag?.label.nl, 'Hoe breed is deze stof?');
});

test('zonder dekkingskolom is de dekking niet onderzocht, en niet nul', () => {
  const { bank, warnings } = lees(LIJST);
  // Die twee mogen nooit samenvallen: 0 is een vondst, null is een gat in de
  // methode. Een tabel zonder panel kan het eerste niet beweren.
  assert.equal(bank?.questions[0].coverage, null);
  assert.equal(bank?.meta.panel.length, 0);
  assert.ok(warnings.some((w) => /dekking/i.test(w)));
});

test('geen sitepanel betekent in review, nooit bevroren', () => {
  const { bank, warnings } = lees(LIJST);
  assert.equal(bank?.meta.status, 'in-review');
  assert.ok(warnings.some((w) => /onomkeerbare fout/i.test(w)));
});

test('een beslisregel zonder bron blijft beredeneerd en wordt niet gerekend', () => {
  const { bank, warnings } = lees(LIJST);
  const regel = bank?.rules.find((r) => r.id === 'martindale >= 30000');
  assert.equal(regel?.source.kind, 'reasoned');
  assert.equal(regel?.source.site, undefined);

  // De melding onderscheidt "noemt een drempel" van "noemt alleen een naam", en
  // belooft van geen van beide dat er iets mee gerekend wordt. Dat laatste is de
  // hele reden dat hij er staat.
  const melding = warnings.find((w) => /beslisregel/i.test(w));
  assert.match(melding ?? '', /zonder bron/i);
  assert.match(melding ?? '', /1 daarvan noemt een drempel \(martindale >= 30000\)/);
  assert.match(melding ?? '', /rekent met geen van beide/i);
});

test('geen enkel toepassingsprofiel weegt mee, ook niet bij een categorievraag', () => {
  // De scan meet nog nergens per toepassingsprofiel. De melding mag dus niet
  // suggereren dat alleen de basisvragen hun profiel kwijtraken.
  const tekst = [HEADER, BASIS, OVERLAY, row({
    id: 'BAS-O02', categorie: 'alle interieurstoffen', laag: 'basis',
    vraag: 'Kan deze stof in de wasmachine?', belang: 'hoog',
    benodigde_attributen: 'wasbaar', toepassingsprofielen_kritiek: 'kussens, sedari',
  })].join('\n');
  const melding = lees(tekst).warnings.find((w) => /toepassingsprofiel/i.test(w));
  assert.match(melding ?? '', /1 basisvraag noemt/);
  assert.match(melding ?? '', /geen enkel profiel weegt mee/i);
});

test('elk genoemd attribuut krijgt een zoekpatroon, met de gok erbij gemeld', () => {
  const { bank, warnings } = lees(LIJST);
  const breedte = bank?.attributes.find((a) => a.key === 'rolbreedte_cm');
  assert.deepEqual(breedte?.evidence, ['attr:rolbreedte.?cm']);
  assert.ok(warnings.some((w) => /geen `velden:`-koppeling/.test(w)));

  // Ook attributen die alleen in een overlay voorkomen staan in het register;
  // anders geldt de vraag die erop leunt als kapot in plaats van onbeantwoord.
  assert.ok(bank?.attributes.some((a) => a.key === 'slijtvastheid_martindale'));
  assert.ok(bank?.attributes.some((a) => a.key === 'garendikte_tex'));
});

test('de bank slaat op de categorieën die de lijst noemt', () => {
  const { bank } = lees(LIJST);
  assert.ok(bank);
  assert.ok(overlayFor(bank, 'Meubelstoffen'));
  assert.ok(overlayFor(bank, 'Gordijnstoffen'));
  assert.equal(overlayFor(bank, 'Fietsbanden'), undefined);
  assert.equal(bank.meta.vertical, 'interieurstoffen');
});

test('telt_mee_in_score: nee haalt een vraag uit de score maar niet uit de lijst', () => {
  const tekst = [
    HEADER,
    row({
      id: 'BAS-K02', categorie: 'basis', laag: 'basis', vraag: 'Kan ik een stofstaal krijgen?',
      belang: 'hoog', benodigde_attributen: 'staal_beschikbaar',
      beantwoordbaar_uit_attributen: 'nee', telt_mee_in_score: 'nee',
    }),
  ].join('\n');
  const { bank } = lees(tekst);
  assert.equal(bank?.questions.length, 1);
  assert.equal(bank?.questions[0].answerable, 'no');
});

test('een lijst zonder belang wordt geweigerd in plaats van gelijk gewogen', () => {
  const tekst = 'id;vraag;benodigde_attributen\nBAS-01;Hoe breed?;rolbreedte_cm';
  const { bank, errors } = lees(tekst);
  assert.equal(bank, undefined);
  assert.ok(errors.some((e) => /belang/.test(e)));
});

test('een dubbel id blokkeert; een rapport moet te herleiden zijn', () => {
  const tekst = [HEADER, BASIS, BASIS].join('\n');
  const { bank, errors } = lees(tekst);
  assert.equal(bank, undefined);
  assert.ok(errors.some((e) => /meer dan één keer/.test(e)));
});

test('een productexport wordt geweigerd met de kolommen erbij', () => {
  const { bank, errors } = lees('sku;titel;prijs\n1;Stof;9,95', 'export.csv');
  assert.equal(bank, undefined);
  assert.ok(errors.some((e) => /export\.csv/.test(e) && /titel/.test(e)));
});

test('honderd afwijkende gewichten worden één melding', () => {
  const rijen = Array.from({ length: 40 }, (_, i) => row({
    id: `BAS-${i}`, categorie: 'basis', laag: 'basis', vraag: `Vraag ${i}?`,
    belang: 'hoog', gewicht: '9', benodigde_attributen: 'iets',
  }));
  const { warnings } = lees([HEADER, ...rijen].join('\n'));
  const overGewicht = warnings.filter((w) => /gewicht/.test(w));
  assert.equal(overGewicht.length, 1);
  assert.match(overGewicht[0], /40 vragen/);
});

test('dezelfde lijst geeft twee keer dezelfde bank', () => {
  assert.deepEqual(lees(LIJST).bank, lees(LIJST).bank);
});

test('de ingang kiest de lezer op inhoud, niet op extensie', () => {
  const yaml = [
    'meta:', '  vertical: test', '  label: Test', '  laag: basis',
    'context_vertical:', '  onomkeerbare_fout: Op maat geknipt, dus geen retour.',
    'attributen:', '  breedte:', '    velden: [width]',
    'vragen:', '  - id: V1', '    vraag: Hoe breed?', '    belang: kritiek',
    '    bewijs: [breedte]',
  ].join('\n');
  assert.equal(importQuestionList([{ name: 'bank.yaml', text: yaml }]).bank?.meta.vertical, 'test');
  assert.equal(importQuestionList([{ name: 'lijst.csv', text: LIJST }]).bank?.meta.vertical, 'interieurstoffen');

  // Door elkaar heen kan niet: dan is niet te bepalen welke laag waar hoort.
  const gemengd = importQuestionList([
    { name: 'bank.yaml', text: yaml }, { name: 'lijst.csv', text: LIJST },
  ]);
  assert.equal(gemengd.bank, undefined);
  assert.ok(gemengd.errors.some((e) => /twee soorten bestanden/.test(e)));
});

// --- De Engelse lijst -------------------------------------------------------

const EN_HEADER = [
  'id', 'category', 'layer', 'applies_to', 'intent', 'question', 'importance', 'weight',
  'reweighting', 'required_attributes', 'attribute_count', 'decision_rule', 'answer_type',
  'answerable_from_attributes', 'counts_in_score', 'legally_required', 'commercial_value',
  'warning', 'note', 'source', 'critical_in_profiles',
].join(';');

function enRow(values: Partial<Record<string, string>>): string {
  return EN_HEADER.split(';').map((column) => values[column] ?? '').join(';');
}

test('een Engelse kopregel wordt op alias herkend, niet op positie', () => {
  const tekst = [EN_HEADER, enRow({
    id: 'BAS-H01', category: 'all interior fabrics', layer: 'base',
    applies_to: 'upholstery fabrics', intent: 'quantity', question: 'How wide is this fabric?',
    importance: 'critical', weight: '5', reweighting: 'curtain fabrics: critical',
    required_attributes: 'rolbreedte_cm', attribute_count: '1', answer_type: 'number',
    answerable_from_attributes: 'yes', counts_in_score: 'yes', source: 'category_pages',
    warning: 'Only show verifiable values.', note: 'Width determines the number of widths.',
  })].join('\n');
  const { bank, errors, warnings } = lees(tekst, 'list-en.csv');
  assert.deepEqual(errors, []);
  // Niets mag als onherkende kolom overblijven: dan is er een alias vergeten en
  // valt er stilzwijgend betekenis weg.
  assert.equal(warnings.some((w) => /niet herkend/.test(w)), false);

  const vraag = bank?.questions[0];
  assert.equal(vraag?.id, 'BAS-H01');
  assert.equal(vraag?.importance, 'critical');
  assert.equal(vraag?.intent, 'quantity');
  assert.equal(vraag?.answerType, 'number');
  assert.equal(vraag?.answerable, 'yes');
  assert.deepEqual(vraag?.evidence, ['rolbreedte_cm']);
  assert.match(vraag?.caution?.nl ?? '', /verifiable/);
  assert.equal(bank?.meta.vertical, 'interior-fabrics');
  // De herweging landt ook in het Engels op de overlay van zijn categorie.
  assert.equal(
    bank?.overlays.find((o) => o.id === 'curtain-fabrics')?.reweight?.['BAS-H01']?.importance,
    'critical',
  );
});

test('Engelse waarden vertalen naar hetzelfde model als de Nederlandse', () => {
  const tekst = [EN_HEADER,
    enRow({ id: 'A1', layer: 'base', intent: 'suitability', question: 'Fits?', importance: 'high',
      required_attributes: 'x', answer_type: 'derived_boolean', counts_in_score: 'yes' }),
    enRow({ id: 'A2', layer: 'base', intent: 'workability', question: 'Sew?', importance: 'medium',
      required_attributes: 'y', answer_type: 'multi_enum', answerable_from_attributes: 'partial' }),
    enRow({ id: 'A3', layer: 'base', intent: 'purchase_confidence', question: 'Swatch?',
      importance: 'low', required_attributes: 'z', answer_type: 'process', counts_in_score: 'no' }),
  ].join('\n');
  const { bank } = lees(tekst, 'list-en.csv');
  assert.deepEqual(bank?.questions.map((q) => q.intent), ['fit', 'processing', 'purchase-certainty']);
  assert.deepEqual(bank?.questions.map((q) => q.answerType), ['derived', 'enum', 'process']);
  assert.deepEqual(bank?.questions.map((q) => q.answerable), ['yes', 'partial', 'no']);
});

test('een overlay matcht ook op de categorienamen uit `geldt_voor`', () => {
  // De uitweg voor een Engelse lijst op een Nederlandse catalogus.
  const tekst = [EN_HEADER, enRow({
    id: 'MEU-A01', category: 'upholstery fabrics', layer: 'overlay',
    applies_to: 'upholstery fabrics, Meubelstoffen', question: 'Strong enough?',
    importance: 'critical', required_attributes: 'slijtvastheid_martindale',
  })].join('\n');
  const { bank } = lees(tekst, 'list-en.csv');
  assert.ok(bank);
  assert.ok(overlayFor(bank, 'Meubelstoffen'), 'de Nederlandse categorienaam hoort te matchen');
  assert.ok(overlayFor(bank, 'Upholstery fabrics'));
});

// --- De modus ---------------------------------------------------------------

test('een vraag met een beslisregel vraagt al zijn attributen, een zonder niet', () => {
  // Een som heeft al zijn termen nodig; bewijs stapelt. Zie `modeOf`.
  const kop = `${HEADER};modus`;
  const tekst = [kop,
    `${row({ id: 'REKEN', categorie: 'basis', laag: 'basis', vraag: 'Hoeveel meter?',
      belang: 'kritiek', benodigde_attributen: 'rolbreedte_cm, rapport_hoogte_cm, heeft_vleug',
      beslisregel: 'meterage_indicatie' })};`,
    `${row({ id: 'BEWIJS', categorie: 'basis', laag: 'basis', vraag: 'Duurzaam geproduceerd?',
      belang: 'hoog', benodigde_attributen: 'certificeringen, gerecycled_pct, vezelsamenstelling' })};`,
    `${row({ id: 'EIGEN', categorie: 'basis', laag: 'basis', vraag: 'Hoe dik is dit garen?',
      belang: 'hoog', benodigde_attributen: 'garendikte_tex, garendikte_nm',
      beslisregel: 'iets' })};een`,
  ].join('\n');
  const { bank } = lees(tekst);
  const modes = Object.fromEntries((bank?.questions ?? []).map((q) => [q.id, q.mode]));
  assert.equal(modes.REKEN, 'all');
  assert.equal(modes.BEWIJS, 'any');
  // Een expliciete kolom gaat altijd voor de afleiding.
  assert.equal(modes.EIGEN, 'any');
});

// --- De onomkeerbare fout ---------------------------------------------------

test('de onomkeerbare fout mag uit een kolom komen, en zwijgt dan', () => {
  const kop = `${HEADER};onomkeerbare_fout`;
  const met = [kop, `${BASIS};Stof wordt op maat geknipt, dus het herroepingsrecht vervalt.`].join('\n');
  const { bank, warnings } = lees(met);
  assert.match(bank?.context.irreversibleMistake?.nl ?? '', /op maat geknipt/);
  assert.equal(warnings.some((w) => /onomkeerbare fout/i.test(w)), false);

  // Zonder die kolom blijft de melding staan: "kritiek" is dan niet na te lopen.
  const zonder = lees(LIJST);
  assert.equal(zonder.bank?.context.irreversibleMistake, undefined);
  assert.ok(zonder.warnings.some((w) => /onomkeerbare fout/i.test(w)));
});

test('synoniemen uit de lijst reizen mee naar de koppeling', () => {
  const kop = `${HEADER};synoniemen`;
  const tekst = [kop, `${row({
    id: 'BAS-H02', categorie: 'basis', laag: 'basis', vraag: 'Rapporthoogte?',
    belang: 'kritiek', benodigde_attributen: 'rapport_hoogte_cm',
  })};patroon_hoogte, dessin_hoogte`].join('\n');
  const attribuut = lees(tekst).bank?.attributes.find((a) => a.key === 'rapport_hoogte_cm');
  assert.deepEqual(attribuut?.namedAs, ['patroon_hoogte', 'dessin_hoogte']);
});

// --- De koppeling van kenmerk naar kolom ------------------------------------

test('een koppeling vervangt de gok, en "geen kolom" is een geldig antwoord', () => {
  const { bank } = lees(LIJST);
  // `rol_breedte` wordt door de intake herkend als het canonieke veld
  // `dimensions`; de koppeling moet dus die vorm opleveren en niet de ruwe naam,
  // anders zoekt de motor naar een sleutel die niet bestaat.
  const catalogus = ingest('c.csv', 'sku;rol_breedte;eigen_kolom\n1;140;x');
  const gekoppeld = applyMapping(
    bank!,
    { rolbreedte_cm: ['rol_breedte'], slijtvastheid_martindale: [] },
    catalogus,
  );

  const breedte = gekoppeld.attributes.find((a) => a.key === 'rolbreedte_cm');
  // Vervangen en niet aanvullen: bleef het gokpatroon staan, dan kan een
  // toevallige kolom het antwoord alsnog leveren en is de herkomst weg.
  assert.deepEqual(breedte?.evidence, ['dimensions']);
  assert.equal(breedte?.mode, 'any');

  // Geen kolom betekent: dit kenmerk staat niet in de catalogus. Het attribuut
  // houdt niets over, en de vraag die erop leunt is dus onbeantwoordbaar — dat
  // is de bevinding en geen fout.
  assert.deepEqual(
    gekoppeld.attributes.find((a) => a.key === 'slijtvastheid_martindale')?.evidence,
    [],
  );

  // Wat niet in de koppeling staat, blijft ongemoeid.
  assert.deepEqual(
    gekoppeld.attributes.find((a) => a.key === 'garensoort')?.evidence,
    bank?.attributes.find((a) => a.key === 'garensoort')?.evidence,
  );
});

test('een kolom die de intake niet herkent wordt verankerd opgezocht', () => {
  // Zonder anker vangt het patroon ook `stof_rolbreedte`, en dan telt een vraag
  // als beantwoord door een kolom die de merchant nooit heeft aangewezen.
  const catalogus = ingest('c.csv', 'sku;lichtechtheid;extra_lichtechtheid\n1;5;7');
  const { bank } = lees(LIJST);
  const gekoppeld = applyMapping(bank!, { rolbreedte_cm: ['lichtechtheid'] }, catalogus);
  const veld = gekoppeld.attributes.find((a) => a.key === 'rolbreedte_cm')?.evidence[0];
  assert.equal(veld, 'attr:^lichtechtheid$');
  assert.equal(catalogKnows(catalogus, veld!), true);
  assert.equal(fieldState(catalogus.products[0], veld!), 'ok');
});

test('een verzonnen kolomnaam is een fout en geen waarschuwing', () => {
  // Zou hij doorgaan, dan telt het kenmerk als gekoppeld terwijl het nooit iets
  // vindt: het gat blijft staan en niemand ziet meer waarom.
  const result = parseMappingAnswer(
    'rolbreedte_cm: fabric_width',
    ['rolbreedte_cm'],
    ['rol_breedte'],
  );
  assert.deepEqual(result.pairs, []);
  assert.ok(result.errors.some((e) => /fabric_width/.test(e)));
});

test('het antwoord van een agent wordt gelezen zoals een agent het schrijft', () => {
  const antwoord = [
    'Hier is de koppeling:', '', '```',
    '- `rapport_hoogte_cm`: patroon_hoogte',
    'vezelsamenstelling: material',
    'productieland: geen',
    'onbekend_kenmerk: material',
    '```',
  ].join('\n');
  const result = parseMappingAnswer(
    antwoord,
    ['rapport_hoogte_cm', 'vezelsamenstelling', 'productieland'],
    ['patroon_hoogte', 'material'],
  );
  assert.deepEqual(result.pairs, [
    { key: 'rapport_hoogte_cm', columns: ['patroon_hoogte'] },
    { key: 'vezelsamenstelling', columns: ['material'] },
  ]);
  // "geen" is een antwoord en geen koppeling; een onbekend kenmerk wordt gemeld.
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((w) => /onbekend_kenmerk/.test(w)));
});

test('de koppelopdracht draagt geen productdata', () => {
  const request = buildMappingRequest(
    [{ key: 'rolbreedte_cm', questions: ['Hoe breed is deze stof?'] }],
    ['rol_breedte', 'title'],
  );
  const tekst = renderMappingRequest(request, 'nl');
  // Het type kan het niet dragen, en de afgeleverde tekst dus ook niet: alleen
  // kenmerknamen, vraagteksten en kolomnamen.
  assert.match(tekst, /rolbreedte_cm/);
  assert.match(tekst, /rol_breedte/);
  assert.match(tekst, /Hoe breed is deze stof\?/);
  assert.equal(/\b\d{3,}\b/.test(tekst), false, 'geen aantallen in de opdracht');
  assert.match(tekst, /geen productdata/i);
});

test('wat al gekoppeld is, wordt niet opnieuw gevraagd', () => {
  const request = buildMappingRequest(
    [{ key: 'vezelsamenstelling', questions: ['Waar is dit van gemaakt?'] }],
    ['material', 'rol_breedte', 'weight'],
    ['rol_breedte'],
  );
  assert.deepEqual(request.columns, ['material', 'weight']);
});

// --- Algemene vragen en categorie-eigen vragen ------------------------------

test('elke vraag draagt of hij algemeen is of bij de categorie hoort', () => {
  // Dit onderscheid is het hele punt van de laagopzet. Raakt het kwijt, dan
  // leest een set als één hoop en kan een merchant niet zien of zijn
  // categoriespecifieke vragen überhaupt zijn aangekomen.
  const { bank } = lees(LIJST);
  const set = composeSet(bank!, { id: 'meubelstoffen', name: 'Meubelstoffen', count: 5 });
  const lagen = Object.fromEntries(set.questions.map((q) => [q.id, q.layer]));
  assert.equal(lagen['BAS-H01'], 'base');
  assert.equal(lagen['MEU-A01'], 'category');
});

test('de merchant mag zelf aanwijzen welke vragenset bij zijn categorie hoort', () => {
  // De regex faalt zodra de lijst zijn categorieën anders noemt dan de
  // catalogus — een Engelse lijst op een Nederlandse boom is het normale geval.
  // Dan krijgt elke categorie dezelfde basisvragen en valt het cijfer te gunstig
  // uit, want juist de kritieke vragen van die categorie ontbreken.
  const { bank } = lees(LIJST);
  const eigen = (chosen?: string | null) =>
    composeSet(bank!, { id: 'x', name: 'Bekledingsstof', count: 5 }, chosen)
      .questions.filter((q) => q.layer === 'category').map((q) => q.id);

  // Zonder keuze slaat de regex niet aan op deze naam.
  assert.deepEqual(eigen(), []);
  // Met keuze landen de categoriespecifieke vragen alsnog.
  assert.deepEqual(eigen('meubelstoffen'), ['MEU-A01']);
  // En `null` betekent uitdrukkelijk: alleen de algemene vragen.
  assert.deepEqual(eigen(null), []);
});

test('de algemene vragen worden één keer bevestigd, de eigen vragen per categorie', () => {
  // Vier keer dezelfde 34 vragen voorleggen levert vier keer hetzelfde oordeel
  // op, en wie dat moet doen leest de vierde keer niet meer.
  const { bank } = lees(LIJST);
  const set = (naam: string, chosen?: string | null) =>
    composeSet(bank!, { id: naam.toLowerCase(), name: naam, count: 10 }, chosen);
  const state: QuestionSetState = {
    version: 1,
    sets: [set('Meubelstoffen', 'meubelstoffen'), set('Overig', null)],
    changeLog: [],
    banks: [],
    blindAttributes: [],
    attributeMatches: [],
    overlays: [],
    categoriesWithoutOverlay: [],
  };

  // De algemene vragen staan er één keer in, niet één keer per categorie.
  assert.deepEqual(baseQuestions(state).map((entry) => entry.question.id), ['BAS-H01']);

  // Zolang de algemene vragen niet bevestigd zijn is niets af.
  assert.equal(allValidated(state), false);

  // Een categorie zonder eigen vragen hoeft niet apart bevestigd te worden:
  // die bestaat helemaal uit de basislaag en is met die ene klik al gezien.
  assert.equal(hasOwnQuestions(state.sets[1]), false);
  const alleenBasis = { ...toggleBaseValidated(state) };
  assert.equal(allValidated(alleenBasis), false, 'Meubelstoffen heeft wél eigen vragen');

  const compleet = toggleValidated(alleenBasis, 'meubelstoffen');
  assert.equal(allValidated(compleet), true);
});

test('een algemene vraag bewerken raakt élke categorie', () => {
  // Anders meten twee categorieën verschillende dingen onder hetzelfde id.
  const { bank } = lees(LIJST);
  const state: QuestionSetState = {
    version: 1,
    sets: [
      composeSet(bank!, { id: 'a', name: 'Meubelstoffen', count: 10 }, 'meubelstoffen'),
      composeSet(bank!, { id: 'b', name: 'Gordijnstoffen', count: 10 }, null),
    ],
    changeLog: [],
    banks: [],
    blindAttributes: [],
    attributeMatches: [],
    overlays: [],
    categoriesWithoutOverlay: [],
  };
  const na = editBaseQuestion(state, '2026-01-01T00:00:00Z', 'BAS-H01', {
    nl: 'Hoe breed is de baan?', en: 'How wide is the roll?',
  });
  for (const set of na.sets) {
    assert.equal(set.questions.find((q) => q.id === 'BAS-H01')?.label.nl, 'Hoe breed is de baan?');
  }
});

test('een subcategorie krijgt alleen een eigen niveau als de lijst hem kent', () => {
  // Anders is het dezelfde meting op minder producten, en suggereert de rij een
  // onderscheid dat de vragenlijst niet maakt. Het aggregatieniveau volgt de
  // vragen, niet de categorieboom.
  const { bank } = lees(LIJST);
  const catalogus = ingest('c.csv', [
    'sku;title;main_category',
    // Effen kent de lijst niet; naaigarens wél, als eigen categorie.
    '1;A;Meubelstoffen > Effen',
    '2;B;Meubelstoffen > Effen',
    '3;C;Meubelstoffen > Naaigarens',
    '4;D;Meubelstoffen > Naaigarens',
  ].join('\n'));

  const state = generateQuestionSets(catalogus, [bank!], {}, { Meubelstoffen: 'meubelstoffen' });
  const set = state.sets.find((entry) => entry.category === 'Meubelstoffen');
  assert.deepEqual(set?.distinguishes, ['Naaigarens']);
  assert.equal(set?.distinguishes?.includes('Effen'), false);
});
