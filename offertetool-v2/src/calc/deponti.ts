/**
 * Deponti — Pinela-overkappingen, Fiano Louvre en losse onderdelen (STERDealer-prijslijst 2026, blz. 19-36).
 *
 * De dealerlijst ís de inkoopprijs: geen leverancierskorting. De prijs van een Pinela volgt uit één
 * tabelcel (breedte × uitval); muurmontage (2 staanders) en vrijstaand (4 staanders) kosten hetzelfde
 * (so91234: Delight 4088x4000 vrijstaand = €7.315 = de tabelprijs). Er bestaan enkel de maten uit de
 * lijst — een Pinela is geen maatwerk.
 *
 * De Fiano-glaswand zelf zit in glaswand.ts (merk Deponti).
 */
import data from '../data/deponti.json';
import glaswandData from '../data/glaswand.json';
import { DEPONTI, GLASWAND_VOORBEREIDING_TARIEF } from '../data/constants';
import { depontiOptieMeldingen, kiesRaillengte } from './glaswand';
import { berekenTotalen } from './shared';
import type { CalcResult, Marges, PrijsRegel } from './types';

const d = data as any;
const fiano = (glaswandData as any).deponti;
const GEEN_BEDIENING = { bed1: '', bed2: '' };
const eur = (n: number) => Math.round(n * 100) / 100;

export interface DepontiOptieKeuze { id: string; aantal: number }
/** Een stuk dat niet in de lijst staat; het bedrag is de inkoopprijs. */
export interface DepontiExtra { omschrijving: string; bedrag: number }

interface Voorbereiding {
  voorbereidingPersonen: number;
  voorbereidingUren: number;
  voorbereidingTarief?: number;
}

function voorbereidingKost(v: Voorbereiding) {
  const tarief = v.voorbereidingTarief ?? GLASWAND_VOORBEREIDING_TARIEF;
  return Math.max(0, v.voorbereidingPersonen || 0) * Math.max(0, v.voorbereidingUren || 0) * Math.max(0, tarief);
}

function extraRegels(extra: DepontiExtra[] | undefined, regels: PrijsRegel[], ...lijsten: string[][]) {
  for (const e of extra ?? []) {
    if (!e || !e.bedrag) continue;
    const naam = (e.omschrijving || '').trim() || 'Extra';
    regels.push({ label: `${naam} (netto inkoop)`, bedrag: e.bedrag, netto: true, eenmalig: true });
    for (const l of lijsten) l.push(naam);   // zonder bedrag: dit gaat mee naar de klantoffertetekst
  }
}

/** Transport dealer: één keer per offerteregel, niet in de klantoffertetekst (wel op de bestelbon). */
function transportRegel(aan: boolean | undefined, regels: PrijsRegel[], labels: string[]) {
  if (!aan) return;
  const t = d.transport as { label: string; prijs: number };
  regels.push({ label: `${t.label} (per levering)`, bedrag: t.prijs, eenmalig: true });
  labels.push(t.label);
}

/** Kleur als tekst; 'andere' vraagt een omschrijving. */
function kleurTekst(select: string, custom: string, errors: string[], wat: string) {
  if (select === 'andere') {
    const k = (custom || '').trim();
    if (!k) errors.push(`Vul in welke ${wat} — niet-standaardkleuren zijn op aanvraag bij Deponti`);
    return k;
  }
  return select || '';
}

// ======================================================================================
// Pinela-overkappingen
// ======================================================================================

export type PinelaMontage = 'muur' | 'vrij';

export interface PinelaType {
  blz: number;
  omschrijving: string;
  kleuren: string[];
  lamelKleurApart: boolean;
  /** false = geen lamellendak (carports: dak van stalen platen), dus ook geen lamelkleur op de bestelbon. */
  lamellendak?: boolean;
  /** Klanttekst ('' = geen LED inbegrepen). */
  led: string;
  /** Interne notitie voor het formulier. */
  ledInfo?: string;
  /** Maten die bij Deponti bevestigd moeten worden (rij → melding). */
  bevestigen?: Record<string, string>;
  screens: boolean;
  rijen: number[];
  kolommen: number[];
  prijzen: Record<string, Record<string, number>>;
  lamellen?: { rij?: Record<string, number>; kolom?: Record<string, number> };
}

