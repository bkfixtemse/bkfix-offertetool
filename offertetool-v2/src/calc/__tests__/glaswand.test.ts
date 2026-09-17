/**
 * Golden tests glaswanden — nagerekend op ECHTE bestelbonnen en orderbevestigingen van 2026.
 * De ES-bedragen zijn de aankoopprijzen die op de bestelbon van ES Systems stonden
 * (lijstprijs − 40%); de glasmaten komen letterlijk van diezelfde bestelbon.
 */
import { describe, expect, it } from 'vitest';
import { calcGlaswand, glaswandOpties, kiesRaillengte, type GlaswandInput } from '../glaswand';
import type { Marges } from '../types';

const ES_MARGES: Marges = { allroundKorting: 0.4, bkfixMarge: 0.41, eenmaligeKorting: 0 };
const DP_MARGES: Marges = { allroundKorting: 0, bkfixMarge: 0.31, eenmaligeKorting: 0 };

const basis: GlaswandInput = {
  merk: 'ES Systems',
  aantal: 1,
  dagmaatBreedte: 0,
  kokerLinks: 0, kokerMidden: 0, kokerRechts: 0,
  dagmaatHoogte: 0,
  aantalPanelen: 0,
  paneelModus: 'maatwerk',
  paneelBreedte: 0,
  overlap: 30,
  steellook: false,
  glas: 'helder',
  sporen: 0,
  raillengte: 0,
  glassoort: 'standaard',
  sluiting: 'geen',
  kleur: { select: '', custom: '' },
  opties: [],
  extraLijnen: [],
  voorbereidingPersonen: 0,
  voorbereidingUren: 0,
  bediening: { bed1: '', bed2: '' },
  opmerkingen: '',
  vrijeOpties: [],
  marges: ES_MARGES,
};

const es = (o: Partial<GlaswandInput>) => calcGlaswand({ ...basis, ...o });
const dp = (o: Partial<GlaswandInput>) =>
  calcGlaswand({ ...basis, merk: 'Deponti', marges: DP_MARGES, ...o });

describe('golden ES75 — bestelbonnen 2026', () => {
  it('BB260806 (3744 Loir): 3 rail helder standaard 900mm, dagmaat 2650×2400 → aankoop €420', () => {
    const r = es({
      dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 900,
    });
    expect(r.ok).toBe(true);
    expect(r.productSubtotal).toBe(700);          // lijstprijs
    expect(r.aankoop).toBeCloseTo(420, 2);        // bestelbon: € 420,00 / set
    expect(r.detail.overlap).toBe(25);            // 3×900 − 2650 = 50, over 2 naden
    expect(r.detail.glasHoogte).toBe(2300);       // bestelbon: glas 900×2300
    expect(r.plaatsingTotaal).toBe(800);          // vast bedrag per wand, ongeacht het aantal sporen
  });

  it('BB261000 (4035 Raina): 3 rail helder standaard 1000mm, dagmaat 2930×2400 → aankoop €420', () => {
    const r = es({
      dagmaatBreedte: 2930, dagmaatHoogte: 2400, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 1000,
    });
    expect(r.ok).toBe(true);
    expect(r.aankoop).toBeCloseTo(420, 2);
    expect(r.detail.overlap).toBe(35);
    expect(r.detail.glasHoogte).toBe(2300);       // bestelbon: glas 1000×2300
  });

  it('BB260402 (3918 Van Wouwe): 3 rail helder standaard 1000mm, dagmaat 2920×2600 → aankoop €420', () => {
    const r = es({
      dagmaatBreedte: 2920, dagmaatHoogte: 2600, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 1000,
    });
    expect(r.ok).toBe(true);
    expect(r.aankoop).toBeCloseTo(420, 2);
    expect(r.detail.overlap).toBe(40);
    expect(r.detail.glasHoogte).toBe(2500);       // bestelbon: glas 1000×2500
  });

  it('BB260457 (3953 Van Bogaert): 4 rail helder maatwerk, dagmaat 2534×2384 → glas 656×2284, aankoop €960', () => {
    const r = es({
      dagmaatBreedte: 2534, dagmaatHoogte: 2384, aantalPanelen: 4,
      paneelModus: 'maatwerk', overlap: 30,
    });
    expect(r.ok).toBe(true);
    expect(r.productSubtotal).toBe(1600);
    expect(r.aankoop).toBeCloseTo(960, 2);
    expect(r.detail.paneelBreedte).toBe(656);     // bestelbon: 4× 656×2284mm
    expect(r.detail.glasHoogte).toBe(2284);
  });

  it('BB260457 tweede wand: dagmaat 2307×2385 → glas 599×2285', () => {
    const r = es({
      dagmaatBreedte: 2307, dagmaatHoogte: 2385, aantalPanelen: 4,
      paneelModus: 'maatwerk', overlap: 30,
    });
    expect(r.detail.paneelBreedte).toBe(599);     // bestelbon: 4× 599×2285mm
    expect(r.detail.glasHoogte).toBe(2285);
  });

  it('BB260696 (3381 Maes): 4 rail maatwerk €960 en 5 rail maatwerk €1200', () => {
    const vier = es({ dagmaatBreedte: 3182, dagmaatHoogte: 2300, aantalPanelen: 4, overlap: 30 });
    expect(vier.aankoop).toBeCloseTo(960, 2);
    expect(vier.detail.glasHoogte).toBe(2200);    // bestelbon: glas 817×2200
    // Bij 30mm overlap komt de tool op 818mm; ES bestelde 817mm (overlap 28,7mm). Het verschil van
    // 1mm ligt hier bewust vast, zodat een wijziging in de overlap- of afrondingsregel opvalt.
    expect(vier.detail.paneelBreedte).toBe(818);
    const vijf = es({ dagmaatBreedte: 4502, dagmaatHoogte: 2300, aantalPanelen: 5, overlap: 30 });
    expect(vijf.detail.paneelBreedte).toBe(924);  // ES bestelde 927mm (overlap 33,25mm)
    expect(vijf.productSubtotal).toBe(2000);
    expect(vijf.aankoop).toBeCloseTo(1200, 2);
  });

  it('BB261030 (4091 Meeus): 3 rail maatwerk, glas 746 breed → overlap 50mm, aankoop €720', () => {
    const r = es({
      dagmaatBreedte: 2138, dagmaatHoogte: 2550, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 746,   // bestelbon: 3× 746×2450mm
    });
    expect(r.detail.overlap).toBe(50);
    expect(r.detail.glasHoogte).toBe(2450);
    expect(r.aankoop).toBeCloseTo(720, 2);            // maatwerktarief 1200 × 0,6
  });

  it('opties volgen dezelfde 40% korting (meenemer €17 → €10,20)', () => {
    const r = es({
      dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 900,
      opties: [{ id: 'meenemer', aantal: 3 }, { id: 'handvat_recht', aantal: 1 }],
    });
    expect(r.productSubtotal).toBe(700 + 3 * 17 + 25);
    expect(r.aankoop).toBeCloseTo((700 + 51 + 25) * 0.6, 2);
  });
});

