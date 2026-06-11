/** Excel bestelbon voor de leverancier (alle maten + specificaties). */
import * as XLSX from 'xlsx';
import type { OfferItem } from '../calc/types';
import { kleurLabel } from '../calc/shared';

export function downloadBestelbon(items: OfferItem[], klantNaam: string) {
  const date = new Date().toLocaleDateString('nl-BE');
  const headers = [
    'Nr', 'Product', 'Type', 'Aantal', 'Plaatsing',
    'Dagmaat B (mm)', 'Dagmaat H/Uitval (mm)',
    'Bestelmaat B (mm)', 'Bestelmaat H (mm)', 'Calculatiemaat',
    'Kleur', 'Kleur omkasting', 'Geleider', 'Lamel', 'Motor', 'Omkasting/Kast', 'Onderlat',
    'Bediening', 'Extra opties', 'Opmerkingen',
  ];
  const rows = items.map((it, i) => {
    const d = it.detail;
    const bediening = [it.bediening.bed1, it.bediening.bed2].filter(Boolean).join(', ');
    const extra = it.options.filter((o) => !o.startsWith('Bediening')).join(' | ');
    return [
      i + 1, it.product, it.type, it.aantal,
      d.plaatsing ? String(d.plaatsing).toUpperCase() : '',
      it.breedte || '', it.hoogte ?? it.uitval ?? '',
      it.bestelmaat?.b ?? '', it.bestelmaat?.h ?? '',
      it.calculatiemaat ? `${it.calculatiemaat.b}×${it.calculatiemaat.h}` : '',
      kleurLabel(it.kleur), String(d.kleurOmkasting ?? ''),
      String(d.geleider ?? ''), String(d.lamel ?? ''), String(d.motor ?? ''),
      String(d.kasttype ?? d.omkasting ?? ''), String(d.onderlat ?? ''),
      bediening, extra, it.opmerkingen,
    ];
  });
  const title = [`BKfix Bestelbon  |  ${klantNaam || 'Offerte'}  |  ${date}`];
  const ws = XLSX.utils.aoa_to_sheet([title, [], headers, ...rows]);
  ws['!cols'] = [4, 14, 18, 7, 10, 14, 18, 14, 14, 14, 18, 16, 14, 12, 22, 16, 14, 20, 34, 30].map((wch) => ({ wch }));
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bestelbon');
  const safe = (klantNaam || 'Offerte').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `BKfix_Bestelbon_${safe}_${date.replace(/\//g, '-')}.xlsx`);
}
