// Het Excel-bestand per product maken en downloaden.
//
// De inhoud komt uit `src/report/productExport.ts`, het bestand uit
// `src/report/xlsx.ts`; hier staan alleen de kleuren uit de pagina en de
// download. Alles gebeurt in de browser: de catalogus gaat nergens heen.

import type { Locale, ScanReport } from '../src/domain/types';
import type { Strings } from '../src/i18n/strings';
import type { SiteCheck } from '../src/collect/answers';
import type { SupportList } from '../src/questions/support';
import { readinessPlan } from '../src/report/actions';
import { productExportFilename, productWorkbook } from '../src/report/productExport';
import { buildXlsx, type XlsxPalette } from '../src/report/xlsx';
import { readLightTokens } from './reportPdf';

function palette(): XlsxPalette {
  const t = readLightTokens({
    text: '--text', muted: '--muted', surface2: '--surface-2',
    ok: '--ok', okSoft: '--ok-soft', warn: '--warn', warnSoft: '--warn-soft',
    accent: '--accent', accentSoft: '--accent-soft', danger: '--danger', dangerSoft: '--danger-soft',
  });
  return {
    text: t.text, muted: t.muted, headerFill: t.surface2,
    ok: [t.ok, t.okSoft], fill: [t.warn, t.warnSoft], add: [t.accent, t.accentSoft], critical: [t.danger, t.dangerSoft],
  };
}

export async function saveProductXlsx(report: ScanReport, s: Strings, locale: Locale, siteCheck?: SiteCheck, support?: SupportList): Promise<void> {
  const plan = readinessPlan(report, locale, siteCheck, support);
  const bytes = buildXlsx(productWorkbook(report, plan, s, locale), palette());
  const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = productExportFilename(report);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
