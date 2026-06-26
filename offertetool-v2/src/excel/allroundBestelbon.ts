/**
 * Genereert bestelbonnen in de EXACTE layout van de Allround-bestelformulieren
 * (de echte .xltx-sjablonen in public/bestelformulieren). We laden het sjabloon
 * met ExcelJS — dat behoudt alle opmaak, randen, logo's en merges — en vullen
 * enkel de invulcellen (kolommen E–I = posities 1–5). Zo hoeft niets meer
 * overgetypt te worden voor de bestelling bij de leverancier.
 */
import type { OfferItem } from '../calc/types';
import { kleurLabel } from '../calc/shared';

const COL0 = 5; // kolom E = positie 1

// ---- Vertalingen offertetool → vocabulaire bestelformulier ----
const ROLLUIK_TYPE: Record<string, string> = {
  'Ecoroll-L': 'Ecoroll L 42mm lamel',
  'Rollex-L': 'Rollex L 42mm lamel',
  'Ecoroll-M': 'Ecoroll M 37mm lamel',
  'Rollex-M': 'Rollex M 37mm lamel',
};

const LAMEL_KLEUR: Record<string, string> = {
  wit_01: '01 Wit', grijs_02: '02 Grijs', bruin_03: '03 Bruin', lichtbeige_04: '04 Lichtbeige',
  naturel_07: '07 Naturel', lichtgrijs_23: '23 Lichtgrijs', creme_wit_27: '27 Creme-wit', creme_84: '84 Creme',
  antracietgrijs_38: '38 Antracietgrijs', grijsaluminium_85: '85 Grijsaluminium', teak_12: '12 Teak',
  donker_eiken_22: '22 Donker eiken', zwartgrijs_46: '46 Zwartgrijs', dennengroen_28: '28 Dennengroen',
  jamaicabruin_30: '30 Jamaicabruin', staalblauw_39: '39 Staalblauw', kwartsgrijs_43: '43 Kwartsgrijs',
  diepzwart_90: '90 Diepzwart', db703_18: '18 DB703',
};

const plaatsingLabel = (p: string) => (p === 'odd' ? 'Op de dag' : 'In de dag');
const kastvormLabel = (k: string) => (k || '').toLowerCase().includes('afgeschuind') ? 'Afgeschuind' : 'Afgerond';
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const motorClean = (m: string) => (m || '').replace(/^Somfy\s+/i, '').replace(/\s*\(standaard\)/i, '').trim();
const d = (it: OfferItem, k: string) => { const v = it.detail[k]; return v === undefined || v === null ? '' : v; };
const ds = (it: OfferItem, k: string) => String(d(it, k)).trim();

function voorboren(it: OfferItem, side: 'links' | 'rechts'): string {
  const z = ds(it, 'voorborenZijde').toLowerCase();
  if (!z) return '';
  if (z === 'beide') return 'ja';
  return z === side ? 'ja' : 'Nee';
}

type Filler = { row: number; val: (it: OfferItem) => string | number };

const ROLLUIK_FILLERS: Filler[] = [
  { row: 10, val: (it) => it.aantal },
  { row: 11, val: (it) => it.breedte || '' },
  { row: 12, val: (it) => it.hoogte ?? '' },
  { row: 13, val: (it) => ROLLUIK_TYPE[it.type] ?? it.type },
  { row: 15, val: (it) => kastvormLabel(ds(it, 'kasttype')) },
  { row: 17, val: (it) => ds(it, 'kleurOmkasting') || kleurLabel(it.kleur) },
  { row: 18, val: (it) => ds(it, 'geleider') },
  { row: 19, val: (it) => ds(it, 'geleiderRechts') },
  { row: 20, val: (it) => LAMEL_KLEUR[ds(it, 'lamelKleur')] ?? ds(it, 'lamelKleur') },
  { row: 21, val: (it) => motorClean(ds(it, 'motor')) },
  { row: 22, val: (it) => ds(it, 'handBediening') },
  { row: 23, val: (it) => ds(it, 'motorkabelUitvoering') },
  { row: 24, val: (it) => ds(it, 'kabeluitvoer') },
  { row: 25, val: (it) => ds(it, 'bedieningskant') },
  { row: 26, val: (it) => voorboren(it, 'links') },
  { row: 27, val: (it) => voorboren(it, 'rechts') },
];

const SCREEN_FILLERS: Filler[] = [
  { row: 10, val: (it) => it.aantal },
  { row: 11, val: (it) => it.breedte || '' },
  { row: 12, val: (it) => it.hoogte ?? '' },
  { row: 13, val: (it) => ds(it, 'standaardZip') },
  { row: 14, val: (it) => cap(ds(it, 'omkasting')) },
  { row: 16, val: (it) => kleurLabel(it.kleur) },
  { row: 17, val: (it) => motorClean(ds(it, 'motor')) },
  { row: 18, val: (it) => ds(it, 'motorkabelUitvoering') },
  { row: 19, val: (it) => ds(it, 'kabeluitvoer') },
  { row: 20, val: (it) => ds(it, 'motorzijde') },
  { row: 21, val: (it) => ds(it, 'doekCode') },
  { row: 22, val: (it) => ds(it, 'voorzijdeDoek') },
  { row: 23, val: (it) => voorboren(it, 'links') },
  { row: 24, val: (it) => voorboren(it, 'rechts') },
  { row: 25, val: (it) => plaatsingLabel(ds(it, 'plaatsing')) },
  { row: 26, val: (it) => ds(it, 'geleider') },
  { row: 27, val: (it) => ds(it, 'geleiderRechts') },
];