export const PINELA_TYPES: string[] = Object.keys(d.pinela);
export const pinelaType = (type: string): PinelaType | undefined => d.pinela[type];
export const PINELA_OPTIES = d.pinelaOpties as {
  id: string; label: string; eenheid: string; prijs: number; bron: string;
  /** Leveranciersregel (creditering, transport): niet in de klantoffertetekst. */
  intern?: boolean;
  /** Prijs niet bevestigd voor 2026: deze melding komt op het item. */
  onbevestigd?: string;
  /** true = per overkapping (× aantal); anders één keer voor de hele offerteregel. */
  perStuk?: boolean;
  koppelset?: boolean;
}[];
export const PINELA_SCREENS = d.screens as {
  kleuren: string[];
  breedte: Record<string, { maat: string; label: string; prijs: number }>;
  uitval: Record<string, { maat: string; label: string; prijs: number }>;
};

export interface PinelaInput {
  type: string;
  aantal: number;
  /** Rijmaat uit de lijst (mm) — "breedte" in de Deponti-tabel. */
  breedte: number;
  /** Kolommaat uit de lijst (mm) — "uitval" in de Deponti-tabel. */
  uitval: number;
  montage: PinelaMontage;
  kleurFrame: string;
  kleurFrameCustom: string;
  /** Enkel Delight en Tilt: lamellen in een andere kleur dan het frame. */
  kleurLamel: string;
  /** Transport dealer (€160 per levering): BKfix rekent het altijd, standaard aan. */
  transport?: boolean;
  /** Screens langs de breedte (voorzijde) en langs de uitval (zijkanten), per overkapping. */
  screensBreedte: number;
  screensUitval: number;
  opties: DepontiOptieKeuze[];
  extraLijnen: DepontiExtra[];
  plaatsingPerStuk: number;
  plaatsingPerScreen: number;
  plaatsingPerKoppelset: number;
  voorbereidingPersonen: number;
  voorbereidingUren: number;
  voorbereidingTarief?: number;
  marges: Marges;
  opmerkingen: string;
}

/** Welke maten er in de lijst staan voor dit type: per rij de kolommen met een prijs. */
export function pinelaMaten(type: string): { rij: number; kolommen: number[] }[] {
  const t = pinelaType(type);
  if (!t) return [];
  return t.rijen.map((rij) => ({
    rij,
    kolommen: t.kolommen.filter((k) => typeof t.prijzen[String(rij)]?.[String(k)] === 'number'),
  }));
}

