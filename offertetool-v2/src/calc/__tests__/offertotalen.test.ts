/** Arbeid mag de margeteller niet opblazen: werkuren én voorbereidende werken zijn pass-through. */
import { describe, expect, it } from 'vitest';
import { offerTotals } from '../../store/offerStore';
import { calcGlaswand, type GlaswandInput } from '../glaswand';
import type { OfferItem } from '../types';

const wand = (voorbereiding: { personen: number; uren: number }): OfferItem => {
  const inp: GlaswandInput = {
    merk: 'ES Systems', aantal: 1, dagmaatBreedte: 2650, dagmaatHoogte: 2400,
    kokerLinks: 0, kokerMidden: 0, kokerRechts: 0, aantalPanelen: 3,
    paneelModus: 'standaard', paneelBreedte: 900, overlap: 30, steellook: false,
    glas: 'helder', sporen: 0, raillengte: 0, glassoort: 'standaard', sluiting: 'geen',
    kleur: { select: 'RAL 9005 structuur', custom: '' }, opties: [], extraLijnen: [],
    bediening: { bed1: '', bed2: '' }, opmerkingen: '', vrijeOpties: [],
    voorbereidingPersonen: voorbereiding.personen, voorbereidingUren: voorbereiding.uren,
    marges: { allroundKorting: 0.4, bkfixMarge: 0.2, eenmaligeKorting: 0 },
  };
  return { ...calcGlaswand(inp), id: 'g', kind: 'glaswand', input: {} };
};
const geenWerkuren = { tarief: 230, uren: 0, personen: 2 };

describe('totale marge', () => {
  it('voorbereidende werken worden aan de klant aangerekend maar tellen niet als winst', () => {
    const zonder = offerTotals([wand({ personen: 0, uren: 0 })], 0, geenWerkuren);
    const met = offerTotals([wand({ personen: 2, uren: 6 })], 0, geenWerkuren);
    const arbeid = 2 * 6 * 230;                       // € 2.760
    expect(met.verkoop - zonder.verkoop).toBeCloseTo(arbeid, 2);   // klant betaalt het wel
    expect(met.werkelijkeWinst).toBeCloseTo(zonder.werkelijkeWinst, 2); // maar het is geen marge
    expect(met.voorbereidingKost).toBeCloseTo(arbeid, 2);
  });

  it('meer voorbereiding maakt een deal niet winstgevender op papier', () => {
    const weinig = offerTotals([wand({ personen: 1, uren: 2 })], 0, geenWerkuren);
    const veel = offerTotals([wand({ personen: 3, uren: 10 })], 0, geenWerkuren);
    expect(veel.winstPct).toBeLessThan(weinig.winstPct);  // zakt zelfs, want de omzet stijgt
    expect(veel.werkelijkeWinst).toBeCloseTo(weinig.werkelijkeWinst, 2);
  });

  it('dezelfde arbeid via het werkuren-veld geeft hetzelfde resultaat', () => {
    const viaRegel = offerTotals([wand({ personen: 2, uren: 6 })], 0, geenWerkuren);
    const viaWerkuren = offerTotals([wand({ personen: 0, uren: 0 })], 0, { tarief: 230, uren: 6, personen: 2 });
    expect(viaRegel.subtotaal).toBeCloseTo(viaWerkuren.subtotaal, 2);
    expect(viaRegel.werkelijkeWinst).toBeCloseTo(viaWerkuren.werkelijkeWinst, 2);
  });
});
