/**
 * Wat de Historie van een bewaard item laat terugzien. Alles komt uit het item zelf, zodat een oude
 * offerte toont wat ze toen was — ook als de prijslijsten intussen veranderd zijn.
 */
import { describe, expect, it } from 'vitest';
import { itemMarge, itemSecties, itemTitel } from '../itemOverzicht';
import { calcRolluik } from '../rolluik';
import { calcGlaswand } from '../glaswand';
import type { Marges, OfferItem } from '../types';

const M50: Marges = { allroundKorting: 0.5, bkfixMarge: 0.2, eenmaligeKorting: 0 };
const geen = { bed1: '', bed2: '' };

const rolluik = (over: Partial<Parameters<typeof calcRolluik>[0]> = {}): OfferItem => ({
  ...calcRolluik({
    type: 'Ecoroll_L', aantal: 2, breedte: 2000, hoogte: 1500, plaatsing: 'idd',
    geleider: '', kasttype: 'afgeschuind 45°', motor: '', mkabel: '', lamel: 'standaard',
    lamelKleur: '', koppelen: '', bereik: 'Goed', onderlat: 'Design onderlat',
    borenJa: false, zonnepaneelJa: false, kleur: { select: 'RAL 7016 antraciet', custom: '' },
    kleurOmkasting: '', bediening: { bed1: 'Tahoma switch', bed2: '' },
    opmerkingen: 'Levering langs de achterkant', vrijeOpties: [], marges: M50,
    bedieningskant: 'Rechts', ...over,
  }),
  id: 'r1', kind: 'rolluik', input: {},
});

const sectie = (it: OfferItem, titel: string) => itemSecties(it).find((s) => s.titel === titel);
const rij = (it: OfferItem, titel: string, label: string) =>
  (sectie(it, titel)?.rijen ?? []).find(([l]) => l === label)?.[1];

describe('overzicht van een bewaard offerte-item', () => {
  it('toont maat, aantal en de maten waarmee gerekend en besteld is', () => {
    const it2 = rolluik();
    expect(itemTitel(it2)).toBe('2× Rolluik · Ecoroll-L · 2000×1500mm');
    expect(rij(it2, 'Maat & aantal', 'Aantal')).toBe('2');
    expect(rij(it2, 'Maat & aantal', 'Dagmaat')).toBe('2000×1500mm');
    expect(rij(it2, 'Maat & aantal', 'Calculatiemaat (prijsopzoeking)')).toBe('2000×1500mm');
    expect(rij(it2, 'Maat & aantal', 'Bestelmaat (fabrikant)')).toBe('1994×1496mm');
  });

  it('toont kleur, bediening en de opties zoals ze op de offerte stonden', () => {
    const it2 = rolluik();
    expect(rij(it2, 'Uitvoering & opties', 'Kleur')).toBe('RAL 7016 antraciet');
    expect(rij(it2, 'Uitvoering & opties', 'Bediening')).toBe('Tahoma switch');
    expect(sectie(it2, 'Uitvoering & opties')?.punten).toEqual(it2.options);
  });

  it('toont de bestelspecificaties die ook op de bestelbon komen', () => {
    expect(rij(rolluik(), 'Bestelspecificaties', 'Bedieningskant')).toBe('Rechts');
  });

  it('toont de prijsopbouw met de marges van toen, en de marge zonder plaatsing', () => {
    const it2 = rolluik();
    const prijs = sectie(it2, 'Prijsopbouw')!;
    // elke prijsregel van de berekening staat erin
    for (const r of it2.regels) expect(prijs.rijen!.some(([l]) => l.startsWith(r.label))).toBe(true);
    expect(rij(it2, 'Prijsopbouw', 'Leverancierskorting')).toBe('50%');
    expect(rij(it2, 'Prijsopbouw', 'BKfix-marge')).toBe('20%');
    expect(rij(it2, 'Prijsopbouw', 'Aankoop')).toBe(`€${it2.aankoop.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    const m = itemMarge(it2);
    expect(m.bedrag).toBeCloseTo(it2.uwVerkoop - it2.aankoop - it2.plaatsingTotaal, 2);
    expect(rij(it2, 'Prijsopbouw', 'Marge (product, zonder plaatsing)')).toContain('%');
  });

  it('toont de opmerking en laat lege secties weg', () => {
    expect(sectie(rolluik(), 'Opmerkingen')?.punten).toEqual(['Levering langs de achterkant']);
    expect(sectie(rolluik({ opmerkingen: '' }), 'Opmerkingen')).toBeUndefined();
  });

  it('bewaart de waarschuwingen van toen, bv. een maat die bij de leverancier bevestigd moest worden', () => {
    const wand = calcGlaswand({
      merk: 'ES Systems', aantal: 1, dagmaatBreedte: 3000, dagmaatHoogte: 1900,
      kokerLinks: 0, kokerMidden: 0, kokerRechts: 0, aantalPanelen: 3, paneelModus: 'standaard',
      paneelBreedte: 1000, overlap: 30, steellook: false, glas: 'helder', sporen: 0, raillengte: 0,
      glassoort: 'standaard', sluiting: 'geen', kleur: { select: '', custom: '' }, opties: [],
      extraLijnen: [], bediening: geen, opmerkingen: '', vrijeOpties: [],
      marges: { allroundKorting: 0.4, bkfixMarge: 0.2, eenmaligeKorting: 0 },
      voorbereidingPersonen: 0, voorbereidingUren: 0,
    });
    const it2: OfferItem = { ...wand, id: 'g1', kind: 'glaswand', input: {} };
    expect(it2.warnings.length).toBeGreaterThan(0);
    expect(sectie(it2, 'Waarschuwingen bij het berekenen')?.punten).toEqual(it2.warnings);
  });

  it('verdraagt een oud item zonder de nieuwere velden', () => {
    const oud = {
      id: 'x', kind: 'artikel', input: {}, ok: true, errors: [], warnings: [],
      product: 'Los artikel', type: '', aantal: 1, breedte: 0,
      regels: [], productSubtotal: 100, plaatsingTotaal: 0, bedieningTotaal: 0, bedieningAankoop: 0,
      marges: { allroundKorting: 0, bkfixMarge: 0.2, eenmaligeKorting: 0 },
      aankoop: 100, verkoop: 125, uwVerkoop: 125, options: [], opmerkingen: '', detail: {},
      bediening: geen, kleur: { select: '', custom: '' },
    } as unknown as OfferItem;
    const secties = itemSecties(oud);
    expect(secties.map((s) => s.titel)).toEqual(['Maat & aantal', 'Prijsopbouw']);
    expect(rij(oud, 'Prijsopbouw', 'Uw verkoop')).toBe('€125,00');
  });
});
