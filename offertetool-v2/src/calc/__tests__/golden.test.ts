/** Golden tests — eindtotalen tegen catalogus-geverifieerde waarden, met de hand nagerekend. */
import { describe, expect, it } from 'vitest';
import { calcRolluik } from '../rolluik';
import { calcScreen } from '../screen';
import { calcKnikarm } from '../knikarm';
import { calcVeranda } from '../veranda';
import { calcAfstandsbediening } from '../afstandsbediening';
import type { Marges } from '../types';

const M50: Marges = { allroundKorting: 0.5, bkfixMarge: 0.2, eenmaligeKorting: 0 };
const M40: Marges = { allroundKorting: 0.4, bkfixMarge: 0.2, eenmaligeKorting: 0 };
const geen = { bed1: '', bed2: '' };
const wit = { select: '', custom: '' };

const baseRolluik = {
  type: 'Ecoroll_L', aantal: 1, breedte: 2000, hoogte: 1500, plaatsing: 'idd' as const,
  geleider: '', kasttype: 'afgeschuind 45°', motor: '', mkabel: '' as const,
  lamel: 'standaard' as const, lamelKleur: '', koppelen: '', bereik: 'Goed', onderlat: 'Design onderlat',
  borenJa: false, zonnepaneelJa: false, kleur: wit, kleurOmkasting: '',
  bediening: geen, opmerkingen: '', vrijeOpties: [], marges: M50,
};

describe('golden: rolluik', () => {
  it('Ecoroll-L 2000×1500 IDD: bestelmaat 1994×1496 → raster 2000×1500 = €899', () => {
    const r = calcRolluik(baseRolluik);
    expect(r.ok).toBe(true);
    expect(r.bestelmaat).toEqual({ b: 1994, h: 1496 });
    expect(r.calculatiemaat).toEqual({ b: 2000, h: 1500 });
    expect(r.productSubtotal).toBe(899);
    expect(r.aankoop).toBeCloseTo(449.5, 2);
    expect(r.verkoop).toBeCloseTo(561.875, 3);
    expect(r.plaatsingTotaal).toBe(150); // 50 + 100 per type
    expect(r.uwVerkoop).toBeCloseTo(711.875, 3);
  });
  it('Ecoroll-L 2000×1500 ODD: kasthoogte 165 → bestel 2110×1665 → raster 2200×1700 = €964 (géén fantoomkastprijs)', () => {
    const r = calcRolluik({ ...baseRolluik, plaatsing: 'odd' });
    expect(r.bestelmaat).toEqual({ b: 2110, h: 1665 });
    expect(r.calculatiemaat).toEqual({ b: 2200, h: 1700 });
    expect(r.productSubtotal).toBe(964);
    expect(r.uwVerkoop).toBeCloseTo(964 * 0.5 / 0.8 + 150, 3);
  });
  it('bediening situo 5 pure: +€67 verkoop, +€40,20 aankoop', () => {
    const r = calcRolluik({ ...baseRolluik, bediening: { bed1: 'situo 5 pure', bed2: '' } });
    expect(r.uwVerkoop).toBeCloseTo(711.875 + 67, 3);
    expect(r.aankoop).toBeCloseTo(449.5 + 40.2, 2);
  });
});

describe('golden: screen', () => {
  it('Nova solar 103 1000×1500: dagmaat-raster 1000×1600 = €1099, motor vergrendeld', () => {
    const r = calcScreen({
      type: 'Nova solar 103', aantal: 1, breedte: 1000, hoogte: 1500, plaatsing: 'idd',
      geleider: '', onderlatHoog: false, borenJa: false, omkasting: 'recht', motor: 'LT-12',
      zonnepaneelJa: false, bereik: 'Goed', doek: 'standaard', koppelen: '', kleur: wit,
      bediening: geen, opmerkingen: '', vrijeOpties: [], marges: M50,
    });
    expect(r.ok).toBe(true);
    expect(r.calculatiemaat).toEqual({ b: 1000, h: 1600 });
    expect(r.productSubtotal).toBe(1099);            // RS100 Solar io geforceerd (0 meerprijs)
    expect(String(r.detail.motor)).toBe('RS100 Solar io');
    expect(r.plaatsingTotaal).toBe(150);             // 100 + 50 solar
    expect(r.uwVerkoop).toBeCloseTo(1099 * 0.5 / 0.8 + 150, 3);
  });
  it('screen doekgroep C = €110 (catalogus-fix, was 220)', () => {
    const a = calcScreen({
      type: 'Nova 83', aantal: 1, breedte: 1500, hoogte: 1500, plaatsing: 'idd',
      geleider: '', onderlatHoog: false, borenJa: false, omkasting: 'recht', motor: '',
      zonnepaneelJa: false, bereik: 'Goed', doek: 'groep C', koppelen: '', kleur: wit,
      bediening: geen, opmerkingen: '', vrijeOpties: [], marges: M50,
    });
    expect(a.regels.find((x) => x.label.includes('Doek'))?.bedrag).toBe(110);
  });
});

