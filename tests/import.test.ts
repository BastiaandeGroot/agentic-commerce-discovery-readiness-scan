// Een vragenbank inlezen zoals de promptreeks hem oplevert.
//
// De tests hieronder bewaken vooral wat er NIET doorheen mag. Een bank die er
// af uitziet maar zijn herkomst niet kan tonen — een gepubliceerde drempel
// zonder site, dekking zonder panel, kritiek zonder onomkeerbare fout — levert
// een rapport op dat overtuigender oogt dan het is, en dat is het ergste soort
// fout in dit product.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importBank } from '../src/questions/import';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';

/** Een bank in de vorm van `prompt-vragenbank-genereren.md`, prompt 2. */
const BANK = `
meta:
  vertical: stoffen
  label: Stoffen
  match: stof|textiel
  laag: basis
  versie: "1.0.0"
  status: bevroren
  bevroren_op: "2026-08-01"
  sitepanel:
    - {naam: Site A, url: "https://a.example", type: categorieleider, geraadpleegd: "2026-07-02"}
    - {naam: Site B, url: "https://b.example", type: specialist, geraadpleegd: "2026-07-02"}
  panelomvang: 2
  bronnen: [faq, categorietekst]
weging:
  belang: {kritiek: 5, hoog: 3, middel: 2, laag: 1}
context_vertical:
  onomkeerbare_fout: >-
    Stof wordt op maat geknipt, dus er is geen herroepingsrecht.
  gevolg: Vragen die deze fout voorkomen krijgen belang kritiek
  koopeenheid: maateenheid
attributen:
  baanbreedte:
    type: getal
    niveau: product
    benoemd_als: [Breedte, Rolbreedte]
  schuurweerstand:
    type: getal
    normering: EN ISO 12947-2
    niveau: product
    velden: ["attr:martindale|schuurtoer"]
beslisregels:
  meterage:
    bron: gepubliceerd
    site: Site A
    url: "https://a.example/meterage"
    regels:
      - Bij een rapport groter dan 0 komt er per baan een rapportlengte bij
vragen:
  - id: BAS-01
    vraag: Hoeveel meter heb ik nodig?
    intentie: hoeveelheid
    belang: kritiek
    dekking: 2
    dekking_bronnen: [site-a, site-b]
    bron: [faq, vakkennis]
    bewijs: [baanbreedte]
    beslisregel: meterage
    antwoordtype: afgeleid
    beantwoordbaar_uit_attributen: gedeeltelijk
  - id: BAS-02
    vraag: Hoeveel slijtage kan het hebben?
    intentie: duurzaamheid
    belang: hoog
    dekking: 1
    bron: [categorietekst]
    bewijs: [schuurweerstand]
    antwoordtype: getal
    beantwoordbaar_uit_attributen: true
  - id: BAS-03
    vraag: Kan ik eerst een staal krijgen?
    intentie: koopzekerheid
    belang: hoog
    dekking: 0
    bron: [vakkennis]
    bewijs: [baanbreedte]
    antwoordtype: proces
    toelichting: Een staal dekt de onomkeerbare fout af, maar is een dienst.
uitgesloten_van_score: [BAS-03]
open_punten:
  - id: drempels
    soort: reasoned-threshold
    belang: hoog
    vraag: Welke schuurweerstand hoort bij welke toepassing?
`.trim();

test('een bank uit de promptreeks wordt ingelezen met zijn herkomst', () => {
  const { bank, errors } = importBank(BANK);
  assert.deepEqual(errors, []);
  assert.ok(bank);

  assert.equal(bank.meta.vertical, 'stoffen');
  assert.equal(bank.meta.status, 'frozen');
  assert.equal(bank.meta.origin, 'imported');
  assert.equal(bank.meta.panel.length, 2);
  assert.equal(bank.meta.panel[0].type, 'category-leader');
  assert.match(bank.context.irreversibleMistake.nl, /geen herroepingsrecht/);
  assert.equal(bank.context.unitOfSale, 'measure');

  // De Nederlandse termen worden vertaald naar het model, niet overgenomen.
  const meterage = bank.questions.find((q) => q.id === 'BAS-01');
  assert.equal(meterage?.importance, 'critical');
  assert.equal(meterage?.intent, 'quantity');
  assert.equal(meterage?.answerType, 'derived');
  assert.equal(meterage?.answerable, 'partial');
  assert.deepEqual(meterage?.sources, ['faq', 'expertise']);
  assert.equal(meterage?.coverage, 2);

  // Dekking nul blijft nul en wordt geen "niet onderzocht".
  assert.equal(bank.questions.find((q) => q.id === 'BAS-03')?.coverage, 0);
});

test('uitgesloten_van_score zet een vraag buiten de meting, niet buiten de bank', () => {
  const { bank } = importBank(BANK);
  const staal = bank?.questions.find((q) => q.id === 'BAS-03');
  assert.ok(staal, 'de vraag blijft staan, want er zit advies in');
  assert.equal(staal.answerable, 'no');
});

test('een gepubliceerde drempel zonder site komt er niet in', () => {
  const zonderSite = BANK.replace('    site: Site A\n', '');
  const { errors, bank } = importBank(zonderSite);
  assert.equal(bank, undefined);
  assert.ok(errors.some((e) => /gepubliceerd maar noemt geen site/.test(e)), errors.join(' | '));
});

