/** Los artikel (koker, accessoire …): vrije omschrijving + verkoop/aankoop per stuk. */
import type { CalcResult } from './types';

export interface ArtikelInput {
  description: string;
  aantal: number;
  verkoop: number;   // verkoopprijs per stuk
  aankoop: number;   // aankoopprijs per stuk
}

export function calcArtikel(inp: ArtikelInput): CalcResult {
  const errors: string[] = [];
  if (!inp.description.trim()) errors.push('Geef een omschrijving');
  const aantal = Math.max(1, inp.aantal);
  const uwVerkoop = inp.verkoop * aantal;
  const aankoop = inp.aankoop * aantal;
  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
    product: 'Artikel',
    type: inp.description || 'Los artikel',
    aantal,
    breedte: 0,
    regels: [{
      label: aantal > 1
        ? `${inp.description || 'Los artikel'} (${aantal}× €${inp.verkoop.toFixed(2)})`
        : (inp.description || 'Los artikel'),
      bedrag: uwVerkoop,
    }],
    productSubtotal: uwVerkoop,
    plaatsingTotaal: 0,
    bedieningTotaal: 0,
    bedieningAankoop: 0,
    marges: { allroundKorting: 0, bkfixMarge: 0, eenmaligeKorting: 0 },
    aankoop,
    verkoop: uwVerkoop,
    uwVerkoop,
    options: [`${aantal}× €${inp.verkoop.toFixed(2)}`],
    opmerkingen: '',
    detail: {},
    bediening: { bed1: '', bed2: '' },
    kleur: { select: '', custom: '' },
  };
}
