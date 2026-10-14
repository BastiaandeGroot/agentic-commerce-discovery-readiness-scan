// Het rapport als pdf-bestand.
//
// Opgebouwd uit de gegevens van het rapport en niet uit een afdruk van het
// scherm: de tekst is doorzoekbaar, tabellen breken tussen rijen en niet midden
// in een regel af, en het bestand blijft klein. Wat erin staat komt uit dezelfde
// afleidingen als het scherm (`src/report/derive.ts`), zodat het bestand dat de
// merchant bewaart hetzelfde zegt als wat hij zag.
//
// Alles gebeurt in de browser. Er gaat niets de deur uit: de pdf wordt hier
// gemaakt en rechtstreeks gedownload.
//
// Twee delen. `buildReportPdf` maakt het document en raakt geen DOM, zodat het
// in een test te draaien is. `saveReportPdf` leest de kleuren uit de pagina en
// start de download.

import { jsPDF } from 'jspdf';
import type { Locale, ScanReport } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import type { SiteCheck } from '../src/collect/answers';
import type { SupportList } from '../src/questions/support';
import { readinessPlan, topActions } from '../src/report/actions';

/** De kleuren van het document, als hex. Uit de ontwerptokens, nooit hier verzonnen. */
export interface PdfPalette {
  text: string;
  muted: string;
  line: string;
  surface2: string;
  ok: string;
  warn: string;
  danger: string;
  warnSoft: string;
  accent: string;
}

/** Welk token welke kleur levert. Een pdf is papier, dus altijd de lichte stand. */
const TOKENS: Record<keyof PdfPalette, string> = {
  text: '--text',
  muted: '--muted',
  line: '--border',
  surface2: '--surface-2',
  ok: '--ok',
  warn: '--warn',
  danger: '--danger',
  warnSoft: '--warn-soft',
  accent: '--accent',
};

/**
 * De lichte tokens uit de stylesheet van de pagina.
 *
 * Uit de regel voor `:root` en niet uit de berekende stijl: staat de merchant in
 * de donkere stand, dan zou het document anders donkere kleuren op wit papier
 * krijgen. Lukt het lezen van de stylesheet niet, dan de berekende stijl.
 */
export function lightPalette(): PdfPalette {
  return readLightTokens(TOKENS) as unknown as PdfPalette;
}