describe('ES75 — grenzen', () => {
  it('meer dan 6 panelen kan niet', () => {
    const r = es({ dagmaatBreedte: 6000, dagmaatHoogte: 2400, aantalPanelen: 7, overlap: 30 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/6 rails/);
  });
  it('getint boven 2500mm geeft een melding, geen blokkade', () => {
    const r = es({
      dagmaatBreedte: 2650, dagmaatHoogte: 2600, aantalPanelen: 3, glas: 'getint',
      paneelModus: 'standaard', paneelBreedte: 900,
    });
    expect(r.ok).toBe(true);
    expect(r.productSubtotal).toBe(900);
    expect(r.warnings.join(' ')).toMatch(/getint glas tot 2500mm/);
  });
  it('de hoogte verandert de prijs niet: 2000 en 2700 kosten hetzelfde', () => {
    const laag = es({ dagmaatBreedte: 2650, dagmaatHoogte: 2000, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 900 });
    const hoog = es({ dagmaatBreedte: 2650, dagmaatHoogte: 2700, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 900 });
    expect(laag.ok && hoog.ok).toBe(true);
    expect(laag.productSubtotal).toBe(700);
    expect(hoog.productSubtotal).toBe(700);
    expect(hoog.detail.glasHoogte).toBe(2600);
  });
  it('boven 2700mm blijft het kunnen, maar met de melding dat de prijs op aanvraag is', () => {
    const r = es({ dagmaatBreedte: 2650, dagmaatHoogte: 2750, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 900 });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/prijs is op aanvraag/);
  });
  it('een hoogte onder 2000mm mag, maar met waarschuwing', () => {
    const r = es({ dagmaatBreedte: 2650, dagmaatHoogte: 1950, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 900 });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/onder de laagste maat/);
  });
  it('een gemeten hoogte buiten het 50mm-raster kost evenveel', () => {
    const r = es({
      dagmaatBreedte: 2700, dagmaatHoogte: 2430, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 900,
    });
    expect(r.ok).toBe(true);
    expect(r.productSubtotal).toBe(700);
    expect(r.detail.uitvoeringLabel).toBe('standaard');
    expect(r.warnings.join(' ')).not.toMatch(/raster/);
  });
  it('een glashoogte die niet overblijft is een fout', () => {
    const r = es({ dagmaatBreedte: 2650, dagmaatHoogte: 90, aantalPanelen: 3, overlap: 30 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/geen glashoogte/);
  });
  it('alle vier de standaardbreedtes krijgen het standaardtarief, zonder waarschuwing', () => {
    for (const breedte of [900, 980, 1000, 1030]) {
      const r = es({
        dagmaatBreedte: 2900, dagmaatHoogte: 2400, aantalPanelen: 3,
        paneelModus: 'standaard', paneelBreedte: breedte,
      });
      expect(r.productSubtotal, `${breedte}mm`).toBe(700);
      expect(r.warnings.join(' '), `${breedte}mm`).not.toMatch(/standaardmaat/);
    }
  });
  it('een niet-standaardmaat valt terug op het maatwerktarief, mét waarschuwing', () => {
    const r = es({
      dagmaatBreedte: 2790, dagmaatHoogte: 2400, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 950,
    });
    expect(r.productSubtotal).toBe(1200);
    expect(r.warnings.join(' ')).toMatch(/geen standaardma/);
  });
  it('het tarief volgt de GLASMAAT, niet de invoerwijze (BB261000)', () => {
    const viaStandaard = es({ dagmaatBreedte: 2930, dagmaatHoogte: 2400, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 1000 });
    const viaMaatwerk = es({ dagmaatBreedte: 2930, dagmaatHoogte: 2400, aantalPanelen: 3, paneelModus: 'maatwerk', overlap: 35 });
    expect(viaMaatwerk.detail.paneelBreedte).toBe(1000);
    expect(viaMaatwerk.productSubtotal).toBe(700);
    expect(viaMaatwerk.aankoop).toBeCloseTo(viaStandaard.aankoop, 2);
    expect(viaMaatwerk.detail.uitvoering).toBe('standaard');
  });
  it('één paneel moet de opening dekken', () => {
    const gat = es({ dagmaatBreedte: 3000, dagmaatHoogte: 2400, aantalPanelen: 1, paneelModus: 'standaard', paneelBreedte: 900 });
    expect(gat.warnings.join(' ')).toMatch(/laat 2100mm van de opening open/);
    const teBreed = es({ dagmaatBreedte: 800, dagmaatHoogte: 2400, aantalPanelen: 1, paneelModus: 'standaard', paneelBreedte: 1000 });
    expect(teBreed.ok).toBe(false);
    expect(teBreed.errors.join(' ')).toMatch(/past niet in een opening/);
  });
  it('panelen die samen te smal zijn, blokkeren de offerte', () => {
    const r = es({ dagmaatBreedte: 3200, dagmaatHoogte: 2400, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 900 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/te smal/);
  });
  it('ES levert geen steel-look: het vinkje wordt genegeerd', () => {
    const met = es({ dagmaatBreedte: 2930, dagmaatHoogte: 2400, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 1000, steellook: true });
    const zonder = es({ dagmaatBreedte: 2930, dagmaatHoogte: 2400, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 1000 });
    expect(met.calculatiemaat).toEqual(zonder.calculatiemaat);
    expect(met.detail.overlap).toBe(zonder.detail.overlap);
    expect(met.warnings.join(' ')).toMatch(/geen steel-look/);
  });
  it('kokers gaan van de openingsbreedte af', () => {
    const r = es({
      dagmaatBreedte: 3000, kokerLinks: 110, dagmaatHoogte: 2400, aantalPanelen: 3, overlap: 30,
    });
    expect(r.calculatiemaat).toEqual({ b: 2890, h: 2400 });
    expect(r.detail.paneelBreedte).toBe(983); // (2890 + 60) / 3
  });
});

describe('ES75 — gemengde paneelmaten (mix & match)', () => {
  it('BB260402 derde wand: 2x 900 + 1x 1000 blijft het standaardtarief', () => {
    // Bestelbon: "2600x2731mm / Glasmaten: 2x 900x2500mm en 1x 1000x2500mm" onder
    // "[ES75] Glaswand 3 rail helder RAL9005st" aan 420,00 per set.
    const r = es({
      dagmaatBreedte: 2731, dagmaatHoogte: 2600,
      paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 1000, aantal: 1 }],
    });
    expect(r.ok).toBe(true);
    expect(r.detail.aantalPanelen).toBe(3);
    expect(r.detail.uitvoering).toBe('standaard');
    expect(r.productSubtotal).toBe(700);
    expect(r.aankoop).toBeCloseTo(420, 2);
    expect(r.detail.overlap).toBe(34.5);                 // (2x900 + 1000 - 2731) / 2
    expect(r.detail.paneelVerdeling).toBe('2\u00d7 900mm + 1\u00d7 1000mm');
    expect(r.detail.glasmaat).toBe('2\u00d7 900\u00d72500mm + 1\u00d7 1000\u00d72500mm');
  });

  it('een paneel zonder breedte vult de rest van de opening op', () => {
    const r = es({
      dagmaatBreedte: 2800, dagmaatHoogte: 2400, overlap: 30,
      paneelVerdeling: [{ breedte: 1000, aantal: 2 }, { breedte: 0, aantal: 1 }],
    });
    expect(r.ok).toBe(true);
    expect(r.detail.paneelVerdeling).toBe('2\u00d7 1000mm + 1\u00d7 860mm');   // 2800 + 2x30 - 2000
    expect(r.detail.aantalPanelen).toBe(3);
  });

  it('alleen het maatwerkglas gaat aan het maatwerktarief, de standaardpanelen blijven standaard', () => {
    const r = es({
      dagmaatBreedte: 2800, dagmaatHoogte: 2400, overlap: 30,
      paneelVerdeling: [{ breedte: 1000, aantal: 2 }, { breedte: 0, aantal: 1 }],
    });
    // 3 rails helder: set standaard 700, set maatwerk 1200 -> per paneel 233,33 en 400
    // 2 standaardpanelen + 1 maatwerkpaneel = (2x700 + 1x1200) / 3 = 866,67
    expect(r.productSubtotal).toBe(866.67);
    expect(r.aankoop).toBeCloseTo(866.67 * 0.6, 2);
    expect(r.detail.uitvoeringLabel).toBe('gemengd (2\u00d7 standaard + 1\u00d7 maatwerk)');
    expect(r.warnings.join(' ')).toMatch(/860mm is geen standaardma/);
    expect(r.warnings.join(' ')).toMatch(/alleen dat glas/);
    // en het blijft goedkoper dan de hele set als maatwerk
    const allesMaatwerk = es({
      dagmaatBreedte: 2800, dagmaatHoogte: 2400, overlap: 30,
      paneelVerdeling: [{ breedte: 0, aantal: 3 }],
    });
    expect(allesMaatwerk.productSubtotal).toBe(1200);
    expect(r.productSubtotal).toBeLessThan(allesMaatwerk.productSubtotal);
  });

  it('een gemengde wand op een afwijkende hoogte blijft gewoon standaard', () => {
    const r = es({
      dagmaatBreedte: 2731, dagmaatHoogte: 2430,
      paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 1000, aantal: 1 }],
    });
    expect(r.productSubtotal).toBe(700);
    expect(r.detail.uitvoeringLabel).toBe('standaard');
  });

  it('de splitsing werkt ook bij 5 rails', () => {
    // set standaard 1167, set maatwerk 2000 -> (4x1167 + 1x2000) / 5 = 1333,60
    const r = es({
      dagmaatBreedte: 4680, dagmaatHoogte: 2400, overlap: 30,
      paneelVerdeling: [{ breedte: 1000, aantal: 4 }, { breedte: 0, aantal: 1 }],
    });
    expect(r.detail.aantalPanelen).toBe(5);
    expect(r.productSubtotal).toBe(1333.6);
  });

  it('drie verschillende standaardmaten door elkaar blijven standaard', () => {
    const r = es({
      dagmaatBreedte: 2830, dagmaatHoogte: 2400,
      paneelVerdeling: [{ breedte: 900, aantal: 1 }, { breedte: 980, aantal: 1 }, { breedte: 1010, aantal: 1 }],
    });
    expect(r.detail.uitvoering).toBe('maatwerk');        // 1010 staat niet in de lijst
    const goed = es({
      dagmaatBreedte: 2820, dagmaatHoogte: 2400,
      paneelVerdeling: [{ breedte: 900, aantal: 1 }, { breedte: 980, aantal: 1 }, { breedte: 1000, aantal: 1 }],
    });
    expect(goed.detail.uitvoering).toBe('standaard');
    expect(goed.productSubtotal).toBe(700);
    expect(goed.detail.overlap).toBe(30);                // (900 + 980 + 1000 - 2820) / 2
  });

  it('een restpaneel smaller dan de overlap wordt geblokkeerd', () => {
    // 2x 900 + 1x 1000 in een opening van 2729 laat bij 30mm overlap maar 19mm over
    const r = es({
      dagmaatBreedte: 2729, dagmaatHoogte: 2600, overlap: 30,
      paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 1000, aantal: 1 }, { breedte: 0, aantal: 1 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/19mm is smaller dan de overlap/);
  });

  it('vaste panelen die de opening al vullen, geven een fout', () => {
    const r = es({
      dagmaatBreedte: 1800, dagmaatHoogte: 2400, overlap: 30,
      paneelVerdeling: [{ breedte: 1000, aantal: 2 }, { breedte: 0, aantal: 1 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/geen breedte over/);
  });

  it('de verdeling bepaalt het aantal rails, ook tegen de maximumgrens', () => {
    const r = es({
      dagmaatBreedte: 6000, dagmaatHoogte: 2400,
      paneelVerdeling: [{ breedte: 900, aantal: 4 }, { breedte: 1000, aantal: 3 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/6 rails/);
  });
});

describe('ES75 - de volledige tarieftabel', () => {
  const tabel = {
    standaard: { helder: [350, 467, 700, 935, 1167, 1400], getint: [417, 600, 900, 1200, 1500, 1800] },
    maatwerk: { helder: [517, 800, 1200, 1600, 2000, 2400], getint: [567, 900, 1350, 1800, 2250, 2700] },
  };
  for (const uitvoering of ['standaard', 'maatwerk'] as const) {
    for (const glas of ['helder', 'getint'] as const) {
      it(`${uitvoering} ${glas}: 1 t/m 6 rails`, () => {
        for (let n = 1; n <= 6; n++) {
          const breedte = uitvoering === 'standaard' ? 900 : 950;
          const r = es({
            dagmaatBreedte: n * breedte - (n - 1) * 30, dagmaatHoogte: 2400, aantalPanelen: n,
            glas, paneelModus: 'standaard', paneelBreedte: breedte,
          });
          expect(r.detail.uitvoering, `${uitvoering} ${glas} ${n}`).toBe(uitvoering);
          expect(r.productSubtotal, `${uitvoering} ${glas} ${n} rails`).toBe(tabel[uitvoering][glas][n - 1]);
        }
      });
    }
  }
});

describe('ES75 - opties: reserveonderdelen, projectartikelen en glas met gat', () => {
  const wand = {
    dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
    paneelModus: 'standaard' as const, paneelBreedte: 900,
  };
  it('glas, loopwagen en rail zitten al in het settarief - waarschuwen bij keuze', () => {
    const r = es({ ...wand, opties: [{ id: 'glaspaneel_helder_klein', aantal: 3 }] });
    expect(r.warnings.join(' ')).toMatch(/zit al in het settarief/);
  });
  it('een paal telt één keer per project, niet per wand', () => {
    const r = es({ ...wand, aantal: 2, opties: [{ id: 'paal_110_2600', aantal: 1 }] });
    expect(r.productSubtotal).toBe(2 * 700 + 110);
    expect(r.aankoop).toBeCloseTo((1400 + 110) * 0.6, 2);
  });
  it('meenemers tellen wél per wand', () => {
    const r = es({ ...wand, aantal: 2, opties: [{ id: 'meenemer', aantal: 3 }] });
    expect(r.productSubtotal).toBe(2 * (700 + 3 * 17));
  });
  it('een draaihandvat zonder glas met gat geeft een waarschuwing', () => {
    const r = es({ ...wand, opties: [{ id: 'draaihandvat', aantal: 1 }] });
    expect(r.warnings.join(' ')).toMatch(/vraagt glas met gat/);
    const ok = es({ ...wand, opties: [{ id: 'draaihandvat', aantal: 1 }, { id: 'glas_gat', aantal: 1 }] });
    expect(ok.warnings.join(' ')).not.toMatch(/vraagt glas met gat/);
  });
  it('L-profiel staat in de lijst aan de prijs van blz. 15', () => {
    const l = glaswandOpties('ES Systems').find((o) => o.id === 'l_profiel_50_3000');
    expect(l?.prijs).toBe(45);
  });
  it('geen enkel bedrag van een extra lijn belandt in de offertetekst', () => {
    const r = es({ ...wand, extraLijnen: [{ omschrijving: 'Slot', bedrag: 56, netto: true }] });
    expect(String(r.detail.optiesTekst)).toBe('Slot');
    expect(String(r.detail.optiesTekst)).not.toMatch(/56/);
  });
});

describe('ES75 - afronding, ondergrenzen en lege invoer', () => {
  it('1mm meetverschil mag het tarief niet omgooien als het glas dezelfde maat blijft', () => {
    // Bij overlap 35 en 3 panelen levert 2929 / 2930 / 2931 alle drie glas van 1000mm op.
    for (const dagmaat of [2929, 2930, 2931]) {
      const r = es({ dagmaatBreedte: dagmaat, dagmaatHoogte: 2400, aantalPanelen: 3, overlap: 35 });
      expect(r.detail.paneelBreedte, `${dagmaat}`).toBe(1000);
      expect(r.detail.uitvoeringLabel, `${dagmaat}`).toBe('standaard');
      expect(r.productSubtotal, `${dagmaat}`).toBe(700);
      expect(r.aankoop, `${dagmaat}`).toBeCloseTo(420, 2);
      expect(r.warnings.join(' '), `${dagmaat}`).not.toMatch(/geen standaardma/);
    }
  });

  it('glas onder de ondergrens wordt geblokkeerd, ook bij overlap 0', () => {
    const smal = es({ dagmaatBreedte: 1200, dagmaatHoogte: 2400, aantalPanelen: 6, overlap: 30 });
    expect(smal.ok).toBe(false);
    expect(smal.errors.join(' ')).toMatch(/te smal om te schuiven/);
    const nul = es({ dagmaatBreedte: 60, dagmaatHoogte: 2400, aantalPanelen: 3, overlap: 0 });
    expect(nul.ok).toBe(false);
    expect(nul.errors.join(' ')).toMatch(/te smal om te schuiven/);
  });

  it('een restpaneel van 160mm in een mixwand wordt ook geblokkeerd', () => {
    const r = es({
      dagmaatBreedte: 2100, dagmaatHoogte: 2400, overlap: 30,
      paneelVerdeling: [{ breedte: 1000, aantal: 2 }, { breedte: 0, aantal: 1 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/te smal om te schuiven/);
  });

  it('ongewoon smal glas mag wel, met melding', () => {
    const r = es({ dagmaatBreedte: 1590, dagmaatHoogte: 2400, aantalPanelen: 3, overlap: 30 });
    expect(r.ok).toBe(true);
    expect(r.detail.paneelBreedte).toBe(550);
    expect(r.warnings.join(' ')).toMatch(/ongewoon smal/);
  });

  it('mix & match zonder rijen rekent niets door', () => {
    const r = es({ dagmaatBreedte: 2650, dagmaatHoogte: 2400, paneelVerdeling: [] });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/minstens \u00e9\u00e9n glasmaat/);
    expect(r.productSubtotal).toBe(0);
  });

  it('"andere kleur" zonder omschrijving blokkeert, en levert nooit een rolluik-meerprijs op', () => {
    const leeg = es({
      dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 900,
      kleur: { select: 'andere', custom: '' },
    });
    expect(leeg.ok).toBe(false);
    expect(leeg.errors.join(' ')).toMatch(/Vul in welke kleur/);
    expect(JSON.stringify(leeg)).not.toMatch(/675/);
    const ingevuld = es({
      dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 900,
      kleur: { select: 'andere', custom: 'RAL 7037 structuur' },
    });
    expect(ingevuld.ok).toBe(true);
    expect(ingevuld.options.join(' ')).toMatch(/RAL 7037 structuur/);
    expect(ingevuld.warnings.join(' ')).toMatch(/geen standaardkleur/);
  });

  it('het uurtarief van de voorbereiding komt niet in de opsomming voor de bestelbon', () => {
    const r = es({
      dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 900,
      voorbereidingPersonen: 2, voorbereidingUren: 8,
    });
    const tekst = r.options.join(' ');
    expect(tekst).toMatch(/Voorbereidende werken: 2 \u00d7 8u/);
    expect(tekst).not.toMatch(/230/);
    expect(tekst).not.toMatch(/3680/);
    expect(r.detail.voorbereidingKost).toBe(3680);
  });
});

describe('plaatsing & voorbereidende werken', () => {
  const wand = {
    dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
    paneelModus: 'standaard' as const, paneelBreedte: 900,
  };
  it('vaste plaatsing: 3 of 6 sporen maakt niets uit', () => {
    const drie = es({ ...wand });
    const zes = es({ dagmaatBreedte: 5400, dagmaatHoogte: 2400, aantalPanelen: 6, overlap: 30 });
    expect(drie.plaatsingTotaal).toBe(800);
    expect(zes.plaatsingTotaal).toBe(800);
  });
  it('plaatsing telt per wand', () => {
    expect(es({ ...wand, aantal: 3 }).plaatsingTotaal).toBe(2400);
  });
  it('voorbereidende werken = man × uur × tarief, voor de hele regel', () => {
    const r = es({ ...wand, voorbereidingPersonen: 2, voorbereidingUren: 6 });
    expect(r.plaatsingTotaal).toBe(800 + 2 * 6 * 230);
    expect(r.detail.voorbereidingKost).toBe(2760);
    expect(r.options.join(' ')).toMatch(/Voorbereidende werken: 2 × 6u/);
  });
  it('voorbereiding schaalt NIET mee met het aantal wanden', () => {
    const r = es({ ...wand, aantal: 2, voorbereidingPersonen: 2, voorbereidingUren: 6 });
    expect(r.plaatsingTotaal).toBe(2 * 800 + 2760);
  });
  it('een eigen uurtarief overschrijft het standaardtarief', () => {
    const r = es({ ...wand, voorbereidingPersonen: 1, voorbereidingUren: 4, voorbereidingTarief: 65 });
    expect(r.plaatsingTotaal).toBe(800 + 260);
  });
  it('plaatsing en voorbereiding staan buiten de leverancierskorting en de marge', () => {
    const kaal = es({ ...wand });
    const met = es({ ...wand, voorbereidingPersonen: 2, voorbereidingUren: 6 });
    expect(met.aankoop).toBeCloseTo(kaal.aankoop, 2);
    expect(met.verkoop).toBeCloseTo(kaal.verkoop, 2);
    expect(met.uwVerkoop - kaal.uwVerkoop).toBeCloseTo(2760, 2);
  });
});

describe('ES75 — handmatige extra lijnen', () => {
  const wand = {
    dagmaatBreedte: 2650, dagmaatHoogte: 2400, aantalPanelen: 3,
    paneelModus: 'standaard' as const, paneelBreedte: 900,
  };
  it('netto bedrag (bv. een slot) gaat ongewijzigd in de inkoop', () => {
    const r = es({ ...wand, extraLijnen: [{ omschrijving: 'Slot', bedrag: 60, netto: true }] });
    expect(r.productSubtotal).toBe(700);          // netto telt niet mee in de adviesprijs
    expect(r.aankoop).toBeCloseTo(420 + 60, 2);   // maar wel volledig in de inkoop
    expect(r.verkoop).toBeCloseTo(480 / 0.59, 2);
  });
  it('lijstprijs-bedrag krijgt wel de 40% korting', () => {
    const r = es({ ...wand, extraLijnen: [{ omschrijving: 'Lakwerk', bedrag: 100, netto: false }] });
    expect(r.productSubtotal).toBe(800);
    expect(r.aankoop).toBeCloseTo(480, 2);
  });
  it('lege of nulbedragen worden genegeerd', () => {
    const r = es({ ...wand, extraLijnen: [{ omschrijving: '', bedrag: 0, netto: true }] });
    expect(r.regels).toHaveLength(1);
    expect(r.aankoop).toBeCloseTo(420, 2);
  });
  it('extra lijnen schalen mee met het aantal wanden', () => {
    const r = es({ ...wand, aantal: 2, extraLijnen: [{ omschrijving: 'Slot', bedrag: 60, netto: true }] });
    expect(r.aankoop).toBeCloseTo(2 * (420 + 60), 2);
  });
  it('plakhandvat rond inox staat niet meer in de optielijst', () => {
    expect(glaswandOpties('ES Systems').some((o) => /plakhandvat/i.test(o.label))).toBe(false);
  });
});

describe('Deponti Fiano', () => {
  it('stuklijst: 5 panelen 820×2200 + rail 5 sporen 4000mm', () => {
    const r = dp({
      dagmaatBreedte: 3900, dagmaatHoogte: 2200, aantalPanelen: 5, sporen: 5,
      paneelModus: 'standaard', paneelBreedte: 820,
    });
    expect(r.ok).toBe(true);
    expect(r.detail.overlap).toBe(50);
    expect(r.detail.raillengte).toBe(4000);
    expect(r.productSubtotal).toBe(5 * 140 + 251);   // paneel €140 + rail €251
    expect(r.aankoop).toBeCloseTo(951, 2);           // dealerlijst = inkoop, geen korting
    expect(r.verkoop).toBeCloseTo(951 / 0.69, 2);
    expect(r.plaatsingTotaal).toBe(800);             // vast bedrag per wand
  });

  it('railkeuze: de kortste rail die de wand overspant', () => {
    expect(kiesRaillengte(4, 3900)).toBe(4000);
    expect(kiesRaillengte(4, 4200)).toBe(5000);
    expect(kiesRaillengte(6, 4200)).toBe(6000);   // 6 sporen bestaat enkel in 6m
    expect(kiesRaillengte(6, 6200)).toBeNull();
    expect(kiesRaillengte(2, 2500)).toBe(6000);   // 2 sporen: enkel 2m of 6m
  });

  it('geen rail die de wand overspant → foutmelding met de beschikbare lengtes', () => {
    const r = dp({
      dagmaatBreedte: 6500, dagmaatHoogte: 2200, aantalPanelen: 6, sporen: 6,
      paneelModus: 'standaard', paneelBreedte: 1040,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/6-spoorrail/);
  });

  it('640mm bestaat niet in hoogte 2350', () => {
    const r = dp({
      dagmaatBreedte: 2400, dagmaatHoogte: 2350, aantalPanelen: 4, sporen: 4,
      paneelModus: 'standaard', paneelBreedte: 640,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/geen paneel van 640mm/);
  });

  it('RAL 9005 kan niet op een 3-spoorrail van 6000mm', () => {
    const r = dp({
      dagmaatBreedte: 5200, dagmaatHoogte: 2200, aantalPanelen: 3, sporen: 3, raillengte: 6000,
      paneelModus: 'maatwerk', overlap: 30,
      kleur: { select: 'RAL 9005 zwart structuur', custom: '' },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/niet beschikbaar in RAL 9005/);
  });

  it('meenemers vragen minimaal 35mm overlap', () => {
    const r = dp({
      dagmaatBreedte: 3900, dagmaatHoogte: 2200, aantalPanelen: 5, sporen: 5,
      paneelModus: 'maatwerk', overlap: 30,
      opties: [{ id: 'meenemer', aantal: 5 }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/minimaal 35mm overlap/);
  });

  it('zijsluiting trekt 85mm van de gemeten dagmaat af', () => {
    const r = dp({
      dagmaatBreedte: 3900, dagmaatHoogte: 2200, aantalPanelen: 5, sporen: 5,
      paneelModus: 'maatwerk', overlap: 40, sluiting: 'zij',
    });
    expect(r.calculatiemaat?.b).toBe(3815);
    expect(r.detail.paneelBreedte).toBe(795);   // (3815 + 4×40) / 5
  });

  it('maatwerkglas per m² op de inbouwhoogtemaat', () => {
    const r = dp({
      dagmaatBreedte: 3000, dagmaatHoogte: 2200, aantalPanelen: 3, sporen: 3,
      paneelModus: 'maatwerk', overlap: 30,
    });
    const pb = (3000 + 2 * 30) / 3;             // 1020mm
    const glas = (pb / 1000) * 2.2 * 125 * 3;
    expect(r.productSubtotal).toBeCloseTo(glas + 120, 2);  // + rail 3 sporen 3000mm
  });

  it('steellook: 20mm van de breedte, 30mm overlap en €50 plaatsing per glas', () => {
    const r = dp({
      dagmaatBreedte: 3000, dagmaatHoogte: 2200, aantalPanelen: 3, sporen: 3,
      paneelModus: 'maatwerk', overlap: 45, steellook: true,
      opties: [{ id: 'steellook_2500', aantal: 3 }],
    });
    expect(r.calculatiemaat?.b).toBe(2980);
    expect(r.detail.overlap).toBe(30);          // steellook forceert 30mm
    expect(r.plaatsingTotaal).toBe(800);
  });
});

describe('robuustheid — een offerte-item dat bewaard is vóór deze velden bestonden', () => {
  it('rekent gewoon door zonder opties, extraLijnen of vrijeOpties', () => {
    const r = calcGlaswand({
      merk: 'ES Systems', aantal: 1, dagmaatBreedte: 2650, dagmaatHoogte: 2400,
      kokerLinks: 0, kokerMidden: 0, kokerRechts: 0, aantalPanelen: 3,
      paneelModus: 'standaard', paneelBreedte: 900, overlap: 30, steellook: false,
      glas: 'helder', sporen: 0, raillengte: 0, glassoort: 'standaard', sluiting: 'geen',
      kleur: { select: '', custom: '' }, bediening: { bed1: '', bed2: '' }, opmerkingen: '',
      voorbereidingPersonen: 0, voorbereidingUren: 0,
      marges: { allroundKorting: 0.4, bkfixMarge: 0.41, eenmaligeKorting: 0 },
    } as any);
    expect(r.ok).toBe(true);
    expect(r.aankoop).toBeCloseTo(420, 2);
    expect(r.plaatsingTotaal).toBe(800);
  });

  it('een onbekend merk valt terug op ES in plaats van te crashen', () => {
    const r = calcGlaswand({ ...basis, merk: 'Onbekend' as any, dagmaatBreedte: 2650,
      dagmaatHoogte: 2400, aantalPanelen: 3, paneelModus: 'standaard', paneelBreedte: 900 });
    expect(r.ok).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/Onbekend merk/);
  });
});
