/**
 * Deponti — Pinela, Fiano Louvre en onderdelen, getoetst aan de Deponti-orderbevestigingen van 2026
 * (inkoop) en aan de BKfix-rekenbladen van dezelfde werven (verkoop = inkoop / 0,8 + plaatsing).
 */
import { describe, expect, it } from 'vitest';
import {
  calcLouvre, calcOnderdelen, calcPinela, depontiMarges, louvreKlasse, onderdeelArtikel,
  ONDERDEEL_GROEPEN, PINELA_TYPES, pinelaMaten, pinelaType,
  type LouvreInput, type OnderdelenInput, type PinelaInput,
} from '../deponti';

const pinela: PinelaInput = {
  type: 'Pinela Delight', aantal: 1, breedte: 3124, uitval: 3500, montage: 'muur',
  kleurFrame: 'RAL 7024 antraciet structuur', kleurFrameCustom: '', kleurLamel: '',
  screensBreedte: 0, screensUitval: 0, opties: [], extraLijnen: [],
  plaatsingPerStuk: 0, plaatsingPerScreen: 0, plaatsingPerKoppelset: 0,
  voorbereidingPersonen: 0, voorbereidingUren: 0,
  marges: depontiMarges(), opmerkingen: '',
};
const p = (o: Partial<PinelaInput>) => calcPinela({ ...pinela, ...o });

describe('Pinela — de Deponti-orders van 2026 (inkoop)', () => {
  it('so95422: 2 gekoppelde Delights muurmontage = €13.760', () => {
    const a = p({ breedte: 3124, uitval: 3500, kleurLamel: 'RAL 9016 verkeerswit structuur',
      opties: [{ id: 'koppelset_muur2', aantal: 1 }, { id: 'hoekstaander_minder', aantal: 2 }] });
    const b = p({ breedte: 5052, uitval: 3500, kleurLamel: 'RAL 9016 verkeerswit structuur' });
    expect(a.ok && b.ok).toBe(true);
    expect(a.regels[0].bedrag).toBe(5850);
    expect(b.regels[0].bedrag).toBe(7720);
    expect(a.aankoop).toBe(5850 + 290 - 100);
    expect(a.aankoop + b.aankoop).toBe(13760);
    expect(a.detail.kleurLamel).toBe('RAL 9016 verkeerswit structuur');   // Antraciet/Verk. Wit
  });

  it('so91234: Delight 4088×4000 vrijstaand + screen 3785×2500 = €8.234 (vrijstaand kost hetzelfde)', () => {
    const r = p({ breedte: 4088, uitval: 4000, montage: 'vrij', screensBreedte: 1 });
    expect(r.ok).toBe(true);
    expect(r.aankoop).toBe(8234);
    expect(r.detail.staanders).toBe(4);
    expect(r.detail.screens).toBe('1 × screen 3785x2500 (voorzijde)');
  });

  it('so93085: Delight 3124×4000 vrijstaand + 4 montagevoeten + transport = €6.640', () => {
    const r = p({ breedte: 3124, uitval: 4000, montage: 'vrij',
      opties: [{ id: 'montagevoet', aantal: 4 }], transport: true });
    expect(r.aankoop).toBe(6640);
  });

  it('so94994: Deluxe Plus 4088×4000 zwart + hoekstuk + staander 3200 + staander 3000 (extra lijn) = €8.852', () => {
    const r = p({ type: 'Pinela Deluxe Plus', breedte: 4088, uitval: 4000, kleurFrame: 'RAL 9005 zwart structuur',
      opties: [{ id: 'hoekstuk', aantal: 1 }, { id: 'staander_3200', aantal: 1 }],
      extraLijnen: [{ omschrijving: 'Staander vierkant zwart 3000mm', bedrag: 95 }] });
    expect(r.ok).toBe(true);
    expect(r.aankoop).toBe(8852);
  });

  it('Deluxe Plus 5052×3000 = €8.427 volgens de lijst 2026 (so88310 in april rekende nog de lijst 2025: €8.025)', () => {
    expect(p({ type: 'Pinela Deluxe Plus', breedte: 5052, uitval: 3000 }).regels[0].bedrag).toBe(8427);
  });
});

