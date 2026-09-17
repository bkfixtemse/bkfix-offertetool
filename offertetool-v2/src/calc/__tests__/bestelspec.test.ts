import { describe, expect, it } from 'vitest';
import { calcRolluik } from '../rolluik';
import { calcGlaswand, type GlaswandInput } from '../glaswand';
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

describe('bestelspecificaties glaswand', () => {
  const wand: GlaswandInput = {
    merk: 'ES Systems', aantal: 1, dagmaatBreedte: 2930, dagmaatHoogte: 2400,
    kokerLinks: 0, kokerMidden: 0, kokerRechts: 0, aantalPanelen: 3,
    paneelModus: 'standaard', paneelBreedte: 1000, overlap: 30, steellook: false,
    glas: 'helder', sporen: 0, raillengte: 0, glassoort: 'standaard', sluiting: 'geen',
    kleur: { select: 'RAL 9005 structuur', custom: '' }, opties: [], extraLijnen: [],
    bediening: { bed1: '', bed2: '' }, opmerkingen: '', vrijeOpties: [],
    voorbereidingPersonen: 0, voorbereidingUren: 0,
    marges: { allroundKorting: 0.4, bkfixMarge: 0.2, eenmaligeKorting: 0 },
  };
  const item = (): OfferItem => ({ ...calcGlaswand(wand), id: 'g', kind: 'glaswand', input: {} });

  it('de maten die naar ES gaan staan op de bestelbon', () => {
    const pairs = bestelSpecPairs(item());
    expect(pairs).toContainEqual(['Merk', 'ES Systems']);
    expect(pairs).toContainEqual(['Uitvoering glas', 'standaard']);
    expect(pairs).toContainEqual(['Aantal panelen', '3']);
    expect(pairs).toContainEqual(['Paneelbreedte (mm)', '1000']);
    expect(pairs).toContainEqual(['Glas-/paneelhoogte (mm)', '2300']);
    expect(pairs).toContainEqual(['Overlap (mm)', '35']);
    expect(pairs).toContainEqual(['Railbreedte (mm)', '69']);
  });

  it('Deponti-velden blijven weg bij een ES-wand', () => {
    const labels = bestelSpecPairs(item()).map(([l]) => l);
    expect(labels).not.toContain('Aantal sporen');
    expect(labels).not.toContain('Raillengte (mm)');
    expect(labels).not.toContain('Sluiting');
    expect(bestelSpecString(item())).toMatch(/Paneelbreedte/);
  });
});
