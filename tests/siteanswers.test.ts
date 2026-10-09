// De sitetoets: lezen zoals een agent, en een antwoord alleen geloven als het
// citaat er letterlijk staat.
//
// De fout die hier bewaakt wordt is dezelfde als op het koppelscherm: een model
// dat iets aanwijst wat er niet staat, mag geen vinkje opleveren. En de tweede:
// tekst die voor een bezoeker dichtgeklapt is, bestaat voor een agent wél — die
// twee door elkaar halen maakt de toets strenger of soepeler dan de werkelijkheid.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE_CHECK_VERSION, agentText, choosePages, isStockQuestion, pathAllowed, quoteLink, readSiteAnswers,
  reusableSiteCheck, sameSite, siteCheckTotals, withoutSharedLines,
} from '../src/collect/answers';

const PAGINA = `<html><head><title>FAQ</title><script>var a = "<p>niet lezen</p>";</script></head><body>
<nav><a href="/retour">Retourneren</a></nav>
<div x-data="{ open: false, klik() { return this.a > 1 } }">
  <button @click="open = !open" :class="{ 'actief': open > 0 }">Wat zijn de verzendkosten?</button>
  <dd x-show="open">Wij versturen uw bestelling voor &euro;7,59 binnen Nederland.</dd>
</div>
<details><summary>Kan ik een staal krijgen?</summary><p>Ja, een staal kost &euro;1,60.</p></details>
<p>Geknipte stof kan niet retour.</p>
<style>.x{display:none}</style>
</body></html>`;

test('een agent leest de tekst, niet het script, en weet wat dichtgeklapt staat', () => {
  const page = agentText(PAGINA, 'https://w.nl/faq');
  assert.ok(!page.text.includes('niet lezen'), 'script hoort er niet in');
  assert.ok(!page.text.includes('display:none'), 'stijl hoort er niet in');
  assert.ok(!page.text.includes('klik()'), 'een attribuut met > erin is geen tekst');
  assert.ok(page.text.includes('Wij versturen uw bestelling voor €7,59 binnen Nederland.'));

  const verzend = page.collapsed.find((range) => page.text.slice(range.start, range.end).includes('€7,59'));
  assert.equal(verzend?.opener, 'Wat zijn de verzendkosten?');
  const staal = page.collapsed.find((range) => page.text.slice(range.start, range.end).includes('€1,60'));
  assert.equal(staal?.opener, 'Kan ik een staal krijgen?');
  // De vraag zelf en de gewone alinea staan niet dichtgeklapt.
  const dicht = page.collapsed.map((range) => page.text.slice(range.start, range.end)).join(' ');
  assert.ok(!dicht.includes('Kan ik een staal krijgen?'));
  assert.ok(!dicht.includes('Geknipte stof'));
});

test('een antwoord telt alleen met een citaat dat letterlijk op een gelezen pagina staat', () => {
  const page = agentText(PAGINA, 'https://w.nl/faq');
  const vragen = [
    { id: 'A', label: 'Wat kost verzenden?' },
    { id: 'B', label: 'Hoe lang is de garantie?' },
    { id: 'C', label: 'Kan ik geknipte stof terugsturen?' },
    { id: 'D', label: 'Is deze stof op voorraad?' },
    { id: 'E', label: 'Kan ik advies krijgen?' },
  ];
  const { answers, dropped } = readSiteAnswers({ answers: [
    { id: 'A', status: 'answered', quote: 'Wij versturen uw  bestelling voor €7,59 binnen Nederland.', url: 'https://w.nl/anders' },
    { id: 'B', status: 'answered', quote: 'Wij geven tien jaar garantie op alle stoffen.', url: 'https://w.nl/faq' },
    { id: 'C', status: 'partial', quote: 'Geknipte stof kan niet retour.', url: 'https://w.nl/faq', note: 'Annuleren staat er niet.' },
    { id: 'D', status: 'answered', quote: 'Geknipte stof kan niet retour.', url: 'https://w.nl/faq' },
  ] }, vragen, [page]);

  const by = new Map(answers.map((answer) => [answer.questionId, answer]));
  // Het citaat beslist, niet het adres dat het model noemde; witruimte telt niet.
  assert.equal(by.get('A')?.status, 'answered');
  assert.equal(by.get('A')?.url, 'https://w.nl/faq');
  assert.equal(by.get('A')?.opener, 'Wat zijn de verzendkosten?');
  // Verzonnen: geen vinkje.
  assert.equal(by.get('B')?.status, 'not-found');
  assert.equal(dropped, 1);
  assert.equal(by.get('C')?.status, 'partial');
  assert.equal(by.get('C')?.opener, undefined, 'een gewone alinea staat niet in een uitklapblok');
  assert.equal(by.get('C')?.note, 'Annuleren staat er niet.');
  // Voorraad wordt niet getoetst, wat het model ook zei.
  assert.equal(by.get('D')?.status, 'not-checked');
  // Zwijgen is geen vinkje.
  assert.equal(by.get('E')?.status, 'not-found');

  const totals = siteCheckTotals({ version: '1', site: '', checkedAt: '', model: '', pages: [], namedBots: [], notes: [], answers });
  assert.deepEqual(totals, { answered: 1, partial: 1, 'not-found': 2, 'not-checked': 1 });
});

