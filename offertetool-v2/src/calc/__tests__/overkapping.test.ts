/**
 * Overkappingen met glaswanden eronder (Pinela-familie). De maatregels komen uit de
 * Deponti-montagehandleidingen (Tilt maart 2026, Delight maart 2026, Deluxe Plus dec. 2024) en
 * kloppen met de BKfix-rekenbladen 3928, 3820 en 3302.
 */
import { describe, expect, it } from 'vitest';
import {
  fianoKlasse, hoogteMeldingen, MAX_ONDERKANT_GOOT, MIN_ONDERKANT_GOOT, overkappingZijden, wandenMogelijk,
  wandMaatFout, wandVoorstel, wandVoorstellen,
} from '../overkapping';
import {
  berekenGlaswandStaat, glaswandBasisInvoer, merkInstellingen, wijzigMaatStaat, wisselMerkStaat, type GlaswandStaat,
} from '../glaswandStaat';
import { depontiStandaardBreedtes } from '../glaswand';
import { glaswandOptiesVoorAantal, migreerIndeling } from '../glaswandAdvies';
import { GLASWAND_DEFAULT } from '../glaswandStaat';
import { calcPinela, depontiMarges, type PinelaInput } from '../deponti';
import { bestelSpecString } from '../bestelspec';
import { tlDescription } from '../../teamleader/descriptions';
import type { OfferItem } from '../types';

/** Een wand zoals hij op de offerte komt en in de Glaswand-tab heropend wordt. */
const heropen = (st: GlaswandStaat) =>
  berekenGlaswandStaat({ ...GLASWAND_DEFAULT, ...migreerIndeling(JSON.parse(JSON.stringify(st))) } as GlaswandStaat).r;

describe('zijden en maten onder een Pinela', () => {
  it('vrijstaand: B − 300 voor en achter, D − 300 aan de zijkanten (handleiding Tilt blz. 24)', () => {
    const z = overkappingZijden('Pinela Delight', 4088, 3500, 'vrij');
    expect(z.map((x) => [x.id, x.dagmaat])).toEqual([['voor', 3788], ['achter', 3788], ['links', 3200], ['rechts', 3200]]);
  });

  it('muurmontage: voorzijde B − 300, zijkanten zelf ingeven (beslissing zaakvoerder)', () => {
    const z = overkappingZijden('Pinela Deluxe Plus', 6016, 4500, 'muur');
    expect(z.map((x) => [x.id, x.dagmaat])).toEqual([['voor', 5716], ['links', null], ['rechts', null]]);
    expect(z[1].uitleg).toMatch(/zelf nameten/);
  });

  it('dezelfde voorzijde als in de rekenbladen: 6016 → 5716 (3928, 3820), 5052 → 4752 (3302: ±4750)', () => {
    expect(overkappingZijden('Pinela Deluxe Plus', 6016, 4000, 'muur')[0].dagmaat).toBe(5716);
    expect(overkappingZijden('Pinela Deluxe Plus', 5052, 3500, 'muur')[0].dagmaat).toBe(4752);
  });

  it('carports: geen glaswanden (de lijst noemt ze niet als optie)', () => {
    expect(wandenMogelijk('Pinela Carport')).toBe(false);
    expect(wandenMogelijk('Pinela Delight Carport')).toBe(false);
    expect(overkappingZijden('Pinela Carport', 4088, 4000, 'vrij')).toEqual([]);
    for (const t of ['Pinela Delight', 'Pinela Tilt', 'Pinela Deluxe Plus']) expect(wandenMogelijk(t)).toBe(true);
  });

  it('hoogte onder de goot: maximaal 2500mm doorloophoogte volgens Deponti', () => {
    expect(MAX_ONDERKANT_GOOT).toBe(2500);
    expect(hoogteMeldingen(2500)).toEqual([]);
    expect(hoogteMeldingen(2600).join(' ')).toMatch(/maximale doorloophoogte van 2500mm/);
    expect(hoogteMeldingen(0).join(' ')).toMatch(/Vul de hoogte/);
  });
});

