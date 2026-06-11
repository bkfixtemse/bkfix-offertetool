/**
 * Gedeelde prijsformule + bediening- en kleurlogica.
 * Pure functies — geen React/Firebase.
 *
 * Formule (geldt voor elk product):
 *   productAankoop = productSubtotal × (1 − allroundKorting)
 *   verkoop        = productAankoop ÷ (1 − bkfixMarge)
 *   aankoop        = productAankoop + bedieningAankoop          (bedieningen @ 40%)
 *   uwVerkoop      = verkoop − eenmaligeKorting + plaatsing + bedieningVerkoop
 */
import opties from '../data/opties.json';
import {
  BEDIENING_CATALOG, BEDIENING_KORTING, KLEUR_MEERPRIJS,
  PISANO_RAL_MEERPRIJS, PISANO_STD_KLEUREN,
} from '../data/constants';
import type { BedieningKeuze, KleurKeuze, Marges, PrijsRegel } from './types';

const bedieningTabel: Record<string, number> = (opties as any).algemene.bediening;

/** Verkoopprijs van één bediening (lijstprijs). */
export function bedieningVerkoop(name: string): number {
  return name ? bedieningTabel[name] ?? 0 : 0;
}

/** Aankoopprijs van één bediening: cataloguskostprijs × (1 − 40%). */
export function bedieningAankoop(name: string): number {
  if (!name) return 0;
  const basis = name in BEDIENING_CATALOG ? BEDIENING_CATALOG[name] : bedieningVerkoop(name);
  return basis * (1 - BEDIENING_KORTING);
}

export function bedieningTotalen(bed: BedieningKeuze): { verkoop: number; aankoop: number } {
  return {
    verkoop: bedieningVerkoop(bed.bed1) + bedieningVerkoop(bed.bed2),
    aankoop: bedieningAankoop(bed.bed1) + bedieningAankoop(bed.bed2),
  };
}

/** Label voor de gekozen kleur (op offerte/bestelbon). */
export function kleurLabel(k: KleurKeuze): string {
  if (k.select === 'andere') return k.custom || `Andere kleur (+€${KLEUR_MEERPRIJS})`;
  return k.select;
}

/** Meerprijs van de kleurkeuze. Pisano 230 heeft afwijkende regels. */
export function kleurMeerprijs(k: KleurKeuze, productType?: string): number {
  if (k.select === 'andere') return KLEUR_MEERPRIJS;
  if (productType === 'Pisano 230' && k.select && !PISANO_STD_KLEUREN.includes(k.select)) {
    return PISANO_RAL_MEERPRIJS;
  }
  return 0;
}

export interface Totalen {
  productSubtotal: number;
  aankoop: number;
  verkoop: number;
  uwVerkoop: number;
  bedieningTotaal: number;
  bedieningAankoop: number;
}

/**
 * Pas de gedeelde formule toe op een lijst prijsregels.
 * @param regels prijscomponenten per stuk (basis + opties)
 * @param aantal aantal stuks
 * @param vrijeOpties som van handmatige opties (niet vermenigvuldigd met aantal)
 */
export function berekenTotalen(
  regels: PrijsRegel[],
  aantal: number,
  vrijeOpties: number,
  plaatsingTotaal: number,
  bed: BedieningKeuze,
  marges: Marges,
): Totalen {
  const perStuk = regels.reduce((s, r) => s + r.bedrag, 0);
  const productSubtotal = perStuk * aantal + vrijeOpties;
  const bedT = bedieningTotalen(bed);
  const productAankoop = productSubtotal * (1 - marges.allroundKorting);
  const verkoop = productAankoop / (1 - marges.bkfixMarge);
  const aankoop = productAankoop + bedT.aankoop;
  const uwVerkoop = verkoop - marges.eenmaligeKorting + plaatsingTotaal + bedT.verkoop;
  return {
    productSubtotal,
    aankoop,
    verkoop,
    uwVerkoop,
    bedieningTotaal: bedT.verkoop,
    bedieningAankoop: bedT.aankoop,
  };
}

/** Bereikbaarheid: numerieke meerprijs of tekstwaarschuwing. */
export function bereikbaarheid(name: string): { prijs: number; warning?: string } {
  const raw = (opties as any).algemene.bereikbaarheid[name];
  if (typeof raw === 'number') return { prijs: raw };
  if (typeof raw === 'string' && raw) return { prijs: 0, warning: `Bereikbaarheid "${name}": ${raw}` };
  return { prijs: 0 };
}