export function calcPinela(inp: PinelaInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const t = pinelaType(inp.type);
  const aantal = Math.max(1, Math.floor(inp.aantal || 1));
  const regels: PrijsRegel[] = [];
  const labels: string[] = [];
  /** Wat in de klantofferte komt: zonder crediteringen en transport. */
  const klantLabels: string[] = [];

  let basis: number | undefined;
  if (!t) {
    errors.push(`Onbekend type "${inp.type}"`);
  } else {
    basis = t.prijzen[String(inp.breedte)]?.[String(inp.uitval)];
    if (!inp.breedte || !inp.uitval) {
      errors.push('Kies een maat uit de lijst');
    } else if (typeof basis !== 'number') {
      const rij = pinelaMaten(inp.type).find((m) => m.rij === inp.breedte);
      errors.push(
        `${inp.type} bestaat niet in ${inp.breedte} × ${inp.uitval}mm`
        + (rij ? ` — bij ${inp.breedte}mm enkel uitval ${rij.kolommen.join(' / ')}mm`
          : ` — breedtes: ${t.rijen.join(' / ')}mm`),
      );
    }
  }
  const bevestig = t?.bevestigen?.[String(inp.breedte)];
  if (bevestig) warnings.push(bevestig);
  const staanders = inp.montage === 'vrij' ? 4 : 2;
  const montageLabel = inp.montage === 'vrij' ? 'vrijstaand (4 staanders)' : 'muurmontage (2 staanders)';
  if (t && typeof basis === 'number') {
    regels.push({ label: `${inp.type} ${inp.breedte} × ${inp.uitval}mm — ${montageLabel}`, bedrag: basis });
  }

  // ---- Kleur ----
  const frame = kleurTekst(inp.kleurFrame, inp.kleurFrameCustom, errors, 'framekleur');
  if (t && frame && !t.kleuren.includes(frame)) {
    warnings.push(`"${frame}" is geen standaardkleur voor ${inp.type} — op aanvraag, meerprijs als extra lijn toevoegen`);
  }
  if (t && !frame && inp.kleurFrame !== 'andere') warnings.push('Kies de framekleur');
  const lamel = t?.lamelKleurApart ? (inp.kleurLamel || frame) : frame;

  // ---- Screens (per overkapping) ----
  const sB = Math.max(0, Math.floor(inp.screensBreedte || 0));
  const sU = Math.max(0, Math.floor(inp.screensUitval || 0));
  let screenLabels: string[] = [];
  if ((sB > 0 || sU > 0) && t && !t.screens) {
    errors.push(`Deponti-screens bestaan niet voor ${inp.type} (enkel Delight, Tilt en Deluxe Plus)`);
  } else if (t) {
    if (sB > 0) {
      const s = PINELA_SCREENS.breedte[String(inp.breedte)];
      if (!s) {
        errors.push(`Geen Deponti-screen voor breedte ${inp.breedte}mm (enkel ${Object.keys(PINELA_SCREENS.breedte).join(' / ')}mm)`);
      } else {
        regels.push({ label: `${sB} × screen ${s.maat} t.b.v. ${s.label}`, bedrag: s.prijs * sB });
        screenLabels.push(`${sB} × screen ${s.maat} (voorzijde)`);
      }
    }
    if (sU > 0) {
      const s = PINELA_SCREENS.uitval[String(inp.uitval)];
      if (!s) {
        errors.push(`Geen Deponti-screen voor uitval ${inp.uitval}mm (enkel ${Object.keys(PINELA_SCREENS.uitval).join(' / ')}mm)`);
      } else {
        regels.push({ label: `${sU} × screen ${s.maat} t.b.v. ${s.label}`, bedrag: s.prijs * sU });
        screenLabels.push(`${sU} × screen ${s.maat} (zijkant)`);
      }
    }
    const maxB = inp.montage === 'vrij' ? 2 : 1;
    if (sB > maxB) warnings.push(`${sB} screens langs de breedte bij ${montageLabel}: er ${maxB === 1 ? 'is 1 open voorzijde' : 'zijn 2 open zijden'}`);
    if (sU > 2) warnings.push(`${sU} screens langs de uitval: een overkapping heeft 2 zijkanten`);
    if (sB + sU > 0) warnings.push('Deponti-screens gaan tot 2,5m onderkant goot — controleer de hoogte');
  }

  // ---- Opties ----
  let koppelsets = 0;
  for (const k of inp.opties ?? []) {
    if (!k?.id || !(k.aantal > 0)) continue;
    const o = PINELA_OPTIES.find((x) => x.id === k.id);
    if (!o) { warnings.push(`Optie "${k.id}" staat niet meer in de lijst — niet meegerekend`); continue; }
    regels.push({
      label: `${o.label} (${k.aantal} × €${o.prijs})${o.perStuk ? ' — per overkapping' : ''}`,
      bedrag: o.prijs * k.aantal,
      eenmalig: !o.perStuk,
    });
    labels.push(`${o.label}: ${k.aantal}${o.perStuk && aantal > 1 ? ' per overkapping' : ''}`);
    if (o.onbevestigd) warnings.push(o.onbevestigd);
    if (!o.intern) klantLabels.push(`${o.label}: ${k.aantal}${o.perStuk && aantal > 1 ? ' per overkapping' : ''}`);
    if (o.koppelset) koppelsets += k.aantal;
  }
  if ((inp.opties ?? []).some((k) => k.id === 'koppelset_muur2' && k.aantal > 0) && inp.montage === 'vrij') {
    warnings.push('Koppelset voor muurmontage gekozen bij een vrijstaande overkapping');
  }
  if ((inp.opties ?? []).some((k) => /^koppelset_vrij/.test(k.id) && k.aantal > 0) && inp.montage === 'muur') {
    warnings.push('Koppelset voor vrijstaand gekozen bij muurmontage');
  }
  extraRegels(inp.extraLijnen, regels, labels, klantLabels);
  transportRegel(inp.transport, regels, labels);

  // ---- Plaatsing ----
  const vb = voorbereidingKost(inp);
  const plaatsingTotaal = Math.max(0, inp.plaatsingPerStuk || 0) * aantal
    + Math.max(0, inp.plaatsingPerScreen || 0) * (sB + sU) * aantal
    + Math.max(0, inp.plaatsingPerKoppelset || 0) * koppelsets
    + vb;

  const tot = berekenTotalen(regels, aantal, 0, plaatsingTotaal, GEEN_BEDIENING, inp.marges);
  const lamellen = t?.lamellen?.rij?.[String(inp.breedte)] ?? t?.lamellen?.kolom?.[String(inp.uitval)] ?? '';

  return {
    ok: errors.length === 0,
    errors, warnings,
    product: 'Overkapping',
    type: inp.type,
    aantal,
    breedte: inp.breedte,
    uitval: inp.uitval,
    calculatiemaat: { b: inp.breedte, h: inp.uitval },
    bestelmaat: { b: inp.breedte, h: inp.uitval },
    regels,
    productSubtotal: tot.productSubtotal,
    plaatsingTotaal,
    bedieningTotaal: 0,
    bedieningAankoop: 0,
    marges: inp.marges,
    aankoop: tot.aankoop,
    verkoop: tot.verkoop,
    uwVerkoop: tot.uwVerkoop,
    options: [
      `Montage: ${montageLabel}`,
      frame && `Kleur frame: ${frame}`,
      t?.lamelKleurApart && lamel && lamel !== frame && `Kleur lamellen: ${lamel}`,
      ...screenLabels,
      vb > 0 && `Voorbereidende werken: ${inp.voorbereidingPersonen} × ${inp.voorbereidingUren}u`,
      ...labels,
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      merk: 'Deponti',
      soort: 'pinela',
      montage: montageLabel,
      staanders,
      kleurFrame: frame,
      kleurLamel: t?.lamellendak === false ? '' : lamel,
      led: t?.led ?? '',
      lamellen,
      screens: screenLabels.join(' + '),
      optiesTekst: [...screenLabels, ...klantLabels].join(' · '),
      plaatsingPerStuk: inp.plaatsingPerStuk,
      voorbereidingPersonen: inp.voorbereidingPersonen,
      voorbereidingUren: inp.voorbereidingUren,
      voorbereidingKost: eur(vb),
    },
    bediening: GEEN_BEDIENING,
    kleur: { select: frame, custom: '' },
  };
}

