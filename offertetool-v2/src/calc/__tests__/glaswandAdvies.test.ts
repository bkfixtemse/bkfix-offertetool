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

});

describe('advies — waar de tool goedkoper uitkomt dan wat er toen besteld werd', () => {
  // Bij deze twee bestelde BKfix alles in maatwerk. Met standaardglas plus opvulpanelen, per paneel
  // afgerekend, kan dezelfde opening goedkoper. De bestelde indeling blijft in de maatwerklijst staan.
  it('BB261030 (4091): 2138mm, overlap 50 → 1× 900 + 2× 669 voor €620 i.p.v. 3× 746 voor €720', () => {
    const a = advies({ dagmaatBreedte: 2138, overlap: 50 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([669, 669, 900]);   // (2138 + 2×50 − 900) / 2
    expect(a.beste?.overlap).toBe(50);
    expect(a.beste?.aankoop).toBe(620);                               // (700 + 2×1200) / 3 × 0,6
    const besteld = a.maatwerk.find((m) => m.panelen.length === 3);
    expect(besteld?.panelen).toEqual([746, 746, 746]);
    expect(besteld?.aankoop).toBe(720);
  });

  it('BB260696 (3381): 3182mm, overlap 30 → 2× 900 + 2× 736 voor €760,50 i.p.v. 4× 818 voor €960', () => {
    const a = advies({ dagmaatBreedte: 3182, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([736, 736, 900, 900]);
    expect(a.beste?.aankoop).toBe(760.5);                             // (2×935 + 2×1600) / 4 × 0,6
    const besteld = a.maatwerk.find((m) => m.panelen.length === 4);
    expect(besteld?.panelen).toEqual([818, 818, 818, 818]);           // ES bestelde 817
    expect(besteld?.aankoop).toBe(960);
  });
});

describe('advies — alle combinaties worden overwogen', () => {
  it('twee opvulpanelen: 4061mm → 3× 900 + 2× 741 voor €900,12 i.p.v. 5× 836 maatwerk voor €1200', () => {
    const a = advies({ dagmaatBreedte: 4061, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([741, 741, 900, 900, 900]);
    expect(a.beste?.aankoop).toBe(900.12);                            // (3×1167 + 2×2000) / 5 × 0,6
    expect(a.beste?.krap).toBe(false);
  });

  it('drie verschillende standaardmaten: 2820mm → 900 + 980 + 1000 op exact 30mm', () => {
    const a = advies({ dagmaatBreedte: 2820, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([900, 980, 1000]);
    expect(a.beste?.overlap).toBe(30);
    expect(a.beste?.meldingen).toEqual([]);
  });

  it('bij gelijke prijs ligt de keuze vast, niet op de volgorde van berekenen', () => {
    // 2× 900 + 2× 736 en 2× 980 + 2× 656 kosten allebei €760,50: het breedste smalste paneel wint
    const a = advies({ dagmaatBreedte: 3182, overlap: 30 });
    expect(Math.min(...a.beste!.panelen)).toBe(736);
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

  it('de controle telt terug op tot de wandbreedte, op de afronding na', () => {
    for (const breedte of [2800, 5500, 5501, 5503]) {
      const a = advies({ dagmaatBreedte: breedte, overlap: 30 });
      for (const m of [...a.maatwerk, ...a.mix].filter((x) => x.mogelijk)) {
        // elk paneel wordt op hele mm afgerond (hooguit 0,5mm): samen hooguit n/2 mm
        expect(Math.abs(m.controle - breedte), `${breedte} ${m.titel}`).toBeLessThanOrEqual(Math.ceil(m.panelen.length / 2));
        expect(m.controleKlopt, `${breedte} ${m.titel}`).toBe(true);
      }
    }
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
    // 2138mm, overlap 50: 2× 900 + 438mm kost €520, goedkoper dan de beste (€620), maar 438mm is ongewoon smal
    const smal = calcGlaswand({
      ...basis, dagmaatBreedte: 2138, ...indelingNaarInvoer({
        paneelModus: 'mix', aantalPanelen: 3, paneelBreedte: 0, overlap: 50,
        paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 0, aantal: 1 }],
      }),
    });
    expect(smal.ok).toBe(true);
    expect(String(smal.detail.panelenLijst)).toBe('900,900,438');
    const a = advies({ dagmaatBreedte: 2138, overlap: 50 });
    expect(smal.aankoop).toBeLessThan(a.beste!.aankoop);
    expect(a.beste?.krap).toBe(false);
  });

  it('elke mix-optie heeft een overlap binnen de marge van de gewenste', () => {
    const a = advies({ dagmaatBreedte: 2800, overlap: 30 });
    for (const m of a.mix) {
      expect(m.overlap).toBeGreaterThanOrEqual(20);
      expect(m.overlap).toBeLessThanOrEqual(50);
    }
  });

  it('de eenmalige korting van de regel verandert de voorstellen niet', () => {
    const zonder = advies({ dagmaatBreedte: 2800, overlap: 30 });
    const met = advies({ dagmaatBreedte: 2800, overlap: 30, marges: { ...basis.marges, eenmaligeKorting: 100 } });
    expect(met.beste?.verkoop).toBe(zonder.beste?.verkoop);
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
