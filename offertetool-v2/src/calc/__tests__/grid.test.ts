/** Rastertests: stappen, minima, Gaudi 400-overgang, niet-produceerbaar. */
import { describe, expect, it } from 'vitest';
import { ceilStep, knikarmGrid, lookupPrice, SCREEN_GRID, verandaGrid } from '../grid';
import knikarm from '../../data/knikarm.json';
import veranda from '../../data/veranda.json';

describe('rasters', () => {
  it('ceilStep rondt op', () => {
    expect(ceilStep(1001, 100)).toBe(1100);
    expect(ceilStep(2000, 100)).toBe(2000);
    expect(ceilStep(4250, 500)).toBe(4500);
  });
  it('screenstappen per type', () => {
    expect(SCREEN_GRID['Nova 83'].stepB).toBe(100);
    expect(SCREEN_GRID['Nova 103'].stepB).toBe(200);
    expect(SCREEN_GRID['Nova solar 103'].stepB).toBe(200);
  });
  it('Gaudi 400: 250mm tot 7000, daarboven 500mm', () => {
    expect(knikarmGrid('Gaudi 400', 6900).stepB).toBe(250);
    expect(knikarmGrid('Gaudi 400', 7250).stepB).toBe(500);
    expect(knikarmGrid('Pisano 230', 9000).stepB).toBe(250);
  });
  it('veranda: Vinci 500/min 1500×2000 · Stilo 250/min 1000×1500', () => {
    expect(verandaGrid('Vinci 150 onderliggend')).toEqual({ stepB: 500, stepH: 500, minB: 1500, minH: 2000 });
    expect(verandaGrid('Stilo 103 onderliggend')).toEqual({ stepB: 250, stepH: 250, minB: 1000, minH: 1500 });
  });
});

describe('niet produceerbaar', () => {
  it("'x'-cel wordt geweigerd (Pisano b5750)", () => {
    const td = (knikarm as any)['Pisano 230'];
    const lk = lookupPrice(td.prices, knikarmGrid('Pisano 230', 5750), 'PIU_', 'PI_', 5750, 1500);
    expect(lk.producible).toBe(false);
  });
  it('ontbrekende cel wordt geweigerd (Stilo 123 traplimiet b3000 u4250)', () => {
    const td = (veranda as any).types['Stilo 123 onderliggend'];
    const lk = lookupPrice(td.prices, verandaGrid('Stilo 123 onderliggend'), 'S_123U_', 'S_123B_', 3000, 4250);
    expect(lk.producible).toBe(false);
  });
  it('Gaudi 400 brede sectie vindt mei-prijs (u1500 b7500 = 5881)', () => {
    const td = (knikarm as any)['Gaudi 400'];
    const lk = lookupPrice(td.prices, knikarmGrid('Gaudi 400', 7200), 'G4U_', 'G4_', 7200, 1500);
    expect(lk.price).toBe(5881);
  });
});
