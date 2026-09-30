/**
 * ES Systems terrasoverkappingen — getoetst aan de prijslijsten januari 2026.
 * De cellen hieronder zijn met de hand uit de PDF overgenomen als tegenproef op de machinale
 * extractie in essystems.json: staat er ooit een verkeerde prijs in de data, dan valt dit om.
 */
import { describe, expect, it } from 'vitest';
import {
  calcEsOverkapping, esArtikel, esDakM2, esMarges, esModel, esOnderdeelGroepen,
  ES_KORTING, ES_MARGE, ES_MODELLEN, ES_PLAATSING, type EsInput,
} from '../essystems';

const basis: EsInput = {
  model: 'Comfortline Plus inclusief glas', aantal: 1, breedte: 4060, uitval: 3000,
  kleur: 'RAL 7016 structuur', opties: [], onderdelen: [], extraLijnen: [],
  plaatsingPerStuk: 0, voorbereidingPersonen: 0, voorbereidingUren: 0,
  marges: esMarges(), opmerkingen: '',
};
const c = (o: Partial<EsInput>) => calcEsOverkapping({ ...basis, ...o });

describe('ES Systems — de prijsrasters uit de lijsten van januari 2026', () => {
  it('alle elf modellen uit de twee lijsten staan erin', () => {
    expect(ES_MODELLEN).toEqual([
      'Comfortline Plus polycarbonaat',
      'Comfortline Plus inclusief glas',
      'Comfortline Plus voorbereid voor glas',
      'Oversteek polycarbonaat',
      'Oversteek Plus inclusief glas',
      'Black muuraanbouw polycarbonaat',
      'Black muuraanbouw inclusief glas',
      'Black muuraanbouw voorbereid voor glas',
      'Black vrijstaand polycarbonaat',
      'Black vrijstaand inclusief glas',
      'Black vrijstaand voorbereid voor glas',
    ]);
  });

  // Steekproef: vier hoeken en een middenwaarde per lijst, met de hand uit de PDF.
  it.each([
    ['Comfortline Plus polycarbonaat', 3060, 2000, 1250],
    ['Comfortline Plus polycarbonaat', 12060, 5000, 6917],
    ['Comfortline Plus inclusief glas', 4060, 3000, 2327],
    ['Comfortline Plus inclusief glas', 12060, 4000, 8540],
    ['Comfortline Plus voorbereid voor glas', 3060, 2000, 1117],
    ['Oversteek polycarbonaat', 3060, 1890, 1417],
    ['Oversteek Plus inclusief glas', 12060, 3890, 10033],
    ['Black muuraanbouw polycarbonaat', 3000, 2500, 3498],
    ['Black muuraanbouw inclusief glas', 12000, 5000, 23800],
    ['Black muuraanbouw voorbereid voor glas', 7000, 3500, 8115],
    ['Black vrijstaand polycarbonaat', 6000, 5000, 11750],
    ['Black vrijstaand inclusief glas', 3000, 2500, 5096],
    ['Black vrijstaand voorbereid voor glas', 6000, 5000, 12000],
  ])('%s %s × %s = €%s lijstprijs', (model, breedte, uitval, prijs) => {
    const r = c({ model: String(model), breedte: Number(breedte), uitval: Number(uitval) });
    expect(r.ok).toBe(true);
    expect(r.regels[0].bedrag).toBe(prijs);
  });

  it('een maat die niet in de lijst staat blokkeert, met de maten die er wel in staan', () => {
    const r = c({ breedte: 4500, uitval: 3000 });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/bestaat niet in 4500 × 3000mm/);
    expect(r.errors.join(' ')).toMatch(/breedtes 3060/);
  });

  it('de Black vrijstaand gaat maar tot 6000mm breed', () => {
    expect(c({ model: 'Black vrijstaand polycarbonaat', breedte: 7000, uitval: 3000 }).ok).toBe(false);
    expect(c({ model: 'Black vrijstaand polycarbonaat', breedte: 6000, uitval: 3000 }).ok).toBe(true);
  });
});

