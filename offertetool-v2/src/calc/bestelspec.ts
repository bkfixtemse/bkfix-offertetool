/**
 * Bestelspecificaties: niet-prijsbepalende montage-/uitvoeringsvelden die op de
 * Allround-bestelformulieren ingevuld moeten worden. Ze leven in `CalcResult.detail`
 * (raken de berekening niet) en verschijnen op de BKfix-bestelbon — niet op de
 * klantgerichte Teamleader-offerte.
 */
import type { OfferItem } from './types';

/** [detailKey, label] per product, in weergavevolgorde. */
const SPEC_FIELDS: Record<string, [string, string][]> = {
  Rolluik: [
    ['bedieningskant', 'Bedieningskant'],
    ['handBediening', 'Handmatige bediening'],
    ['motorkabelUitvoering', 'Motorkabel'],
    ['kabeluitvoer', 'Kabeluitvoer'],
    ['geleiderRechts', 'Geleider rechts (afwijkend)'],
    ['voorborenZijde', 'Voorboren zijde'],
  ],
  Screen: [
    ['standaardZip', 'Uitvoering'],
    ['motorkabelUitvoering', 'Motorkabel'],
    ['kabeluitvoer', 'Kabeluitvoer'],
    ['motorzijde', 'Motorzijde'],
    ['voorzijdeDoek', 'Voorzijde doek'],
    ['doekCode', 'Kleurcode doek'],
    ['geleiderRechts', 'Geleider rechts (afwijkend)'],
    ['voorborenZijde', 'Voorboren zijde'],
    ['raamvlakType', 'Raamvlak'],
    ['raamvlakA', 'Raamvlak afm. A (mm)'],
    ['raamvlakB', 'Raamvlak afm. B (mm)'],
  ],
  Knikarmscherm: [
    ['typeBediening', 'Type bediening'],
    ['motorkabelUitvoering', 'Motorkabel'],
    ['bedieningskant', 'Bedieningskant'],
    ['volantType', 'Volant'],
    ['doekAfwerking', 'Doekafwerking'],
    ['volantHoogte', 'Volanthoogte (mm)'],
    ['varioVolant', 'Vario volant'],
    ['ledUitvoering', 'LED-uitvoering'],
    ['verlengdeSteunen', 'Verlengde steunen'],
    ['doekCode', 'Kleurcode doek'],
  ],
};

function show(v: string | number | boolean | undefined): string {
  if (v === undefined || v === null || v === false) return '';
  if (v === true) return 'ja';
  return String(v).trim();
}

/** Niet-lege bestelspecificaties als [label, waarde]-paren. */
export function bestelSpecPairs(it: OfferItem): [string, string][] {
  const fields = SPEC_FIELDS[it.product] ?? [];
  const out: [string, string][] = [];
  for (const [key, label] of fields) {
    const v = show(it.detail[key]);
    if (v) out.push([label, v]);
  }
  return out;
}

/** Bestelspecificaties als één tekstregel voor de bestelbon-cel. */
export function bestelSpecString(it: OfferItem): string {
  return bestelSpecPairs(it).map(([l, v]) => `${l}: ${v}`).join(' | ');
}
