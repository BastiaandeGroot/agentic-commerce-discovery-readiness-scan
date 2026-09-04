// De vragenbank op zijn beloftes.
//
// Vier daarvan zijn de kern van de methode en breken stilletjes als niemand ze
// bewaakt: een overlay herweegt maar herschrijft niet, een vraag die geen enkel
// attribuut kan dragen telt niet mee in de meting, niet-onderzochte dekking is
// iets anders dan dekking nul, en bewijs heeft twee lagen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingest } from '../src/intake/index';
import { generateQuestionSets } from '../src/questions/generate';
import { runScan } from '../src/engine/report';
import { BUILT_IN_BANKS, bankFor, resolveBanks } from '../src/questions/banks';
import { HOME_TEXTILES_BANK } from '../src/questions/banks/home-textiles';
import { composeQuestions, overlayFor, weightOf } from '../src/questions/compose';
import { IMPORTANCE_WEIGHT, reasonedRules } from '../src/questions/bank';
import type { QuestionBank } from '../src/questions/bank';

const VAST_TIJDSTIP = '2026-01-01T00:00:00.000Z';

/** Een catalogus met precies genoeg kolommen om de toestanden uit elkaar te trekken. */
const CATALOG = [
  'sku,name,brand,category,description,image,color,material,baanbreedte',
  '1,Meubelstof Anker gestreept blauw,DeGroot,Meubelstoffen,Een stevige meubelstof met een gestreept dessin in blauw,https://x/1.jpg,blauw,katoen,140 cm',
  '2,Meubelstof Effen groen,DeGroot,Meubelstoffen,Kort,https://x/2.jpg,groen,,',
].join('\n');

function scan(text: string) {
  const catalog = ingest('catalogus.csv', text);
  return runScan(catalog, generateQuestionSets(catalog), { scannedAt: VAST_TIJDSTIP });
}

test('een overlay herweegt een basisvraag maar herschrijft hem niet', () => {
  const overlay = overlayFor(HOME_TEXTILES_BANK, 'Meubelstoffen');
  assert.ok(overlay, 'meubelstoffen hoort een overlay te hebben');

  const basis = HOME_TEXTILES_BANK.questions.find((q) => q.id === 'h14');
  const meubel = composeQuestions(HOME_TEXTILES_BANK, overlay).find((q) => q.id === 'h14');
  const gordijn = composeQuestions(
    HOME_TEXTILES_BANK, overlayFor(HOME_TEXTILES_BANK, 'Gordijnstoffen'),
  ).find((q) => q.id === 'h14');

  // Het gewicht verschilt per categorie...
  assert.equal(basis?.importance, 'high');
  assert.equal(meubel?.importance, 'critical');
  assert.equal(gordijn?.importance, 'low');
  // ...maar de vraag zelf is in alle drie letterlijk dezelfde. Zou een overlay de
  // formulering mogen veranderen, dan meten twee categorieën verschillende dingen
  // onder hetzelfde id en is vergelijken tussen categorieën betekenisloos.
  assert.equal(meubel?.label.nl, basis?.label.nl);
  assert.equal(gordijn?.label.nl, basis?.label.nl);
  assert.deepEqual(meubel?.requires, gordijn?.requires);
});

test('een herweging draagt zijn verantwoording mee', () => {
  const meubel = composeQuestions(
    HOME_TEXTILES_BANK, overlayFor(HOME_TEXTILES_BANK, 'Meubelstoffen'),
  ).find((q) => q.id === 'h14');
  assert.ok(meubel?.weightNote?.nl, 'een zwaarder gewicht zonder uitleg is een mening');
  assert.ok(meubel?.weightNote?.en);
});

test('een vraag die geen attribuut kan dragen telt niet mee, maar verdwijnt niet', () => {
  const report = scan(CATALOG);
  const staal = HOME_TEXTILES_BANK.questions.find((q) => q.id === 'h15');
  assert.equal(staal?.answerable, 'no');

  // Niet als gescoorde vraag in de dekkingstabel...
  const gescoord = report.questionCoverage.find((q) => q.questionId === 'h15');
  assert.equal(gescoord?.scored, false);
  assert.equal(gescoord?.weight, 0);
  // ...wel in het adviesblok, want er zit advies in.
  assert.ok(report.advisory.some((a) => a.questionId === 'h15'));

  // En hij drukt de meting niet: het aantal toepasselijke vragen telt hem niet mee.
  const product = report.products[0];
  assert.equal(product.questions.filter((q) => q.scored).length + 1, product.questions.length);
});

test('basisgeschikt vraagt de kritieke vragen, volledig vraagt ze allemaal', () => {
  const report = scan(CATALOG);
  for (const product of report.products) {
    const gescoord = product.questions.filter((q) => q.scored);
    const kritiek = gescoord.filter((q) => q.importance === 'critical');

    assert.equal(product.qualified, gescoord.length > 0 && kritiek.every((q) => q.answered));
    assert.equal(product.findable, gescoord.length > 0 && gescoord.every((q) => q.answered));
    // Volledig impliceert basisgeschikt; andersom niet. Anders is de trede geen trede.
    if (product.findable) assert.equal(product.qualified, true);
  }
});

