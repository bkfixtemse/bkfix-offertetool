/**
 * Wat de Historie van een bewaard item laat terugzien. Alles komt uit het item zelf, zodat een oude
 * offerte toont wat ze toen was — ook als de prijslijsten intussen veranderd zijn.
 */
import { describe, expect, it } from 'vitest';
import { itemMarge, itemPanelen, itemSecties, itemTitel } from '../itemOverzicht';
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

describe('glaswand: paneel per paneel terugkijken', () => {
  const wand = (over: Record<string, unknown> = {}): OfferItem => {
    const r = calcGlaswand({
      merk: 'ES Systems', aantal: 1, dagmaatBreedte: 3200, dagmaatHoogte: 2500,
      // paneelVerdeling gaat vóór paneelModus: zo mengen we standaardmaten met maatwerk.
      kokerLinks: 0, kokerMidden: 0, kokerRechts: 0, aantalPanelen: 4, paneelModus: 'maatwerk',
      paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 745, aantal: 2 }],
      paneelBreedte: 900, overlap: 30, steellook: false, glas: 'helder', sporen: 0, raillengte: 0,
      glassoort: 'standaard', sluiting: 'geen', kleur: { select: '', custom: '' }, opties: [],
      extraLijnen: [], bediening: geen, opmerkingen: '', vrijeOpties: [],
      marges: { allroundKorting: 0.4, bkfixMarge: 0.2, eenmaligeKorting: 0 },
      voorbereidingPersonen: 0, voorbereidingUren: 0, ...over,
    } as unknown as Parameters<typeof calcGlaswand>[0]);
    return { ...r, id: 'w', kind: 'glaswand', input: {} };
  };

  it('ES gemengde wand: 2× 900 standaard en 2× 745 maatwerk, met de glasmaat erbij', () => {
    const p = itemPanelen(wand());
    expect(p.map((x) => [x.breedte, x.standaard])).toEqual([[900, true], [900, true], [745, false], [745, false]]);
    expect(rij(wand(), 'Panelen', 'Aantal panelen')).toBe('4 (2 standaard, 2 maatwerk)');
    expect(rij(wand(), 'Panelen', 'Paneel 1')).toBe('900mm · standaardmaat · glas 900×2400mm');
    expect(rij(wand(), 'Panelen', 'Paneel 3')).toBe('745mm · maatwerk · glas 745×2400mm');
    // ES: alle glas is 100mm kleiner dan de dagmaat, standaard of niet.
    expect(rij(wand(), 'Panelen', 'Overlap')).toBe('30mm');
  });

  it('Deponti: 640 is standaard op 2500 en maatwerk op 2350 — de bewaarde soort volgt de lijst', () => {
    const op2500 = wand({ merk: 'Deponti', dagmaatBreedte: 3145, dagmaatHoogte: 2500, aantalPanelen: 4,
      paneelVerdeling: [{ breedte: 640, aantal: 2 }, { breedte: 980, aantal: 2 }] });
    expect(itemPanelen(op2500).map((x) => x.standaard)).toEqual([true, true, true, true]);
    const op2350 = wand({ merk: 'Deponti', dagmaatBreedte: 3145, dagmaatHoogte: 2350, aantalPanelen: 4,
      paneelVerdeling: [{ breedte: 640, aantal: 2 }, { breedte: 980, aantal: 2 }] });
    expect(itemPanelen(op2350).map((x) => [x.breedte, x.standaard]))
      .toEqual([[640, false], [640, false], [980, true], [980, true]]);
    expect(rij(op2350, 'Panelen', 'Aantal panelen')).toBe('4 (2 standaard, 2 maatwerk)');
    // Deponti bestelt een standaardpaneel als artikel op de inbouwhoogte, maatwerkglas 85mm kleiner.
    expect(rij(op2350, 'Panelen', 'Paneel 3')).toBe('980mm · standaardmaat · standaardpaneel 980×2350mm');
    expect(rij(op2350, 'Panelen', 'Paneel 1')).toBe('640mm · maatwerk · glas 640×2265mm');
    expect(rij(op2500, 'Panelen', 'Paneel 1')).toBe('640mm · standaardmaat · standaardpaneel 640×2500mm');
  });

  it('grijs glas is bij Deponti altijd maatwerk, ook op een standaardbreedte', () => {
    const grijs = wand({ merk: 'Deponti', glassoort: 'grijs', dagmaatHoogte: 2500, aantalPanelen: 2,
      paneelVerdeling: [{ breedte: 980, aantal: 2 }] });
    expect(itemPanelen(grijs).every((x) => !x.standaard)).toBe(true);
    expect(rij(grijs, 'Panelen', 'Aantal panelen')).toBe('2 (allemaal maatwerkglas)');
  });

  it('een oude bewaarde wand zonder panelenSoort: de soort wordt afgeleid met dezelfde regel', () => {
    const nieuw = wand();
    const oud = { ...nieuw, detail: { ...nieuw.detail, panelenSoort: '' } } as OfferItem;
    expect(itemPanelen(oud).map((x) => x.standaard)).toEqual(itemPanelen(nieuw).map((x) => x.standaard));
  });

  it('een item zonder panelen (bv. een rolluik) krijgt geen panelensectie', () => {
    expect(itemPanelen(rolluik())).toEqual([]);
    expect(sectie(rolluik(), 'Panelen')).toBeUndefined();
  });
});