const KNIKARM_FILLERS: Filler[] = [
  { row: 10, val: (it) => it.aantal },
  { row: 11, val: (it) => it.breedte || '' },
  { row: 12, val: (it) => it.uitval ?? '' },
  { row: 13, val: (it) => it.type },
  { row: 14, val: (it) => kleurLabel(it.kleur) },
  { row: 15, val: (it) => ds(it, 'typeBediening') },
  { row: 16, val: (it) => ds(it, 'motorkabelUitvoering') },
  { row: 17, val: (it) => ds(it, 'bedieningskant') },
  { row: 18, val: (it) => ds(it, 'doekCode') },
  { row: 19, val: (it) => ds(it, 'volantType') },
  { row: 20, val: (it) => ds(it, 'volantHoogte') },
  { row: 21, val: (it) => ds(it, 'verlengdeSteunen') },
  // Extra opties (rijen 34–36)
  { row: 34, val: (it) => (ds(it, 'ledUitvoering') === 'Standaard' ? 'X' : '') },
  { row: 35, val: (it) => (ds(it, 'ledUitvoering') === 'IO ontvanger' ? 'X' : '') },
  { row: 36, val: (it) => (d(it, 'varioVolant') === true ? 'X' : '') },
];

interface Sjabloon {
  product: string;        // OfferItem.product
  bestand: string;        // public/bestelformulieren/<bestand>
  bladIndex: number;      // invoerblad = 0
  fillers: Filler[];
  opmerkingCel: string;   // top-left van het (merged) opmerkingenblok
  extraOpmerking?: (it: OfferItem) => string;  // specs zonder eigen cel
  titel: string;
}

export const SJABLONEN: Record<string, Sjabloon> = {
  Rolluik: {
    product: 'Rolluik', bestand: 'rolluik.xltx', bladIndex: 0, fillers: ROLLUIK_FILLERS,
    opmerkingCel: 'B31', titel: 'Bestelformulier Rolluik',
  },
  Screen: {
    product: 'Screen', bestand: 'screen.xltx', bladIndex: 0, fillers: SCREEN_FILLERS,
    opmerkingCel: 'B31', titel: 'Bestelformulier Screen Nova',
  },
  Knikarmscherm: {
    product: 'Knikarmscherm', bestand: 'knikarm.xltx', bladIndex: 0, fillers: KNIKARM_FILLERS,
    opmerkingCel: 'B25', titel: 'Bestelformulier Knikarmscherm',
    extraOpmerking: (it) => ds(it, 'doekAfwerking') ? `Doekafwerking: ${ds(it, 'doekAfwerking')}` : '',
  },
};

/** Vul één invoerblad voor max. 5 posities. `ws` is een ExcelJS-worksheet. */
export function fillProductSheet(ws: any, sj: Sjabloon, items: OfferItem[], klantNaam: string) {
  // Kopgegevens
  ws.getCell('E6').value = klantNaam || '';                                  // Order referentie
  ws.getCell('E7').value = new Date().toLocaleDateString('nl-BE');           // Datum

  const opmerkingen: string[] = [];
  items.slice(0, 5).forEach((it, idx) => {
    const col = COL0 + idx;
    for (const f of sj.fillers) {
      const v = f.val(it);
      if (v !== '' && v !== undefined && v !== null) ws.getCell(f.row, col).value = v;
    }
    const extra = sj.extraOpmerking ? sj.extraOpmerking(it) : '';
    const reg = [it.opmerkingen, extra].filter(Boolean).join(' — ');
    if (reg) opmerkingen.push(items.length > 1 ? `Pos ${idx + 1}: ${reg}` : reg);
  });
  if (opmerkingen.length) ws.getCell(sj.opmerkingCel).value = opmerkingen.join('\n');
}

/** Groepeer offerte-items per sjabloon-product, in invoervolgorde. */
export function groepeerPerSjabloon(items: OfferItem[]): Record<string, OfferItem[]> {
  const out: Record<string, OfferItem[]> = {};
  for (const it of items) {
    if (SJABLONEN[it.product]) (out[it.product] ??= []).push(it);
  }
  return out;
}

function downloadBlob(buf: ArrayBuffer, naam: string) {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = naam; document.body.appendChild(a); a.click();
  a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Genereert per product (rolluik/screen/knikarm) een ingevulde Allround-bestelbon
 * in de exacte sjabloon-layout. >5 stuks per product → meerdere bestanden.
 * @returns lijst gegenereerde bestandsnamen (leeg = geen passend product)
 */
export async function genAllroundBestelbonnen(items: OfferItem[], klantNaam: string): Promise<string[]> {
  const groepen = groepeerPerSjabloon(items);
  const namen: string[] = [];
  const ExcelJSmod: any = await import('exceljs');
  const ExcelJS = ExcelJSmod.default ?? ExcelJSmod;
  const safe = (klantNaam || 'offerte').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');

  for (const [product, lijst] of Object.entries(groepen)) {
    const sj = SJABLONEN[product];
    const resp = await fetch(`/bestelformulieren/${sj.bestand}`);
    if (!resp.ok) throw new Error(`Sjabloon ${sj.bestand} niet gevonden (${resp.status})`);
    const templateBuf = await resp.arrayBuffer();

    // Per 5 posities een apart bestand
    for (let i = 0; i < lijst.length; i += 5) {
      const groep = lijst.slice(i, i + 5);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(templateBuf);
      const ws = wb.worksheets[sj.bladIndex];
      fillProductSheet(ws, sj, groep, klantNaam);
      const buf = await wb.xlsx.writeBuffer();
      const deel = lijst.length > 5 ? `_pos${i + 1}-${Math.min(i + 5, lijst.length)}` : '';
      const naam = `${sj.titel} - ${safe}${deel}.xlsx`;
      downloadBlob(buf, naam);
      namen.push(naam);
    }
  }
  return namen;
}