describe('Pinela — de BKfix-rekenbladen (verkoop = inkoop / 0,8 + plaatsing)', () => {
  it('3450: Delight 3124×3500 + €2.500 plaatsing = €9.812,50', () => {
    expect(p({ plaatsingPerStuk: 2500 }).uwVerkoop).toBeCloseTo(9812.5, 2);
  });
  it('4006: Delight 4088×4000 vrijstaand €1.840 + screen €230 = €10.983,75 + €1.378,75', () => {
    const r = p({ breedte: 4088, uitval: 4000, montage: 'vrij', screensBreedte: 1, plaatsingPerStuk: 1840, plaatsingPerScreen: 230 });
    expect(r.uwVerkoop).toBeCloseTo(10983.75 + 1378.75, 2);
  });
  it('4064: Deluxe Plus 4088×4000 + €2.500 = €13.165; screen uitval 4m + €400 = €1.535', () => {
    const r = p({ type: 'Pinela Deluxe Plus', breedte: 4088, uitval: 4000, plaatsingPerStuk: 2500, screensUitval: 1, plaatsingPerScreen: 400 });
    expect(r.uwVerkoop).toBeCloseTo(13165 + 1535, 2);
  });
  it('4132: Tilt 5052×3500 + €2.000 = €13.255 en Tilt 6980×3500 + €2.500 = €17.462,50', () => {
    expect(p({ type: 'Pinela Tilt', breedte: 5052, uitval: 3500, plaatsingPerStuk: 2000 }).uwVerkoop).toBeCloseTo(13255, 2);
    expect(p({ type: 'Pinela Tilt', breedte: 6980, uitval: 3500, plaatsingPerStuk: 2500 }).uwVerkoop).toBeCloseTo(17462.5, 2);
  });
  it('3450: koppelstuk €290 + €150 plaatsing = €512,50', () => {
    const met = p({ opties: [{ id: 'koppelset_muur2', aantal: 1 }], plaatsingPerKoppelset: 150 });
    const zonder = p({});
    expect(met.uwVerkoop - zonder.uwVerkoop).toBeCloseTo(512.5, 2);
  });
});

describe('Pinela — regels en grenzen', () => {
  it('elk type en elke maat uit de lijst geeft een prijs; lege cellen niet', () => {
    for (const type of PINELA_TYPES) {
      for (const m of pinelaMaten(type)) {
        for (const k of m.kolommen) {
          const r = p({ type, breedte: m.rij, uitval: k, kleurFrame: pinelaType(type)!.kleuren[0] });
          expect(r.ok, `${type} ${m.rij}×${k}`).toBe(true);
          expect(r.regels[0].bedrag, `${type} ${m.rij}×${k}`).toBeGreaterThan(0);
        }
      }
    }
    const leeg = p({ breedte: 3445, uitval: 3000 });
    expect(leeg.ok).toBe(false);
    expect(leeg.errors.join(' ')).toMatch(/breedtes: 3124 \/ 4088 \/ 5052 \/ 6016mm/);
  });

  it('Pinela Deluxe (blz. 22) en de gewone Pinela (blz. 19) zitten er niet in', () => {
    expect(PINELA_TYPES).not.toContain('Pinela Deluxe');
    expect(PINELA_TYPES).not.toContain('Pinela');
    expect(PINELA_TYPES).toEqual([
      'Pinela Delight', 'Pinela Tilt', 'Pinela Deluxe Plus', 'Pinela Delight Carport', 'Pinela Carport',
    ]);
  });

  it('screens: enkel Delight/Tilt/Deluxe Plus, en enkel op de maten uit de screenlijst', () => {
    expect(p({ type: 'Pinela Carport', breedte: 4088, uitval: 4000, screensBreedte: 1 }).errors.join(' '))
      .toMatch(/bestaan niet voor Pinela Carport/);
    expect(p({ type: 'Pinela Deluxe Plus', breedte: 3445, uitval: 3000, screensBreedte: 1 }).errors.join(' '))
      .toMatch(/Geen Deponti-screen voor breedte 3445mm/);
    const r = p({ breedte: 5052, uitval: 3000, screensBreedte: 1, screensUitval: 2 });
    expect(r.aankoop).toBe(7225 + 1040 + 2 * 783);
  });

  it('screens en montagevoeten tellen per overkapping, koppelset en transport één keer', () => {
    const r = p({ aantal: 2, screensUitval: 1, opties: [
      { id: 'montagevoet', aantal: 2 }, { id: 'koppelset_muur2', aantal: 1 }], transport: true });
    expect(r.aankoop).toBe(2 * 5850 + 2 * 846 + 2 * 2 * 45 + 290 + 160);
  });

  it('plaatsing: per overkapping, per screen per overkapping, per koppelset, plus voorbereiding', () => {
    const r = p({ aantal: 2, screensBreedte: 1, plaatsingPerStuk: 2500, plaatsingPerScreen: 230,
      plaatsingPerKoppelset: 150, opties: [{ id: 'koppelset_muur2', aantal: 1 }],
      voorbereidingPersonen: 2, voorbereidingUren: 4, voorbereidingTarief: 230 });
    expect(r.plaatsingTotaal).toBe(2 * 2500 + 2 * 230 + 150 + 2 * 4 * 230);
    expect(r.detail.voorbereidingKost).toBe(1840);
  });

  it('een andere kleur moet ingevuld worden; lamelkleur enkel waar de lijst het toelaat', () => {
    expect(p({ kleurFrame: 'andere', kleurFrameCustom: '' }).ok).toBe(false);
    expect(p({ kleurFrame: 'andere', kleurFrameCustom: 'RAL 7016' }).warnings.join(' ')).toMatch(/geen standaardkleur/);
    const dl = p({ type: 'Pinela Deluxe Plus', breedte: 4088, uitval: 4000, kleurLamel: 'RAL 9016 verkeerswit structuur' });
    expect(dl.detail.kleurLamel).toBe('RAL 7024 antraciet structuur');   // Deluxe Plus: één kleur
  });

  it('koppelset van het verkeerde montagetype: waarschuwing', () => {
    expect(p({ montage: 'vrij', opties: [{ id: 'koppelset_muur2', aantal: 1 }] }).warnings.join(' '))
      .toMatch(/muurmontage gekozen bij een vrijstaande/);
  });

  it('dealerlijst = inkoop: geen korting, 20% marge', () => {
    const r = p({});
    expect(r.aankoop).toBe(5850);
    expect(r.verkoop).toBeCloseTo(7312.5, 2);
  });
});

