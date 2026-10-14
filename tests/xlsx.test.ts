// Het Excel-bestand: geldige werkbladen, en per attribuut één taak.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildXlsx } from '../src/report/xlsx';

const PALETTE = { text: '#221f1a', muted: '#6a6156', headerFill: '#ebe3d4', ok: ['#3a7637', '#e8f0e2'], fill: ['#87610f', '#faefd8'], add: ['#a8451f', '#f9e6d9'], critical: ['#a11f2a', '#f9e6e6'] } as const;

test('een werkmap met werkbladen, vaste kopregel en filter', () => {
  const bytes = buildXlsx([
    { name: 'Per product', widths: [10, 20], freeze: { rows: 1, columns: 2 }, filterRow: 1,
      rows: [[{ value: 'SKU', style: 'header' }, { value: 'Titel', style: 'header' }], ['1-8-0113', 'Linnen & <effen> 140 cm'], ['2', 3]] },
    { name: 'Takenlijst: alles/ook dit', widths: [], rows: [['x']] },
  ], { ...PALETTE, ok: [...PALETTE.ok], fill: [...PALETTE.fill], add: [...PALETTE.add], critical: [...PALETTE.critical] });
  const files = unzipSync(bytes);
  const workbook = strFromU8(files['xl/workbook.xml']);
  assert.match(workbook, /name="Per product"/);
  assert.match(workbook, /name="Takenlijst  alles ook dit"/, 'tekens die een werkbladnaam niet mag dragen zijn weg');
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /Linnen &amp; &lt;effen&gt; 140 cm/);
  assert.match(sheet, /<v>3<\/v>/, 'een getal blijft een getal');
  assert.match(sheet, /state="frozen"/);
  assert.match(sheet, /<autoFilter ref="A1:B3"\/>/);
});
