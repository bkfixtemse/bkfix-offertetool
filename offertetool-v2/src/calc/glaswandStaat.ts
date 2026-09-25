/**
 * De toestand van het glaswandformulier en hoe die naar de rekenkern gaat — als pure functies, zodat
 * elke plek die een glaswand berekent (de Glaswand-tab én de wanden onder een overkapping) exact
 * dezelfde invoer, hetzelfde advies en dus dezelfde prijs krijgt.
 */
import { GLASWAND_MERK, GLASWAND_VOORBEREIDING_TARIEF } from '../data/constants';
import {
  calcGlaswand, hoogteVoorMerk, type GlaswandExtra, type GlaswandInput, type GlaswandMerk, type GlaswandOptieKeuze,
  type GlaswandPaneel,
} from './glaswand';
import {
  bepaalIndeling, glaswandOptiesVoorAantal, glaswandOverzicht, indelingNaarInvoer, INDELING_VERSIE,
  type AantalAdvies, type AdviesInstelling, type GlaswandOverzicht, type IndelingKeuze,
} from './glaswandAdvies';
import type { CalcResult } from './types';

export const GLASWAND_DEFAULT = {
  merk: 'ES Systems' as GlaswandMerk,
  aantal: 1,
  dagmaatBreedte: 0, dagmaatHoogte: 0,
  kokerLinks: 0, kokerMidden: 0, kokerRechts: 0,
  aantalPanelen: 3,
  paneelModus: 'maatwerk' as 'standaard' | 'maatwerk' | 'mix',
  paneelBreedte: 900,
  paneelVerdeling: [] as GlaswandPaneel[],
  /** auto = altijd de beste mogelijkheid · vast = zelf aangeklikt · eigen = glasmaten zelf ingegeven */
  keuze: 'auto' as IndelingKeuze,
  /** Zie migreerIndeling: zonder dit veld is het een item van voor het Deponti-advies. */
  indelingVersie: INDELING_VERSIE,
  overlap: 30,
  steellook: false,
  glas: 'helder' as 'helder' | 'getint',
  sporen: 0,
  raillengte: 0,
  glassoort: 'standaard',
  sluiting: 'geen' as 'geen' | 'zij' | 'midden',
  kleurSelect: '', kleurCustom: '',
  opties: [] as GlaswandOptieKeuze[],
  extraLijnen: [] as GlaswandExtra[],
  kortingPct: 40, margePct: 20,
  plaatsingVast: 800,
  voorbereidingPersonen: 0, voorbereidingUren: 0, voorbereidingTarief: GLASWAND_VOORBEREIDING_TARIEF,
  korting: 0, opmerkingen: '',
  /**
   * true = deze wand hoort bij een overkapping (Overkappingen-tab): het transport staat op de
   * overkapping, dus ook een merkwissel naar Deponti zet geen tweede transport op de wand.
   */
  transportBijOverkapping: false,
  /**
   * Gemeten hoogte onder de goot (wanden uit de Overkappingen-tab); 0 = de inbouwhoogte is zelf
   * ingegeven. Zolang ze gekend is, volgt de hoogte bij een merkwissel het nieuwe merk.
   */
  gemetenHoogte: 0,
};
export type GlaswandStaat = typeof GLASWAND_DEFAULT;

/**
 * Wat er verandert als je van merk wisselt: korting, marge, plaatsing en alle merkgebonden keuzes.
 * `transport` = bij Deponti standaard €160 transport erbij (in de Glaswand-tab: een eigen levering).
 */
export function merkInstellingen(merk: GlaswandMerk, transport = true): Partial<GlaswandStaat> {
  const cfg = GLASWAND_MERK[merk];
  return {
    merk,
    kortingPct: cfg.korting * 100,
    margePct: cfg.marge * 100,
    plaatsingVast: cfg.plaatsingVast,
    paneelBreedte: merk === 'Deponti' ? 980 : 900,
    // Deponti rekent €160 transport per levering (ook op grote orders): standaard erbij, weg te
    // halen als de order met een andere levering meekomt.
    opties: merk === 'Deponti' && transport ? [{ id: 'transport', aantal: 1 }] : [],
    extraLijnen: [], kleurSelect: '', kleurCustom: '', sporen: 0, raillengte: 0,
    // steel-look, sluiting en maatwerkglassoort zijn Deponti-velden: bij ES zijn ze onzichtbaar,
    // dus ze mogen niet blijven staan wanneer je van merk wisselt.
    steellook: false, sluiting: 'geen', glassoort: 'standaard',
    // Ook de indeling is merkgebonden (andere standaardmaten). Een zelf gekozen of zelf ingegeven
    // indeling van het ene merk mag niet doorlopen in het andere: begin opnieuw bij de beste.
    keuze: 'auto', paneelModus: 'maatwerk', paneelVerdeling: [],
  };
}

