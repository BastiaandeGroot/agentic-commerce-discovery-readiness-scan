// Per product wat er moet gebeuren, als werkbladen voor Excel of Numbers.
//
// De pdf is de samenvatting; dit is de volledige lijst. Drie werkbladen:
//
//   1. Overzicht — per attribuut wat er moet gebeuren en bij hoeveel producten.
//   2. Per product — één regel per product, één kolom per attribuut.
//   3. Takenlijst — één regel per taak, om te filteren of werk te verdelen.
//
// Een taak is één attribuut bij één product. Heeft de catalogus een kolom voor
// dat attribuut, dan is het invullen; anders toevoegen. Binnen een attribuut
// volstaat één van zijn kolommen, dus drie kandidaatkolommen zijn één taak.
//
// Alleen na een verse scan: een bewaarde analyse draagt geen productsleutels of
// titels. Het bestand wordt in de browser gemaakt en gaat nergens heen.
//
// Puur: rapport en teksten komen binnen als argument.

import type { Locale, ScanReport } from '../domain/types';
import type { Strings } from '../i18n/strings';
import type { ReadinessPlan } from './actions';
import type { Cell, Sheet } from './xlsx';

type Kind = 'fill' | 'add';

interface Task {
  kind: Kind;
  name: string;
  critical: boolean;
  questions: string[];
}

interface ProductTasks {
  key: string;
  title: string;
  category: string;
  qualified: boolean;
  answered: number;
  total: number;
  tasks: Task[];
  /** De attributen waar een vraag van dit product op leunt: daar hoort een ✓ als er niets te doen is. */
  relevant: Set<string>;
}

const taskKey = (kind: Kind, name: string) => `${kind}|${name}`;

/** Of er een productlijst is om te exporteren: na een verse scan wel, uit een bewaarde analyse niet. */
export function canExportProducts(report: ScanReport): boolean {
  return report.products.some((product) => !product.key.startsWith('#'));
}

function productTasks(report: ScanReport, plan: ReadinessPlan, locale: Locale): ProductTasks[] {
  const columnOf = new Map<string, string>();
  for (const row of plan.fill) row.fields.forEach((field, index) => columnOf.set(field, row.columns[index]));

  return report.products
    .filter((product) => !product.unmatched && !product.facetOnly)
    .map((product) => {
      const tasks = new Map<string, Task>();
      const relevant = new Set<string>();
      let answered = 0;
      let total = 0;
      for (const question of product.questions) {
        if (!question.scored) continue;
        total += 1;
        const missing = new Set(question.missing);
        for (const hint of question.evidence ?? []) {
          const columns = [...new Set(hint.fields.flatMap((field) => columnOf.get(field) ?? []))];
          const name = columns.length > 0 ? columns.join(' / ') : hint.label[locale];
          const kind: Kind = columns.length > 0 ? 'fill' : 'add';
          relevant.add(taskKey(kind, name));
          if (question.answered || !hint.fields.some((field) => missing.has(field))) continue;
          const held = tasks.get(taskKey(kind, name)) ?? { kind, name, critical: false, questions: [] };
          if (question.importance === 'critical') held.critical = true;
          if (!held.questions.includes(question.label[locale])) held.questions.push(question.label[locale]);
          tasks.set(taskKey(kind, name), held);
        }
        if (question.answered) answered += 1;
      }
      return {
        key: product.key,
        title: product.title ?? '',
        category: [product.category, product.subcategory].filter(Boolean).join(' › '),
        qualified: product.qualified,
        answered,
        total,
        tasks: [...tasks.values()].sort((a, b) => Number(b.critical) - Number(a.critical) || (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'fill' ? -1 : 1)),
        relevant,
      };
    })
    // Snelste winst eerst: wat het dichtst bij basisgeschikt is, dan wat het minste werk vraagt.
    .sort((a, b) => Number(a.qualified) - Number(b.qualified)
      || a.tasks.filter((task) => task.critical).length - b.tasks.filter((task) => task.critical).length
      || a.tasks.length - b.tasks.length
      || a.key.localeCompare(b.key));
}