describe('glaswandvoorstellen in beide merken', () => {
  it('3928 (DL+ 6016, voorzijde 5716 × 2500): ES op 6 rails standaard = lijst €1.400, Fiano 6× 980', () => {
    const v = wandVoorstellen(5716, 2500);
    expect(v.es.beste?.panelen.length).toBe(6);
    expect(v.es.r.productSubtotal).toBe(1400);              // settarief ES75 standaard helder 6 rails
    expect(v.es.r.aankoop).toBeCloseTo(840, 2);              // −40%
    expect(v.deponti.beste?.panelen).toEqual([980, 980, 980, 980, 980, 980]);
    expect(v.deponti.r.aankoop).toBe(6 * 161 + 410);         // paneel 980×2500 + rail 6 sporen 6000
    expect(v.goedkoopste).toBe('ES Systems');
  });

  it('elke wand rekent na toevoegen en heropenen in de Glaswand-tab exact hetzelfde', () => {
    for (const [b, h] of [[5716, 2500], [4752, 2500], [3788, 2500], [3200, 2400], [6680, 2500]]) {
      const v = wandVoorstellen(b, h);
      for (const o of [v.es, v.deponti]) {
        if (!o.beste) continue;
        const heropend = { ...GLASWAND_DEFAULT, ...migreerIndeling(JSON.parse(JSON.stringify(o.staat))) } as GlaswandStaat;
        const r = berekenGlaswandStaat(heropend).r;
        expect(String(r.detail.panelenLijst), `${b} ${o.merk}`).toBe(String(o.r.detail.panelenLijst));
        expect(r.aankoop, `${b} ${o.merk}`).toBeCloseTo(o.r.aankoop, 2);
        expect(r.uwVerkoop, `${b} ${o.merk}`).toBeCloseTo(o.r.uwVerkoop, 2);
      }
    }
  });

  it('de wanden krijgen geen tweede transport: dat zit bij de overkapping (zelfde levering)', () => {
    const v = wandVoorstel('Deponti', 3788, 2500);
    expect(v.staat.opties).toEqual([]);
    expect(v.r.regels.some((x) => /Transport/.test(x.label))).toBe(false);
  });

  it('te breed voor ES (Tilt 6980 vrijstaand, 6680mm): ES zonder voorstel, Fiano wel — dat is de goedkoopste', () => {
    const v = wandVoorstellen(6680, 2500);
    expect(v.es.beste).toBeNull();
    expect(v.es.reden).toMatch(/Geen indeling/);
    expect(v.deponti.beste?.panelen.length).toBe(7);
    expect(v.goedkoopste).toBe('Deponti');
  });

  it('merk-instellingen zoals in de Glaswand-tab: ES −40% en 20% marge, Deponti 0% en 20%, €800 plaatsing', () => {
    const v = wandVoorstellen(3788, 2500);
    expect([v.es.staat.kortingPct, v.es.staat.margePct, v.es.staat.plaatsingVast]).toEqual([40, 20, 800]);
    expect([v.deponti.staat.kortingPct, v.deponti.staat.margePct, v.deponti.staat.plaatsingVast]).toEqual([0, 20, 800]);
    expect(v.es.r.plaatsingTotaal).toBe(800);
  });

  it('de opmerking van de wand zegt onder welke overkapping ze staat', () => {
    expect(wandVoorstel('ES Systems', 3788, 2500, 'Onder Pinela Delight 4088 × 3500 — voorzijde').staat.opmerkingen)
      .toBe('Onder Pinela Delight 4088 × 3500 — voorzijde');
  });
});

describe('meerdere identieke overkappingen', () => {
  it('elke overkapping krijgt dezelfde wand: aantal wanden = aantal overkappingen, zelfde indeling', () => {
    const een = wandVoorstel('Deponti', 3788, 2500, '', 1);
    const twee = wandVoorstel('Deponti', 3788, 2500, '', 2);
    expect(twee.staat.aantal).toBe(2);
    expect(twee.beste?.panelen).toEqual(een.beste?.panelen);
    expect(twee.r.aankoop).toBeCloseTo(2 * een.r.aankoop, 2);
    expect(twee.r.plaatsingTotaal).toBe(2 * 800);
  });
});

