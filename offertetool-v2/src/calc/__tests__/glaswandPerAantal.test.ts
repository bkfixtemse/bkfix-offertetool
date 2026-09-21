/**
 * "Geef het aantal panelen en de overlap, en de tool toont alle mogelijkheden" — zonder dat je
 * eerst moet kiezen tussen standaard, maatwerk of mix.
 */
import { describe, expect, it } from 'vitest';
import { calcGlaswand, type GlaswandInput } from '../glaswand';
import {
  bepaalIndeling, glaswandOptiesVoorAantal, indelingNaarInvoer, migreerIndeling, type IndelingStaat,
} from '../glaswandAdvies';

const basis: GlaswandInput = {
  merk: 'ES Systems', aantal: 1, dagmaatBreedte: 2800, dagmaatHoogte: 2400,
  kokerLinks: 0, kokerMidden: 0, kokerRechts: 0, aantalPanelen: 3,
  paneelModus: 'maatwerk', paneelBreedte: 900, overlap: 30, steellook: false,
  glas: 'helder', sporen: 0, raillengte: 0, glassoort: 'standaard', sluiting: 'geen',
  kleur: { select: '', custom: '' }, opties: [], extraLijnen: [],
  bediening: { bed1: '', bed2: '' }, opmerkingen: '', vrijeOpties: [],
  voorbereidingPersonen: 0, voorbereidingUren: 0,
  marges: { allroundKorting: 0.4, bkfixMarge: 0.2, eenmaligeKorting: 0 },
};
const gesorteerd = (p: number[]) => [...p].sort((a, b) => a - b);

describe('alle mogelijkheden voor een gekozen aantal panelen', () => {
  const a = glaswandOptiesVoorAantal(basis, 3);

  it('toont standaard, maatwerk en mix door elkaar, allemaal met precies 3 panelen', () => {
    expect(a.opties.length).toBeGreaterThan(5);
    expect(a.opties.every((o) => o.panelen.length === 3)).toBe(true);
    const soorten = new Set(a.opties.map((o) => o.soort));
    expect(soorten.has('maatwerk')).toBe(true);
    expect(soorten.has('standaard')).toBe(true);
    expect(soorten.has('mix')).toBe(true);
    expect(soorten.has('aanvulling')).toBe(true);
  });

  it('de beste staat bovenaan: 900 + 980 + 980 op exact 30mm voor €420', () => {
    expect(a.beste).toBe(a.opties[0]);
    expect(gesorteerd(a.beste!.panelen)).toEqual([900, 980, 980]);
    expect(a.beste?.overlap).toBe(30);
    expect(a.beste?.aankoop).toBe(420);
  });

  it('maatwerk (3× 953 voor €720) en 3× 980 op 70mm staan er ook tussen', () => {
    expect(a.opties.find((o) => o.soort === 'maatwerk')?.panelen).toEqual([953, 953, 953]);
    const std980 = a.opties.find((o) => o.panelen.every((b) => b === 980));
    expect(std980?.overlap).toBe(70);
  });

  it('geen dubbels, en alles wat getoond wordt, kan ook', () => {
    const sleutels = a.opties.map((o) => `${gesorteerd(o.panelen).join(',')}@${o.overlap}`);
    expect(new Set(sleutels).size).toBe(sleutels.length);
    expect(a.opties.every((o) => o.mogelijk)).toBe(true);
  });

  it('op 3182mm met 4 panelen wint 2× 900 + 2× 736', () => {
    const v = glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: 3182 }, 4);
    expect(gesorteerd(v.beste!.panelen)).toEqual([736, 736, 900, 900]);
    expect(v.opties.some((o) => o.panelen.join(',') === '818,818,818,818')).toBe(true);
  });

  it('meer panelen dan rails: niets, met de reden van de rekenkern', () => {
    const v = glaswandOptiesVoorAantal(basis, 7);
    expect(v.opties).toEqual([]);
    expect(v.beste).toBeNull();
    expect(v.reden).toMatch(/6 rails/);
  });

  it('weinig panelen op een brede opening: het brede maatwerkglas komt erin, met vlag', () => {
    const v = glaswandOptiesVoorAantal(basis, 2);
    expect(v.beste?.panelen).toEqual([1415, 1415]);   // (2800 + 30) / 2
    expect(v.beste?.breed).toBe(true);
  });

  it('elke mogelijkheid rekent na "gebruik" exact hetzelfde door', () => {
    for (const [breedte, n] of [[2138, 3], [2650, 3], [2800, 3], [3182, 4], [4061, 5], [5500, 6]]) {
      const v = glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: breedte }, n);
      for (const o of v.opties) {
        const r = calcGlaswand({ ...basis, dagmaatBreedte: breedte, ...indelingNaarInvoer(o.instelling) });
        expect(String(r.detail.panelenLijst), `${breedte}/${n} ${o.titel}`).toBe(o.panelen.join(','));
        expect(r.aankoop, `${breedte}/${n} ${o.titel}`).toBeCloseTo(o.aankoop, 2);
      }
    }
  });

  it('zonder opening of hoogte: geen lijst, geen foutmelding', () => {
    expect(glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: 0 }, 3)).toMatchObject({ opties: [], reden: '' });
    expect(glaswandOptiesVoorAantal({ ...basis, dagmaatHoogte: 0 }, 3)).toMatchObject({ opties: [], reden: '' });
  });
});

