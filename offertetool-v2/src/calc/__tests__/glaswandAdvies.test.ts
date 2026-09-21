/**
 * Indelingsadvies — getoetst aan de echte ES-bestelbonnen van 2026: de indeling die BKfix toen
 * bestelde, moet er als voorstel uit komen.
 */
import { describe, expect, it } from 'vitest';
import { calcGlaswand, type GlaswandInput } from '../glaswand';
import { glaswandAdvies, indelingNaarInvoer } from '../glaswandAdvies';

const basis: GlaswandInput = {
  merk: 'ES Systems', aantal: 1, dagmaatBreedte: 0, dagmaatHoogte: 2400,
  kokerLinks: 0, kokerMidden: 0, kokerRechts: 0, aantalPanelen: 3,
  paneelModus: 'maatwerk', paneelBreedte: 900, overlap: 30, steellook: false,
  glas: 'helder', sporen: 0, raillengte: 0, glassoort: 'standaard', sluiting: 'geen',
  kleur: { select: '', custom: '' }, opties: [], extraLijnen: [],
  bediening: { bed1: '', bed2: '' }, opmerkingen: '', vrijeOpties: [],
  voorbereidingPersonen: 0, voorbereidingUren: 0,
  marges: { allroundKorting: 0.4, bkfixMarge: 0.2, eenmaligeKorting: 0 },
};
const advies = (o: Partial<GlaswandInput>) => glaswandAdvies({ ...basis, ...o });
const gesorteerd = (p: number[]) => [...p].sort((a, b) => a - b);

describe('advies — de echte bestelbonnen komen er als beste uit', () => {
  it('BB260806 (3744): 2650mm, overlap 30 → 3× 900mm op 25mm, €420', () => {
    const a = advies({ dagmaatBreedte: 2650, overlap: 30 });
    expect(a.beste?.panelen).toEqual([900, 900, 900]);
    expect(a.beste?.overlap).toBe(25);
    expect(a.beste?.aankoop).toBe(420);
    expect(a.waarom).toMatch(/overlap wordt 25mm in plaats van 30mm/);
  });

  it('BB261000 (4035): 2930mm, overlap 35 → 3× 1000mm, €420', () => {
    const a = advies({ dagmaatBreedte: 2930, overlap: 35 });
    expect(a.beste?.panelen).toEqual([1000, 1000, 1000]);
    expect(a.beste?.overlap).toBe(35);
    expect(a.beste?.aankoop).toBe(420);
  });

  it('BB261030 (4091): 2138mm, overlap 50 → 3× 746mm maatwerk, €720', () => {
    const a = advies({ dagmaatBreedte: 2138, overlap: 50 });
    expect(a.beste?.soort).toBe('maatwerk');
    expect(a.beste?.panelen).toEqual([746, 746, 746]);
    expect(a.beste?.aankoop).toBe(720);
  });

  it('BB260696 (3381): 3182mm, overlap 30 → 4× 818mm maatwerk (ES bestelde 817)', () => {
    const a = advies({ dagmaatBreedte: 3182, overlap: 30 });
    expect(a.beste?.panelen).toEqual([818, 818, 818, 818]);
    expect(a.beste?.aankoop).toBe(960);
  });
});

describe('advies — maatwerk: altijd drie opties, met de paneelbreedtes', () => {
  it('2800mm, overlap 30 → 3, 4 en 5 panelen van 953, 723 en 584mm', () => {
    const a = advies({ dagmaatBreedte: 2800, overlap: 30 });
    expect(a.maatwerk.map((m) => m.panelen.length)).toEqual([3, 4, 5]);
    // (2800 + 2×30)/3 = 953,3 · (2800 + 3×30)/4 = 722,5 → 723 · (2800 + 4×30)/5 = 584
    expect(a.maatwerk.map((m) => m.panelen[0])).toEqual([953, 723, 584]);
    expect(a.maatwerk.every((m) => m.overlap === 30)).toBe(true);
    expect(a.maatwerk[2].krap).toBe(true);                  // 584mm < 600mm
  });

  it('de controle telt terug op tot de wandbreedte', () => {
    const a = advies({ dagmaatBreedte: 2800, overlap: 30 });
    for (const m of a.maatwerk) expect(Math.abs(m.controle - 2800)).toBeLessThanOrEqual(2);
  });

  it('niet-mogelijke aantallen blijven zichtbaar, met de reden', () => {
    const a = advies({ dagmaatBreedte: 5500, overlap: 30 });  // 6 panelen van 942, dan 7 en 8
    expect(a.maatwerk.map((m) => m.panelen.length)).toEqual([6, 7, 8]);
    expect(a.maatwerk[0].mogelijk).toBe(true);
    expect(a.maatwerk[1].mogelijk).toBe(false);
    expect(a.maatwerk[1].reden).toMatch(/6 rails/);
  });

  it('een te brede opening geeft geen beste optie, met uitleg', () => {
    const a = advies({ dagmaatBreedte: 7000, overlap: 30 });
    expect(a.beste).toBeNull();
    expect(a.maatwerk.every((m) => !m.mogelijk)).toBe(true);
    expect(a.waarom).toMatch(/meer dan 6 panelen nodig/);
  });

  it('kokers gaan van de wandbreedte af', () => {
    const a = advies({ dagmaatBreedte: 3000, kokerLinks: 110, overlap: 30 });
    expect(a.wandBreedte).toBe(2890);
    expect(a.maatwerk[0].wandBreedte).toBe(2890);
  });
});