// ======================================================================================
// Fiano Louvre (blz. 28)
// ======================================================================================

export interface LouvreInput {
  aantal: number;
  aantalPanelen: number;
  /** Inbouwhoogte (mm): bepaalt de hoogteklasse 2050-2580. */
  inbouwhoogte: number;
  /** Optioneel: gemeten breedte van de opening, enkel om de overlap te tonen. */
  dagmaatBreedte: number;
  /** '' = nog niet gekozen · 'met' = Fiano-rail meerekenen · 'zonder' = bestaande of geen rail. */
  rail: '' | 'met' | 'zonder';
  sporen: number;
  kleurFrame: string;
  kleurLamel: string;
  opties: DepontiOptieKeuze[];
  extraLijnen: DepontiExtra[];
  /** Plaatsing per Louvre-paneel (rekenblad 3864: €250). */
  plaatsingPerPaneel: number;
  /** Transport dealer (€160 per levering), standaard aan. */
  transport?: boolean;
  voorbereidingPersonen: number;
  voorbereidingUren: number;
  voorbereidingTarief?: number;
  marges: Marges;
  opmerkingen: string;
}

const louvreGroep = (d.onderdelen as any[]).find((g) => g.groep === 'Fiano Louvre');
const LOUVRE_KLASSEN = (louvreGroep.artikelen as any[]).filter((a) => Array.isArray(a.hoogte)) as {
  id: string; label: string; prijs: number; hoogte: [number, number];
}[];
export const LOUVRE_BREEDTE = 1040;
export const LOUVRE_KLEUREN: string[] = louvreGroep.kleuren;
export const LOUVRE_HOOGTE = { min: LOUVRE_KLASSEN[0].hoogte[0], max: LOUVRE_KLASSEN[LOUVRE_KLASSEN.length - 1].hoogte[1] };

export function louvreKlasse(inbouwhoogte: number) {
  // Op de ondergrens zoeken: 2099,5 hoort bij 2050-2099, niet "tussen" twee klassen.
  if (!(inbouwhoogte >= LOUVRE_HOOGTE.min && inbouwhoogte <= LOUVRE_HOOGTE.max)) return undefined;
  return [...LOUVRE_KLASSEN].reverse().find((k) => inbouwhoogte >= k.hoogte[0]);
}

