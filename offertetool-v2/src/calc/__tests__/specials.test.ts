/** Speciale regels: kasthoogtes, bediening-aankoop, meerprijzen. */
import { describe, expect, it } from 'vitest';
import { getKasthoogte, calcRolluik } from '../rolluik';
import { bedieningAankoop, kleurMeerprijs } from '../shared';
import { calcKnikarm } from '../knikarm';
import type { Marges } from '../types';

const M50: Marges = { allroundKorting: 0.5, bkfixMarge: 0.2, eenmaligeKorting: 0 };

describe('kasthoogte-tiers (catalogus)', () => {
  it('L-serie: 1340→150 · 1900→165 · 2360→180 · daarboven 205', () => {
    expect(getKasthoogte('Ecoroll_L', 1340)).toBe(150);
    expect(getKasthoogte('Ecoroll_L', 1341)).toBe(165);
    expect(getKasthoogte('Rollex_L', 1900)).toBe(165);
    expect(getKasthoogte('Rollex_L', 1901)).toBe(180);
    expect(getKasthoogte('Ecoroll_L', 2361)).toBe(205);
  });
  it('M-serie: 1800→150 · 2350→165 · daarboven 180', () => {
    expect(getKasthoogte('Ecoroll_M', 1800)).toBe(150);
    expect(getKasthoogte('Rollex_M', 2350)).toBe(165);
    expect(getKasthoogte('Ecoroll_M', 2351)).toBe(180);
  });
});

describe('bediening aankoop = catalogus × 0,6', () => {
  it('situo 5 pure: 67 → 40,20', () => expect(bedieningAankoop('situo 5 pure')).toBeCloseTo(40.2, 2));
  it('tahoma: catalogus 260 → 156 (niet 375×0,6)', () => expect(bedieningAankoop('tahoma switch (incl koppelen)')).toBeCloseTo(156, 2));
  it('leeg → 0', () => expect(bedieningAankoop('')).toBe(0));
});

describe('kleur-meerprijzen', () => {
  it('standaard/collectie gratis · andere +675', () => {
    expect(kleurMeerprijs({ select: '', custom: '' })).toBe(0);
    expect(kleurMeerprijs({ select: 'RAL 7016', custom: '' })).toBe(0);
    expect(kleurMeerprijs({ select: 'andere', custom: 'x' })).toBe(675);
  });
  it('Pisano: std gratis · RAL +140', () => {
    expect(kleurMeerprijs({ select: 'RAL 9010', custom: '' }, 'Pisano 230')).toBe(0);
    expect(kleurMeerprijs({ select: 'RAL 7039 SL', custom: '' }, 'Pisano 230')).toBe(140);
  });
});

describe('opties-meerprijzen', () => {
  const base = {
    type: 'Ecoroll_L', aantal: 1, breedte: 2000, hoogte: 1500, plaatsing: 'idd' as const,
    geleider: '', kasttype: 'afgeschuind 45°', motor: '', mkabel: '' as const,
    lamel: 'standaard' as const, lamelKleur: '', koppelen: '', bereik: 'Goed', onderlat: '',
    borenJa: false, zonnepaneelJa: false, kleur: { select: '', custom: '' }, kleurOmkasting: '',
    bediening: { bed1: '', bed2: '' }, opmerkingen: '', vrijeOpties: [], marges: M50,
  };
  it('geleiders boren = €12 (6×2)', () => {
    expect(calcRolluik({ ...base, borenJa: true }).productSubtotal - calcRolluik(base).productSubtotal).toBe(12);
  });
  it('ronde/rechte omkasting = +€65', () => {
    expect(calcRolluik({ ...base, kasttype: 'ronde of rechte omkasting' }).productSubtotal
      - calcRolluik(base).productSubtotal).toBe(65);
  });
  it('zonnepaneel enkel bij solar', () => {
    expect(calcRolluik({ ...base, zonnepaneelJa: true }).productSubtotal).toBe(calcRolluik(base).productSubtotal);
  });
  it('muurstrip Pisano = €125/m × breedte', () => {
    const k = {
      type: 'Pisano 230', aantal: 1, breedte: 4000, uitval: 1500, verdieping: '0', bereik: 'Goed',
      gevel: 'baksteen', muursteun: '', muurstripJa: false, doek: 'standaard', led: 'Nee',
      kleur: { select: '', custom: '' }, bediening: { bed1: '', bed2: '' },
      opmerkingen: '', vrijeOpties: [], marges: M50,
    };
    expect(calcKnikarm({ ...k, muurstripJa: true }).productSubtotal - calcKnikarm(k).productSubtotal).toBe(500);
  });
});