export function productWorkbook(report: ScanReport, plan: ReadinessPlan, s: Strings, locale: Locale): Sheet[] {
  const x = s.report;
  const products = productTasks(report, plan, locale);
  const tag = locale === 'nl' ? 'nl-NL' : 'en-GB';

  // Wat erin hoort, per attribuut: uit dezelfde afleiding als de pdf.
  const expectOf = new Map<string, string>();
  const describe = (kind: string | undefined, unit: string | undefined, own: string[], example?: { value: string; url: string }) => [
    kind ? `${x.expectKinds[kind] ?? kind}${unit ? ` (${unit})` : ''}` : '',
    own.length > 0 ? x.planOwn.replace('{waarden}', own.slice(0, 3).join(' · ')) : '',
    example ? x.planExampleFrom.replace('{waarde}', example.value).replace('{site}', example.url) : '',
  ].filter(Boolean).join('\n');
  for (const row of plan.fill) expectOf.set(taskKey('fill', row.columns.join(' / ')), describe(row.expect?.kind, row.expect?.unit, row.own, row.examples[0]));
  for (const row of plan.fill) for (const column of row.columns) {
    if (!expectOf.has(taskKey('fill', column))) expectOf.set(taskKey('fill', column), describe(row.expect?.kind, row.expect?.unit, row.own, row.examples[0]));
  }
  for (const row of [...plan.add, ...plan.addLater]) expectOf.set(taskKey('add', row.label), describe(row.expect?.kind, row.expect?.unit, [], row.examples[0]));
  const expectFor = (task: { kind: Kind; name: string }) => expectOf.get(taskKey(task.kind, task.name))
    ?? expectOf.get(taskKey(task.kind, task.name.split(' / ')[0])) ?? '';

  // De attributen met werk: kritiek eerst, dan invullen, dan toevoegen, op aantal producten.
  const counts = new Map<string, { kind: Kind; name: string; critical: boolean; products: number; questions: Set<string> }>();
  for (const product of products) {
    for (const task of product.tasks) {
      const held = counts.get(taskKey(task.kind, task.name)) ?? { kind: task.kind, name: task.name, critical: false, products: 0, questions: new Set<string>() };
      held.products += 1;
      held.critical ||= task.critical;
      for (const question of task.questions) held.questions.add(question);
      counts.set(taskKey(task.kind, task.name), held);
    }
  }
  const attributes = [...counts.values()].sort((a, b) => Number(b.critical) - Number(a.critical)
    || (a.kind === b.kind ? 0 : a.kind === 'fill' ? -1 : 1)
    || b.products - a.products);

  const kindLabel = (kind: Kind) => (kind === 'fill' ? x.xlsxFill : x.xlsxAdd);
  const header = (labels: string[]): Cell[] => labels.map((label) => ({ value: label, style: 'header' }));
  const taskCount = products.reduce((sum, product) => sum + product.tasks.length, 0);
  const qualified = products.filter((product) => product.qualified).length;
  const n = (value: number) => value.toLocaleString(tag);

  // --- 1. Overzicht ------------------------------------------------------------
  const overview: Sheet = {
    name: x.xlsxSheetOverview,
    widths: [12, 34, 10, 12, 48, 60],
    freeze: { rows: 6, columns: 0 },
    filterRow: 6,
    rows: [
      [{ value: report.sources.catalog.filename.split(/[\\/]/).pop() ?? '', style: 'title' }],
      [{ value: x.planSub.replace('{datum}', new Date(report.stamp.scannedAt).toLocaleDateString(tag, { dateStyle: 'long' })).replace('{producten}', n(products.length)), style: 'note' }],
      [{ value: `${n(qualified)} ${x.planOf} ${n(products.length)} ${x.planGainQualified}`, style: 'title' }],
      [{ value: x.xlsxTaskTotal.replace('{taken}', n(taskCount)).replace('{attributen}', n(attributes.length)), style: 'title' }],
      [],
      header([x.xlsxColAction, x.planColAttribute, x.planCritical, x.planColProducts, x.planColExpect, x.planColQuestion]),
      ...attributes.map((attribute) => [
        { value: kindLabel(attribute.kind), style: attribute.kind },
        { value: attribute.name, style: 'bold' },
        attribute.critical ? { value: x.xlsxYes, style: 'critical' } : '',
        attribute.products,
        expectFor(attribute),
        [...attribute.questions].join('\n'),
      ] as (Cell | string | number)[]),
    ],
  };

  // --- 2. Per product ------------------------------------------------------------
  const fixed = [x.xlsxColKey, x.xlsxColTitle, x.planColCategory, x.planColQualified, x.xlsxColAnswered, x.xlsxColCriticalOpen, x.xlsxColTodo];
  const perProduct: Sheet = {
    name: x.xlsxSheetProducts,
    widths: [16, 36, 26, 12, 12, 10, 9, ...attributes.map(() => 13)],
    freeze: { rows: 1, columns: 2 },
    filterRow: 1,
    rows: [
      header([...fixed, ...attributes.map((attribute) => attribute.name)]),
      ...products.map((product) => {
        const byKey = new Map(product.tasks.map((task) => [taskKey(task.kind, task.name), task]));
        return [
          product.key,
          product.title,
          product.category,
          { value: product.qualified ? x.xlsxYes : x.xlsxNo, style: product.qualified ? 'ok' : 'critical' } as Cell,
          `${product.answered}/${product.total}`,
          product.tasks.filter((task) => task.critical).length,
          product.tasks.length,
          ...attributes.map((attribute): Cell | string => {
            const task = byKey.get(taskKey(attribute.kind, attribute.name));
            if (task) return { value: `${kindLabel(task.kind)}${task.critical ? ' !' : ''}`, style: task.critical ? 'critical' : task.kind };
            return product.relevant.has(taskKey(attribute.kind, attribute.name)) ? { value: '✓', style: 'ok' } : '';
          }),
        ];
      }),
    ],
  };

  // --- 3. Takenlijst ---------------------------------------------------------------
  const taskList: Sheet = {
    name: x.xlsxSheetTasks,
    widths: [16, 36, 26, 12, 30, 9, 44, 60],
    freeze: { rows: 1, columns: 0 },
    filterRow: 1,
    rows: [
      header([x.xlsxColKey, x.xlsxColTitle, x.planColCategory, x.xlsxColAction, x.planColAttribute, x.planCritical, x.planColExpect, x.planColQuestion]),
      ...products.flatMap((product) => product.tasks.map((task) => [
        product.key,
        product.title,
        product.category,
        { value: kindLabel(task.kind), style: task.kind },
        { value: task.name, style: 'bold' },
        task.critical ? { value: x.xlsxYes, style: 'critical' } : '',
        expectFor(task),
        task.questions.join('\n'),
      ] as (Cell | string | number)[])),
    ],
  };

  return [overview, perProduct, taskList];
}

export function productExportFilename(report: ScanReport): string {
  const base = (report.sources.catalog.filename.split(/[\\/]/).pop() ?? '').replace(/\.[a-z0-9]+$/i, '');
  const safe = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `per-product-${safe || 'catalogus'}-${report.stamp.scannedAt.slice(0, 10)}.xlsx`;
}