test('de link springt naar de zin, behalve in een uitklapblok', () => {
  assert.equal(
    quoteLink({ questionId: 'C', status: 'answered', quote: 'Geknipte stof kan niet retour.', url: 'https://w.nl/faq' }),
    'https://w.nl/faq#:~:text=Geknipte%20stof%20kan%20niet%20retour',
  );
  assert.equal(
    quoteLink({ questionId: 'A', status: 'answered', quote: 'Wij versturen uw bestelling', url: 'https://w.nl/faq', opener: 'Wat zijn de verzendkosten?' }),
    'https://w.nl/faq',
  );
});

test('menu en voet gaan één keer naar het model, niet op elke pagina', () => {
  const pages = ['a', 'b', 'c', 'd'].map((name) => ({
    url: `https://w.nl/${name}`, collapsed: [],
    text: `Meubelstoffen\nGordijnstoffen\nEigen tekst van ${name}\nContact`,
  }));
  const slim = withoutSharedLines(pages);
  assert.deepEqual(slim.map((page) => page.text), ['a', 'b', 'c', 'd'].map((name) => `Eigen tekst van ${name}`));
});

test('gelezen wordt wat de winkel aanwijst: service, categorieën, blogs en een paar producten', () => {
  const keuze = choosePages({
    origin: 'https://w.nl',
    sitemaps: [
      { name: 'https://w.nl/sitemap_paginas.xml', urls: ['https://w.nl/veelgestelde-vragen', 'https://w.nl/retourneren', 'https://w.nl/privacy', 'https://anders.nl/faq'] },
      { name: 'https://w.nl/sitemap_categorieen.xml', urls: ['https://w.nl/meubelstoffen', 'https://w.nl/gordijnstoffen/voering'] },
      { name: 'https://w.nl/sitemap_producten.xml', urls: ['https://w.nl/product/stof-1', 'https://w.nl/product/stof-2', 'https://w.nl/product/stof-3'] },
    ],
    links: ['https://w.nl/blog/hoeveel-stof', 'https://w.nl/showroom', 'https://w.nl/meubelstoffen?kleur=rood'],
  });
  assert.deepEqual(keuze.service.sort(), ['https://w.nl/retourneren', 'https://w.nl/showroom', 'https://w.nl/veelgestelde-vragen']);
  assert.deepEqual(keuze.categories, ['https://w.nl/meubelstoffen', 'https://w.nl/gordijnstoffen/voering']);
  assert.deepEqual(keuze.blogs, ['https://w.nl/blog/hoeveel-stof']);
  assert.equal(keuze.products.length, 2);
});

test('robots.txt: de regels voor alle bezoekers gelden per pad', () => {
  const robots = 'User-agent: *\nDisallow: /checkout/\nDisallow: /*?*kleur=\nDisallow: /*.php$\n\nUser-agent: GPTBot\nDisallow: /';
  assert.equal(pathAllowed(robots, '/veelgestelde-vragen'), true);
  assert.equal(pathAllowed(robots, '/checkout/cart'), false);
  assert.equal(pathAllowed(robots, '/index.php'), false);
  assert.equal(pathAllowed(robots, '/index.php5'), true);
});

test('vragen over voorraad worden herkend, andere niet', () => {
  assert.equal(isStockQuestion('Is deze stof op voorraad?'), true);
  assert.equal(isStockQuestion('Is this fabric in stock?'), true);
  assert.equal(isStockQuestion('Hoe snel heb ik de stof in huis?'), false);
});

test('een eerdere toets wordt hergebruikt als hij van dezelfde winkel is, vers genoeg, en elke vraag kent', () => {
  const toets = (site: string, checkedAt: string, ids: string[], version = SITE_CHECK_VERSION) => ({
    version, site, checkedAt, model: 'm', pages: [], namedBots: [], notes: [],
    answers: ids.map((questionId) => ({ questionId, status: 'not-found' as const })),
  });
  const nu = '2026-10-09T12:00:00Z';
  const goed = toets('https://www.winkel.nl', '2026-09-20T10:00:00Z', ['A', 'B', 'C']);

  assert.equal(sameSite('https://www.winkel.nl', 'winkel.nl/'), true);
  assert.equal(sameSite('https://www.winkel.nl', 'anderewinkel.nl'), false);

  assert.equal(reusableSiteCheck([goed], 'www.winkel.nl', ['A', 'B'], nu), goed);
  // Een vraag die er toen niet was, mag niet stil op "niet gevonden" uitkomen.
  assert.equal(reusableSiteCheck([goed], 'www.winkel.nl', ['A', 'D'], nu), undefined);
  // Te oud, een andere winkel, of gelezen met andere regels.
  assert.equal(reusableSiteCheck([toets('https://www.winkel.nl', '2026-08-01T10:00:00Z', ['A'])], 'winkel.nl', ['A'], nu), undefined);
  assert.equal(reusableSiteCheck([goed], 'anderewinkel.nl', ['A'], nu), undefined);
  assert.equal(reusableSiteCheck([toets('https://www.winkel.nl', '2026-10-01T10:00:00Z', ['A'], 'oud')], 'winkel.nl', ['A'], nu), undefined);
  // De meest recente van de bruikbare.
  const nieuwer = toets('https://winkel.nl', '2026-10-05T10:00:00Z', ['A', 'B']);
  assert.equal(reusableSiteCheck([goed, nieuwer], 'winkel.nl', ['A'], nu), nieuwer);
});