describe('welke indeling het formulier gebruikt', () => {
  const staat: IndelingStaat = {
    keuze: 'auto', paneelModus: 'maatwerk', aantalPanelen: 3, paneelBreedte: 1000,
    paneelVerdeling: [], overlap: 30,
  };
  const perAantal = glaswandOptiesVoorAantal(basis, 3);

  it('automatisch: de beste, zonder de gekozen standaardbreedte te overschrijven', () => {
    const i = bepaalIndeling(staat, perAantal);
    expect(i.paneelModus).toBe('mix');
    expect(i.paneelBreedte).toBe(1000);
    const r = calcGlaswand({ ...basis, ...indelingNaarInvoer(i) });
    expect(gesorteerd(String(r.detail.panelenLijst).split(',').map(Number))).toEqual([900, 980, 980]);
  });

  it('zelf gekozen: blijft wat er aangeklikt werd', () => {
    const i = bepaalIndeling({ ...staat, keuze: 'vast', paneelModus: 'maatwerk' }, perAantal);
    expect(i.paneelModus).toBe('maatwerk');
    const r = calcGlaswand({ ...basis, ...indelingNaarInvoer(i) });
    expect(String(r.detail.panelenLijst)).toBe('953,953,953');
  });

  it('eigen indeling: de rijen tellen, ook voor het aantal panelen', () => {
    const i = bepaalIndeling({
      ...staat, keuze: 'eigen', aantalPanelen: 99,
      paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 1000, aantal: 1 }],
    }, perAantal);
    expect(i.paneelModus).toBe('mix');
    expect(i.aantalPanelen).toBe(3);
  });

  it('automatisch maar niets mogelijk: rekent als maatwerk, zodat de reden zichtbaar wordt', () => {
    const niets = glaswandOptiesVoorAantal(basis, 7);
    const i = bepaalIndeling({ ...staat, aantalPanelen: 7 }, niets);
    const r = calcGlaswand({ ...basis, ...indelingNaarInvoer(i) });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/6 rails/);
  });
});

describe('bewaarde offertes van voor deze wijziging', () => {
  // Zo zag de invoer eruit toen je nog zelf standaard/maatwerk/mix koos.
  const oud = [
    { paneelModus: 'standaard' as const, paneelBreedte: 900, aantalPanelen: 3, paneelVerdeling: [], overlap: 30, breedte: 2650 },
    { paneelModus: 'maatwerk' as const, paneelBreedte: 900, aantalPanelen: 4, paneelVerdeling: [], overlap: 30, breedte: 3182 },
    {
      paneelModus: 'mix' as const, paneelBreedte: 900, aantalPanelen: 3, overlap: 30, breedte: 2731,
      paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 1000, aantal: 1 }],
    },
  ];

  it('rekenen na heropenen exact zoals toen (standaard/maatwerk als "zelf gekozen", mix als "eigen")', () => {
    for (const o of oud) {
      const toen = calcGlaswand({ ...basis, dagmaatBreedte: o.breedte, ...indelingNaarInvoer(o) });
      const gemigreerd = migreerIndeling(o);
      expect(gemigreerd.keuze).toBe(o.paneelModus === 'mix' ? 'eigen' : 'vast');
      const perAantal = glaswandOptiesVoorAantal({ ...basis, dagmaatBreedte: o.breedte }, o.aantalPanelen);
      const nu = calcGlaswand({
        ...basis, dagmaatBreedte: o.breedte, ...indelingNaarInvoer(bepaalIndeling(gemigreerd, perAantal)),
      });
      expect(String(nu.detail.panelenLijst), o.paneelModus).toBe(String(toen.detail.panelenLijst));
      expect(nu.aankoop, o.paneelModus).toBeCloseTo(toen.aankoop, 2);
    }
  });

  it('een oude mixwand met een verouderd aantal (3 bewaard, 4 in de rijen) opent met 4 panelen', () => {
    // Het oude formulier paste "aantal panelen" in mix-modus niet aan: het bleef op 3 staan.
    const o = {
      paneelModus: 'mix' as const, paneelBreedte: 900, aantalPanelen: 3, overlap: 30,
      paneelVerdeling: [{ breedte: 900, aantal: 2 }, { breedte: 1000, aantal: 2 }],
    };
    const toen = calcGlaswand({ ...basis, dagmaatBreedte: 3710, ...indelingNaarInvoer(o) });
    expect(String(toen.detail.panelenLijst)).toBe('900,900,1000,1000');
    const gemigreerd = migreerIndeling(o);
    expect(gemigreerd.keuze).toBe('eigen');
    expect(gemigreerd.aantalPanelen).toBe(4);
    const nu = calcGlaswand({
      ...basis, dagmaatBreedte: 3710, ...indelingNaarInvoer(bepaalIndeling(gemigreerd, null)),
    });
    expect(String(nu.detail.panelenLijst)).toBe('900,900,1000,1000');
    expect(nu.aankoop).toBeCloseTo(toen.aankoop, 2);
  });

  it('een nieuwer item houdt zijn keuze', () => {
    expect(migreerIndeling({ keuze: 'eigen' as const }).keuze).toBe('eigen');
    expect(migreerIndeling({ keuze: 'auto' as const }).keuze).toBe('auto');
  });
});
