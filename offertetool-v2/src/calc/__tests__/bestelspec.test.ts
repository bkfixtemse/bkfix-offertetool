import { describe, expect, it } from 'vitest';
import { calcRolluik } from '../rolluik';
import { bestelSpecPairs, bestelSpecString } from '../bestelspec';
import type { OfferItem } from '../types';

const M = { allroundKorting: 0.5, bkfixMarge: 0.2, eenmaligeKorting: 0 };
const BASE = {
  type: 'Ecoroll_L', aantal: 1, breedte: 2000, hoogte: 1500, plaatsing: 'idd' as const,
  geleider: '', kasttype: 'afgeschuind 45°', motor: '', mkabel: '' as const, lamel: 'standaard' as const,
  lamelKleur: '', koppelen: '', bereik: 'Goed', onderlat: 'Design onderlat',
  borenJa: false, zonnepaneelJa: false, kleur: { select: '', custom: '' }, kleurOmkasting: '',
  bediening: { bed1: '', bed2: '' }, opmerkingen: '', vrijeOpties: [], marges: M,
};
const asItem = (r: ReturnType<typeof calcRolluik>): OfferItem => ({ ...r, id: 'x', kind: 'rolluik', input: {} });

describe('bestelspecificaties', () => {
  it('spec-velden komen op de bestelbon terecht', () => {
    const r = calcRolluik({ ...BASE, bedieningskant: 'Rechts', kabeluitvoer: 'Kapsteun', handBediening: 'Band binnen' });
    const pairs = bestelSpecPairs(asItem(r));
    expect(pairs).toContainEqual(['Bedieningskant', 'Rechts']);
    expect(pairs).toContainEqual(['Kabeluitvoer', 'Kapsteun']);
    expect(bestelSpecString(asItem(r))).toContain('Handmatige bediening: Band binnen');
  });

  it('lege spec-velden verschijnen niet', () => {
    const r = calcRolluik(BASE);
    expect(bestelSpecPairs(asItem(r))).toHaveLength(0);
  });

  it('spec-velden hebben GEEN prijsimpact', () => {
    const zonder = calcRolluik(BASE);
    const met = calcRolluik({ ...BASE, bedieningskant: 'Links', kabeluitvoer: 'Voorkap', handBediening: 'Band binnen', voorborenZijde: 'Beide' });
    expect(met.uwVerkoop).toBe(zonder.uwVerkoop);
    expect(met.aankoop).toBe(zonder.aankoop);
    expect(met.productSubtotal).toBe(zonder.productSubtotal);
  });
});