/** Opties die bij een Fiano Louvre ook passen: dezelfde Fiano-onderdelen als bij de glaswand, zonder glas. */
export const LOUVRE_OPTIES = (fiano.opties as any[]).filter(
  (o) => !['glas_gat', 'indraaihandvat', 'steellook_2500', 'steellook_6000', 'transport'].includes(o.id),
) as {
  id: string; label: string; eenheid: string; prijs: number; perWand?: boolean; intern?: boolean;
  kleuren?: string[]; kleuren7?: string[]; sporen?: number[];
}[];

export function calcLouvre(inp: LouvreInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const regels: PrijsRegel[] = [];
  const labels: string[] = [];
  const klantLabels: string[] = [];
  const aantal = Math.max(1, Math.floor(inp.aantal || 1));
  const n = Math.max(0, Math.floor(inp.aantalPanelen || 0));
  const H = inp.inbouwhoogte || 0;

  if (n < 1) errors.push('Vul het aantal panelen in');
  if (!H) errors.push('Vul de inbouwhoogte in');
  const klasse = H ? louvreKlasse(H) : undefined;
  if (H && !klasse) {
    errors.push(`Fiano Louvre bestaat van ${LOUVRE_HOOGTE.min} tot ${LOUVRE_HOOGTE.max}mm inbouwhoogte (nu ${H}mm)`);
  }
  if (klasse && n > 0) {
    regels.push({ label: `${n} × ${klasse.label} (1040mm breed)`, bedrag: klasse.prijs * n });
  }

  // Of de Louvre-panelen in een Fiano-rail lopen, zegt de lijst niet. Daarom een verplichte keuze.
  const sporen = inp.sporen || n;
  let raillengte: number | null = null;
  if (inp.rail === '') {
    errors.push(
      'Kies of de Fiano-rail meegerekend moet worden: de lijst 2026 zegt het niet bij de Louvre '
      + '(showroomorder so96266 had 2 Louvres met 3 glaspanelen op één Fiano-rail van 3 sporen)',
    );
  } else if (inp.rail === 'met' && n > 0) {
    const W = inp.dagmaatBreedte > 0 ? inp.dagmaatBreedte : n * LOUVRE_BREEDTE;
    raillengte = kiesRaillengte(sporen, W);
    const prijs = raillengte ? fiano.rail[String(sporen)]?.[String(raillengte)] : undefined;
    if (!raillengte || typeof prijs !== 'number') {
      errors.push(`Geen Fiano-rail met ${sporen} sporen die ${W}mm overspant`);
    } else {
      regels.push({ label: `Fiano-onderrail ${sporen} sporen, ${raillengte}mm`, bedrag: prijs });
    }
  }

  // Overlap ter info: de frames zijn 1040mm breed.
  let overlap: number | '' = '';
  if (inp.dagmaatBreedte > 0 && n > 0) {
    const som = n * LOUVRE_BREEDTE;
    if (n === 1) {
      if (som < inp.dagmaatBreedte - 20) warnings.push(`1 paneel van 1040mm laat ${inp.dagmaatBreedte - som}mm open`);
    } else {
      overlap = Math.round(((som - inp.dagmaatBreedte) / (n - 1)) * 10) / 10;
      if (overlap < 0) errors.push(`${n} panelen van 1040mm zijn samen te smal voor ${inp.dagmaatBreedte}mm`);
    }
  }

  for (const k of inp.opties ?? []) {
    if (!k?.id || !(k.aantal > 0)) continue;
    const o = LOUVRE_OPTIES.find((x) => x.id === k.id);
    if (!o) { warnings.push(`Optie "${k.id}" staat niet meer in de lijst — niet meegerekend`); continue; }
    warnings.push(...depontiOptieMeldingen(o, inp.kleurFrame, inp.rail === 'met' ? sporen : 0));
    const eenmalig = o.perWand === false;
    regels.push({ label: `${o.label} (${k.aantal} × €${o.prijs})${eenmalig ? ' — per project' : ''}`, bedrag: o.prijs * k.aantal, eenmalig });
    labels.push(`${o.label}: ${k.aantal}`);
    if (!o.intern) klantLabels.push(`${o.label}: ${k.aantal}`);
  }
  extraRegels(inp.extraLijnen, regels, labels, klantLabels);
  transportRegel(inp.transport, regels, labels);

  const vb = voorbereidingKost(inp);
  const plaatsingTotaal = Math.max(0, inp.plaatsingPerPaneel || 0) * n * aantal + vb;
  const tot = berekenTotalen(regels, aantal, 0, plaatsingTotaal, GEEN_BEDIENING, inp.marges);
  const kleurLamel = inp.kleurLamel || inp.kleurFrame;

  return {
    ok: errors.length === 0,
    errors, warnings,
    product: 'Fiano Louvre',
    type: 'Deponti Fiano Louvre',
    aantal,
    breedte: inp.dagmaatBreedte || n * LOUVRE_BREEDTE,
    hoogte: H,
    calculatiemaat: { b: n * LOUVRE_BREEDTE, h: H },
    bestelmaat: { b: LOUVRE_BREEDTE, h: H },
    regels,
    productSubtotal: tot.productSubtotal,
    plaatsingTotaal,
    bedieningTotaal: 0,
    bedieningAankoop: 0,
    marges: inp.marges,
    aankoop: tot.aankoop,
    verkoop: tot.verkoop,
    uwVerkoop: tot.uwVerkoop,
    options: [
      `${n} panelen van 1040mm`,
      overlap !== '' && `Overlap: ${overlap}mm`,
      inp.rail === 'met' && raillengte && `Rail: ${sporen} sporen × ${raillengte}mm`,
      inp.rail === 'zonder' && 'Zonder Fiano-rail',
      inp.kleurFrame && `Kleur frame: ${inp.kleurFrame}`,
      kleurLamel && `Kleur lamellen: ${kleurLamel}`,
      vb > 0 && `Voorbereidende werken: ${inp.voorbereidingPersonen} × ${inp.voorbereidingUren}u`,
      ...labels,
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      merk: 'Deponti',
      soort: 'louvre',
      aantalPanelen: n,
      inbouwhoogte: H,
      hoogteklasse: klasse?.label ?? '',
      overlap,
      rail: inp.rail === 'met' ? `${sporen} sporen × ${raillengte ?? '?'}mm` : inp.rail === 'zonder' ? 'geen' : '',
      kleurFrame: inp.kleurFrame,
      kleurLamel,
      optiesTekst: klantLabels.join(' · '),
      plaatsingPerPaneel: inp.plaatsingPerPaneel,
      voorbereidingPersonen: inp.voorbereidingPersonen,
      voorbereidingUren: inp.voorbereidingUren,
      voorbereidingKost: eur(vb),
    },
    bediening: GEEN_BEDIENING,
    kleur: { select: inp.kleurFrame, custom: '' },
  };
}

