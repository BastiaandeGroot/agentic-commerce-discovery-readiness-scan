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
import {
  adviceKey, advisoryItems, mergedGaps, scoreRows, topBlockers, unansweredQuestions,
  type AdviceKey, type Average,
} from '../src/report/derive';

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
};

/**
 * De lichte tokens uit de stylesheet van de pagina.
 *
 * Uit de regel voor `:root` en niet uit de berekende stijl: staat de merchant in
 * de donkere stand, dan zou het document anders donkere kleuren op wit papier
 * krijgen. Lukt het lezen van de stylesheet niet, dan de berekende stijl.
 */
export function lightPalette(): PdfPalette {
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
    Object.entries(TOKENS).map(([name, token]) => [name, read(token)]),
  ) as unknown as PdfPalette;
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

  private lines(text: string, size: number, width: number): string[] {
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
 * Het rapport als pdf-document.
 *
 * Dezelfde volgorde als het scherm. Wat op het scherm achter een keuzelijst of
 * een uitklapper zit, staat hier voluit: een bestand kun je niet aanklikken.
 * De productverkenner staat er niet in; dat is een zoekscherm, geen verslag.
 */
export function buildReportPdf(report: ScanReport, s: Strings, locale: Locale, palette: PdfPalette): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = new Writer(doc, palette);
  const tag = locale === 'nl' ? 'nl-NL' : 'en-GB';
  const n = (value: number) => value.toLocaleString(tag);
  const one = (value: number) => value.toLocaleString(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const average = (value: Average) => `${one(value.answered)} ${s.report.scoreOf} ${one(value.total)}`;

  // Kop
  w.text(s.report.heading, { size: 20, bold: true, after: 1 });
  w.text(
    `${s.report.pdfCatalog}: ${report.sources.catalog.filename} · ${s.report.scannedAt}: ${new Date(report.stamp.scannedAt).toLocaleString(tag)}`,
    { size: 9, color: 'muted', after: 4 },
  );

  // Voorbehouden bovenaan, zoals op het scherm.
  const unfrozen = report.stamp.banks.filter((bank) => bank.status !== 'frozen');
  if (unfrozen.length > 0) {
    const provisional = unfrozen.some((bank) => bank.status === 'provisional');
    w.notice(
      `${s.report.bankHeading}: ${unfrozen.map((bank) => bank.label[locale]).join(', ')}`,
      [provisional ? s.report.bankProvisional : s.report.bankInReview],
    );
  }
  if (report.stamp.blindAttributes.length > 0) {
    w.notice(
      `${s.report.blindHeading}: ${report.stamp.blindAttributes.length} ${s.report.blindCount}`,
      [s.report.blindBody, report.stamp.blindAttributes.slice(0, 24).map((attribute) => attribute.key).join(', ')],
    );
  }

  // De trechter
  const { funnel } = report;
  const hasCritical = report.questionCoverage.some((row) => row.scored && row.importance === 'critical');
  w.heading(s.report.funnelHeading);
  const steps: { value: number; label: string; explain?: string }[] = [
    { value: funnel.total, label: s.report.total },
    { value: funnel.qualified, label: s.report.qualified, explain: hasCritical ? s.report.qualifiedExplain : s.report.qualifiedNoCritical },
    { value: funnel.findable, label: s.report.findable, explain: s.report.findableExplain },
  ];
  for (const step of steps) {
    w.text(`${n(step.value)} ${step.label}`, { size: 11, bold: true, after: 0.5 });
    w.bar(step.value, funnel.total, 'ok');
    if (step.explain) w.text(step.explain, { size: 8.5, color: 'muted', after: 2 });
  }
  const status = funnel.avgApplicable <= 0 ? 'early'
    : funnel.avgAnswered >= funnel.avgApplicable ? 'complete'
      : funnel.avgAnswered / funnel.avgApplicable >= 0.5 ? 'partial' : 'early';
  const statusColor = status === 'complete' ? 'ok' : status === 'partial' ? 'warn' : 'danger';
  w.text(s.report.status[status], { size: 10, bold: true, color: statusColor, after: 0.5 });
  w.text(
    `${one(funnel.avgAnswered)} ${s.report.statusScale} ${n(Math.round(funnel.avgApplicable))} ${s.report.statusAnswered} · ${s.report.avgPointsLine} ${one(funnel.avgEarned)} ${s.report.statusScale} ${n(Math.round(funnel.avgWeight))} ${s.report.points}`,
    { size: 9, color: 'muted', after: 1 },
  );
  w.text(s.report.statusExplain[status], { size: 9, after: 2 });

  // Waar begin je?
  const start = topBlockers(report, locale);
  if (start.top.length > 0) {
    w.heading(s.report.startHeading, s.report.startIntro);
    let sentence = funnel.findable === 0 ? s.report.startNoneFindable : `${n(funnel.findable)} ${s.report.startSomeFindable}`;
    if (start.nearest) {
      sentence += ` ${s.report.startNearest} ${n(start.nearest.products)} ${s.report.startNearestProducts} ${start.nearest.open} ${s.report.startNearestQuestions}`;
    }
    w.text(sentence, { after: 2 });
    w.text(s.report.startBlockersHeading, { size: 9, bold: true, color: 'muted', after: 0.5 });
    for (const entry of start.top) {
      const detail = entry.empty > 0
        ? `${n(entry.open)} ${s.report.startBlockerOpen}, ${n(entry.empty)} ${s.report.startBlockerPim}`
        : `${n(entry.open)} ${s.report.startBlockerOpen}, ${s.report.startBlockerNowhere}`;
      w.text(`• ${entry.label}`, { size: 10, bold: true, after: 0 });
      w.text(detail, { size: 9, color: 'muted', indent: 3, after: 1 });
    }
    w.text(s.report.startWinHeading, { size: 9, bold: true, color: 'muted', after: 0.5 });
    w.text(
      start.wouldBecome > 0
        ? `${s.report.startWinBody} ${n(start.wouldBecome)} ${s.report.startWinProducts}`
        : s.report.startWinNone,
      { after: 2 },
    );
  }

  // Waar sta je per categorie
  if (report.categories.length > 0) {
    w.heading(s.report.scoreHeading, s.report.scoreIntro);
    w.table(
      [
        { label: s.report.filterCategory, width: 0.28 },
        { label: s.report.gapAffected, width: 0.12, align: 'right' },
        { label: s.report.scoreCritical, width: 0.2, align: 'right' },
        { label: s.report.scoreGeneral, width: 0.2, align: 'right' },
        { label: s.report.scoreAll, width: 0.2, align: 'right' },
      ],
      scoreRows(report, s.report.scoreAllCategories).map((row) => [
        row.sub ? `   ${row.label}` : row.label,
        n(row.total),
        average(row.critical),
        average(row.general),
        average(row.all),
      ]),
    );
    for (const goal of [s.report.scoreCriticalGoal, s.report.scoreGeneralGoal, s.report.scoreAllGoal]) {
      w.text(goal, { size: 8.5, color: 'muted', after: 0.8 });
    }
  }

  if (report.unmatchedCount > 0) {
    w.notice(`${n(report.unmatchedCount)} ${s.report.unmatched}`, [s.report.unmatchedExplain]);
  }

  // Welke vragen blijven onbeantwoord
  const categoryName = new Map(report.categories.map((row) => [row.setId, row.category]));
  const open = unansweredQuestions(report);
  w.heading(s.report.questionsHeading, `${s.report.questionsIntro} ${s.report.pdfAllUnanswered}`);
  if (open.length === 0) {
    w.text(s.report.allAnswered, { color: 'muted' });
  } else {
    w.table(
      [
        { label: s.report.pdfQuestion, width: 0.4 },
        { label: s.report.filterCategory, width: 0.16 },
        { label: s.report.pdfAnswered, width: 0.12, align: 'right' },
        { label: s.report.pdfStuck, width: 0.17 },
        { label: s.report.pdfAction, width: 0.15 },
      ],
      open.map((row) => {
        const stuck = [
          row.empty > 0 ? `${n(row.empty)} ${s.report.enrichable}` : '',
          row.unusable > 0 ? `${n(row.unusable)} ${s.report.states.unusable.toLowerCase()}` : '',
          row.incomplete > 0 ? `${n(row.incomplete)} ${s.report.states.incomplete.toLowerCase()}` : '',
          row.absent > 0 ? `${n(row.absent)} ${s.report.neither}` : '',
        ].filter(Boolean).join(', ');
        const critical = row.importance === 'critical' ? `${s.questions.importance.critical} · ` : '';
        return [
          `${critical}${row.label[locale]}`,
          categoryName.get(row.setId) ?? row.setId,
          `${n(row.answered)}/${n(row.applicable)}`,
          stuck,
          s.report.pdfActions[adviceKey(row)],
        ];
      }),
    );
    w.text(s.report.pdfActionsLegend, { size: 9, bold: true, color: 'muted', after: 0.5 });
    const keys: AdviceKey[] = ['qNextUnlinked', 'qNextEmpty', 'qNextAbsent', 'qNextWeak'];
    for (const key of keys) {
      w.text(`${s.report.pdfActions[key]}: ${s.report[key]}`, { size: 8.5, color: 'muted', after: 0.8 });
    }
  }

  // Waar komt elk gat vandaan
  const gaps = mergedGaps(report);
  if (gaps.length > 0) {
    w.heading(s.report.gapsHeading, s.report.gapsIntro);
    w.text(s.report.gapsWhy, { size: 8.5, color: 'muted', after: 2 });
    w.table(
      [
        { label: s.report.gapField, width: 0.34 },
        { label: s.report.gapQuestions, width: 0.1, align: 'right' },
        { label: s.report.gapCause, width: 0.42 },
        { label: s.report.gapAffected, width: 0.14, align: 'right' },
      ],
      gaps.map((gap) => [
        gap.label[locale],
        n(gap.questions.length),
        `${s.report.causes[gap.cause]}: ${s.report.causeMeaning[gap.cause]} · ${s.report.causeEffort[gap.cause]}`,
        n(gap.affected),
      ]),
    );
  }

  // Buiten de score
  const advisory = advisoryItems(report, locale);
  if (advisory.length > 0) {
    w.heading(s.report.advisoryHeading, s.report.advisoryIntro);
    for (const item of advisory) {
      w.text(`• ${item.label}`, { size: 9.5, after: 0 });
      w.text(`${s.questions.importance[item.importance] ?? item.importance} · ${item.categories.join(', ')}`, {
        size: 8.5, color: 'muted', indent: 3, after: 1,
      });
    }
  }

  // Versiestempel
  w.heading(s.report.stampHeading, s.report.stampExplain);
  const stamp: [string, string][] = [
    [s.report.scanVersion, `v${report.stamp.scanVersion}`],
    [s.report.specSnapshot, report.stamp.fieldRegister],
    [s.report.bankVersion, report.stamp.banks.length === 0 ? '—'
      : report.stamp.banks.map((bank) => `${bank.label[locale]} ${bank.version}`).join(', ')],
    [s.report.questionVersion, `v${report.stamp.questionSetVersion}`],
    [s.report.scannedAt, new Date(report.stamp.scannedAt).toLocaleString(tag)],
  ];
  for (const [label, value] of stamp) w.text(`${label}: ${value}`, { size: 9, after: 0.6 });
  w.y += 3;
  w.text(s.report.disclaimer, { size: 8.5, color: 'muted' });

  // Paginanummers, als laatste: pas nu is het aantal bekend.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(palette.muted);
    doc.text(pdfText(report.sources.catalog.filename), PAGE.margin, PAGE.height - 10);
    doc.text(
      pdfText(s.report.pdfPage.replace('{n}', String(page)).replace('{totaal}', String(pages))),
      PAGE.width - PAGE.margin,
      PAGE.height - 10,
      { align: 'right' },
    );
  }
  return doc;
}

/** De bestandsnaam: de catalogus en de scandatum, zonder tekens die een bestandssysteem weigert. */
export function pdfFilename(report: ScanReport): string {
  const base = report.sources.catalog.filename.replace(/\.[a-z0-9]+$/i, '');
  const safe = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `rapport-${safe || 'catalogus'}-${report.stamp.scannedAt.slice(0, 10)}.pdf`;
}

/** Het rapport opbouwen en als bestand downloaden. */
export async function saveReportPdf(report: ScanReport, s: Strings, locale: Locale): Promise<void> {
  const doc = buildReportPdf(report, s, locale, lightPalette());
  doc.save(pdfFilename(report));
}
