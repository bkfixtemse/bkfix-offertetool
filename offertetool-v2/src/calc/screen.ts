/**
 * Screen-berekening (Nova 83/103/123/solar 103).
 * Prijsopzoeking gebeurt op DAGMAAT (catalogus-conventie voor screens);
 * de bestelmaat (dagmaat ± ODD/IDD-toeslag) gaat enkel naar de bestelbon.
 *
 * FIX t.o.v. oude tool: doekgroep-meerprijs gebruikt nu de screen-specifieke
 * catalogusprijzen (B €70 / C €110 / D €350) i.p.v. de pergola-tabel.
 */
import screensData from '../data/screens.json';
import opties from '../data/opties.json';
import { EXTERN_ZONNEPANEEL, GELEIDER_BOREN_PER_STUK, ONDERLAT_HOOG_VERZWAARD, PLAATSING } from '../data/constants';
import { lookupPrice, SCREEN_GRID } from './grid';
import { bereikbaarheid, berekenTotalen, kleurLabel, kleurMeerprijs } from './shared';
import type { BedieningKeuze, CalcResult, KleurKeuze, Marges, PriceGrid, VrijeOptie } from './types';

export const SCREEN_SOLAR_MOTOR = 'RS100 Solar io';

export interface ScreenInput {
  type: string;                 // Nova 83 | Nova 103 | Nova 123 | Nova solar 103
  aantal: number;
  breedte: number;
  hoogte: number;
  plaatsing: 'idd' | 'odd';
  geleider: string;             // '' = standaard
  onderlatHoog: boolean;
  borenJa: boolean;
  omkasting: 'recht' | 'afgerond';
  motor: string;
  zonnepaneelJa: boolean;
  bereik: string;
  doek: string;                 // standaard | groep B | groep C | groep D
  koppelen: 'ja' | 'nee' | '';
  kleur: KleurKeuze;
  bediening: BedieningKeuze;
  opmerkingen: string;
  vrijeOpties: VrijeOptie[];
  marges: Marges;
}

