// Een Excel-bestand (.xlsx) schrijven, zonder bibliotheek die de opmaak kent.
//
// Een .xlsx is een zip met een handvol XML-bestanden. Dit schrijft precies wat
// de export nodig heeft — meerdere werkbladen, een vaste kopregel, een filter,
// kolombreedtes en een paar celkleuren — en niets meer. Excel en Numbers openen
// het allebei.
//
// Puur: er komt een lijst werkbladen in en een reeks bytes uit. De browser
// maakt er een download van; de catalogus gaat nergens heen.

import { strToU8, zipSync } from 'fflate';

/** De opmaak van een cel. De kleuren komen uit `XlsxPalette`, nooit uit deze module. */
/** `title` en `note` lopen over de rij door in plaats van af te breken: koptekst boven een tabel. */
export type CellStyle = 'plain' | 'header' | 'bold' | 'ok' | 'fill' | 'add' | 'critical' | 'muted' | 'title' | 'note';

export interface Cell {
  value: string | number;
  style?: CellStyle;
}

export interface Sheet {
  name: string;
  /** Breedte per kolom, in tekens. */
  widths: number[];
  rows: (Cell | string | number)[][];
  /** Hoeveel rijen en kolommen bovenaan en links vast blijven staan. */
  freeze?: { rows: number; columns: number };
  /** Filter op de rij met de kolomkoppen (1 = de eerste rij). */
  filterRow?: number;
}

/** De kleuren als hex zonder #; tekst en vlak per soort. */
export interface XlsxPalette {
  text: string;
  muted: string;
  headerFill: string;
  ok: [string, string];
  fill: [string, string];
  add: [string, string];
  critical: [string, string];
}

const STYLES: CellStyle[] = ['plain', 'header', 'bold', 'ok', 'fill', 'add', 'critical', 'muted', 'title', 'note'];

const escape = (text: string) => text
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Tekens die XML niet toestaat, zoals stuurtekens uit een export.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function stylesXml(palette: XlsxPalette): string {
  const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
  const fonts = [
    `<font><sz val="11"/><color rgb="${argb(palette.text)}"/><name val="Calibri"/></font>`,
    `<font><b/><sz val="11"/><color rgb="${argb(palette.text)}"/><name val="Calibri"/></font>`,
    `<font><sz val="11"/><color rgb="${argb(palette.ok[0])}"/><name val="Calibri"/></font>`,
    `<font><sz val="11"/><color rgb="${argb(palette.fill[0])}"/><name val="Calibri"/></font>`,
    `<font><sz val="11"/><color rgb="${argb(palette.add[0])}"/><name val="Calibri"/></font>`,
    `<font><b/><sz val="11"/><color rgb="${argb(palette.critical[0])}"/><name val="Calibri"/></font>`,
    `<font><sz val="11"/><color rgb="${argb(palette.muted)}"/><name val="Calibri"/></font>`,
  ];
  const solid = (hex: string) => `<fill><patternFill patternType="solid"><fgColor rgb="${argb(hex)}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    solid(palette.headerFill), solid(palette.ok[1]), solid(palette.fill[1]), solid(palette.add[1]), solid(palette.critical[1]),
  ];
  // Volgorde gelijk aan STYLES: [font, fill].
  const xfs: [number, number, boolean][] = [
    [0, 0, true], [1, 2, true], [1, 0, true], [2, 3, true], [3, 4, true], [4, 5, true], [5, 6, true], [6, 0, true], [1, 0, false], [6, 0, false],
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<fonts count="${fonts.length}">${fonts.join('')}</fonts>`
    + `<fills count="${fills.length}">${fills.join('')}</fills>`
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${xfs.length}">${xfs.map(([font, fill, wrap]) => `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyFont="1" applyFill="${fill > 0 ? 1 : 0}" applyAlignment="1"><alignment vertical="top"${wrap ? ' wrapText="1"' : ''}/></xf>`).join('')}</cellXfs>`
    + '</styleSheet>';
}

function sheetXml(sheet: Sheet): string {
  const rows = sheet.rows.map((row, rowIndex) => {
    const cells = row.map((raw, columnIndex) => {
      const cell: Cell = typeof raw === 'object' ? raw : { value: raw };
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      const style = STYLES.indexOf(cell.style ?? 'plain');
      if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
        return `<c r="${ref}" s="${style}"><v>${cell.value}</v></c>`;
      }
      const text = String(cell.value ?? '');
      if (text === '') return style > 0 ? `<c r="${ref}" s="${style}"/>` : '';
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escape(text)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');

  const freeze = sheet.freeze && (sheet.freeze.rows > 0 || sheet.freeze.columns > 0)
    ? `<sheetViews><sheetView workbookViewId="0"><pane${sheet.freeze.columns > 0 ? ` xSplit="${sheet.freeze.columns}"` : ''}${sheet.freeze.rows > 0 ? ` ySplit="${sheet.freeze.rows}"` : ''} topLeftCell="${columnName(sheet.freeze.columns)}${sheet.freeze.rows + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
    : '';
  const width = Math.max(1, ...sheet.rows.map((row) => row.length));
  const filter = sheet.filterRow
    ? `<autoFilter ref="A${sheet.filterRow}:${columnName(width - 1)}${Math.max(sheet.rows.length, sheet.filterRow)}"/>`
    : '';
  const cols = sheet.widths.length > 0
    ? `<cols>${sheet.widths.map((w, index) => `<col min="${index + 1}" max="${index + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `${freeze}${cols}<sheetData>${rows}</sheetData>${filter}</worksheet>`;
}

/** Een werkbladnaam mag 31 tekens en geen []:*?/\ dragen. */
const sheetName = (name: string) => name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);

export function buildXlsx(sheets: Sheet[], palette: XlsxPalette): Uint8Array {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '</Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets>${sheets.map((sheet, index) => `<sheet name="${escape(sheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets>`
      + (sheets.some((sheet) => sheet.filterRow)
        ? `<definedNames>${sheets.map((sheet, index) => {
          if (!sheet.filterRow) return '';
          const width = Math.max(1, ...sheet.rows.map((row) => row.length));
          return `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">'${escape(sheetName(sheet.name))}'!$A$${sheet.filterRow}:$${columnName(width - 1)}$${Math.max(sheet.rows.length, sheet.filterRow)}</definedName>`;
        }).join('')}</definedNames>`
        : '')
      + '</workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + '</Relationships>'),
    'xl/styles.xml': strToU8(stylesXml(palette)),
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetXml(sheet));
  });
  return zipSync(files, { level: 6 });
}
