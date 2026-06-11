/**
 * Veranda/pergola-berekening (Vinci-serie + Stilo serrezonwering).
 * Raster: Vinci 500mm (min 1500×2000) · Stilo 250mm (min 1000×1500).
 * Allround korting: 40% (sterretje-producten in catalogus).
 *
 * FIXES t.o.v. oude tool:
 * - Uitval-toeslag €245 bij uitval 700–1400mm (was dode code op breedte)
 * - Doekgroep = vast bedrag (B110/C220/D360), niet × m²
 */
import verandaData from '../data/veranda.json';
import opties from '../data/opties.json';
import { PERGOLA_TYPES, PLAATSING, UITVAL_KLEIN_TOESLAG, VERANDA_MOTOR_OREA_WT, VERANDA_STEUNEN } from '../data/constants';
import { lookupPrice, verandaGrid } from './grid';
import { berekenTotalen, bereikbaarheid, kleurLabel, kleurMeerprijs } from './shared';
import type { BedieningKeuze, CalcResult, KleurKeuze, Marges, PriceGrid, VrijeOptie } from './types';

export interface VerandaExtra { naam: string; aantal: number }

export interface VerandaInput {
  type: string;
  aantal: number;
  breedte: number;
  uitval: number;
  motor: 'Sunea io' | 'Orea WT';
  steun: string;                // sleutel uit VERANDA_STEUNEN
  steunAantal: number;
  mkabel: 'ja' | 'nee' | '';
  gevel: string;
  doek: string;
  bereik: string;
  led: string;                  // enkel Vinci 250+ volant
  extras: VerandaExtra[];       // losse opties uit veranda.options
  kleur: KleurKeuze;
  bediening: BedieningKeuze;
  opmerkingen: string;
  vrijeOpties: VrijeOptie[];
  marges: Marges;
  /** Vaste plaatsingskost; default: pergola €850, serrezonwering €350 (instelbaar). */
  plaatsingVast?: number;
}

