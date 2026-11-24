/**
 * A small .xlsx writer: inline strings, numbers with fixed formats, borders, fills, merges,
 * column widths and A4 landscape print setup. Enough for a report that opens cleanly in Excel,
 * LibreOffice, Google Sheets and phone viewers.
 */
import { strToU8, zipSync } from 'fflate';

export type StyleKey =
  | 'plain'
  | 'title'
  | 'sub'
  | 'label'
  | 'bold'
  | 'head'
  | 'cell'
  | 'cellBold'
  | 'note'
  | 'sign'
  | `n${0 | 1 | 2 | 3 | 4 | 5}`
  | `b${0 | 1 | 2 | 3 | 4 | 5}`
  | `t${0 | 1 | 2 | 3 | 4 | 5}`
  | `v${0 | 1 | 2 | 3 | 4 | 5}`;

export interface Cell {
  v: string | number | null;
  s?: StyleKey;
}

export interface SheetSpec {
  name: string;
  /** Column widths in characters. */
  cols: number[];
  rows: (Cell | null | undefined)[][];
  /** e.g. 'A1:D1' */
  merges?: string[];
  /** Row heights in points, by 0-based row index. */
  heights?: Record<number, number>;
}

// fonts: 0 normal, 1 bold, 2 title, 3 small grey, 4 sub (bold 11)
const FONTS = [
  '<font><sz val="10"/><name val="Arial"/></font>',
  '<font><b/><sz val="10"/><name val="Arial"/></font>',
  '<font><b/><sz val="14"/><name val="Arial"/></font>',
  '<font><sz val="8.5"/><color rgb="FF555555"/><name val="Arial"/></font>',
  '<font><b/><sz val="11"/><name val="Arial"/></font>',
];
// fills: 0 none, 1 gray125 (required), 2 header grey, 3 total blue
const FILLS = [
  '<fill><patternFill patternType="none"/></fill>',
  '<fill><patternFill patternType="gray125"/></fill>',
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE7EBEE"/><bgColor indexed="64"/></patternFill></fill>',
  '<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF2"/><bgColor indexed="64"/></patternFill></fill>',
];
// borders: 0 none, 1 thin all, 2 bottom thin (signature line)
const BORDERS = [
  '<border><left/><right/><top/><bottom/><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF8C99A1"/></left><right style="thin"><color rgb="FF8C99A1"/></right><top style="thin"><color rgb="FF8C99A1"/></top><bottom style="thin"><color rgb="FF8C99A1"/></bottom><diagonal/></border>',
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FF333333"/></bottom><diagonal/></border>',
];
// number formats by decimals: 0 → builtin 1, 2 → builtin 2, others custom
const FMT: Record<number, number> = { 0: 1, 1: 164, 2: 2, 3: 165, 4: 166, 5: 167 };
const CUSTOM_FMTS =
  '<numFmts count="4"><numFmt numFmtId="164" formatCode="0.0"/><numFmt numFmtId="165" formatCode="0.000"/>' +
  '<numFmt numFmtId="166" formatCode="0.0000"/><numFmt numFmtId="167" formatCode="0.00000"/></numFmts>';

interface Xf {
  font: number;
  fill: number;
  border: number;
  fmt: number;
  h?: 'left' | 'center' | 'right';
  v?: 'center' | 'top' | 'bottom';
  wrap?: boolean;
}