describe('Fiano-hoogte onder de goot: de compensatietabel van Deponti (handleiding Fiano blz. 12)', () => {
  it('standaardhoogte H past in een dagmaat van H − 20 tot H + 25mm', () => {
    expect(fianoKlasse(2490)).toEqual({ hoogte: 2500, van: 2480, tot: 2525, meenemerVan: 2490 });
    expect(fianoKlasse(2480)?.hoogte).toBe(2500);
    expect(fianoKlasse(2525)?.hoogte).toBe(2500);
    expect(fianoKlasse(2262)?.hoogte).toBe(2250);
    expect(fianoKlasse(1980)?.hoogte).toBe(2000);
    expect(fianoKlasse(2479)).toBeNull();                   // tussen 2400 (tot 2425) en 2500 (vanaf 2480)
    expect(fianoKlasse(2126)).toBeNull();                   // tussen 2100 (tot 2125) en 2150 (vanaf 2130)
  });

  it('gemeten 2490 onder een DL+ 3445 (voorzijde 3145): Fiano standaard 2500, zelfde prijs als op 2500, en de goedkoopste', () => {
    const op2500 = wandVoorstellen(3145, 2500);
    const v = wandVoorstellen(3145, 2490);
    expect(v.deponti.staat.dagmaatHoogte).toBe(2500);
    expect(v.deponti.beste?.panelen).toEqual(op2500.deponti.beste?.panelen);
    expect(v.deponti.r.uwVerkoop).toBeCloseTo(1741.25, 2);
    expect(v.deponti.r.detail.uitvoering).not.toBe('maatwerk');
    expect(v.goedkoopste).toBe('Deponti');
    // ES rekent met de gemeten maat; op de bestelbon staat waarom Fiano 2500 is.
    expect(v.es.staat.dagmaatHoogte).toBe(2490);
    expect(v.deponti.nota).toMatch(/2490mm → Fiano-standaardhoogte 2500mm/);
    // De uitleg staat op de bestelbon, niet in de klanttekst.
    const item: OfferItem = { ...v.deponti.r, id: 'd', kind: 'glaswand', input: v.deponti.staat };
    expect(bestelSpecString(item)).toContain('Hoogte: Gemeten dagmaat hoogte 2490mm → Fiano-standaardhoogte 2500mm');
    expect(v.deponti.staat.opmerkingen).not.toMatch(/Fiano|compensatie/);
    expect(tlDescription(item)).not.toMatch(/compensatie|standaardhoogte/);
    const esItem: OfferItem = { ...v.es.r, id: 'e', kind: 'glaswand', input: v.es.staat };
    expect(bestelSpecString(esItem)).not.toMatch(/Hoogte: /);
  });

  it('gemeten 2262 (Delight vrijstaand, zijkant 3200): Fiano standaard 2250', () => {
    const v = wandVoorstellen(3200, 2262);
    expect(v.deponti.staat.dagmaatHoogte).toBe(2250);
    expect(v.deponti.r.uwVerkoop).toBeCloseTo(1637.5, 2);
    expect(v.goedkoopste).toBe('Deponti');
  });

  it('met meenemers is de ondergrens 10mm hoger: dat staat erbij', () => {
    expect(wandVoorstel('Deponti', 3788, 2485).nota).toMatch(/met meenemers past ze pas vanaf 2490mm/);
    expect(wandVoorstel('Deponti', 3788, 2495).nota).not.toMatch(/meenemers/);
    expect(wandVoorstel('Deponti', 3788, 2500).nota).toBe('');
  });

  it('tussen twee standaardhoogtes: maatwerk op de gemeten hoogte, met het alternatief uit de tabel', () => {
    const v = wandVoorstel('Deponti', 3788, 2450);
    expect(v.staat.dagmaatHoogte).toBe(2450);
    expect(v.nota).toMatch(/maatwerkglas/);
    expect(v.nota).toMatch(/2400mm met een U-profiel \(tot 2455mm\)/);
    expect(wandVoorstel('Deponti', 3788, 2470).nota).toMatch(/2400mm met een koker 60 \(tot 2485mm\)/);
  });

  it('ook met de standaardhoogte rekent de wand heropend in de Glaswand-tab exact hetzelfde', () => {
    for (const h of [2490, 2262, 2485, 2450]) {
      const o = wandVoorstel('Deponti', 3200, h);
      const r = heropen(o.staat);
      expect(r.uwVerkoop, `${h}`).toBeCloseTo(o.r.uwVerkoop, 2);
      expect(String(r.detail.panelenLijst), `${h}`).toBe(String(o.r.detail.panelenLijst));
    }
  });
});