describe('ES Systems — marge, plaatsing en opties', () => {
  it('lijstprijs − 40% is de inkoop, daarop 20% marge', () => {
    const r = c({ breedte: 4060, uitval: 3000 });               // lijst €2.327
    expect(ES_KORTING).toBe(0.4);
    expect(ES_MARGE).toBe(0.2);
    expect(r.productSubtotal).toBe(2327);
    expect(r.aankoop).toBeCloseTo(2327 * 0.6, 2);               // €1.396,20
    expect(r.verkoop).toBeCloseTo((2327 * 0.6) / 0.8, 2);       // €1.745,25
    expect(r.uwVerkoop).toBeCloseTo((2327 * 0.6) / 0.8, 2);     // zonder plaatsing
  });

  it('plaatsing telt per overkapping en staat standaard op €1.500', () => {
    expect(ES_PLAATSING).toBe(1500);
    const r = c({ aantal: 2, plaatsingPerStuk: ES_PLAATSING });
    expect(r.plaatsingTotaal).toBe(3000);
    expect(r.aankoop).toBeCloseTo(2 * 2327 * 0.6, 2);
    expect(r.uwVerkoop).toBeCloseTo((2 * 2327 * 0.6) / 0.8 + 3000, 2);
  });

  it('voorbereidende werken rekenen aan het uurtarief, bovenop de plaatsing', () => {
    const r = c({ plaatsingPerStuk: 1500, voorbereidingPersonen: 2, voorbereidingUren: 4, voorbereidingTarief: 230 });
    expect(r.plaatsingTotaal).toBe(1500 + 2 * 4 * 230);
    expect(r.detail.voorbereidingKost).toBe(1840);
  });

  it('een meerprijs per m² rekent op het aantal m² dat je ingeeft', () => {
    expect(esDakM2(4060, 3000)).toBeCloseTo(12.18, 2);
    const mat = esModel('Comfortline Plus inclusief glas')!.opties
      .find((o) => /Mat \(opaal\)/.test(o.label))!;
    expect(mat.prijs).toBe(59);                                  // lijst blz. 4
    expect(mat.eenheid).toBe('m²');
    const r = c({ opties: [{ id: mat.id, aantal: 12.18 }] });
    expect(r.productSubtotal).toBeCloseTo(2327 + 59 * 12.18, 2);
  });

  it('een optie van een ander model telt niet mee en waarschuwt', () => {
    const r = c({ opties: [{ id: 'verlengde_stelanker_type_d_450mm', aantal: 1 }] });
    expect(r.productSubtotal).toBe(2327);                        // Black-optie, niet bij Comfortline
    expect(r.warnings.join(' ')).toMatch(/hoort niet bij/);
  });

  it('losse onderdelen en extra lijnen: de extra lijn is netto inkoop', () => {
    const paal = esArtikel('clk_paal_110_x_110mm_3000')!;
    expect(paal.prijs).toBe(142);                                // lijst blz. 9
    const r = c({ onderdelen: [{ id: paal.id, aantal: 2 }], extraLijnen: [{ omschrijving: 'Kleur op aanvraag', bedrag: 400 }] });
    expect(r.productSubtotal).toBe(2327 + 2 * 142);
    // De netto lijn krijgt geen 40% korting meer, de rest wel.
    expect(r.aankoop).toBeCloseTo((2327 + 284) * 0.6 + 400, 2);
  });

  it('de LED-pagina hangt aan beide lijsten', () => {
    const groepen = esOnderdeelGroepen('Black').map((g) => g.groep);
    expect(groepen).toContain('LED-verlichting (set) dimbaar');
    expect(groepen).toContain('Profielen (Black)');
    expect(groepen).not.toContain('Profielen (Comfortline Plus)');
    expect(esArtikel('led_set_8')!.prijs).toBe(200);             // lijst blz. 17
  });
});

