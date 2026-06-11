/**
 * Rolluik-berekening (Ecoroll-L/M, Rollex-L/M, + Solar-variant).
 * Prijsopzoeking gebeurt op BESTELMAAT (catalogus-conventie voor rolluiken):
 *   ODD: breedte +110mm (geleiders), hoogte +kasthoogte
 *   IDD: breedte −6mm, hoogte −4mm (kast telt niet mee)
 */
import rolluikData from '../data/rolluik.json';
import opties from '../data/opties.json';
import { EXTERN_ZONNEPANEEL, GELEIDER_BOREN_PER_STUK, PLAATSING } from '../data/constants';
import { ceilStep, lookupPrice, ROLLUIK_GRID } from './grid';
import { bereikbaarheid, berekenTotalen, kleurLabel, kleurMeerprijs } from './shared';
import type { BedieningKeuze, CalcResult, KleurKeuze, Marges, PriceGrid, VrijeOptie } from './types';

const PREFIX: Record<string, string> = {
  Ecoroll_L: 'EL_', Rollex_L: 'RL_', Ecoroll_M: 'EM_', Rollex_M: 'RM_', Ecoroll_L_Solar: 'ELS_',
};

const MAX_DIM: Record<string, { b: number; h: number }> = {
  Ecoroll_L: { b: 3500, h: 2800 }, Rollex_L: { b: 3500, h: 2800 },
  Ecoroll_M: { b: 3200, h: 2800 }, Rollex_M: { b: 3200, h: 2800 },
  Ecoroll_L_Solar: { b: 3500, h: 2800 },
};

/** Kasthoogte in mm, afhankelijk van serie en hoogte (catalogus-tiers). */
export function getKasthoogte(type: string, hoogte: number): number {
  if (type === 'Ecoroll_L' || type === 'Rollex_L' || type === 'Ecoroll_L_Solar') {
    if (hoogte <= 1340) return 150;
    if (hoogte <= 1900) return 165;
    if (hoogte <= 2360) return 180;
    return 205;
  }
  // M-serie
  if (hoogte <= 1800) return 150;
  if (hoogte <= 2350) return 165;
  return 180;
}

export interface RolluikInput {
  type: string;                 // Ecoroll_L | Rollex_L | Ecoroll_M | Rollex_M
  aantal: number;
  breedte: number;              // dagmaat mm
  hoogte: number;               // dagmaat mm
  plaatsing: 'idd' | 'odd';
  geleider: string;             // '' = standaard (inbegrepen)
  kasttype: string;             // 'afgeschuind 45°' | 'ronde of rechte omkasting'
  motor: string;                // '' = standaard RS100 io
  mkabel: 'ja' | 'nee' | '';
  lamel: 'standaard' | 'hardschuim';
  lamelKleur: string;
  koppelen: string;
  bereik: string;
  onderlat: string;
  borenJa: boolean;
  zonnepaneelJa: boolean;
  kleur: KleurKeuze;
  kleurOmkasting: string;
  bediening: BedieningKeuze;
  opmerkingen: string;
  vrijeOpties: VrijeOptie[];
  marges: Marges;
}

