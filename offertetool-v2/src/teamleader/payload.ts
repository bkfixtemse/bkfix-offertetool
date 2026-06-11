/**
 * quotations.create payload:
 * - werkuren + verborgen kost worden ONZICHTBAAR verdeeld over de productlijnen
 * - Amy-wandzenders worden als aparte lijn gesplitst (prijs van hoofdlijn afgetrokken)
 * - extended_description is nooit leeg (TL-API eis)
 */
import type { OfferItem } from '../calc/types';
import type { Werkuren } from '../store/offerStore';
import { bedieningVerkoop } from '../calc/shared';
import { tlDescription } from './descriptions';

export interface TlLineItem {
  quantity: number;
  description: string;
  extended_description: string;
  unit_price: { amount: number; tax: 'excluding' };
  purchase_unit_price?: { amount: number; tax: 'excluding' };
  tax_rate_id: string;
}

export interface TlQuotationPayload {
  deal_id: string;
  layout_id?: string;
  grouped_lines: [{ line_items: TlLineItem[] }];
}

const isAmy = (b: string) => b.startsWith('Amy');
const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildQuotationPayload(
  items: OfferItem[],
  dealId: string,
  taxRateId: string,
  layoutId: string,
  hiddenCost: number,
  werkuren: Werkuren,
): TlQuotationPayload {
  const lines: TlLineItem[] = [];
  const amyLines: TlLineItem[] = [];
  const werkurenKost = werkuren.tarief * werkuren.uren * werkuren.personen;
  const perItem = items.length > 0 ? (hiddenCost + werkurenKost) / items.length : 0;

  for (const it of items) {
    const amyPrijs = (isAmy(it.bediening.bed1) ? bedieningVerkoop(it.bediening.bed1) : 0)
      + (isAmy(it.bediening.bed2) ? bedieningVerkoop(it.bediening.bed2) : 0);
    const mainPrice = it.uwVerkoop - amyPrijs + perItem;

    lines.push({
      quantity: it.aantal,
      description: `${it.product} - ${it.type}`,
      extended_description: tlDescription(it),
      unit_price: { amount: r2(mainPrice / it.aantal), tax: 'excluding' },
      purchase_unit_price: { amount: r2(it.aankoop / it.aantal), tax: 'excluding' },
      tax_rate_id: taxRateId,
    });

    for (const bed of [it.bediening.bed1, it.bediening.bed2]) {
      if (isAmy(bed)) {
        amyLines.push({
          quantity: it.aantal,
          description: `${bed} afstandsbediening`,
          extended_description: `${bed} afstandsbediening (draadloze zender)`,
          unit_price: { amount: r2(bedieningVerkoop(bed)), tax: 'excluding' },
          tax_rate_id: taxRateId,
        });
      }
    }
  }

  return {
    deal_id: dealId,
    ...(layoutId ? { layout_id: layoutId } : {}),
    grouped_lines: [{ line_items: [...lines, ...amyLines] }],
  };
}