export function calcScreen(inp: ScreenInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ex = (opties as any).screen_extras;
  const { breedte, hoogte, aantal, type } = inp;
  const isSolar = type === 'Nova solar 103';

  if (!breedte || !hoogte) errors.push('Vul breedte en hoogte in');

  const maxDim: [number, number] | undefined = (screensData as any).max[type];
  if (maxDim) {
    if (breedte > maxDim[0]) errors.push(`Breedte ${breedte}mm overschrijdt maximum voor ${type} (${maxDim[0]}mm)`);
    if (hoogte > maxDim[1]) errors.push(`Hoogte ${hoogte}mm overschrijdt maximum voor ${type} (${maxDim[1]}mm)`);
  }

  // Nova solar: motor vergrendeld
  const motor = isSolar ? SCREEN_SOLAR_MOTOR : inp.motor;

  // Prijsopzoeking op dagmaat
  const spec = SCREEN_GRID[type] ?? SCREEN_GRID['Nova 83'];
  const prefix: string = (screensData as any).prefixes[type];
  const grid = (screensData as any).prices[type] as PriceGrid;
  const lk = lookupPrice(grid, spec, `${prefix}_H_`, `${prefix}_B_`, breedte, hoogte);
  if (!lk.producible && errors.length === 0) {
    errors.push(`Combinatie ${lk.bKey}×${lk.hKey}mm niet produceerbaar voor ${type}`);
  }
  const basePrice = lk.price ?? 0;

  // Bestelmaat = dagmaat + ODD-toeslag per type, of IDD −4
  const add = ex.plaatsing_types[type] ?? { hoogte_add_odd: 100, breedte_add_odd: 80 };
  const bestelB = inp.plaatsing === 'odd' ? breedte + add.breedte_add_odd : breedte - 4;
  const bestelH = inp.plaatsing === 'odd' ? hoogte + add.hoogte_add_odd : hoogte - 4;

  // ---- Prijscomponenten per stuk ----
  const regels = [{ label: 'Basisprijs', bedrag: basePrice }];

  const gelRaw = inp.geleider ? ex.geleiders[inp.geleider] : 0;
  const gelTarief = typeof gelRaw === 'number' ? gelRaw : 0;
  const geleiderPrice = gelTarief > 0 ? (Math.max(0, bestelH) / 1000) * 2 * gelTarief : 0;
  if (geleiderPrice) regels.push({ label: `Geleider ${inp.geleider}`, bedrag: geleiderPrice });

  if (inp.onderlatHoog) regels.push({ label: 'Hoge verzwaarde onderlat', bedrag: ONDERLAT_HOOG_VERZWAARD });
  if (inp.borenJa) regels.push({ label: 'Geleiders boren', bedrag: GELEIDER_BOREN_PER_STUK * 2 });
  if (isSolar && inp.zonnepaneelJa) regels.push({ label: 'Extern zonnepaneel', bedrag: EXTERN_ZONNEPANEEL });

  const motorPrice: number = motor ? ex.motoren[motor] ?? 0 : 0;
  if (motorPrice) regels.push({ label: `Motor ${motor}`, bedrag: motorPrice });

  // FIX: screen-specifieke doekgroep (B70/C110/D350 — catalogus p70-76)
  const doekPrice: number = inp.doek ? ex.doek_groep[inp.doek] ?? 0 : 0;
  if (doekPrice) regels.push({ label: `Doek ${inp.doek}`, bedrag: doekPrice });

  if (inp.koppelen === 'ja') regels.push({ label: 'Koppelen', bedrag: ex.koppelen.ja ?? 90 });

  const km = kleurMeerprijs(inp.kleur);
  if (km) regels.push({ label: 'Kleur meerprijs', bedrag: km });

  // ---- Plaatsing ----
  const novaExtra = PLAATSING.screenNovaExtra[type] ?? 100;
  const ber = bereikbaarheid(inp.bereik);
  if (ber.warning) warnings.push(ber.warning);
  const plaatsingTotaal = (PLAATSING.screenBasis + novaExtra + ber.prijs) * aantal;

  const vrijeSom = inp.vrijeOpties.reduce((s, o) => s + o.amount, 0);
  const tot = berekenTotalen(regels, aantal, vrijeSom, plaatsingTotaal, inp.bediening, inp.marges);

  const kl = kleurLabel(inp.kleur);
  return {
    ok: errors.length === 0,
    errors, warnings,
    product: 'Screen',
    type, aantal, breedte, hoogte,
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
      `Omkasting: ${inp.omkasting}`,
      inp.geleider && `Geleider: ${inp.geleider}`,
      inp.onderlatHoog && 'Hoge verzwaarde onderlat',
      inp.borenJa && 'Geleiders boren',
      `Motor: ${motor}`,
      isSolar && inp.zonnepaneelJa && 'Extern zonnepaneel',
      inp.doek && inp.doek !== 'standaard' && `Doek: ${inp.doek}`,
      inp.koppelen === 'ja' && 'Koppelen',
      kl && `Kleur: ${kl}`,
      km > 0 && `Kleur meerprijs: +€${km}`,
      inp.bereik && `Bereikbaarheid: ${inp.bereik}`,
      inp.bediening.bed1 && `Bediening 1: ${inp.bediening.bed1}`,
      inp.bediening.bed2 && `Bediening 2: ${inp.bediening.bed2}`,
      ...inp.vrijeOpties.map((o) => `${o.description}: €${o.amount.toFixed(2)}`),
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      plaatsing: inp.plaatsing,
      geleider: inp.geleider,
      omkasting: inp.omkasting,
      onderlatHoog: inp.onderlatHoog,
      borenJa: inp.borenJa,
      zonnepaneelJa: isSolar && inp.zonnepaneelJa,
      motor,
      doek: inp.doek,
      isSolar,
    },
    bediening: inp.bediening,
    kleur: inp.kleur,
  };
}

export const SCREEN_TYPES = Object.keys((screensData as any).prices);