test('het gewicht van een vraag volgt zijn belang, en uitzetten zet het op nul', () => {
  const questions = composeQuestions(HOME_TEXTILES_BANK, overlayFor(HOME_TEXTILES_BANK, 'Meubelstoffen'));
  const kritiek = questions.find((q) => q.importance === 'critical');
  assert.ok(kritiek);
  assert.equal(weightOf(kritiek), IMPORTANCE_WEIGHT.critical);
  assert.equal(weightOf({ ...kritiek, disabled: true }), 0);
  // Buiten de score betekent ook: geen gewicht. Anders telt advies stilletjes mee.
  assert.equal(weightOf({ ...kritiek, answerable: 'no' }), 0);
});

test('bewijs heeft twee lagen: alle attributen nodig, per attribuut één veld genoeg', () => {
  const meterage = composeQuestions(HOME_TEXTILES_BANK).find((q) => q.id === 'h13');
  assert.equal(meterage?.mode, 'all');
  assert.equal(meterage?.evidence?.length, 2);
  // Baanbreedte kan uit vier verschillende kolomnamen komen; één ervan volstaat.
  const breedte = meterage?.evidence?.find((g) => g.attributeKey === 'roll-width');
  assert.equal(breedte?.mode, 'any');
  assert.ok((breedte?.fields.length ?? 0) > 0);

  // Platgeslagen zou dit een "en" over alle aliassen worden, en dan zakt een
  // merchant op een kolomnaam die hij nooit hoefde te gebruiken.
  const report = scan(CATALOG);
  const eerste = report.products.find((p) => p.key === '1');
  const uitkomst = eerste?.questions.find((q) => q.questionId === 'h5');
  assert.equal(uitkomst?.state, 'answered', 'één van de vier breedtekolommen is gevuld');
});

test('de vijf toestanden worden onderscheiden', () => {
  const report = scan(CATALOG);
  const een = report.products.find((p) => p.key === '1');
  const twee = report.products.find((p) => p.key === '2');

  // Beantwoordbaar: de catalogus draagt het antwoord.
  assert.equal(een?.questions.find((q) => q.questionId === 'h5')?.state, 'answered');
  // Onvolledig: baanbreedte staat er, het patroonrapport niet, en de vraag vraagt beide.
  assert.equal(een?.questions.find((q) => q.questionId === 'h13')?.state, 'incomplete');
  // Onbruikbaar: "Kort" vult het veld maar haalt de woorddrempel niet.
  assert.equal(twee?.questions.find((q) => q.questionId === 'h12')?.state, 'unusable');
  // Leeg: de kolom `material` bestaat, maar staat bij dit product leeg. Invulwerk.
  assert.equal(twee?.questions.find((q) => q.questionId === 'h3')?.state, 'empty');
  // Ontbreekt: geen enkele kolom kan onderhoud dragen. Modelwerk.
  assert.equal(een?.questions.find((q) => q.questionId === 'h9')?.state, 'absent');
});

test('niet-onderzochte dekking is iets anders dan dekking nul', () => {
  for (const bank of BUILT_IN_BANKS) {
    for (const question of bank.questions) {
      // Nul zou betekenen: geen enkele panelsite behandelt dit onderwerp — een
      // vondst. Deze banken hebben geen panel, dus is het antwoord "niet gemeten".
      assert.equal(question.coverage, null, `${bank.meta.vertical}/${question.id}`);
    }
    assert.equal(bank.meta.panel.length, 0);
    assert.equal(bank.meta.status, 'provisional');
  }
});

test('een meegeleverde bank draagt geen drempel zonder bron', () => {
  for (const bank of BUILT_IN_BANKS) {
    // Een beredeneerde drempel mag bestaan, maar dan mét verantwoording. Een
    // gepubliceerde drempel zonder site is per definitie verzonnen.
    for (const rule of bank.rules) {
      if (rule.source.kind === 'published') assert.ok(rule.source.site, rule.id);
      else assert.ok(rule.source.rationale, rule.id);
    }
    assert.equal(reasonedRules(bank).filter((r) => !r.source.rationale).length, 0);
  }
});

test('een ingelezen bank wint van de meegeleverde terugval', () => {
  const eigen: QuestionBank = {
    ...HOME_TEXTILES_BANK,
    meta: { ...HOME_TEXTILES_BANK.meta, vertical: 'stoffen-onderzocht', version: '1.0.0', status: 'frozen', origin: 'imported' },
  };
  const banken = resolveBanks([eigen]);
  assert.equal(bankFor('Meubelstoffen', banken).meta.vertical, 'stoffen-onderzocht');
  // Zonder ingelezen bank blijft de terugval staan; de scan valt nooit stil.
  assert.equal(bankFor('Meubelstoffen', resolveBanks()).meta.vertical, 'home-textiles');
  assert.equal(bankFor('Kaas en zuivel', resolveBanks()).meta.vertical, 'generic');
});

test('het rapport draagt de herkomst van elke gebruikte bank', () => {
  const catalog = ingest('catalogus.csv', CATALOG);
  const state = generateQuestionSets(catalog);
  assert.deepEqual(state.banks.map((b) => b.id), ['home-textiles']);
  assert.equal(state.banks[0].status, 'provisional');
  assert.equal(state.banks[0].version, HOME_TEXTILES_BANK.meta.version);
});