export function calcVeranda(inp: VerandaInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const vd = verandaData as any;
  const td = vd.types[inp.type];
  const meta = vd.meta[inp.type];
  const { breedte, uitval, aantal, type } = inp;

  if (!breedte || !uitval) errors.push('Vul breedte en uitval in');
  if (meta) {
    if (breedte > meta.max_width) errors.push(`Breedte ${breedte}mm overschrijdt maximum voor ${type} (${meta.max_width}mm)`);
    if (uitval > meta.max_uitval) errors.push(`Uitval ${uitval}mm overschrijdt maximum voor ${type} (${meta.max_uitval}mm)`);
  }

  const spec = verandaGrid(type);
  if (breedte && breedte < spec.minB) warnings.push(`Breedte ${breedte}mm < ${spec.minB}mm: prijs van ${spec.minB}mm gebruikt`);
  const lk = lookupPrice(td?.prices as PriceGrid, spec, td?.prefix_U ?? '', td?.prefix_B ?? '', breedte, uitval);
  if (!lk.producible && errors.length === 0) {
    errors.push(`Combinatie breedte ${lk.bKey}mm × uitval ${lk.hKey}mm niet produceerbaar voor ${type}`);
  }
  const basePrice = lk.price ?? 0;

  // ---- Prijscomponenten per stuk ----
  const regels = [{ label: 'Basisprijs', bedrag: basePrice }];

  // FIX: catalogus "Meerprijs bij uitval 700–1400mm: €245" (alle pergola/serre-types)
  if (uitval >= 700 && uitval <= 1400) {
    regels.push({ label: 'Toeslag kleine uitval (700–1400mm)', bedrag: UITVAL_KLEIN_TOESLAG });
  }

  if (inp.motor === 'Orea WT') regels.push({ label: 'Motor Orea WT', bedrag: VERANDA_MOTOR_OREA_WT });

  const steunPer = VERANDA_STEUNEN[inp.steun] ?? 0;
  const steunPrice = steunPer * Math.max(0, inp.steunAantal);
  if (steunPrice) regels.push({ label: `${inp.steun} × ${inp.steunAantal}`, bedrag: steunPrice });

  if (inp.mkabel === 'ja') regels.push({ label: 'Afwijkende motorkabel', bedrag: (opties as any).algemene.motorkabel.ja ?? 35 });

  // FIX: doekgroep = vast bedrag (catalogus), niet per m²
  const doekRaw = (opties as any).algemene.doekgroep[inp.doek];
  const doekPrice = typeof doekRaw === 'number' ? doekRaw : 0;
  if (doekPrice) regels.push({ label: `Doek ${inp.doek}`, bedrag: doekPrice });

  // LED / volant: tabelprijs per breedte, enkel Vinci 250+ volant
  let ledPrice = 0;
  if (inp.led) {
    if (type === 'Vinci 250+ volant') {
      ledPrice = vd.accessory_prices?.[type]?.[inp.led]?.[String(lk.bKey)] ?? 0;
      if (!ledPrice) warnings.push(`Geen tabelprijs voor "${inp.led}" bij breedte ${lk.bKey}mm`);
      else regels.push({ label: inp.led, bedrag: ledPrice });
    } else {
      errors.push(`LED/volant niet mogelijk op ${type}`);
    }
  }

  // Extra opties (steunen e.d. uit veranda.options) — per stuk × aantal
  const extrasList: string[] = [];
  let extrasSom = 0;
  for (const e of inp.extras) {
    if (!e.naam || e.aantal <= 0) continue;
    const p = vd.options[e.naam]?.prijs ?? 0;
    extrasSom += p * e.aantal;
    extrasList.push(`${e.naam} (${e.aantal}×€${p})`);
  }

  const km = kleurMeerprijs(inp.kleur);
  if (km) regels.push({ label: 'Kleur meerprijs', bedrag: km });

  // ---- Plaatsing (gevel = plaatsingskost) ----
  const gevelRaw = (opties as any).algemene.type_gevel[inp.gevel];
  const gevelPrice = typeof gevelRaw === 'number' ? gevelRaw : 0;
  if (typeof gevelRaw === 'string' && gevelRaw) warnings.push(`Gevel "${inp.gevel}": ${gevelRaw}`);
  const ber = bereikbaarheid(inp.bereik);
  if (ber.warning) warnings.push(ber.warning);
  // Pergola (vrijstaand, met staanders) = zwaardere montage dan serrezonwering
  const plaatsingVast = inp.plaatsingVast
    ?? (PERGOLA_TYPES.includes(type) ? PLAATSING.pergolaVast : PLAATSING.serreVast);
  const plaatsingTotaal = (plaatsingVast + ber.prijs) * aantal + gevelPrice;

  const vrijeSom = inp.vrijeOpties.reduce((s, o) => s + o.amount, 0) + extrasSom;
  const tot = berekenTotalen(regels, aantal, vrijeSom, plaatsingTotaal, inp.bediening, inp.marges);

  const kl = kleurLabel(inp.kleur);
  return {
    ok: errors.length === 0,
    errors, warnings,
    product: 'Veranda',
    type, aantal, breedte, uitval,
    calculatiemaat: { b: lk.bKey, h: lk.hKey },
    bestelmaat: { b: lk.bKey, h: lk.hKey },
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
      `Motor: ${inp.motor}`,
      steunPrice > 0 && `${inp.steun} × ${inp.steunAantal} (+€${steunPrice.toFixed(2)})`,
      uitval >= 700 && uitval <= 1400 && `Toeslag kleine uitval +€${UITVAL_KLEIN_TOESLAG}`,
      inp.mkabel === 'ja' && 'Afwijkende motorkabel',
      inp.gevel && `Gevel: ${inp.gevel}`,
      inp.doek && `Doek: ${inp.doek}`,
      inp.bereik && `Bereikbaarheid: ${inp.bereik}`,
      inp.led && `${inp.led}`,
      kl && `Kleur: ${kl}`,
      km > 0 && `Kleur meerprijs: +€${km}`,
      ...extrasList,
      inp.bediening.bed1 && `Bediening 1: ${inp.bediening.bed1}`,
      inp.bediening.bed2 && `Bediening 2: ${inp.bediening.bed2}`,
      ...inp.vrijeOpties.map((o) => `${o.description}: €${o.amount.toFixed(2)}`),
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      motor: inp.motor,
      steun: inp.steun,
      steunAantal: inp.steunAantal,
      mkabel: inp.mkabel,
      gevel: inp.gevel,
      doek: inp.doek,
      led: inp.led,
      extras: extrasList.join(' | '),
      kastHoogte: meta?.kast_hoogte ?? '',
    },
    bediening: inp.bediening,
    kleur: inp.kleur,
  };
}

export const VERANDA_TYPES = Object.keys((verandaData as any).types);
export const VERANDA_EXTRA_OPTIES = Object.keys((verandaData as any).options ?? {});