test('dekking zonder panel dat erbij past, komt er niet in', () => {
  const scheef = importBank(BANK.replace('panelomvang: 2', 'panelomvang: 6'));
  assert.ok(scheef.errors.some((e) => /panelomvang/.test(e)), scheef.errors.join(' | '));

  const zonderPanel = importBank(BANK.replace(/  sitepanel:[\s\S]*?  panelomvang: 2\n/, ''));
  assert.ok(zonderPanel.errors.some((e) => /geen sitepanel/.test(e)), zonderPanel.errors.join(' | '));
});

test('zonder onomkeerbare fout is kritiek een mening en gaat de bank niet door', () => {
  const zonder = BANK.replace(/  onomkeerbare_fout: >-\n.*\n/, '');
  const { errors, bank } = importBank(zonder);
  assert.equal(bank, undefined);
  assert.ok(errors.some((e) => /onomkeerbare_fout/.test(e)), errors.join(' | '));
});

test('een vraag die naar een onbekend attribuut wijst, is een fout en geen stilte', () => {
  const { errors } = importBank(BANK.replace('bewijs: [schuurweerstand]', 'bewijs: [bestaat_niet]'));
  assert.ok(errors.some((e) => /bestaat_niet/.test(e)), errors.join(' | '));
});

test('zonder veldkoppeling wordt er gezocht op de namen die de markt gebruikt', () => {
  const { bank, warnings } = importBank(BANK);
  const breedte = bank?.attributes.find((a) => a.key === 'baanbreedte');
  // De mappinglaag hoort volgens de methode ná het bevriezen te komen. Ontbreekt
  // hij, dan is `benoemd_als` de beste gok — maar wel een gok, en dat staat erbij.
  assert.match(breedte?.evidence[0] ?? '', /^attr:/);
  assert.match(breedte?.evidence[0] ?? '', /rolbreedte/);
  assert.ok(warnings.some((w) => /geen veldkoppeling/.test(w)), warnings.join(' | '));

  // Met expliciete velden blijft het bij die velden, zonder waarschuwing.
  const schuur = bank?.attributes.find((a) => a.key === 'schuurweerstand');
  assert.deepEqual(schuur?.evidence, ['attr:martindale|schuurtoer']);
  assert.equal(schuur?.standard, 'EN ISO 12947-2');
});

test('een eigen weging wordt genegeerd, met een waarschuwing', () => {
  const { bank, warnings } = importBank(BANK.replace('{kritiek: 5, hoog: 3, middel: 2, laag: 1}', '{kritiek: 9, hoog: 3, middel: 2, laag: 1}'));
  assert.ok(bank, 'een afwijkende weging blokkeert niet');
  // Zou elke bank zijn eigen gewichten meebrengen, dan zijn twee merchants niet
  // meer met elkaar te vergelijken en is de benchmark weg.
  assert.ok(warnings.some((w) => /eigen weging/.test(w)), warnings.join(' | '));
});

test('een onleesbaar bestand levert een leesbare fout, geen halve bank', () => {
  const kapot = importBank('meta:\n  vertical: stoffen\n\tvragen: nee');
  assert.equal(kapot.bank, undefined);
  assert.equal(kapot.errors.length, 1);
  assert.match(kapot.errors[0], /niet te lezen/);
});

test('een ingelezen bank stuurt de scan, niet de meegeleverde terugval', () => {
  const { bank } = importBank(BANK);
  assert.ok(bank);
  const catalog = ingest('catalogus.csv', [
    'sku,name,category,image,rolbreedte',
    '1,Meubelstof blauw,Meubelstoffen,https://x/1.jpg,140 cm',
  ].join('\n'));

  const state = generateQuestionSets(catalog, [bank]);
  assert.deepEqual(state.banks.map((b) => b.id), ['stoffen']);
  assert.equal(state.banks[0].status, 'frozen');
  // Drie vragen uit de bank, waarvan er één buiten de score valt.
  assert.deepEqual(state.sets[0].questions.map((q) => q.id), ['BAS-01', 'BAS-02', 'BAS-03']);
  // En "rolbreedte" wordt gevonden via het patroon uit `benoemd_als`.
  const breedte = state.sets[0].questions[0].evidence?.[0];
  assert.equal(breedte?.attributeKey, 'baanbreedte');
});

test('ontbrekende vertalingen worden één melding, geen lijst van dertig', () => {
  const { warnings } = importBank(BANK);
  const taal = warnings.filter((warning) => /Engelse tekst/.test(warning));
  // Eén regel voor de hele bank. Dertig keer dezelfde melding verbergt de
  // waarschuwingen die er wél toe doen.
  assert.equal(taal.length, 1);
  assert.match(taal[0], /onderdelen hebben geen Engelse tekst/);
});

test('een zoekpatroon bevat elk woord één keer', () => {
  const { bank, warnings } = importBank(
    BANK.replace('benoemd_als: [Breedte, Rolbreedte]', 'benoemd_als: [Baanbreedte, baanbreedte, Rolbreedte]'),
  );
  const breedte = bank?.attributes.find((a) => a.key === 'baanbreedte');
  assert.equal(breedte?.evidence[0], 'attr:baanbreedte|rolbreedte');
  assert.ok(warnings.some((w) => /baanbreedte, rolbreedte/.test(w)), warnings.join(' | '));
});
