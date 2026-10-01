/**
 * Kastmaten op de offerte. De maten komen uit de Allround catalogus 2026 (versie mei):
 * screens blz. 6.15 / 6.17 / 6.19 / 6.21, rolluiken blz. 7.4 (maximale hoogte per kasttype).
 */
import { describe, expect, it } from 'vitest';
import { calcRolluik, getKasthoogte } from '../rolluik';
import { calcScreen } from '../screen';
import { bestelSpecPairs } from '../bestelspec';
import { tlDescription } from '../../teamleader/descriptions';
import type { Marges, OfferItem } from '../types';

const M50: Marges = { allroundKorting: 0.5, bkfixMarge: 0.2, eenmaligeKorting: 0 };
const geen = { bed1: '', bed2: '' };
const wit = { select: '', custom: '' };

const screen = (over: Partial<Parameters<typeof calcScreen>[0]> = {}) => calcScreen({
  type: 'Nova 103', aantal: 1, breedte: 2000, hoogte: 2000, plaatsing: 'odd',
  geleider: '', onderlatHoog: false, borenJa: false, omkasting: 'recht', motor: '',
  zonnepaneelJa: false, bereik: 'Goed', doek: 'standaard', koppelen: '', kleur: wit,
  bediening: geen, opmerkingen: '', vrijeOpties: [], marges: M50, ...over,
});

const rolluik = (over: Partial<Parameters<typeof calcRolluik>[0]> = {}) => calcRolluik({
  type: 'Ecoroll_L', aantal: 1, breedte: 2000, hoogte: 1500, plaatsing: 'odd',
  geleider: '', kasttype: 'afgeschuind 45°', motor: '', mkabel: '', lamel: 'standaard',
  lamelKleur: '', koppelen: '', bereik: 'Goed', onderlat: 'Design onderlat',
  borenJa: false, zonnepaneelJa: false, kleur: wit, kleurOmkasting: '',
  bediening: geen, opmerkingen: '', vrijeOpties: [], marges: M50, ...over,
});

const item = (r: { product: string }): OfferItem => ({ ...r, id: 'x', kind: 'screen', input: {} } as OfferItem);

describe('screens: de kastmaat van het gekozen type', () => {
  it('elk Nova-type heeft zijn eigen kastmaat, recht én afgerond (catalogus 6.15-6.19)', () => {
    expect(screen({ type: 'Nova 83' }).detail.kastmaat).toBe('83 × 83mm');
    expect(screen({ type: 'Nova 83', omkasting: 'afgerond' }).detail.kastmaat).toBe('88 × 83mm');
    expect(screen({ type: 'Nova 103' }).detail.kastmaat).toBe('103 × 103mm');
    expect(screen({ type: 'Nova 103', omkasting: 'afgerond' }).detail.kastmaat).toBe('109 × 103mm');
    expect(screen({ type: 'Nova 123', breedte: 2000, hoogte: 2000 }).detail.kastmaat).toBe('123 × 123mm');
    expect(screen({ type: 'Nova 123', omkasting: 'afgerond' }).detail.kastmaat).toBe('131 × 123mm');
  });

  it('de solar bestaat enkel met rechte omkasting: dat meldt de berekening (catalogus 6.21)', () => {
    const recht = screen({ type: 'Nova solar 103' });
    expect(recht.detail.kastmaat).toBe('116 × 109mm');
    expect(recht.warnings.join(' ')).not.toMatch(/omkasting/);
    const afgerond = screen({ type: 'Nova solar 103', omkasting: 'afgerond' });
    expect(afgerond.detail.kastmaat).toBe('116 × 109mm');
    expect(afgerond.warnings.join(' ')).toMatch(/enkel met rechte omkasting/);
  });

  it('de kastmaat staat in de opties, op de bestelbon en in de offertetekst', () => {
    const r = screen({ type: 'Nova 83' });
    expect(r.options).toContain('Omkasting: recht (kast 83 × 83mm)');
    expect(bestelSpecPairs(item(r))).toContainEqual(['Kastmaat', '83 × 83mm']);
    const tekst = tlDescription(item(r));
    expect(tekst).toContain('Rechte geëxtrudeerde omkasting (83 × 83mm)');
    // vroeger stond op elke screenofferte 103×103, ongeacht het type
    expect(tekst).not.toContain('103×103');
  });
});

describe('rolluiken: de kasthoogte volgt uit serie en hoogte (catalogus 7.4)', () => {
  it('L-lamel: 150 tot 1340, 165 tot 1900, 180 tot 2360, daarboven 205', () => {
    expect(getKasthoogte('Ecoroll_L', 1340)).toBe(150);
    expect(getKasthoogte('Ecoroll_L', 1341)).toBe(165);
    expect(getKasthoogte('Ecoroll_L', 1900)).toBe(165);
    expect(getKasthoogte('Ecoroll_L', 2360)).toBe(180);
    expect(getKasthoogte('Ecoroll_L', 2500)).toBe(205);
  });

  it('M-lamel: 150 tot 1800, 165 tot 2350, daarboven 180', () => {
    expect(getKasthoogte('Ecoroll_M', 1800)).toBe(150);
    expect(getKasthoogte('Ecoroll_M', 2350)).toBe(165);
    expect(getKasthoogte('Ecoroll_M', 2400)).toBe(180);
  });

  it('de kastmaat staat in de opties, op de bestelbon en in de offertetekst', () => {
    const r = rolluik({ hoogte: 1500 });
    expect(r.detail.kasthoogte).toBe(165);
    expect(r.detail.kastmaat).toBe('165mm');
    expect(r.options).toContain('Kast: afgeschuind 45° (165mm)');
    const it2 = { ...item(r), kind: 'rolluik' } as OfferItem;
    expect(bestelSpecPairs(it2)).toContainEqual(['Kastmaat', '165mm']);
    expect(tlDescription(it2)).toContain('afgeschuind 45° — <strong>165mm</strong>');
  });

  it('een Solar-rolluik heeft altijd een kast van 180mm', () => {
    const r = rolluik({ type: 'Ecoroll_L_Solar', hoogte: 1200, motor: 'RS100 Solar io' });
    expect(r.detail.kastmaat).toBe('180mm');
  });

  it('een hogere rolluik krijgt een grotere kast: 2500mm hoog → 205mm', () => {
    expect(rolluik({ hoogte: 2500 }).detail.kastmaat).toBe('205mm');
  });
});