describe('invoer die niet kan', () => {
  it('te lage hoogte onder de goot (bv. 250 i.p.v. 2500) blokkeert: onder de laagste maat van beide prijslijsten', () => {
    expect(MIN_ONDERKANT_GOOT).toBe(1980);
    expect(hoogteMeldingen(250).join(' ')).toMatch(/lager dan de laagste maat/);
    expect(hoogteMeldingen(1979).length).toBe(1);
    expect(hoogteMeldingen(1980)).toEqual([]);
  });

  it('een wand breder dan de vrije opening, of een zijwand langer dan de uitval, is een fout', () => {
    const [voor, links] = overkappingZijden('Pinela Delight', 4088, 3000, 'muur');
    expect(wandMaatFout(voor, 5000, 3000)).toMatch(/breder dan de vrije opening tussen de staanders \(3788mm\)/);
    expect(wandMaatFout(voor, 3788, 3000)).toBe('');
    expect(wandMaatFout(voor, 3000, 3000)).toBe('');        // een smallere wand kan (bv. met een vast deel)
    expect(wandMaatFout(links, 4500, 3000)).toMatch(/langer dan de uitval/);
    expect(wandMaatFout(links, 2850, 3000)).toBe('');
  });
});

describe('een wand van de overkapping in de Glaswand-tab', () => {
  it('naar Deponti wisselen zet geen tweede transport: dat staat op de overkapping', () => {
    const es = wandVoorstel('ES Systems', 3788, 2500);
    expect(es.staat.transportBijOverkapping).toBe(true);
    const gewisseld = wisselMerkStaat(es.staat, 'Deponti');
    expect(gewisseld.opties).toEqual([]);
    expect(berekenGlaswandStaat(gewisseld).r.uwVerkoop).toBeCloseTo(wandVoorstel('Deponti', 3788, 2500).r.uwVerkoop, 2);
    // Een gewone wand in de Glaswand-tab houdt het standaardtransport bij Deponti.
    expect(GLASWAND_DEFAULT.transportBijOverkapping).toBe(false);
    expect(merkInstellingen('Deponti', !GLASWAND_DEFAULT.transportBijOverkapping).opties).toEqual([{ id: 'transport', aantal: 1 }]);
  });

  it('klanttekst: een indeling met verschillende breedtes staat er volledig in', () => {
    const o = wandVoorstel('ES Systems', 3200, 2500);
    expect(String(o.r.detail.paneelVerdeling)).toContain('+');
    const it2: OfferItem = { ...o.r, id: 'w', kind: 'glaswand', input: o.staat };
    const tekst = tlDescription(it2);
    expect(tekst).toContain(`Paneelbreedtes: ${o.r.detail.paneelVerdeling}`);
    expect(tekst).not.toMatch(/Paneelbreedte: \d+mm/);
  });
});

describe('ES: een zelf gekozen indeling blijft staan als hoogte of glastype wijzigt', () => {
  const basis = { ...GLASWAND_DEFAULT, dagmaatBreedte: 2950, dagmaatHoogte: 2300, aantalPanelen: 3 } as GlaswandStaat;
  const opties = glaswandOptiesVoorAantal(glaswandBasisInvoer(basis), 3)?.opties ?? [];
  const eigen = opties.find((o) => o.panelen.every((b) => b === o.panelen[0]) && !o.panelen.every((b) => [900, 980, 1000, 1030].includes(b)));
  const vast = { ...basis, ...eigen!.instelling, paneelBreedte: eigen!.instelling.paneelBreedte || basis.paneelBreedte, keuze: 'vast' } as GlaswandStaat;

  it('hoogte 2300 → 2310 en helder → getint: de keuze blijft vast (de mogelijkheden hangen er bij ES niet van af)', () => {
    expect(eigen).toBeTruthy();
    expect(wijzigMaatStaat(vast, { dagmaatHoogte: 2310 })).toEqual({ dagmaatHoogte: 2310 });
    expect(wijzigMaatStaat(vast, { glas: 'getint' })).toEqual({ glas: 'getint' });
    const r = berekenGlaswandStaat({ ...vast, dagmaatHoogte: 2310 } as GlaswandStaat).r;
    expect(String(r.detail.panelenLijst)).toBe(eigen!.panelen.join(','));
  });

  it('een andere breedte: de keuze past niet meer, dus opnieuw de beste', () => {
    expect(wijzigMaatStaat(vast, { dagmaatBreedte: 3500 }).keuze).toBe('auto');
  });
});