/**
 * Van merk wisselen in de Glaswand-tab. Een wand van een overkapping krijgt geen eigen transport, en
 * rekent opnieuw vanaf de gemeten hoogte: ES met de gemeten maat, Fiano met de standaardhoogte die erin past.
 */
export function wisselMerkStaat(s: GlaswandStaat, merk: GlaswandMerk): GlaswandStaat {
  return {
    ...s,
    ...merkInstellingen(merk, !s.transportBijOverkapping),
    ...(s.gemetenHoogte > 0 ? { dagmaatHoogte: hoogteVoorMerk(merk, s.gemetenHoogte) } : {}),
  };
}

/** Alles behalve de indeling. Zowel de berekening als de voorstellen vertrekken hiervan. */
export function glaswandBasisInvoer(s: GlaswandStaat): GlaswandInput {
  return {
    ...s,
    ...indelingNaarInvoer({
      paneelModus: s.paneelModus, aantalPanelen: s.aantalPanelen, paneelBreedte: s.paneelBreedte,
      paneelVerdeling: s.paneelVerdeling, overlap: s.overlap,
    }),
    kleur: { select: s.kleurSelect === 'andere' ? 'andere' : s.kleurSelect, custom: s.kleurCustom },
    bediening: { bed1: '', bed2: '' },
    vrijeOpties: [],
    marges: {
      allroundKorting: s.kortingPct / 100,
      bkfixMarge: s.margePct / 100,
      eenmaligeKorting: s.korting,
    },
  };
}

export interface GlaswandBerekening {
  basis: GlaswandInput;
  perAantal: AantalAdvies;
  instelling: AdviesInstelling;
  invoer: GlaswandInput;
  r: CalcResult;
}

/**
 * De berekening zoals de Glaswand-tab ze maakt: de indeling volgens de keuze (standaard automatisch
 * de beste voor het gekozen aantal panelen), daarna de rekenkern.
 */
export function berekenGlaswandStaat(s: GlaswandStaat, perAantal?: AantalAdvies): GlaswandBerekening {
  const basis = glaswandBasisInvoer(s);
  const pa = perAantal ?? glaswandOptiesVoorAantal(basis, s.aantalPanelen);
  const instelling = bepaalIndeling(s, pa);
  const invoer: GlaswandInput = { ...basis, ...indelingNaarInvoer(instelling) };
  return { basis, perAantal: pa, instelling, invoer, r: calcGlaswand(invoer) };
}

/**
 * Een maat wijzigen die bepaalt welke mogelijkheden er zijn. Een zelf gekozen indeling ('vast') blijft
 * staan zolang ze met de nieuwe maten nog een van de mogelijkheden is — bij ES veranderen hoogte en
 * glastype die niet. Is ze er niet meer bij, dan kiest de tool opnieuw de beste ('auto').
 */
export function wijzigMaatStaat(s: GlaswandStaat, p: Partial<GlaswandStaat>): Partial<GlaswandStaat> {
  if (s.keuze !== 'vast') return p;
  const nieuw = { ...s, ...p };
  // Tijdens het typen passeert een maat onvolledige waarden (2, 23, 230 …). Geen glaswand is lager
  // dan 1000mm, en zonder mogelijkheden is er niets om mee te vergelijken: dan de keuze niet weggooien.
  if (!(nieuw.dagmaatHoogte >= 1000) || !(nieuw.dagmaatBreedte > 0)) return p;
  const opties = glaswandOptiesVoorAantal(glaswandBasisInvoer(nieuw), nieuw.aantalPanelen)?.opties ?? [];
  if (opties.length === 0) return p;
  const nu = berekenGlaswandStaat(s).r;
  // Vergelijk gesorteerd, zoals de Glaswand-tab de rij "in gebruik" aanduidt.
  const huidig = String(nu.detail.panelenLijst || '').split(',').filter(Boolean).map(Number)
    .sort((a, b) => a - b).join(',');
  const blijft = opties.some((o) => [...o.panelen].sort((a, b) => a - b).join(',') === huidig
    && (o.panelen.length <= 1 || Number(nu.detail.overlap) === o.overlap));
  return blijft ? p : { ...p, keuze: 'auto' };
}

/** Het overzicht over alle aantallen panelen, voor dezelfde invoer. */
export function glaswandOverzichtStaat(s: GlaswandStaat): GlaswandOverzicht {
  return glaswandOverzicht(glaswandBasisInvoer(s));
}