describe('advies — mix & match', () => {
  it('2800mm, overlap 30: 1× 900 + 2× 980 op precies 30mm is het beste, €300 goedkoper dan maatwerk', () => {
    const a = advies({ dagmaatBreedte: 2800, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([900, 980, 980]);
    expect(a.beste?.overlap).toBe(30);
    expect(a.beste?.aankoop).toBe(420);
    expect(a.waarom).toMatch(/300,00 goedkoper/);
    expect(a.mix.length).toBeGreaterThanOrEqual(1);
    expect(a.mix.length).toBeLessThanOrEqual(3);
  });

  it('standaardglas met één maatwerkpaneel wordt per paneel afgerekend', () => {
    // 2534mm, overlap 30: 2× 900 + 1 opvulpaneel van 794mm → (2×700 + 1200)/3 = 866,67
    const a = advies({ dagmaatBreedte: 2534, overlap: 30 });
    const aanvulling = a.mix.find((m) => m.soort === 'aanvulling');
    expect(aanvulling).toBeDefined();
    expect(gesorteerd(aanvulling!.panelen)).toEqual([794, 900, 900]);
    expect(aanvulling!.lijst).toBe(866.67);
  });

  it('ongewoon smal glas komt achter een indeling zonder smal glas, ook als het goedkoper is', () => {
    // 2138mm, overlap 50: 2× 900 + 438mm is goedkoper (€520) maar ongewoon smal
    const a = advies({ dagmaatBreedte: 2138, overlap: 50 });
    const smal = a.mix.find((m) => m.krap);
    expect(smal?.aankoop).toBeLessThan(a.beste!.aankoop);
    expect(a.beste?.krap).toBe(false);
  });

  it('elke mix-optie heeft een overlap binnen de marge van de gewenste', () => {
    const a = advies({ dagmaatBreedte: 2800, overlap: 30 });
    for (const m of a.mix) {
      expect(m.overlap).toBeGreaterThanOrEqual(20);
      expect(m.overlap).toBeLessThanOrEqual(50);
    }
  });

  it('opties, kleur en voorbereiding van het formulier beïnvloeden de vergelijking niet', () => {
    const kaal = advies({ dagmaatBreedte: 2800, overlap: 30 });
    const volgeladen = advies({
      dagmaatBreedte: 2800, overlap: 30,
      opties: [{ id: 'meenemer', aantal: 3 }], kleur: { select: 'andere', custom: '' },
      extraLijnen: [{ omschrijving: 'Slot', bedrag: 56, netto: true }],
      voorbereidingPersonen: 2, voorbereidingUren: 8,
    });
    expect(volgeladen.beste?.panelen).toEqual(kaal.beste?.panelen);
    expect(volgeladen.beste?.aankoop).toBe(kaal.beste?.aankoop);
  });
});

describe('advies — "gebruik deze" rekent exact hetzelfde door', () => {
  it('elk voorstel levert na toepassen dezelfde panelen en dezelfde prijs op', () => {
    for (const breedte of [2138, 2534, 2650, 2800, 2930, 3182, 4500]) {
      const a = advies({ dagmaatBreedte: breedte, overlap: 30 });
      for (const o of [...a.maatwerk, ...a.mix]) {
        const r = calcGlaswand({ ...basis, dagmaatBreedte: breedte, ...indelingNaarInvoer(o.instelling) });
        expect(String(r.detail.panelenLijst), `${breedte} ${o.titel}`).toBe(o.panelen.join(','));
        expect(r.aankoop, `${breedte} ${o.titel}`).toBeCloseTo(o.aankoop, 2);
      }
    }
  });
});

describe('advies — zonder volledige invoer', () => {
  it('geen breedte of hoogte → geen voorstellen', () => {
    expect(advies({ dagmaatBreedte: 0 }).beste).toBeNull();
    expect(advies({ dagmaatBreedte: 2800, dagmaatHoogte: 0 }).maatwerk).toHaveLength(0);
  });
});