// ======================================================================================
// Losse onderdelen (blz. 28-36)
// ======================================================================================

export interface OnderdeelArtikel {
  id: string;
  groep: string;
  label: string;
  prijs: number;
  kleuren: string[];
}

export interface OnderdeelGroep {
  groep: string;
  blz: number;
  info?: string;
  artikelen: OnderdeelArtikel[];
}

/** Alle groepen met hun artikelen; de Lumassina-tabel wordt uitgeschreven tot één artikel per cel. */
export const ONDERDEEL_GROEPEN: OnderdeelGroep[] = (d.onderdelen as any[]).map((g) => {
  const artikelen: OnderdeelArtikel[] = [];
  if (g.lumassina) {
    const lengtes: number[] = g.lumassina.lengtes;
    for (const [n, rij] of Object.entries(g.lumassina.prijzen as Record<string, number[]>)) {
      lengtes.forEach((l, i) => artikelen.push({
        id: `lu_${n}x${l}`, groep: g.groep,
        label: `Lumassina ${n} ${n === '1' ? 'armatuur' : 'armaturen'} × ${l}mm`, prijs: rij[i], kleuren: [],
      }));
    }
  }
  for (const a of g.artikelen) {
    artikelen.push({ id: a.id, groep: g.groep, label: a.label, prijs: a.prijs, kleuren: a.kleuren ?? g.kleuren ?? [] });
  }
  return { groep: g.groep, blz: g.blz, info: g.info, artikelen };
});
const ARTIKELEN = new Map(ONDERDEEL_GROEPEN.flatMap((g) => g.artikelen.map((a) => [a.id, a] as const)));
export const onderdeelArtikel = (id: string) => ARTIKELEN.get(id);
export const GRILLO_WERKENDE_HOOGTE: number =
  (d.onderdelen as any[]).find((g) => g.groep === 'Grillo panelen')?.werkendeHoogte ?? 150;