/** De lichte waarde van elk token, op naam; zie `lightPalette`. */
export function readLightTokens(tokens: Record<string, string>): Record<string, string> {
  let root: CSSStyleDeclaration | undefined;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === ':root' && rule.style.getPropertyValue('--text')) {
        root = rule.style;
      }
    }
    if (root) break;
  }
  const computed = getComputedStyle(document.documentElement);
  const read = (token: string) => (root?.getPropertyValue(token) || computed.getPropertyValue(token)).trim();
  const palette = Object.fromEntries(
    Object.entries(tokens).map(([name, token]) => [name, read(token)]),
  );
  const missing = Object.entries(palette).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Kleurtokens ontbreken: ${missing.join(', ')}`);
  return palette;
}

// --- Tekst ------------------------------------------------------------------

/** Tekens die de standaardletter van een pdf kent naast Latin-1 (WinAnsi). */
const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

/**
 * Tekst die de standaardletter kan tonen.
 *
 * Een pdf zonder ingebedde letter kent alleen WinAnsi. Een vinkje of een pijl
 * zou als losse tekens verschijnen, dus die worden omgezet of weggelaten.
 */
export function pdfText(text: string): string {
  return text
    .replace(/✓\s?/g, '')
    .replace(/[→⟶]/g, '->')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[  ]/g, ' ')
    .replace(/./gu, (char) => {
      const code = char.codePointAt(0) ?? 0;
      return code <= 0xff || WINANSI_EXTRA.includes(char) ? char : '';
    });
}

// --- Opmaak -----------------------------------------------------------------

const PAGE = { width: 210, height: 297, margin: 18, top: 20, bottom: 282 };
const PT_TO_MM = 0.3528;

interface Column { label: string; width: number; align?: 'left' | 'right' }

interface Kpi { value: string; of: string; share: number; label: string }

class Writer {
  y = PAGE.top;
  readonly width = PAGE.width - PAGE.margin * 2;

  constructor(readonly doc: jsPDF, readonly palette: PdfPalette) {}

  private lineHeight(size: number) {
    return size * PT_TO_MM * 1.35;
  }

  ensure(height: number) {
    if (this.y + height > PAGE.bottom) {
      this.doc.addPage();
      this.y = PAGE.top;
    }
  }

  lines(text: string, size: number, width: number): string[] {
    this.doc.setFontSize(size);
    return this.doc.splitTextToSize(pdfText(text), width) as string[];
  }

  text(text: string, options: { size?: number; color?: keyof PdfPalette; bold?: boolean; after?: number; indent?: number } = {}) {
    const size = options.size ?? 10;
    const indent = options.indent ?? 0;
    this.doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    const lines = this.lines(text, size, this.width - indent);
    const height = this.lineHeight(size);
    this.doc.setTextColor(this.palette[options.color ?? 'text']);
    for (const line of lines) {
      this.ensure(height);
      this.doc.text(line, PAGE.margin + indent, this.y + height * 0.75);
      this.y += height;
    }
    this.y += options.after ?? 1.5;
  }

  heading(text: string, intro?: string) {
    this.ensure(18);
    this.y += 4;
    this.text(text, { size: 13, bold: true, after: 1 });
    if (intro) this.text(intro, { size: 9, color: 'muted', after: 3 });
  }

  bar(value: number, total: number, color: keyof PdfPalette) {
    this.ensure(4);
    const share = total > 0 ? Math.min(value / total, 1) : 0;
    this.doc.setFillColor(this.palette.surface2);
    this.doc.rect(PAGE.margin, this.y, this.width, 2, 'F');
    if (share > 0) {
      this.doc.setFillColor(this.palette[color]);
      this.doc.rect(PAGE.margin, this.y, this.width * share, 2, 'F');
    }
    this.y += 4;
  }

  /** Een blok met een zachte achtergrond, voor een voorbehoud dat bovenaan hoort. */
  notice(title: string, body: string[]) {
    const size = 9;
    const lines = body.flatMap((part) => this.lines(part, size, this.width - 8));
    const height = this.lineHeight(11) + lines.length * this.lineHeight(size) + 6;
    this.ensure(height);
    this.doc.setFillColor(this.palette.warnSoft);
    this.doc.rect(PAGE.margin, this.y, this.width, height, 'F');
    const start = this.y;
    this.y += 3;
    this.text(title, { size: 10, bold: true, color: 'warn', indent: 4, after: 0.5 });
    for (const part of body) this.text(part, { size, indent: 4, after: 0.5 });
    this.y = start + height + 3;
  }

  /** Een nieuwe pagina voor het volgende deel; het document is in delen opgebouwd. */
  page() {
    this.doc.addPage();
    this.y = PAGE.top;
  }

  /** Twee vlakken naast elkaar met een kop en tekst: de begrippen bovenaan. */
  boxes(items: { title: string; body: string[] }[]) {
    const gap = 4;
    const width = (this.width - gap * (items.length - 1)) / items.length;
    const size = 8.5;
    const prepared = items.map((item) => ({
      title: item.title,
      lines: item.body.filter(Boolean).flatMap((part) => this.lines(part, size, width - 6)),
    }));
    const height = Math.max(...prepared.map((item) => this.lineHeight(10) + item.lines.length * this.lineHeight(size))) + 7;
    this.ensure(height);
    prepared.forEach((item, index) => {
      const x = PAGE.margin + index * (width + gap);
      this.doc.setFillColor(this.palette.surface2);
      this.doc.roundedRect(x, this.y, width, height, 1.5, 1.5, 'F');
      let y = this.y + 3.5;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.doc.setTextColor(this.palette.text);
      this.doc.text(pdfText(item.title), x + 3, y + this.lineHeight(10) * 0.75);
      y += this.lineHeight(10) + 0.5;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(size);
      for (const line of item.lines) {
        this.doc.text(line, x + 3, y + this.lineHeight(size) * 0.75);
        y += this.lineHeight(size);
      }
    });
    this.y += height + 5;
  }

  /** De kerncijfers naast elkaar, elk met een balk. */
  kpis(items: Kpi[]) {
    const gap = 4;
    const width = (this.width - gap * (items.length - 1)) / items.length;
    const size = 8.5;
    const labels = items.map((item) => this.lines(item.label, size, width - 6));
    const height = 9 + 5 + Math.max(...labels.map((lines) => lines.length)) * this.lineHeight(size) + 6;
    this.ensure(height);
    items.forEach((item, index) => {
      const x = PAGE.margin + index * (width + gap);
      this.doc.setDrawColor(this.palette.line);
      this.doc.roundedRect(x, this.y, width, height, 1.5, 1.5, 'S');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(18);
      this.doc.setTextColor(this.palette.text);
      const big = pdfText(item.value);
      this.doc.text(big, x + 3, this.y + 9);
      const bigWidth = this.doc.getTextWidth(big);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(this.palette.muted);
      this.doc.text(pdfText(item.of), x + 4 + bigWidth, this.y + 9);
      this.doc.setFillColor(this.palette.surface2);
      this.doc.rect(x + 3, this.y + 11.5, width - 6, 1.6, 'F');
      this.doc.setFillColor(this.palette.accent);
      this.doc.rect(x + 3, this.y + 11.5, (width - 6) * Math.max(0, Math.min(item.share, 1)), 1.6, 'F');
      this.doc.setFontSize(size);
      this.doc.setTextColor(this.palette.text);
      labels[index].forEach((line, lineIndex) => {
        this.doc.text(line, x + 3, this.y + 16.5 + lineIndex * this.lineHeight(size));
      });
    });
    this.y += height + 4;
  }

  /** Eén actie: nummer, wat te doen, waarom, en rechts wat het oplevert. */
  action(index: number, item: { title: string; flag?: string; why: string; gain: string; gainLabel: string }) {
    const gainWidth = 34;
    const textWidth = this.width - 9 - gainWidth;
    const titleLines = this.lines(item.title, 10, textWidth);
    const whyLines = this.lines(item.why, 8.5, textWidth);
    const height = titleLines.length * this.lineHeight(10) + whyLines.length * this.lineHeight(8.5) + 5;
    this.ensure(height);
    this.doc.setDrawColor(this.palette.line);
    this.doc.line(PAGE.margin, this.y, PAGE.margin + this.width, this.y);
    const top = this.y + 2.5;
    this.doc.setFillColor(this.palette.accent);
    this.doc.circle(PAGE.margin + 3, top + 2.2, 2.6, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor('#ffffff');
    this.doc.text(String(index), PAGE.margin + 3, top + 3.3, { align: 'center' });
    let y = top;
    this.doc.setFontSize(10);
    this.doc.setTextColor(this.palette.text);
    titleLines.forEach((line, lineIndex) => {
      this.doc.text(line, PAGE.margin + 9, y + this.lineHeight(10) * 0.75);
      if (item.flag && lineIndex === titleLines.length - 1) {
        this.doc.setFontSize(8);
        this.doc.setTextColor(this.palette.danger);
        this.doc.text(pdfText(item.flag), PAGE.margin + 11 + this.doc.setFontSize(10).getTextWidth(line), y + this.lineHeight(10) * 0.75);
        this.doc.setFontSize(10);
        this.doc.setTextColor(this.palette.text);
      }
      y += this.lineHeight(10);
    });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(this.palette.muted);
    for (const line of whyLines) {
      this.doc.text(line, PAGE.margin + 9, y + this.lineHeight(8.5) * 0.75);
      y += this.lineHeight(8.5);
    }
    const right = PAGE.margin + this.width;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.palette.text);
    this.doc.text(pdfText(item.gain), right, top + 4, { align: 'right' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(this.palette.muted);
    this.doc.text(pdfText(item.gainLabel), right, top + 8, { align: 'right' });
    this.y += height;
  }

  /** De stempel en het paginanummer onderaan elke pagina. */
  footer(stamp: string) {
    const pages = this.doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      this.doc.setPage(page);
      this.doc.setDrawColor(this.palette.line);
      this.doc.line(PAGE.margin, PAGE.bottom + 4, PAGE.margin + this.width, PAGE.bottom + 4);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(this.palette.muted);
      this.doc.text(pdfText(stamp), PAGE.margin, PAGE.bottom + 8);
      this.doc.text(`${page}/${pages}`, PAGE.margin + this.width, PAGE.bottom + 8, { align: 'right' });
    }
  }

  /** Een tabel die tussen rijen afbreekt en de kop op elke pagina herhaalt. */
  table(columns: Column[], rows: string[][]) {
    const size = 8.5;
    const height = this.lineHeight(size);
    const widths = columns.map((column) => column.width * this.width);

    const header = () => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(this.palette.muted);
      const cells = columns.map((column, index) => this.lines(column.label, size, widths[index] - 2));
      const rowHeight = Math.max(...cells.map((cell) => cell.length)) * height + 2;
      this.ensure(rowHeight + height * 2);
      this.drawRow(columns, widths, cells, rowHeight, size);
      this.doc.setDrawColor(this.palette.line);
      this.doc.line(PAGE.margin, this.y, PAGE.margin + this.width, this.y);
      this.doc.setFont('helvetica', 'normal');
    };

    header();
    for (const row of rows) {
      this.doc.setFont('helvetica', 'normal');
      const cells = row.map((value, index) => this.lines(value, size, widths[index] - 2));
      const rowHeight = Math.max(...cells.map((cell) => cell.length)) * height + 2;
      if (this.y + rowHeight > PAGE.bottom) {
        this.doc.addPage();
        this.y = PAGE.top;
        header();
      }
      this.doc.setTextColor(this.palette.text);
      this.drawRow(columns, widths, cells, rowHeight, size);
      this.doc.setDrawColor(this.palette.line);
      this.doc.line(PAGE.margin, this.y, PAGE.margin + this.width, this.y);
    }
    this.y += 3;
  }

  private drawRow(columns: Column[], widths: number[], cells: string[][], rowHeight: number, size: number) {
    const height = this.lineHeight(size);
    let x = PAGE.margin;
    cells.forEach((cell, index) => {
      cell.forEach((line, lineIndex) => {
        const baseline = this.y + 1 + height * (lineIndex + 0.75);
        if (columns[index].align === 'right') {
          this.doc.text(line, x + widths[index] - 2, baseline, { align: 'right' });
        } else {
          this.doc.text(line, x, baseline);
        }
      });
      x += widths[index];
    });
    this.y += rowHeight;
  }
}

// --- Inhoud -----------------------------------------------------------------

/**
 * Het rapport als pdf-document: alleen bevindingen en wat eraan te doen is.
 *
 * Vier delen, elk op een eigen pagina: een samenvatting met de acties die het
 * meeste opleveren, de attributen, de categorieën en de website. Uitleg over de
 * meting, citaten van wat al goed staat en de versiestempel staan er niet in;
 * de stempel is één regel onderaan. Lijsten worden nooit ingekort. Wat erin
 * staat komt uit `src/report/actions.ts`.
 */
export function buildReportPdf(report: ScanReport, s: Strings, locale: Locale, palette: PdfPalette, siteCheck?: SiteCheck, support?: SupportList): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = new Writer(doc, palette);
  const tag = locale === 'nl' ? 'nl-NL' : 'en-GB';
  const n = (value: number) => Math.round(value).toLocaleString(tag);
  const one = (value: number) => value.toLocaleString(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const r = s.report;
  const plan = readinessPlan(report, locale, siteCheck, support);
  const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const short = (value: string) => (value.length > 40 ? `${value.slice(0, 38)}…` : value);

  /** Wat erin hoort: het soort waarde, wat er bij hem staat, en hoe een andere winkel het invult. */
  const expectation = (kind: string | undefined, unit: string | undefined, own: string[], examples: { value: string; url: string }[]) => [
    kind ? `${r.expectKinds[kind] ?? kind}${unit ? ` (${unit})` : ''}` : '',
    own.length > 0 ? r.planOwn.replace('{waarden}', own.slice(0, 3).map(short).join(' · ')) : '',
    ...examples.slice(0, 1).map((example) => r.planExampleFrom.replace('{waarde}', short(example.value)).replace('{site}', host(example.url))),
  ].filter(Boolean).join('\n');

  // --- 1. Samenvatting -------------------------------------------------------
  w.text(r.planKicker, { size: 8.5, bold: true, color: 'accent', after: 0.5 });
  w.text(report.sources.catalog.filename.split(/[\\/]/).pop()!.replace(/\.[a-z0-9]+$/i, ''), { size: 18, bold: true, after: 1 });
  const sub = r.planSub
    .replace('{datum}', new Date(report.stamp.scannedAt).toLocaleDateString(tag, { dateStyle: 'long' }))
    .replace('{producten}', n(plan.total));
  w.text(plan.site ? `${sub} · ${host(plan.site.site)}` : sub, { size: 9, color: 'muted', after: 4 });

  w.boxes([
    { title: r.planCriticalTitle, body: [r.planCriticalBody, plan.exampleCritical ? r.planExample.replace('{vraag}', plan.exampleCritical) : ''] },
    { title: r.planOtherTitle, body: [r.planOtherBody, plan.exampleOther ? r.planExample.replace('{vraag}', plan.exampleOther) : ''] },
  ]);

  const kpis: Kpi[] = [
    { value: n(plan.qualified), of: `${r.planOf} ${n(plan.total)}`, share: plan.total > 0 ? plan.qualified / plan.total : 0, label: r.planKpiQualified },
    {
      value: n(plan.avgAnswered), of: `${r.planOf} ${n(plan.avgApplicable)}`,
      share: plan.avgApplicable > 0 ? plan.avgAnswered / plan.avgApplicable : 0,
      label: `${r.planKpiAnswered} ${plan.complete > 0 ? r.planKpiComplete.replace('{aantal}', n(plan.complete)) : r.planKpiNoneComplete}`,
    },
  ];
  if (plan.site && plan.site.checked > 0) {
    kpis.push({ value: n(plan.site.answered), of: `${r.planOf} ${n(plan.site.checked)}`, share: plan.site.answered / plan.site.checked, label: r.planKpiSite });
  }
  w.kpis(kpis);

  const actions = topActions(plan);
  if (actions.length > 0) {
    w.heading(r.planTopHeading);
    actions.forEach((action, index) => {
      if (action.kind === 'fill') {
        const row = action.row;
        w.action(index + 1, {
          title: r.planFillTitle.replace('{kolom}', row.columns.join(` ${r.planAnd} `)),
          flag: row.critical ? r.planCritical : undefined,
          why: r.planFillWhy.replace('{aantal}', n(row.empty)).replace('{vraag}', row.questions[0] ?? ''),
          gain: row.gain > 0 ? `+${n(row.gain)}` : n(row.empty),
          gainLabel: row.gain > 0 ? r.planGainQualified : r.planGainProducts,
        });
      } else if (action.kind === 'add') {
        const row = action.row;
        w.action(index + 1, {
          title: r.planAddTitle.replace('{kenmerk}', row.label),
          flag: row.critical ? r.planCritical : undefined,
          why: r.planAddWhy.replace('{vraag}', row.questions[0] ?? ''),
          gain: `+${n(row.gain)}`,
          gainLabel: r.planGainQualified,
        });
      } else {
        w.action(index + 1, {
          title: action.groups.length > 0
            ? r.planSiteTitle.replace('{themas}', action.groups.map((group) => group.name.toLowerCase()).join(', '))
            : r.planSiteTitleBank.replace('{aantal}', n(action.questions)),
          why: r.planSiteWhy.replace('{aantal}', n(action.questions)),
          gain: action.mails > 0 ? n(action.mails) : n(action.questions),
          gainLabel: action.mails > 0 ? r.planGainMails : r.planGainQuestions,
        });
      }
    });
  }

  // --- 2. Attributen ----------------------------------------------------------
  w.page();
  w.heading(r.planFillHeading, r.planFillIntro);
  if (plan.fill.length === 0) {
    w.text(r.planNothingFill, { size: 9, color: 'muted' });
  } else {
    w.table(
      [
        { label: r.planColColumn, width: 0.2 },
        { label: r.planColExpect, width: 0.34 },
        { label: r.planColEmpty, width: 0.1, align: 'right' },
        { label: r.planColQuestion, width: 0.36 },
      ],
      plan.fill.map((row) => [
        `${row.columns.join('\n')}${row.critical ? `\n${r.planCritical}` : ''}`,
        expectation(row.expect?.kind, row.expect?.unit, row.own, row.examples),
        n(row.empty),
        row.questions.join('\n'),
      ]),
    );
  }

  if (plan.add.length > 0 || plan.addLater.length > 0) {
    w.heading(r.planAddHeading, r.planAddIntro);
    if (plan.add.length > 0) {
      w.table(
        [
          { label: r.planColAttribute, width: 0.24 },
          { label: r.planColExpect, width: 0.3 },
          { label: r.planColProducts, width: 0.1, align: 'right' },
          { label: r.planColQuestion, width: 0.36 },
        ],
        plan.add.map((row) => [
          `${row.label}${row.critical ? `\n${r.planCritical}` : ''}`,
          expectation(row.expect?.kind, row.expect?.unit, [], row.examples),
          n(row.products),
          row.questions.join('\n'),
        ]),
      );
    }
    if (plan.addLater.length > 0) {
      w.text(`${r.planAddLater} ${plan.addLater.map((row) => row.label).join(' · ')}`, { size: 8.5, color: 'muted', after: 2 });
    }
  }

  // --- 3. Per categorie -------------------------------------------------------
  if (plan.categories.length > 0) {
    w.page();
    w.heading(r.planCategoryHeading);
    w.table(
      [
        { label: r.planColCategory, width: 0.3 },
        { label: r.planColProducts, width: 0.11, align: 'right' },
        { label: r.planColQualified, width: 0.15, align: 'right' },
        { label: r.planColAnswered, width: 0.16, align: 'right' },
        { label: r.planColFirst, width: 0.28 },
      ],
      plan.categories.map((row) => [
        row.label,
        n(row.total),
        `${row.total > 0 ? Math.round((row.qualified / row.total) * 100) : 0}%`,
        `${one(row.answered)} / ${one(row.applicable)}`,
        row.first ? (row.first.cause === 'unfilled' ? r.planFirstFill : r.planFirstAdd).replace('{kenmerk}', row.first.label) : '',
      ]),
    );
    w.text(r.planCategoryNote, { size: 8.5, color: 'muted' });
  }

  // --- 4. Website -------------------------------------------------------------
  w.page();
  w.heading(r.planSiteHeading, plan.site
    ? r.planSiteIntro.replace('{site}', host(plan.site.site)).replace('{paginas}', n(plan.site.pages))
    : undefined);
  if (!plan.site) {
    w.text(r.planNoSite, { size: 9, color: 'muted' });
  } else {
    const status = (value: 'not-found' | 'partial') => (value === 'not-found' ? r.planNotFound : r.planPartial);
    if (plan.siteSupport.length > 0) {
      w.text(r.planSiteSupport, { size: 10, bold: true, after: 0.5 });
      w.table(
        [
          { label: r.pdfQuestion, width: 0.64 },
          { label: r.planColSite, width: 0.2 },
          { label: r.planColMails, width: 0.16, align: 'right' },
        ],
        plan.siteSupport.map((line) => [line.label, status(line.status), line.mails === undefined ? '' : `${n(line.mails)}${line.group ? '*' : ''}`]),
      );
      if (plan.siteSupport.some((line) => line.group && line.mails !== undefined)) w.text(r.planMailsGroup, { size: 8, color: 'muted', after: 3 });
    }
    if (plan.siteBank.length > 0) {
      w.text(r.planSiteBank, { size: 10, bold: true, after: 0.5 });
      w.table(
        [
          { label: r.pdfQuestion, width: 0.8 },
          { label: r.planColSite, width: 0.2 },
        ],
        plan.siteBank.map((line) => [line.label, status(line.status)]),
      );
    }
    w.text(r.planSiteAnswered.replace('{aantal}', n(plan.site.answered)), { size: 8.5, color: 'muted' });
  }

  // --- Voettekst: de stempel in één regel, en de paginanummers -------------------
  const stamp = [
    plan.banks.length > 0
      ? r.planFooterBank.replace('{naam}', plan.banks.map((bank) => `${bank.label[locale]} ${bank.version}${bank.status !== 'frozen' ? ` (${s.bank.status[bank.status as keyof typeof s.bank.status] ?? bank.status})` : ''}`).join(', '))
      : '',
    `scan v${report.stamp.scanVersion}`,
    plan.unmatched > 0 ? (plan.unmatched === 1 ? r.planFooterUnmatchedOne : r.planFooterUnmatched.replace('{aantal}', n(plan.unmatched))) : '',
  ].filter(Boolean).join(' · ');
  w.footer(stamp);

  return doc;
}

export function pdfFilename(report: ScanReport): string {
  const base = report.sources.catalog.filename.replace(/\.[a-z0-9]+$/i, '');
  const safe = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `rapport-${safe || 'catalogus'}-${report.stamp.scannedAt.slice(0, 10)}.pdf`;
}

/** Het rapport opbouwen en als bestand downloaden. */
export async function saveReportPdf(report: ScanReport, s: Strings, locale: Locale, siteCheck?: SiteCheck, support?: SupportList): Promise<void> {
  const doc = buildReportPdf(report, s, locale, lightPalette(), siteCheck, support);
  doc.save(pdfFilename(report));
}