describe('carports op de bestelbon', () => {
  const carport: PinelaInput = {
    type: 'Pinela Carport', aantal: 1, breedte: 4088, uitval: 4000, montage: 'vrij',
    kleurFrame: 'RAL 7024 antraciet structuur', kleurFrameCustom: '', kleurLamel: '',
    screensBreedte: 0, screensUitval: 0, opties: [], extraLijnen: [],
    plaatsingPerStuk: 0, plaatsingPerScreen: 0, plaatsingPerKoppelset: 0,
    voorbereidingPersonen: 0, voorbereidingUren: 0, marges: depontiMarges(), opmerkingen: '',
  };
  it('geen lamelkleur: een carport heeft een dak van stalen platen, geen lamellen', () => {
    for (const type of ['Pinela Carport', 'Pinela Delight Carport']) {
      const r = calcPinela({ ...carport, type });
      const spec = bestelSpecString({ ...r, id: 'c', kind: 'overkapping', input: {} });
      expect(spec, type).toContain('RAL 7024');
      expect(spec, type).not.toMatch(/lamel/i);
    }
    const delight = calcPinela({ ...carport, type: 'Pinela Delight', uitval: 3500 });
    expect(bestelSpecString({ ...delight, id: 'd', kind: 'overkapping', input: {} })).toMatch(/Kleur lamellen/);
  });
});

describe('merk wisselen in de Glaswand-tab rekent opnieuw vanaf de gemeten hoogte', () => {
  for (const h of [2490, 2262]) {
    it(`gemeten ${h}: Fiano → ES krijgt de gemeten hoogte, ES → Fiano de standaardhoogte — zelfde als in de Overkappingen-tab`, () => {
      const v = wandVoorstellen(3145, h);
      const heropend = (st: GlaswandStaat) =>
        ({ ...GLASWAND_DEFAULT, ...migreerIndeling(JSON.parse(JSON.stringify(st))) } as GlaswandStaat);
      const naarEs = wisselMerkStaat(heropend(v.deponti.staat), 'ES Systems');
      expect(naarEs.dagmaatHoogte).toBe(h);
      const rEs = berekenGlaswandStaat(naarEs).r;
      expect(rEs.bestelmaat).toEqual(v.es.r.bestelmaat);
      expect(rEs.uwVerkoop).toBeCloseTo(v.es.r.uwVerkoop, 2);
      const naarDp = wisselMerkStaat(heropend(v.es.staat), 'Deponti');
      expect(naarDp.dagmaatHoogte).toBe(v.deponti.staat.dagmaatHoogte);
      expect(berekenGlaswandStaat(naarDp).r.uwVerkoop).toBeCloseTo(v.deponti.r.uwVerkoop, 2);
    });
  }

  it('een gewone wand (hoogte zelf ingegeven) houdt zijn hoogte bij een merkwissel', () => {
    const gewoon = { ...GLASWAND_DEFAULT, merk: 'Deponti', dagmaatBreedte: 3000, dagmaatHoogte: 2490 } as GlaswandStaat;
    expect(wisselMerkStaat(gewoon, 'ES Systems').dagmaatHoogte).toBe(2490);
    expect(wisselMerkStaat({ ...gewoon, merk: 'ES Systems' }, 'Deponti').dagmaatHoogte).toBe(2490);
  });
});