export interface OnderdeelRegel { artikel: string; aantal: number; kleur: string }

export interface OnderdelenInput {
  /** Korte omschrijving voor de offerte, bv. "Grillo-wand links". */
  omschrijving: string;
  regels: OnderdeelRegel[];
  extraLijnen: DepontiExtra[];
  plaatsingVast: number;
  /** Transport dealer (€160 per levering), standaard aan. */
  transport?: boolean;
  voorbereidingPersonen: number;
  voorbereidingUren: number;
  voorbereidingTarief?: number;
  marges: Marges;
  opmerkingen: string;
}

export function calcOnderdelen(inp: OnderdelenInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const regels: PrijsRegel[] = [];
  const labels: string[] = [];
  const groepen = new Set<string>();

  for (const r of inp.regels ?? []) {
    if (!r?.artikel) continue;
    const a = onderdeelArtikel(r.artikel);
    if (!a) { warnings.push(`Artikel "${r.artikel}" staat niet meer in de lijst — niet meegerekend`); continue; }
    if (!(r.aantal > 0)) continue;
    groepen.add(a.groep);
    const kleur = (r.kleur || '').trim();
    if (kleur && a.kleuren.length > 0 && !a.kleuren.includes(kleur)) {
      warnings.push(`${a.label}: ${kleur} staat niet bij de leverbare kleuren (${a.kleuren.join(' / ')})`);
    }
    const tekst = `${a.label}${kleur ? ` — ${kleur}` : ''}`;
    regels.push({ label: `${r.aantal} × ${tekst} (€${a.prijs})`, bedrag: eur(a.prijs * r.aantal), eenmalig: true });
    labels.push(`${r.aantal} × ${tekst}`);
  }
  if (groepen.has('Lumassina LED') && [...(inp.regels ?? [])].some((r) => /^lu_\d+x/.test(r.artikel) && r.aantal > 0)) {
    warnings.push('Lumassina: de tabel geldt niet voor een liggerafstand tot 2m — die prijs staat in de portal (so94835: €449 i.p.v. €419)');
  }
  extraRegels(inp.extraLijnen, regels, labels);
  if (regels.length === 0) errors.push('Voeg minstens één artikel toe');
  // Transport zit niet in de klanttekst: labels hierboven gaan naar optiesTekst, dus een aparte lijst.
  const bestelLabels = [...labels];
  transportRegel(inp.transport, regels, bestelLabels);

  const vb = voorbereidingKost(inp);
  const plaatsingTotaal = Math.max(0, inp.plaatsingVast || 0) + vb;
  const tot = berekenTotalen(regels, 1, 0, plaatsingTotaal, GEEN_BEDIENING, inp.marges);
  const type = (inp.omschrijving || '').trim() || [...groepen].join(' + ') || 'Onderdelen';

  return {
    ok: errors.length === 0,
    errors, warnings,
    product: 'Deponti onderdelen',
    type,
    aantal: 1,
    breedte: 0,
    regels,
    productSubtotal: tot.productSubtotal,
    plaatsingTotaal,
    bedieningTotaal: 0,
    bedieningAankoop: 0,
    marges: inp.marges,
    aankoop: tot.aankoop,
    verkoop: tot.verkoop,
    uwVerkoop: tot.uwVerkoop,
    options: [
      ...bestelLabels,
      vb > 0 && `Voorbereidende werken: ${inp.voorbereidingPersonen} × ${inp.voorbereidingUren}u`,
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      merk: 'Deponti',
      soort: 'onderdelen',
      artikelen: labels.join(' | '),
      optiesTekst: labels.join(' · '),
      plaatsingVast: inp.plaatsingVast,
      voorbereidingPersonen: inp.voorbereidingPersonen,
      voorbereidingUren: inp.voorbereidingUren,
      voorbereidingKost: eur(vb),
    },
    bediening: GEEN_BEDIENING,
    kleur: { select: '', custom: '' },
  };
}

/** Standaardmarges voor Deponti: geen korting (dealerlijst = inkoop), 20% marge. */
export const depontiMarges = (margePct = DEPONTI.marge * 100, eenmaligeKorting = 0): Marges => ({
  allroundKorting: 0,
  bkfixMarge: margePct / 100,
  eenmaligeKorting,
});
