/**
 * Losse afstandsbediening/zender als apart offerte-artikel.
 * Verkoop = vaste lijstprijs · aankoop = cataloguskostprijs × (1 − 40%).
 * Tahoma: catalogus €260, verkoop €375 incl. koppeling/installatie.
 */
import opties from '../data/opties.json';
import { BEDIENING_KORTING } from '../data/constants';
import { bedieningAankoop, bedieningVerkoop } from './shared';
import type { CalcResult, Marges } from './types';

export interface AfstandsbedieningInput {
  type: string;
  aantal: number;
  eenmaligeKorting: number;
  opmerkingen: string;
}

export function calcAfstandsbediening(inp: AfstandsbedieningInput): CalcResult {
  const errors: string[] = [];
  if (!inp.type) errors.push('Kies een type afstandsbediening');

  const sellEach = bedieningVerkoop(inp.type);
  const productSubtotal = sellEach * inp.aantal;
  const aankoop = bedieningAankoop(inp.type) * inp.aantal;
  const uwVerkoop = productSubtotal - inp.eenmaligeKorting;

  const marges: Marges = { allroundKorting: BEDIENING_KORTING, bkfixMarge: 0, eenmaligeKorting: inp.eenmaligeKorting };

  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
    product: 'Afstandsbediening',
    type: inp.type,
    aantal: inp.aantal,
    breedte: 0,
    regels: [{ label: inp.type, bedrag: sellEach }],
    productSubtotal,
    plaatsingTotaal: 0,
    bedieningTotaal: 0,
    bedieningAankoop: 0,
    marges,
    aankoop,
    verkoop: productSubtotal,
    uwVerkoop,
    options: [
      `Type: ${inp.type}`,
      inp.eenmaligeKorting > 0 && `Korting: €${inp.eenmaligeKorting.toFixed(2)}`,
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {},
    bediening: { bed1: '', bed2: '' },
    kleur: { select: '', custom: '' },
  };
}

export const BEDIENING_TYPES = Object.keys((opties as any).algemene.bediening);