export function calcRolluik(inp: RolluikInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ex = (opties as any).rolluik_extras;

  const isSolar = !!inp.motor && inp.motor.toLowerCase().includes('solar');
  const effType = isSolar ? 'Ecoroll_L_Solar' : inp.type;
  if (isSolar && inp.type !== 'Ecoroll_L') errors.push('Solar motor is enkel beschikbaar voor Ecoroll-L');

  const { breedte, hoogte, aantal } = inp;
  if (!breedte || !hoogte) errors.push('Vul breedte en hoogte in');

  const max = MAX_DIM[effType];
  if (max && breedte > max.b) errors.push(`Breedte ${breedte}mm overschrijdt maximum (${max.b}mm)`);
  if (max && hoogte > max.h) errors.push(`Hoogte ${hoogte}mm overschrijdt maximum (${max.h}mm)`);
  if (breedte && breedte < 1000) warnings.push(`Breedte ${breedte}mm < 1m: prijs van 1000mm gebruikt`);
  if (hoogte && hoogte < 1000) warnings.push(`Hoogte ${hoogte}mm < 1m: prijs van 1000mm gebruikt`);

  // Bestelmaat (exact, voor fabrikant)
  const kasthoogte = isSolar ? 180 : getKasthoogte(effType, Math.max(1000, hoogte));
  const bestelB = inp.plaatsing === 'odd' ? breedte + 110 : breedte - 6;
  const bestelH = inp.plaatsing === 'odd' ? hoogte + kasthoogte : hoogte - 4;

  // Prijsopzoeking op bestelmaat → raster
  const prefix = PREFIX[effType];
  const grid = (rolluikData as any).prices[effType] as PriceGrid;
  const lk = lookupPrice(grid, ROLLUIK_GRID, `${prefix}H_`, `${prefix}B_`, bestelB, bestelH);
  if (!lk.producible && errors.length === 0) {
    errors.push(`Combinatie ${lk.bKey}×${lk.hKey}mm niet produceerbaar voor ${inp.type.replace(/_/g, '-')}`);
  }
  const basePrice = lk.price ?? 0;

  // ---- Prijscomponenten per stuk ----
  // FIX t.o.v. oude tool: geen aparte "kast-prijs" meer. De oude kast-tabel bevatte
  // kasthoogtes (150/165/180/205mm) die op exact 4 hoogtes als prijs werden opgeteld —
  // een import-artefact. De catalogus-basisprijs is voor het complete rolluik incl. kast.
  const regels = [{ label: 'Basisprijs', bedrag: basePrice }];

  // Geleider: afwijkende types €/m × 2 geleiders (lengte = bestelhoogte)
  const gelTarief: number = inp.geleider ? ex.geleiders[inp.geleider] ?? 0 : 0;
  const geleiderPrice = !isSolar && gelTarief > 0 ? (Math.max(0, bestelH) / 1000) * 2 * gelTarief : 0;
  if (geleiderPrice) regels.push({ label: `Geleider ${inp.geleider}`, bedrag: geleiderPrice });

  if (inp.borenJa) regels.push({ label: 'Geleiders boren', bedrag: GELEIDER_BOREN_PER_STUK * 2 });
  if (isSolar && inp.zonnepaneelJa) regels.push({ label: 'Extern zonnepaneel', bedrag: EXTERN_ZONNEPANEEL });

  const motorPrice: number = inp.motor ? ex.motoren[inp.motor] ?? 0 : 0;
  if (motorPrice) regels.push({ label: `Motor ${inp.motor}`, bedrag: motorPrice });

  if (inp.mkabel === 'ja') regels.push({ label: 'Afwijkende motorkabel', bedrag: ex.afwijkende_motorkabel.ja ?? 35 });

  const kastTypePrice: number = ex.kast_types[inp.kasttype] ?? 0;
  if (kastTypePrice) regels.push({ label: `Omkasting ${inp.kasttype}`, bedrag: kastTypePrice });

  const koppelPrice: number = inp.koppelen ? ex.koppelen[inp.koppelen] ?? 0 : 0;
  if (koppelPrice) regels.push({ label: `Koppelen ${inp.koppelen}`, bedrag: koppelPrice });

  // Hardschuim lamel: €119/m² op bestelmaat, enkel als de lamelkleur het toelaat
  if (inp.lamel === 'hardschuim') {
    const kleurData = inp.lamelKleur ? ex.lamel_colors[inp.lamelKleur] : null;
    if (kleurData?.hardschuim === 'ja') {
      regels.push({ label: 'Hardschuim lamel', bedrag: (Math.max(0, bestelB) * Math.max(0, bestelH) / 1e6) * 119 });
    } else if (kleurData?.hardschuim === 'nee') {
      errors.push(`Hardschuim niet mogelijk met kleur "${inp.lamelKleur}"`);
    } else {
      warnings.push('Controleer of hardschuim mogelijk is voor deze kleur');
    }
  }

  const km = kleurMeerprijs(inp.kleur);
  if (km) regels.push({ label: 'Kleur meerprijs', bedrag: km });

  // ---- Plaatsing ----
  const perType: number = ex.plaatsing_extra_per_type[inp.type] ?? 100;
  const ber = bereikbaarheid(inp.bereik);
  if (ber.warning) warnings.push(ber.warning);
  const plaatsingTotaal = (PLAATSING.rolluikBasis + perType + ber.prijs) * aantal;

  const vrijeSom = inp.vrijeOpties.reduce((s, o) => s + o.amount, 0);
  const tot = berekenTotalen(regels, aantal, vrijeSom, plaatsingTotaal, inp.bediening, inp.marges);

  const kl = kleurLabel(inp.kleur);
  return {
    ok: errors.length === 0,
    errors, warnings,
    product: 'Rolluik',
    type: inp.type.replace(/_/g, '-'),
    aantal, breedte, hoogte,
    calculatiemaat: { b: lk.bKey, h: lk.hKey },
    bestelmaat: { b: bestelB, h: bestelH },
    regels,
    productSubtotal: tot.productSubtotal,
    plaatsingTotaal,
    bedieningTotaal: tot.bedieningTotaal,
    bedieningAankoop: tot.bedieningAankoop,
    marges: inp.marges,
    aankoop: tot.aankoop,
    verkoop: tot.verkoop,
    uwVerkoop: tot.uwVerkoop,
    options: [
      `Plaatsing: ${inp.plaatsing.toUpperCase()}`,
      inp.geleider && `Geleider: ${inp.geleider}`,
      inp.kasttype && `Kast: ${inp.kasttype}`,
      inp.motor && `Motor: ${inp.motor}`,
      inp.mkabel === 'ja' && 'Afwijkende motorkabel',
      inp.lamel === 'hardschuim' && 'Lamel: hardschuim',
      inp.lamelKleur && `Kleur lamel: ${inp.lamelKleur}`,
      kl && `Kleur: ${kl}`,
      km > 0 && `Kleur meerprijs: +€${km}`,
      inp.onderlat && `Onderlat: ${inp.onderlat}`,
      inp.borenJa && 'Geleiders boren',
      inp.zonnepaneelJa && isSolar && 'Extern zonnepaneel',
      inp.koppelen && `Koppelen: ${inp.koppelen}`,
      inp.bereik && `Bereikbaarheid: ${inp.bereik}`,
      inp.bediening.bed1 && `Bediening 1: ${inp.bediening.bed1}`,
      inp.bediening.bed2 && `Bediening 2: ${inp.bediening.bed2}`,
      ...inp.vrijeOpties.map((o) => `${o.description}: €${o.amount.toFixed(2)}`),
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      plaatsing: inp.plaatsing,
      geleider: inp.geleider,
      kasttype: inp.kasttype,
      motor: inp.motor || 'RS100 io (standaard)',
      lamel: inp.lamel,
      lamelKleur: inp.lamelKleur,
      onderlat: inp.onderlat,
      kleurOmkasting: inp.kleurOmkasting,
      kasthoogte,
      isSolar,
    },
    bediening: inp.bediening,
    kleur: inp.kleur,
  };
}

export const ROLLUIK_TYPES = Object.keys(PREFIX).filter((t) => t !== 'Ecoroll_L_Solar');
export { ceilStep };
