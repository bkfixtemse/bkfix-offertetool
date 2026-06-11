/**
 * Knikarmscherm-berekening (Pisano 230, Gaudi 300/400, Moneo 400).
 * Raster: breedte 250mm (Gaudi 400 boven 7000mm → 500mm), uitval 500mm.
 * Pisano 230: 3 standaardkleuren gratis · Allround RAL +€140 · poedercoating +€675.
 */
import knikarmData from '../data/knikarm.json';
import opties from '../data/opties.json';
import { KNIKARM_MUURSTRIP_PER_M, PLAATSING } from '../data/constants';
import { knikarmGrid, lookupPrice } from './grid';
import { berekenTotalen, kleurLabel, kleurMeerprijs } from './shared';
import type { BedieningKeuze, CalcResult, KleurKeuze, Marges, PriceGrid, VrijeOptie } from './types';

export interface KnikarmInput {
  type: string;
  aantal: number;
  breedte: number;
  uitval: number;
  verdieping: string;
  bereik: string;
  gevel: string;
  muursteun: string;
  muurstripJa: boolean;
  doek: string;
  led: string;
  kleur: KleurKeuze;
  bediening: BedieningKeuze;
  opmerkingen: string;
  vrijeOpties: VrijeOptie[];
  marges: Marges;
}

export function calcKnikarm(inp: KnikarmInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ex = (opties as any).knikarm_extras;
  const td = (knikarmData as any)[inp.type];
  const { breedte, uitval, aantal, type } = inp;

  if (!breedte || !uitval) errors.push('Vul breedte en uitval in');
  if (td && breedte > td.max_width) errors.push(`Breedte ${breedte}mm overschrijdt maximum voor ${type} (${td.max_width}mm)`);
  if (td && uitval > td.max_uitval) errors.push(`Uitval ${uitval}mm overschrijdt maximum voor ${type} (${td.max_uitval}mm)`);

  const spec = knikarmGrid(type, breedte);
  const lk = lookupPrice(td?.prices as PriceGrid, spec, td?.prefix_U ?? '', td?.prefix_B ?? '', breedte, uitval);
  if (!lk.producible && errors.length === 0) {
    errors.push(`Combinatie breedte ${lk.bKey}mm × uitval ${lk.hKey}mm niet produceerbaar voor ${type}`);
  }
  const basePrice = lk.price ?? 0;

  // Aantal armen (informatief, uit catalogus)
  const armen = td?.armen?.[`${td.prefix_B}${lk.bKey}`];

  // ---- Prijscomponenten per stuk ----
  const regels = [{ label: 'Basisprijs', bedrag: basePrice }];

  const muurPrice: number = inp.muursteun ? ex.muursteun[inp.muursteun] ?? 0 : 0;
  if (muurPrice) regels.push({ label: `Muursteun ${inp.muursteun}`, bedrag: muurPrice });

  // Universele muurstrip (Pisano/Gaudi): €125 per lopende meter (lengte ≈ breedte)
  const muurstripBeschikbaar = type === 'Pisano 230' || type.startsWith('Gaudi');
  const muurstripPrice = inp.muurstripJa && muurstripBeschikbaar
    ? KNIKARM_MUURSTRIP_PER_M * (breedte / 1000) : 0;
  if (muurstripPrice) regels.push({ label: 'Universele muurstrip', bedrag: muurstripPrice });

  const doekPrice: number = inp.doek ? ex.doek[inp.doek] ?? 0 : 0;
  if (doekPrice) regels.push({ label: `Doek ${inp.doek}`, bedrag: doekPrice });

  const ledPrice: number = inp.led ? ex.verlichting[inp.led] ?? 0 : 0;
  if (ledPrice) regels.push({ label: 'LED verlichting', bedrag: ledPrice });

  const km = kleurMeerprijs(inp.kleur, type);
  if (km) regels.push({ label: 'Kleur meerprijs', bedrag: km });

  // ---- Plaatsing (incl. verdieping/gevel — BKfix-kosten, niet onder korting) ----
  const vData = ex.verdieping[inp.verdieping];
  const verdPrice = vData && typeof vData.prijs === 'number' ? vData.prijs : 0;
  if (vData && typeof vData.prijs === 'string' && vData.prijs !== 'incl') warnings.push(`Verdieping: ${vData.prijs}`);

  const gevelRaw = ex.type_gevel[inp.gevel];
  const gevelPrice = typeof gevelRaw === 'number' ? gevelRaw : 0;
  if (typeof gevelRaw === 'string' && gevelRaw) warnings.push(`Gevel "${inp.gevel}": ${gevelRaw}`);

  const berRaw = ex.bereikbaarheid[inp.bereik];
  const bereikPrice = typeof berRaw === 'number' ? berRaw : 0;
  if (typeof berRaw === 'string' && berRaw) warnings.push(`Bereikbaarheid "${inp.bereik}": ${berRaw}`);

  const plaatsingTotaal =
    ((lk.bKey / 1000) * PLAATSING.knikarmPerMeter + PLAATSING.knikarmVast + bereikPrice) * aantal
    + verdPrice + gevelPrice;

  const vrijeSom = inp.vrijeOpties.reduce((s, o) => s + o.amount, 0);
  const tot = berekenTotalen(regels, aantal, vrijeSom, plaatsingTotaal, inp.bediening, inp.marges);

  const kl = kleurLabel(inp.kleur);
  return {
    ok: errors.length === 0,
    errors, warnings,
    product: 'Knikarmscherm',
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
      typeof armen === 'number' && `Armen: ${armen}`,
      inp.verdieping && inp.verdieping !== '0' && `Verdieping: ${inp.verdieping}`,
      inp.bereik && `Bereikbaarheid: ${inp.bereik}`,
      inp.gevel && `Gevel: ${inp.gevel}`,
      inp.muursteun && `Muursteun: ${inp.muursteun}`,
      inp.muurstripJa && muurstripBeschikbaar && `Universele muurstrip (+€${muurstripPrice.toFixed(2)})`,
      inp.doek && `Doek: ${inp.doek}`,
      inp.led && inp.led !== 'Nee' && `LED: ${inp.led}`,
      kl && `Kleur: ${kl}`,
      km > 0 && `Kleur meerprijs: +€${km}`,
      inp.bediening.bed1 && `Bediening 1: ${inp.bediening.bed1}`,
      inp.bediening.bed2 && `Bediening 2: ${inp.bediening.bed2}`,
      ...inp.vrijeOpties.map((o) => `${o.description}: €${o.amount.toFixed(2)}`),
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      armen: typeof armen === 'number' ? armen : '',
      verdieping: inp.verdieping,
      gevel: inp.gevel,
      muursteun: inp.muursteun,
      muurstripJa: inp.muurstripJa && muurstripBeschikbaar,
      doek: inp.doek,
      led: inp.led,
    },
    bediening: inp.bediening,
    kleur: inp.kleur,
  };
}

export const KNIKARM_TYPES = Object.keys(knikarmData as any);