const XFS: [StyleKey, Xf][] = [
  ['plain', { font: 0, fill: 0, border: 0, fmt: 0 }],
  ['title', { font: 2, fill: 0, border: 0, fmt: 0, v: 'center' }],
  ['sub', { font: 4, fill: 0, border: 0, fmt: 0, v: 'center' }],
  ['label', { font: 0, fill: 0, border: 0, fmt: 0, v: 'center' }],
  ['bold', { font: 1, fill: 0, border: 0, fmt: 0, v: 'center' }],
  ['head', { font: 1, fill: 2, border: 1, fmt: 0, h: 'center', v: 'center', wrap: true }],
  ['cell', { font: 0, fill: 0, border: 1, fmt: 0, h: 'center', v: 'center' }],
  ['cellBold', { font: 1, fill: 3, border: 1, fmt: 0, h: 'center', v: 'center' }],
  ['note', { font: 3, fill: 0, border: 0, fmt: 0, v: 'top', wrap: true }],
  ['sign', { font: 0, fill: 0, border: 2, fmt: 0, v: 'bottom' }],
];
for (const d of [0, 1, 2, 3, 4, 5] as const) {
  XFS.push([`n${d}`, { font: 0, fill: 0, border: 1, fmt: FMT[d], h: 'right', v: 'center' }]); // bordered number
  XFS.push([`b${d}`, { font: 1, fill: 3, border: 1, fmt: FMT[d], h: 'right', v: 'center' }]); // total
  XFS.push([`t${d}`, { font: 1, fill: 0, border: 0, fmt: FMT[d], h: 'right', v: 'center' }]); // bold, no border
  XFS.push([`v${d}`, { font: 0, fill: 0, border: 0, fmt: FMT[d], h: 'right', v: 'center' }]); // plain number
}
const XF_INDEX = new Map(XFS.map(([k], i) => [k, i]));

function stylesXml(): string {
  const xfs = XFS.map(([, x]) => {
    const align =
      x.h || x.v || x.wrap
        ? `<alignment${x.h ? ` horizontal="${x.h}"` : ''}${x.v ? ` vertical="${x.v}"` : ''}${x.wrap ? ' wrapText="1"' : ''}/>`
        : '';
    return (
      `<xf numFmtId="${x.fmt}" fontId="${x.font}" fillId="${x.fill}" borderId="${x.border}" xfId="0"` +
      `${x.fmt ? ' applyNumberFormat="1"' : ''} applyFont="1" applyFill="1" applyBorder="1"${align ? ' applyAlignment="1">' + align + '</xf>' : '/>'}`
    );
  }).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    CUSTOM_FMTS +
    `<fonts count="${FONTS.length}">${FONTS.join('')}</fonts>` +
    `<fills count="${FILLS.length}">${FILLS.join('')}</fills>` +
    `<borders count="${BORDERS.length}">${BORDERS.join('')}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${XFS.length}">${xfs}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}

const esc = (s: string) =>
  s
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
    .replace(
      // characters XML 1.0 does not allow
      // eslint-disable-next-line no-control-regex
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,
      '',
    );

export function colName(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetXml(sh: SheetSpec): string {
  const cols = sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const rows = sh.rows
    .map((row, r) => {
      const cells = (row ?? [])
        .map((c, ci) => {
          if (!c) return '';
          const ref = `${colName(ci)}${r + 1}`;
          const s = XF_INDEX.get(c.s ?? 'plain') ?? 0;
          if (c.v === null || c.v === '') return `<c r="${ref}" s="${s}"/>`;
          if (typeof c.v === 'number') {
            if (!Number.isFinite(c.v)) return `<c r="${ref}" s="${s}"/>`;
            return `<c r="${ref}" s="${s}"><v>${+c.v.toPrecision(15)}</v></c>`;
          }
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
        })
        .join('');
      const ht = sh.heights?.[r];
      return `<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells}</row>`;
    })
    .join('');
  const merges = sh.merges?.length
    ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows}</sheetData>` +
    merges +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>'
  );
}

export function buildXlsx(sheets: SheetSpec[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const put = (path: string, xml: string) => (files[path] = strToU8(xml));
  put(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join('') +
      '</Types>',
  );
  put(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
  );
  put(
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' +
      sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets></workbook>',
  );
  put(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>',
  );
  put('xl/styles.xml', stylesXml());
  sheets.forEach((s, i) => put(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return zipSync(files, { level: 6 });
}