describe('Fiano Louvre', () => {
  const louvre: LouvreInput = {
    aantal: 1, aantalPanelen: 3, inbouwhoogte: 2210, dagmaatBreedte: 3000, rail: 'met', sporen: 0,
    kleurFrame: 'RAL 7024 antraciet structuur', kleurLamel: 'Eik structuur (enkel lamellen)',
    opties: [], extraLijnen: [], plaatsingPerPaneel: 250, voorbereidingPersonen: 0, voorbereidingUren: 0,
    marges: depontiMarges(), opmerkingen: '',
  };
  const l = (o: Partial<LouvreInput>) => calcLouvre({ ...louvre, ...o });

  it('hoogteklassen per 50mm, van 2050 tot 2580', () => {
    expect(louvreKlasse(2049)).toBeUndefined();
    expect(louvreKlasse(2050)?.prijs).toBe(285);
    expect(louvreKlasse(2210)?.prijs).toBe(300);
    expect(louvreKlasse(2580)?.prijs).toBe(335);
    expect(louvreKlasse(2581)).toBeUndefined();
  });

  it('3 panelen op 2210 + rail 3 sporen 3000mm, overlap 60mm', () => {
    const r = l({});
    expect(r.ok).toBe(true);
    expect(r.aankoop).toBe(3 * 300 + 103);                 // rail 3 sporen 3000mm
    expect(r.detail.overlap).toBe(60);                     // (3120 − 3000) / 2
    expect(r.plaatsingTotaal).toBe(3 * 250);               // €250 per Louvre (rekenblad 3864)
  });

  it('de rail is een verplichte keuze', () => {
    const r = l({ rail: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Kies of de Fiano-rail/);
    expect(l({ rail: 'zonder' }).aankoop).toBe(900);
  });

  it('buiten de hoogteklassen of te weinig panelen: fout', () => {
    expect(l({ inbouwhoogte: 2000 }).errors.join(' ')).toMatch(/van 2050 tot 2580mm/);
    expect(l({ aantalPanelen: 2 }).errors.join(' ')).toMatch(/samen te smal/);
  });
});

describe('Deponti onderdelen', () => {
  const basisO: OnderdelenInput = {
    omschrijving: '', regels: [], extraLijnen: [], plaatsingVast: 0,
    voorbereidingPersonen: 0, voorbereidingUren: 0, marges: depontiMarges(), opmerkingen: '',
  };
  const o = (x: Partial<OnderdelenInput>) => calcOnderdelen({ ...basisO, ...x });

  it('so88772: zijspie glas 3924 + Combi-Groove + 11 Grillo 4000 + 2 U-profielen = €1.209', () => {
    const r = o({ regels: [
      { artikel: 'zsg_3924_met', aantal: 1, kleur: 'RAL 9005 zwart structuur' },
      { artikel: 'cg_6060', aantal: 1, kleur: 'RAL 9005 zwart structuur' },
      { artikel: 'gr_4000', aantal: 11, kleur: 'RAL 9005' },
      { artikel: 'gr_u_4000', aantal: 2, kleur: 'RAL 9005' },
    ] });
    expect(r.ok).toBe(true);
    expect(r.aankoop).toBe(375 + 249 + 561 + 24);
    expect(r.warnings).toEqual([]);
  });

  it('so89101 + rekenblad 3962: zijspie poly 4000 opaal €210, plaatsing €340 → €602,50', () => {
    const r = o({ regels: [{ artikel: 'zsp_4000_opaal', aantal: 1, kleur: 'RAL 9001 crèmewit' }], plaatsingVast: 340 });
    expect(r.aankoop).toBe(210);
    expect(r.uwVerkoop).toBeCloseTo(602.5, 2);
  });

  it('so88491: losse screen 4749×2500 = €1.040', () => {
    expect(o({ regels: [{ artikel: 'sc_b5', aantal: 1, kleur: '' }] }).aankoop).toBe(1040);
  });

  it('Lumassina: elke tabelcel is een artikel, met de portal-melding', () => {
    expect(onderdeelArtikel('lu_6x3500')?.prijs).toBe(419);
    expect(onderdeelArtikel('lu_12x6000')?.prijs).toBe(1415);
    const lu = ONDERDEEL_GROEPEN.find((g) => g.groep === 'Lumassina LED')!;
    expect(lu.artikelen.filter((a) => a.id.startsWith('lu_') && /x\d+$/.test(a.id))).toHaveLength(60);
    expect(o({ regels: [{ artikel: 'lu_6x3500', aantal: 1, kleur: '' }] }).warnings.join(' ')).toMatch(/portal/);
  });

  it('een kleur die niet leverbaar is voor dat artikel: waarschuwing', () => {
    expect(o({ regels: [{ artikel: 'gr_5000', aantal: 1, kleur: 'RAL 9016' }] }).warnings.join(' '))
      .toMatch(/niet bij de leverbare kleuren \(RAL 7024\)/);
  });

  it('leeg: fout; onbekend artikel: melding, geen stille prijs', () => {
    expect(o({}).ok).toBe(false);
    expect(o({ regels: [{ artikel: 'weg', aantal: 1, kleur: '' }] }).warnings.join(' ')).toMatch(/"weg" staat niet meer/);
  });

  it('artikel-id\'s zijn uniek over alle groepen', () => {
    const ids = ONDERDEEL_GROEPEN.flatMap((g) => g.artikelen.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('review-bevindingen (regressies)', () => {
  it('Louvre: een inbouwhoogte met decimalen valt nooit tussen twee klassen', () => {
    expect(louvreKlasse(2099.5)?.prijs).toBe(285);
    expect(louvreKlasse(2149.4)?.prijs).toBe(290);
    expect(louvreKlasse(2580.5)).toBeUndefined();
  });

  it('F-profielen Brute: kleur "Brute" is de enige juiste, zonder waarschuwing', () => {
    const r = calcOnderdelen({
      omschrijving: '', regels: [{ artikel: 'zsp_f_brute', aantal: 1, kleur: 'Brute' }], extraLijnen: [],
      plaatsingVast: 0, voorbereidingPersonen: 0, voorbereidingUren: 0, marges: depontiMarges(), opmerkingen: '',
    });
    expect(r.warnings).toEqual([]);
  });

  it('zijspie en zijwand poly: opaal en helder zijn aparte artikelen (so89101 bestelde "Opaal")', () => {
    expect(onderdeelArtikel('zsp_4000_opaal')?.label).toMatch(/opaal$/);
    expect(onderdeelArtikel('zsp_4000_helder')?.prijs).toBe(210);
    expect(onderdeelArtikel('zwp_3500_helder')?.prijs).toBe(404);
    expect(onderdeelArtikel('zsp_4000_op')).toBeUndefined();
  });

  it('de LED staat als inbegrepen in de klanttekst', () => {
    expect(p({}).detail.led).toMatch(/inbegrepen/);
  });

  it('creditering en transport staan niet in de klanttekst, wel in de berekening en op de bestelbon', () => {
    const r = p({ opties: [{ id: 'koppelset_muur2', aantal: 1 }, { id: 'hoekstaander_minder', aantal: 2 }], transport: true });
    expect(String(r.detail.optiesTekst)).toMatch(/Koppelset/);
    expect(String(r.detail.optiesTekst)).not.toMatch(/creditering|Transport/);
    expect(r.options.join(' ')).toMatch(/Transport dealer/);
    expect(r.aankoop).toBe(5850 + 290 - 100 + 160);
  });

  it('Tilt 6980 is bevestigd (montagehandleiding maart 2026): geen waarschuwing meer', () => {
    expect(p({ type: 'Pinela Tilt', breedte: 6980, uitval: 3500 }).warnings.join(' ')).not.toMatch(/6890|bevestigen/);
    expect(pinelaType('Pinela Tilt')!.rijen).toEqual([4088, 5052, 6016, 6980]);
  });
});

describe('review ronde 2', () => {
  it('Louvre: opties die niet in de kleur of voor het aantal sporen bestaan geven een melding', () => {
    const r = calcLouvre({
      aantal: 1, aantalPanelen: 7, inbouwhoogte: 2300, dagmaatBreedte: 6900, rail: 'met', sporen: 0,
      kleurFrame: 'RAL 7024 antraciet structuur', kleurLamel: '', extraLijnen: [], plaatsingPerPaneel: 0,
      opties: [{ id: 'u_profiel_6000', aantal: 1 }, { id: 'tochtborstel_brute', aantal: 2 }],
      voorbereidingPersonen: 0, voorbereidingUren: 0, marges: depontiMarges(), opmerkingen: '',
    });
    const m = r.warnings.join(' ');
    expect(m).toMatch(/U-profiel 6000mm .* bestaat niet voor 7 sporen/);
    expect(m).toMatch(/Tochtborstel Brute 7100mm bestaat niet in RAL 7024/);
  });
});

describe('onderzoek open vragen (21-09-2026)', () => {
  it('koppelset vrijstaand 2 systemen = €570 (so96266, sep. 2026); 4 systemen: onbevestigd', () => {
    const r2 = p({ montage: 'vrij', opties: [{ id: 'koppelset_vrij2', aantal: 1 }] });
    expect(r2.aankoop).toBe(5850 + 570);
    expect(r2.warnings.join(' ')).not.toMatch(/bevestigen/);
    expect(p({ montage: 'vrij', opties: [{ id: 'koppelset_vrij4', aantal: 1 }] }).warnings.join(' ')).toMatch(/4 systemen: prijs uit de lijst 2025/);
  });
});

describe('transport altijd (zaakvoerder, 21-09-2026)', () => {
  it('Pinela, Louvre en onderdelen: €160 één keer per regel, niet in de klanttekst', () => {
    const pin = p({ aantal: 2, transport: true });
    expect(pin.aankoop).toBe(2 * 5850 + 160);
    expect(String(pin.detail.optiesTekst)).not.toMatch(/Transport/);
    const ond = calcOnderdelen({ omschrijving: '', regels: [{ artikel: 'gr_4000', aantal: 2, kleur: '' }], extraLijnen: [],
      plaatsingVast: 0, voorbereidingPersonen: 0, voorbereidingUren: 0, marges: depontiMarges(), opmerkingen: '', transport: true });
    expect(ond.aankoop).toBe(2 * 51 + 160);
    expect(String(ond.detail.optiesTekst)).not.toMatch(/Transport/);
    expect(ond.options.join(' ')).toMatch(/Transport dealer/);
    const enkelTransport = calcOnderdelen({ omschrijving: '', regels: [], extraLijnen: [], plaatsingVast: 0,
      voorbereidingPersonen: 0, voorbereidingUren: 0, marges: depontiMarges(), opmerkingen: '', transport: true });
    expect(enkelTransport.ok).toBe(false);
  });
});