describe('een zelf gekozen indeling overleeft het typen van een nieuwe hoogte', () => {
  const typ = (st: GlaswandStaat, veld: 'dagmaatHoogte' | 'dagmaatBreedte', stappen: number[]) =>
    stappen.reduce((x, v) => ({ ...x, ...wijzigMaatStaat(x, { [veld]: v }) } as GlaswandStaat), st);
  const kies = (st: GlaswandStaat, pred: (panelen: number[]) => boolean) => {
    const o = (glaswandOptiesVoorAantal(glaswandBasisInvoer(st), st.aantalPanelen)?.opties ?? []).find((x) => pred(x.panelen));
    expect(o, 'optie gevonden').toBeTruthy();
    return { ...st, ...o!.instelling, paneelBreedte: o!.instelling.paneelBreedte || st.paneelBreedte, keuze: 'vast' } as GlaswandStaat;
  };

  it('ES: 2300 → (0, 2, 24, 240, 2400) blijft de gekozen 3× maatwerk', () => {
    const basis = { ...GLASWAND_DEFAULT, dagmaatBreedte: 2950, dagmaatHoogte: 2300, aantalPanelen: 3 } as GlaswandStaat;
    const vast = kies(basis, (p) => p.every((b) => b === p[0]) && ![900, 980, 1000, 1030].includes(p[0]));
    const na = typ(vast, 'dagmaatHoogte', [0, 2, 24, 240, 2400]);
    expect(na.keuze).toBe('vast');
    expect(String(berekenGlaswandStaat(na).r.detail.panelenLijst)).toBe(String(berekenGlaswandStaat(vast).r.detail.panelenLijst));
  });

  it('ES: een nieuwe breedte typen (3, 35, 350, 3500): de keuze past niet meer → opnieuw de beste', () => {
    const basis = { ...GLASWAND_DEFAULT, dagmaatBreedte: 2950, dagmaatHoogte: 2300, aantalPanelen: 3 } as GlaswandStaat;
    const vast = kies(basis, (p) => p.every((b) => b === p[0]) && ![900, 980, 1000, 1030].includes(p[0]));
    expect(typ(vast, 'dagmaatBreedte', [3, 35, 350, 3500]).keuze).toBe('auto');
  });

  it('Deponti: standaardpanelen die ook op 2300 bestaan blijven gekozen (2500 → 2, 23, 230, 2300)', () => {
    const basis = { ...GLASWAND_DEFAULT, ...merkInstellingen('Deponti'), dagmaatBreedte: 2900, dagmaatHoogte: 2500, aantalPanelen: 3 } as GlaswandStaat;
    const op2300 = depontiStandaardBreedtes(2300, 'standaard');
    const vast = kies(basis, (p) => p.every((b) => op2300.includes(b)));
    expect(typ(vast, 'dagmaatHoogte', [2, 23, 230, 2300]).keuze).toBe('vast');
  });

  it('Deponti: 640 bestaat niet op 2350 → na het typen van 2350 opnieuw de beste', () => {
    expect(depontiStandaardBreedtes(2350, 'standaard')).not.toContain(640);
    const basis = { ...GLASWAND_DEFAULT, ...merkInstellingen('Deponti'), dagmaatBreedte: 3145, dagmaatHoogte: 2500, aantalPanelen: 4 } as GlaswandStaat;
    const vast = kies(basis, (p) => p.includes(640));
    expect(typ(vast, 'dagmaatHoogte', [2, 23, 235, 2350]).keuze).toBe('auto');
  });
});

describe('klanttekst: gelijke panelen in aparte rijen zijn geen gemengde wand', () => {
  it('drie rijen van 1× 900mm → "Paneelbreedte: 900mm"', () => {
    const st = {
      ...GLASWAND_DEFAULT, dagmaatBreedte: 2640, dagmaatHoogte: 2300, keuze: 'eigen', paneelModus: 'mix', aantalPanelen: 3,
      paneelVerdeling: [{ breedte: 900, aantal: 1 }, { breedte: 900, aantal: 1 }, { breedte: 900, aantal: 1 }],
    } as GlaswandStaat;
    const r = berekenGlaswandStaat(st).r;
    const tekst = tlDescription({ ...r, id: 'u', kind: 'glaswand', input: st });
    expect(tekst).toContain('Paneelbreedte: 900mm');
    expect(tekst).not.toContain('Paneelbreedtes');
  });
});
