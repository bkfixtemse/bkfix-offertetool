/**
 * Maatrasters per producttype — STRUCTURELE feiten van de Allround prijstabellen.
 * Bewust hardcoded en NIET instelbaar: een verkeerde rasterinstelling mag een
 * prijsopzoeking nooit kunnen breken (zie bug 'Vinci 4250 niet produceerbaar').
 */
import type { PriceCell, PriceGrid } from './types';

/** Rond op naar het dichtstbijzijnde veelvoud van step. */
export const ceilStep = (n: number, step: number): number => Math.ceil(n / step) * step;

export interface GridSpec {
  stepB: number;
  stepH: number;   // hoogte of uitval
  minB: number;
  minH: number;
}

/** Screens: prijsopzoeking op DAGMAAT. */
export const SCREEN_GRID: Record<string, GridSpec> = {
  'Nova 83':        { stepB: 100, stepH: 100, minB: 1000, minH: 1000 },
  'Nova 103':       { stepB: 200, stepH: 200, minB: 1000, minH: 1000 },
  'Nova 123':       { stepB: 200, stepH: 200, minB: 1600, minH: 1000 },
  'Nova solar 103': { stepB: 200, stepH: 200, minB: 1000, minH: 1000 },
};

/** Rolluiken: prijsopzoeking op BESTELMAAT, raster 100mm, prijsbodem 1000mm. */
export const ROLLUIK_GRID: GridSpec = { stepB: 100, stepH: 100, minB: 1000, minH: 1000 };

/** Knikarm: breedte 250mm (Gaudi 400 boven 7000mm: 500mm), uitval 500mm. */
export function knikarmGrid(type: string, breedte: number): GridSpec {
  const stepB = type === 'Gaudi 400' && breedte > 7000 ? 500 : 250;
  return { stepB, stepH: 500, minB: 1000, minH: 1500 };
}

/** Veranda/pergola: Vinci 500mm min 1500×2000 · Stilo 250mm min 1000×1500. */
export function verandaGrid(type: string): GridSpec {
  if (type.startsWith('Stilo')) return { stepB: 250, stepH: 250, minB: 1000, minH: 1500 };
  return { stepB: 500, stepH: 500, minB: 1500, minH: 2000 };
}

export interface LookupResult {
  price: number | null;       // null = niet produceerbaar / niet gevonden
  bKey: number;               // gebruikte rasterbreedte
  hKey: number;               // gebruikte rasterhoogte/-uitval
  producible: boolean;
}

/**
 * Zoek een prijs op in een grid {<hKeyPrefix><h>: {<bKeyPrefix><b>: prijs|'x'}}.
 * b/h worden eerst naar het raster gebracht (ceil + minimum).
 */
export function lookupPrice(
  grid: PriceGrid | undefined,
  spec: GridSpec,
  hPrefix: string,
  bPrefix: string,
  breedte: number,
  hoogte: number,
): LookupResult {
  const bKey = Math.max(spec.minB, ceilStep(breedte, spec.stepB));
  const hKey = Math.max(spec.minH, ceilStep(hoogte, spec.stepH));
  const row = grid?.[`${hPrefix}${hKey}`];
  const cell: PriceCell | undefined = row?.[`${bPrefix}${bKey}`];
  if (typeof cell === 'number') return { price: cell, bKey, hKey, producible: true };
  return { price: null, bKey, hKey, producible: false };
}