describe('ES Systems — wat de lijst bij een maat vraagt', () => {
  it('de oranje zone: bij deze uitval zit de versterkte XL-ligger in de prijs', () => {
    expect(esModel('Comfortline Plus inclusief glas')!.xlLigger).toEqual([3500, 4000]);
    expect(c({ uitval: 3000 }).detail.xlLigger).toBe(false);
    const r = c({ uitval: 3500 });
    expect(r.detail.xlLigger).toBe(true);
    expect(r.options.join(' ')).toMatch(/Versterkte XL-ligger inbegrepen/);
  });

  it('Black boven 4001mm diep: liggerversterking per ligger is vereist', () => {
    const diep = c({ model: 'Black muuraanbouw inclusief glas', breedte: 4000, uitval: 4500 });
    expect(diep.warnings.join(' ')).toMatch(/Liggerversterking is vereist per ligger/);
    const ondiep = c({ model: 'Black muuraanbouw inclusief glas', breedte: 4000, uitval: 3500 });
    expect(ondiep.warnings.join(' ')).not.toMatch(/Liggerversterking/);
  });

  it('Comfortline polycarbonaat 6060mm: "2 of 3" palen vraagt gootversterking of statiek balk', () => {
    const r = c({ model: 'Comfortline Plus polycarbonaat', breedte: 6060, uitval: 3000 });
    expect(esModel('Comfortline Plus polycarbonaat')!.palen['6060']).toBe('2 of 3');
    expect(r.warnings.join(' ')).toMatch(/Gootversterking of statiek balk is vereist/);
    expect(c({ model: 'Comfortline Plus polycarbonaat', breedte: 5060, uitval: 3000 }).warnings.join(' '))
      .not.toMatch(/statiek balk/);
  });

  it('het aantal palen en vakken volgt de lijst', () => {
    const m = esModel('Comfortline Plus inclusief glas')!;
    expect([m.palen['5060'], m.palen['6060'], m.palen['10060']]).toEqual(['2', '3', '4']);
    expect(m.vakken['3060']).toBe(4);
    const bl = esModel('Black muuraanbouw polycarbonaat')!;
    expect(bl.palen['6000']).toBe('2');
    expect(bl.palen['7000']).toBe('2x Hoekpaal 1x Tussenpaal');
  });

  it('een kleur buiten de twee standaardkleuren waarschuwt', () => {
    expect(c({ kleur: '' }).warnings.join(' ')).toMatch(/Kies de kleur/);
    expect(c({ kleur: 'RAL 9005 structuur' }).warnings.join(' ')).not.toMatch(/standaardkleur/);
    expect(c({ kleur: 'RAL 7021' }).warnings.join(' ')).toMatch(/geen standaardkleur/);
  });
});

describe('ES Systems — de maat is de buitenkant van de palen', () => {
  it('Comfortline: palen van 110mm, dus vrije opening = breedte − 220', () => {
    const m = esModel('Comfortline Plus inclusief glas')!;
    expect(m.paal.breedte).toBe(110);
    expect(m.vrijeOpeningAftrek).toBe(220);
  });

  it('Black: palen van 150 x 200mm met de 150 in de breedte, dus − 300', () => {
    const m = esModel('Black vrijstaand inclusief glas')!;
    expect(m.paal).toEqual({ breedte: 150, diepte: 200, label: 'Rechthoekig 150 x 200mm' });
    expect(m.vrijeOpeningAftrek).toBe(300);
  });

  it('de Black vrijstaand staat op vier palen, de rest tegen de muur', () => {
    expect(esModel('Black vrijstaand polycarbonaat')!.montage).toBe('vrij');
    expect(esModel('Black muuraanbouw polycarbonaat')!.montage).toBe('muur');
    expect(esModel('Comfortline Plus polycarbonaat')!.montage).toBe('muur');
    expect(c({ model: 'Black vrijstaand inclusief glas', breedte: 4000, uitval: 3000 }).detail.montage)
      .toBe('vrijstaand');
  });

  it('het item draagt merk en soort, zodat offerte en bestelbon het juiste dossier nemen', () => {
    const r = c({});
    expect(r.detail.merk).toBe('ES Systems');
    expect(r.detail.soort).toBe('es-overkapping');
    expect(r.product).toBe('Overkapping');
    expect(r.bestelmaat).toEqual({ b: 4060, h: 3000 });
  });
});
