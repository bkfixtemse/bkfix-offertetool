/**
 * Indelingsadvies — het overzicht over alle aantallen panelen, getoetst aan de echte ES-bestelbonnen
 * van 2026. Er is in de hele tab maar één definitie van "beste": die van de lijst per aantal.
 */
import { describe, expect, it } from 'vitest';
import { calcGlaswand, type GlaswandInput } from '../glaswand';
import { glaswandOptiesVoorAantal, glaswandOverzicht, indelingNaarInvoer } from '../glaswandAdvies';

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
const overzicht = (o: Partial<GlaswandInput>) => glaswandOverzicht({ ...basis, ...o });
const gesorteerd = (p: number[]) => [...p].sort((a, b) => a - b);

describe('overzicht — de echte bestelbonnen', () => {
  it('BB260806 (3744): 2650mm, overlap 30 → 3× 900mm op 25mm, €420', () => {
    const a = overzicht({ dagmaatBreedte: 2650, overlap: 30 });
    expect(a.beste?.panelen).toEqual([900, 900, 900]);
    expect(a.beste?.overlap).toBe(25);
    expect(a.beste?.aankoop).toBe(420);
    expect(a.waarom).toMatch(/overlap wordt 25mm in plaats van 30mm/);
  });

  it('BB261000 (4035): 2930mm, overlap 35 → 3× 1000mm, €420', () => {
    const a = overzicht({ dagmaatBreedte: 2930, overlap: 35 });
    expect(a.beste?.panelen).toEqual([1000, 1000, 1000]);
    expect(a.beste?.overlap).toBe(35);
    expect(a.beste?.aankoop).toBe(420);
  });

  // Bij deze twee bestelde BKfix alles in maatwerk. Met standaardglas plus opvulpanelen, per paneel
  // afgerekend, kan het goedkoper; de bestelde indeling staat in de lijst voor dat aantal panelen.
  it('BB261030 (4091): 2138mm, overlap 50 → 1× 900 + 2× 669 voor €620 i.p.v. 3× 746 voor €720', () => {
    const a = overzicht({ dagmaatBreedte: 2138, overlap: 50 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([669, 669, 900]);
    expect(a.beste?.aankoop).toBe(620);
    const besteld = a.perAantal[2].opties.find((o) => o.soort === 'maatwerk');
    expect(besteld?.panelen).toEqual([746, 746, 746]);
    expect(besteld?.aankoop).toBe(720);
  });

  it('BB260696 (3381): 3182mm, overlap 30 → 2× 900 + 2× 736 voor €760,50 i.p.v. 4× 818 voor €960', () => {
    const a = overzicht({ dagmaatBreedte: 3182, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([736, 736, 900, 900]);
    expect(a.beste?.aankoop).toBe(760.5);
    const besteld = a.perAantal[3].opties.find((o) => o.soort === 'maatwerk');
    expect(besteld?.panelen).toEqual([818, 818, 818, 818]);
    expect(besteld?.aankoop).toBe(960);
  });
});

describe('overzicht — één definitie van "beste"', () => {
  it('voor elk aantal is de beste in het overzicht dezelfde als bovenaan de lijst voor dat aantal', () => {
    for (const breedte of [2138, 2650, 2800, 3182, 4061, 5500]) {
      const a = overzicht({ dagmaatBreedte: breedte, overlap: 30 });
      expect(a.perAantal.map((p) => p.aantal)).toEqual([1, 2, 3, 4, 5, 6]);
      for (const p of a.perAantal) {
        const los = glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: breedte }, p.aantal);
        expect(p.beste?.panelen, `${breedte}/${p.aantal}`).toEqual(los.beste?.panelen);
      }
      // en de globale beste is de beste van zijn eigen aantal
      if (a.beste) expect(a.perAantal[a.beste.panelen.length - 1].beste).toBe(a.beste);
    }
  });

  it('beveelt nooit smal of te breed glas aan', () => {
    for (let breedte = 1200; breedte <= 6500; breedte += 250) {
      const a = overzicht({ dagmaatBreedte: breedte, overlap: 30 });
      if (a.beste) {
        expect(a.beste.krap, `${breedte}`).toBe(false);
        expect(a.beste.breed, `${breedte}`).toBe(false);
      }
    }
  });

  it('2800mm, overlap 30: 900 + 980 + 980 op exact 30mm, €300 goedkoper dan maatwerk', () => {
    const a = overzicht({ dagmaatBreedte: 2800, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([900, 980, 980]);
    expect(a.beste?.overlap).toBe(30);
    expect(a.waarom).toMatch(/300,00 goedkoper/);
  });

  it('twee opvulpanelen: 4061mm → 3× 900 + 2× 741 voor €900,12', () => {
    const a = overzicht({ dagmaatBreedte: 4061, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([741, 741, 900, 900, 900]);
    expect(a.beste?.aankoop).toBe(900.12);
  });

  it('drie verschillende standaardmaten: 2820mm → 900 + 980 + 1000 op exact 30mm', () => {
    const a = overzicht({ dagmaatBreedte: 2820, overlap: 30 });
    expect(gesorteerd(a.beste!.panelen)).toEqual([900, 980, 1000]);
    expect(a.beste?.meldingen).toEqual([]);
  });

  it('een te brede opening: geen aanbeveling, wel uitleg — het brede glas staat in de lijst per aantal', () => {
    const a = overzicht({ dagmaatBreedte: 7000, overlap: 30 });
    expect(a.beste).toBeNull();
    expect(a.waarom).toMatch(/Geen indeling met glas tussen 600 en 1030mm/);
    expect(a.perAantal[5].beste?.breed).toBe(true);           // 6× 1192mm, met vlag
  });

  it('kokers gaan van de wandbreedte af', () => {
    expect(overzicht({ dagmaatBreedte: 3000, kokerLinks: 110 }).wandBreedte).toBe(2890);
  });

  it('de eenmalige korting, opties, kleur en voorbereiding veranderen niets aan de vergelijking', () => {
    const kaal = overzicht({ dagmaatBreedte: 2800, overlap: 30 });
    const vol = overzicht({
      dagmaatBreedte: 2800, overlap: 30,
      marges: { ...basis.marges, eenmaligeKorting: 100 },
      opties: [{ id: 'meenemer', aantal: 3 }], kleur: { select: 'andere', custom: '' },
      extraLijnen: [{ omschrijving: 'Slot', bedrag: 56, netto: true }],
      voorbereidingPersonen: 2, voorbereidingUren: 8,
    });
    expect(vol.beste?.panelen).toEqual(kaal.beste?.panelen);
    expect(vol.beste?.verkoop).toBe(kaal.beste?.verkoop);
  });

  it('zonder breedte of hoogte: leeg', () => {
    expect(overzicht({ dagmaatBreedte: 0 }).perAantal).toHaveLength(0);
    expect(overzicht({ dagmaatBreedte: 2800, dagmaatHoogte: 0 }).beste).toBeNull();
  });
});

describe('lijst per aantal — details', () => {
  it('dezelfde glasmaten staan er maar één keer in, met de werkelijke overlap', () => {
    // 3 maatwerkpanelen in 2941mm op 30mm komen op 1000mm: dat is 3× 1000 standaard op 29,5mm
    const v = glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: 2941 }, 3);
    const drieKeer1000 = v.opties.filter((o) => o.panelen.join(',') === '1000,1000,1000');
    expect(drieKeer1000).toHaveLength(1);
    expect(drieKeer1000[0].overlap).toBe(29.5);
  });

  it('één paneel: geen overlap, en een speling die de rekenkern aanvaardt telt als in orde', () => {
    const v = glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: 1015 }, 1);
    expect(v.beste?.panelen).toEqual([1000]);
    expect(v.beste?.overlap).toBe(0);
    expect(v.beste?.controleKlopt).toBe(true);               // 15mm speling
  });

  it('de controle telt terug op tot de wandbreedte, op de afronding na', () => {
    for (const breedte of [2800, 5500, 5501, 5503]) {
      for (const n of [2, 3, 4, 5, 6]) {
        const v = glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: breedte }, n);
        for (const o of v.opties) {
          expect(Math.abs(o.controle - breedte), `${breedte}/${n} ${o.titel}`).toBeLessThanOrEqual(Math.ceil(n / 2));
          expect(o.controleKlopt, `${breedte}/${n} ${o.titel}`).toBe(true);
        }
      }
    }
  });

  it('elke mogelijkheid rekent na "gebruik" exact hetzelfde door', () => {
    for (const breedte of [2138, 2534, 2650, 2800, 2930, 3182, 4500]) {
      const a = overzicht({ dagmaatBreedte: breedte, overlap: 30 });
      for (const p of a.perAantal) {
        for (const o of p.opties) {
          const r = calcGlaswand({ ...basis, dagmaatBreedte: breedte, ...indelingNaarInvoer(o.instelling) });
          expect(String(r.detail.panelenLijst), `${breedte} ${o.titel}`).toBe(o.panelen.join(','));
          expect(r.aankoop, `${breedte} ${o.titel}`).toBeCloseTo(o.aankoop, 2);
        }
      }
    }
  });

  it('snel genoeg voor elke toetsaanslag', () => {
    const t0 = performance.now();
    overzicht({ dagmaatBreedte: 5500, overlap: 30 });
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

describe('Deponti Fiano — dezelfde voorstellen, met de Deponti-regels', () => {
  const dpBasis: GlaswandInput = {
    ...basis, merk: 'Deponti', dagmaatHoogte: 2200, paneelBreedte: 980,
    marges: { allroundKorting: 0, bkfixMarge: 0.2, eenmaligeKorting: 0 },
  };
  const dpOverzicht = (o: Partial<GlaswandInput>) => glaswandOverzicht({ ...dpBasis, ...o });

  it('2880mm op standaardhoogte 2200: 3× 980mm standaard op 30mm, €508 (3 × €135 + rail €103)', () => {
    const a = dpOverzicht({ dagmaatBreedte: 2880 });
    expect(a.beste?.panelen).toEqual([980, 980, 980]);
    expect(a.beste?.overlap).toBe(30);
    expect(a.beste?.aankoop).toBe(508);
    expect(a.perAantal).toHaveLength(7);                          // Fiano gaat tot 7 sporen
    expect(a.criterium).toMatch(/breder dan 1040mm/);
  });

  it('werf 3835 (2714 × 2111, steel-look): alles op 30mm, en de bestelde 4× 696mm staat erbij', () => {
    const a = dpOverzicht({ dagmaatBreedte: 2714, dagmaatHoogte: 2111, steellook: true, overlap: 45 });
    expect(a.wandBreedte).toBe(2694);                             // −20mm voor steel-look
    for (const p of a.perAantal) for (const o of p.opties) expect(o.overlap).toBe(30);
    const vier = a.perAantal[3].opties.find((o) => o.panelen.join(',') === '696,696,696,696');
    expect(vier?.aankoop).toBe(917.64);                           // 4 × €183,66 + rail €183
  });

  it('geen standaardhoogte: enkel maatwerk', () => {
    const a = dpOverzicht({ dagmaatBreedte: 3000, dagmaatHoogte: 2230 });
    for (const p of a.perAantal) for (const o of p.opties) expect(o.soort).toBe('maatwerk');
    expect(a.beste?.panelen).toEqual([1020, 1020, 1020]);
  });

  it('gekleurd glas: enkel maatwerk, ook op een standaardhoogte', () => {
    const a = dpOverzicht({ dagmaatBreedte: 2880, glassoort: 'brons' });
    for (const p of a.perAantal) for (const o of p.opties) expect(o.soort).toBe('maatwerk');
  });

  it('640mm is geen standaardmaat op 2350: nooit als standaardpaneel voorgesteld', () => {
    const a = dpOverzicht({ dagmaatBreedte: 2400, dagmaatHoogte: 2350 });
    for (const p of a.perAantal) {
      for (const o of p.opties) {
        if (o.panelen.includes(640)) expect(o.titel).toMatch(/640mm \(maatwerk\)/);
      }
    }
  });

  it('elke Deponti-mogelijkheid rekent na "gebruik" exact hetzelfde door', () => {
    for (const [b, h] of [[2880, 2200], [3900, 2200], [2714, 2111], [5500, 2300]]) {
      const a = dpOverzicht({ dagmaatBreedte: b, dagmaatHoogte: h });
      for (const p of a.perAantal) {
        for (const o of p.opties) {
          const r = calcGlaswand({ ...dpBasis, dagmaatBreedte: b, dagmaatHoogte: h, ...indelingNaarInvoer(o.instelling) });
          expect(String(r.detail.panelenLijst), `${b}x${h} ${o.titel}`).toBe(o.panelen.join(','));
          expect(r.aankoop, `${b}x${h} ${o.titel}`).toBeCloseTo(o.aankoop, 2);
        }
      }
    }
  });

  it('de standaardcombinaties blijven binnen 30-70mm overlap (sjabloon BKfix)', () => {
    const a = dpOverzicht({ dagmaatBreedte: 3900 });
    for (const p of a.perAantal) {
      for (const o of p.opties) {
        if (o.soort === 'standaard' || o.soort === 'mix') {
          expect(o.overlap, o.titel).toBeGreaterThanOrEqual(30);
          expect(o.overlap, o.titel).toBeLessThanOrEqual(70);
        }
      }
    }
  });
});

describe('Deponti brut in het advies (review ronde 2)', () => {
  const brut: GlaswandInput = {
    ...basis, merk: 'Deponti', dagmaatHoogte: 2300, kleur: { select: 'Brut', custom: '' },
    marges: { allroundKorting: 0, bkfixMarge: 0.2, eenmaligeKorting: 0 },
  };
  it('de voorstellen rekenen met de brute rail, zoals de berekening', () => {
    const v = glaswandOptiesVoorAantal({ ...brut, dagmaatBreedte: 3500 }, 4);
    const r = calcGlaswand({ ...brut, dagmaatBreedte: 3500, ...indelingNaarInvoer(v.beste!.instelling) });
    expect(r.regels.some((x) => /Brute, 7100mm/.test(x.label))).toBe(true);
    expect(r.aankoop).toBeCloseTo(v.beste!.aankoop, 2);
  });
  it('2 of 7 panelen (geen brute rail) worden niet voorgesteld', () => {
    const a = glaswandOverzicht({ ...brut, dagmaatBreedte: 1980 });
    expect(a.perAantal[1].opties).toEqual([]);
    expect(a.perAantal[6].opties).toEqual([]);
    expect(a.beste?.panelen.length).not.toBe(2);
  });
});