describe('golden: knikarm', () => {
  const basePisano = {
    type: 'Pisano 230', aantal: 1, breedte: 2250, uitval: 1500,
    verdieping: '0', bereik: 'Goed', gevel: 'baksteen', muursteun: '', muurstripJa: false,
    doek: 'standaard', led: 'Nee', kleur: wit, bediening: geen,
    opmerkingen: '', vrijeOpties: [], marges: M50,
  };
  it('Pisano 230 2250×1500 = €1724 (mei-prijs), plaatsing €475', () => {
    const r = calcKnikarm(basePisano);
    expect(r.ok).toBe(true);
    expect(r.productSubtotal).toBe(1724);
    expect(r.plaatsingTotaal).toBe(475); // 2.25×100 + 250
    expect(r.uwVerkoop).toBeCloseTo(1724 * 0.5 / 0.8 + 475, 3);
  });
  it('Pisano kleurregels: std gratis · RAL +140 · andere +675', () => {
    expect(calcKnikarm({ ...basePisano, kleur: { select: 'RAL 9001', custom: '' } }).productSubtotal).toBe(1724);
    expect(calcKnikarm({ ...basePisano, kleur: { select: 'RAL 7016', custom: '' } }).productSubtotal).toBe(1724 + 140);
    expect(calcKnikarm({ ...basePisano, kleur: { select: 'andere', custom: 'RAL 6005 mat' } }).productSubtotal).toBe(1724 + 675);
  });
});

describe('golden: veranda', () => {
  const baseVinci = {
    type: 'Vinci 250 met zip', aantal: 1, breedte: 4250, uitval: 3000,
    motor: 'Sunea io' as const, steun: 'Geen', steunAantal: 0, mkabel: '' as const,
    gevel: '', doek: '', bereik: '', led: '', extras: [], kleur: wit,
    bediening: geen, opmerkingen: '', vrijeOpties: [], marges: M40,
  };
  it('Vinci 250 met zip 4250×3000 → raster 4500×3000 = €4572, pergola-plaatsing €850', () => {
    const r = calcVeranda(baseVinci);
    expect(r.ok).toBe(true);
    expect(r.calculatiemaat).toEqual({ b: 4500, h: 3000 });
    expect(r.productSubtotal).toBe(4572);
    expect(r.aankoop).toBeCloseTo(4572 * 0.6, 2);
    expect(r.uwVerkoop).toBeCloseTo(4572 * 0.6 / 0.8 + 850, 2);
  });
  it('Kevins case: met zip 4140×2840, RAL 9005 SL, hout, situo 1 → €4.316', () => {
    const r = calcVeranda({
      ...baseVinci, breedte: 4140, uitval: 2840, gevel: 'hout',
      kleur: { select: 'RAL 9005 SL', custom: '' },
      bediening: { bed1: 'situo 1 pure', bed2: '' },
    });
    expect(r.calculatiemaat).toEqual({ b: 4500, h: 3000 });
    expect(r.productSubtotal).toBe(4572);           // kleur in collectie, hout €0
    expect(r.uwVerkoop).toBeCloseTo(4572 * 0.75 + 850 + 37, 2); // = 4316
  });
  it('serrezonwering (Vinci 150) houdt €350 plaatsing', () => {
    const r = calcVeranda({ ...baseVinci, type: 'Vinci 150 onderliggend', breedte: 4000, uitval: 3000 });
    expect(r.plaatsingTotaal).toBe(350);
  });
  it('Stilo 103 1000×1500 = €1596 (eigen 250mm-raster)', () => {
    const r = calcVeranda({ ...baseVinci, type: 'Stilo 103 onderliggend', breedte: 1000, uitval: 1500 });
    expect(r.ok).toBe(true);
    expect(r.calculatiemaat).toEqual({ b: 1000, h: 1500 });
    expect(r.productSubtotal).toBe(1596);
  });
  it('uitval 1200 → toeslag €245 (catalogus, gefixte dode code)', () => {
    const r = calcVeranda({ ...baseVinci, type: 'Vinci 150 onderliggend', breedte: 1500, uitval: 1200 });
    expect(r.regels.find((x) => x.label.includes('kleine uitval'))?.bedrag).toBe(245);
  });
  it('Orea WT = −€60', () => {
    const a = calcVeranda(baseVinci);
    const b = calcVeranda({ ...baseVinci, motor: 'Orea WT' });
    expect(a.productSubtotal - b.productSubtotal).toBe(60);
  });
});

describe('golden: afstandsbediening', () => {
  it('Tahoma: verkoop €375 vast, aankoop €156 (260×0,6)', () => {
    const r = calcAfstandsbediening({ type: 'tahoma switch (incl koppelen)', aantal: 1, eenmaligeKorting: 0, opmerkingen: '' });
    expect(r.uwVerkoop).toBe(375);
    expect(r.aankoop).toBeCloseTo(156, 2);
  });
  it('Situo 5 ×2: verkoop €134, aankoop €80,40', () => {
    const r = calcAfstandsbediening({ type: 'situo 5 pure', aantal: 2, eenmaligeKorting: 0, opmerkingen: '' });
    expect(r.uwVerkoop).toBe(134);
    expect(r.aankoop).toBeCloseTo(80.4, 2);
  });
});
