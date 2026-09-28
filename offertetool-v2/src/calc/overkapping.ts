/**
 * Overkapping met de glaswanden eronder — Pinela-familie (lijst 2026 blz. 20-25).
 *
 * De maat van een Pinela (breedte × uitval) is de buitenkant van de staanders van 150×150. Tussen
 * twee staanders blijft B − 300 en D − 300 over (Deponti-handleidingen Tilt, Delight en Deluxe Plus;
 * ook de Deponti-screens zijn precies B − 303 en D − 303). De glaswand komt tegen de onderkant van
 * de goot: maximaal 2500mm doorloophoogte.
 *
 * Bij muurmontage staat er aan de muurkant geen staander. Hoe breed de zijwand dan is, beschrijft
 * Deponti nergens: die dagmaat geeft de gebruiker zelf in (beslissing zaakvoerder, 21-09-2026).
 *
 * Elke wand wordt voorgesteld in beide merken — Deponti Fiano en ES Systems ES75 — met dezelfde
 * rekenkern en hetzelfde indelingsadvies als de Glaswand-tab (glaswandStaat.ts). Zo is een wand hier
 * exact dezelfde wand als wanneer je ze in de Glaswand-tab opnieuw opent.
 */
import data from '../data/deponti.json';
import glaswandData from '../data/glaswand.json';
import {
  fianoAlternatief, fianoHoogteNota, fianoKlasse, hoogteVoorMerk, DEPONTI_HOOGTES, FIANO_COMPENSATIE,
  type GlaswandMerk,
} from './glaswand';
import type { AdviesOptie } from './glaswandAdvies';
import {
  berekenGlaswandStaat, glaswandOverzichtStaat, merkInstellingen, GLASWAND_DEFAULT, type GlaswandStaat,
} from './glaswandStaat';
import { pinelaType, type PinelaMontage } from './deponti';
import type { CalcResult } from './types';

const d = data as any;
const gw = glaswandData as any;
/** Maximale doorloophoogte onder de goot volgens de handleidingen (Tilt, Delight, Deluxe Plus). */
export const MAX_ONDERKANT_GOOT: number = d.maxOnderkantGoot;
const AFTREK: number = d.vrijeOpeningAftrek;

/**
 * De laagste hoogte onder de goot die nog in een prijslijst valt: ES begint bij 2000mm, Fiano bij de
 * standaardhoogte 2000 die met de compensatie tot 1980mm dagmaat past. Lager = niet te prijzen (of een tikfout).
 */
export const MIN_ONDERKANT_GOOT: number = Math.min(gw.es.dagmaat.helder.min, DEPONTI_HOOGTES[0] - FIANO_COMPENSATIE.onder);

export { fianoKlasse, fianoHoogteNota, fianoAlternatief, hoogteVoorMerk };

export type ZijdeId = 'voor' | 'achter' | 'links' | 'rechts';

export interface OverkappingZijde {
  id: ZijdeId;
  label: string;
  langs: 'breedte' | 'uitval';
  /** Vrije opening tussen de staanders, of null: bij muurmontage zelf nameten. */
  dagmaat: number | null;
  uitleg: string;
}

/** Kan dit type een glaswand eronder krijgen? (De lijst noemt Fiano niet bij de carports.) */
export function wandenMogelijk(type: string): boolean {
  return !!(pinelaType(type) as any)?.wanden;
}

/** De open zijden van een overkapping, met de vrije opening tussen de staanders. */
export function overkappingZijden(
  type: string, breedte: number, uitval: number, montage: PinelaMontage,
): OverkappingZijde[] {
  if (!wandenMogelijk(type)) return [];
  return zijdenVan(breedte, uitval, montage, AFTREK, 'twee staanders van 150',
    'muurmontage: zelf nameten, van de muur tot de staander (Deponti geeft hier geen maat)');
}

/**
 * De open zijden van eender welke overkapping. De opgegeven maat loopt over de buitenkant van de
 * palen, dus tussen twee palen blijft maat − `aftrek` over. Bij muurmontage staat er aan de
 * muurkant geen paal: hoe breed die zijkant is, meet je zelf na.
 */
export function zijdenVan(
  breedte: number, uitval: number, montage: PinelaMontage,
  aftrek: number, paalUitleg: string, muurUitleg: string,
): OverkappingZijde[] {
  if (!(breedte > 0) || !(uitval > 0)) return [];
  const voor = (id: ZijdeId, label: string): OverkappingZijde => ({
    id, label, langs: 'breedte', dagmaat: breedte - aftrek,
    uitleg: `breedte ${breedte} − ${aftrek} (${paalUitleg})`,
  });
  const zij = (id: ZijdeId, label: string): OverkappingZijde => (montage === 'vrij'
    ? { id, label, langs: 'uitval', dagmaat: uitval - aftrek, uitleg: `uitval ${uitval} − ${aftrek} (${paalUitleg})` }
    : { id, label, langs: 'uitval', dagmaat: null, uitleg: muurUitleg });
  return montage === 'vrij'
    ? [voor('voor', 'Voorzijde'), voor('achter', 'Achterzijde'), zij('links', 'Zijkant links'), zij('rechts', 'Zijkant rechts')]
    : [voor('voor', 'Voorzijde'), zij('links', 'Zijkant links'), zij('rechts', 'Zijkant rechts')];
}

export interface WandVoorstel {
  merk: GlaswandMerk;
  /** Wat in het offerte-item komt: te bewerken in de Glaswand-tab, rekent daar exact hetzelfde. */
  staat: GlaswandStaat;
  r: CalcResult;
  /** De beste indeling volgens het advies van de Glaswand-tab; null = niets geschikt. */
  beste: AdviesOptie | null;
  /** Waarom er geen geschikte indeling is. */
  reden: string;
  /** Uitleg voor op het scherm (bv. welke Fiano-standaardhoogte in de gemeten hoogte past). */
  nota: string;
}

/**
 * Eén wand in één merk: de beste indeling over alle aantallen panelen, doorgerekend zoals de
 * Glaswand-tab. Zonder transport: dat zit bij de overkapping (zelfde levering).
 *
 * `dagmaatHoogte` is de gemeten hoogte onder de goot. ES rekent daar rechtstreeks mee. Fiano bestelt
 * een inbouwhoogte: past er een standaardhoogte in (compensatietabel), dan wordt dat die
 * standaardhoogte — anders maatwerk op de gemeten hoogte. Zo staat in het item de inbouwhoogte die
 * de Glaswand-tab verwacht, en rekent de wand daar opnieuw geopend exact hetzelfde.
 */
export function wandVoorstel(
  merk: GlaswandMerk, dagmaatBreedte: number, dagmaatHoogte: number, opmerkingen = '', aantal = 1,
): WandVoorstel {
  const nota = merk === 'Deponti'
    ? [fianoHoogteNota(dagmaatHoogte), fianoAlternatief(dagmaatHoogte)].filter(Boolean).join('. ')
    : '';
  // aantal = het aantal wanden aan deze zijde (standaard: één per overkapping). Het advies rekent per
  // wand (voorbereid() zet aantal op 1), dus de indeling hangt er niet van af.
  // gemetenHoogte blijft bewaard: wissel je in de Glaswand-tab van merk, dan rekent het andere merk
  // opnieuw vanaf de gemeten hoogte (ES rechtstreeks, Fiano met de standaardhoogte die erin past).
  const s0: GlaswandStaat = {
    ...GLASWAND_DEFAULT, ...merkInstellingen(merk, false), dagmaatBreedte, opmerkingen,
    dagmaatHoogte: hoogteVoorMerk(merk, dagmaatHoogte), gemetenHoogte: dagmaatHoogte,
    aantal: Math.max(1, Math.floor(aantal || 1)),
    transportBijOverkapping: true,
  } as GlaswandStaat;
  const ov = glaswandOverzichtStaat(s0);
  const staat: GlaswandStaat = ov.beste
    ? { ...s0, aantalPanelen: ov.beste.panelen.length, keuze: 'auto' }
    : s0;
  const { r } = berekenGlaswandStaat(staat);
  return { merk, staat, r, beste: ov.beste, reden: ov.beste ? '' : (ov.waarom || r.errors.join(' · ')), nota };
}

export interface WandVoorstellen {
  es: WandVoorstel;
  deponti: WandVoorstel;
  /** Het merk met de laagste klantprijs, als er minstens één kan. */
  goedkoopste: GlaswandMerk | null;
}

/** Een wand in beide merken naast elkaar, met het goedkoopste (klantprijs) aangeduid. */
export function wandVoorstellen(
  dagmaatBreedte: number, dagmaatHoogte: number, opmerkingen = '', aantal = 1,
): WandVoorstellen {
  const es = wandVoorstel('ES Systems', dagmaatBreedte, dagmaatHoogte, opmerkingen, aantal);
  const deponti = wandVoorstel('Deponti', dagmaatBreedte, dagmaatHoogte, opmerkingen, aantal);
  const kan = [es, deponti].filter((v) => v.beste && v.r.ok);
  const goedkoopste = kan.length === 0 ? null
    : kan.reduce((a, b) => (b.r.uwVerkoop < a.r.uwVerkoop ? b : a)).merk;
  return { es, deponti, goedkoopste };
}

/** Wat de gebruiker per zijde kiest. Leeft in de staat van het overkappingsformulier. */
export interface WandKeuze {
  aan: boolean;
  /** Gemeten/gewenste dagmaat breedte; 0 = de voorgestelde vrije opening gebruiken. */
  dagmaat: number;
  /** '' = het goedkoopste merk. */
  merk: '' | GlaswandMerk;
  /** Aantal wanden aan deze zijde; 0 = één per overkapping (het aantal identieke overkappingen). */
  aantal: number;
}

export const GEEN_WAND: WandKeuze = { aan: false, dagmaat: 0, merk: '', aantal: 0 };

export interface WandenStatus {
  /** De aangevinkte zijden. */
  actief: OverkappingZijde[];
  voorstellen: Partial<Record<ZijdeId, WandVoorstellen>>;
  /** Het gekozen (of goedkoopste) voorstel van een zijde. */
  gekozen: (id: ZijdeId) => WandVoorstel | null;
  maatVan: (id: ZijdeId) => number;
  aantalVan: (id: ZijdeId) => number;
  /** Alles wat het toevoegen van de wanden tegenhoudt. */
  fouten: string[];
  /** Klantprijs van alle gekozen wanden samen. */
  totaal: number;
}

/**
 * Alle glaswanden onder één overkapping doorgerekend: per aangevinkte zijde het beste voorstel in
 * beide merken, plus wat het toevoegen tegenhoudt. Puur — het formulier memoïseert de aanroep.
 */
export function berekenWanden(o: {
  zijden: OverkappingZijde[];
  wanden: Record<ZijdeId, WandKeuze>;
  onderkantGoot: number;
  uitval: number;
  /** Aantal identieke overkappingen: standaard één wand per overkapping. */
  aantal: number;
  /** Omschrijving die in het glaswand-item komt, bv. "Onder Pinela Delight 4088 × 3500". */
  titel: string;
  /** Telt het aantal per zijde mee? (Enkel bij meerdere of gekoppelde overkappingen.) */
  toonAantal: boolean;
}): WandenStatus {
  const maatVan = (id: ZijdeId) => {
    const z = o.zijden.find((x) => x.id === id);
    return o.wanden[id]?.dagmaat > 0 ? o.wanden[id].dagmaat : (z?.dagmaat ?? 0);
  };
  const aantalVan = (id: ZijdeId) =>
    (o.toonAantal && o.wanden[id]?.aantal > 0 ? o.wanden[id].aantal : o.aantal);
  const actief = o.zijden.filter((z) => o.wanden[z.id]?.aan);

  const voorstellen: Partial<Record<ZijdeId, WandVoorstellen>> = {};
  for (const z of actief) {
    const b = maatVan(z.id);
    if (b > 0 && o.onderkantGoot > 0) {
      voorstellen[z.id] = wandVoorstellen(b, o.onderkantGoot, `${o.titel} — ${z.label.toLowerCase()}`, aantalVan(z.id));
    }
  }
  const gekozen = (id: ZijdeId): WandVoorstel | null => {
    const v = voorstellen[id];
    if (!v) return null;
    const merk = o.wanden[id].merk || v.goedkoopste;
    return merk === 'ES Systems' ? v.es : merk === 'Deponti' ? v.deponti : null;
  };

  const fouten: string[] = [];
  for (const z of actief) {
    const b = maatVan(z.id);
    const maatFout = b > 0 ? wandMaatFout(z, b, o.uitval) : '';
    if (!(b > 0)) fouten.push(`${z.label}: vul de dagmaat in`);
    else if (maatFout) fouten.push(maatFout);
    else {
      const g = gekozen(z.id);
      // Zonder hoogte is er nog geen voorstel: dat meldt hoogteMeldingen al, niet "geen glaswand".
      if (!g) { if (o.onderkantGoot > 0) fouten.push(`${z.label}: geen geschikte glaswand in ${b}mm`); }
      // Een zelf gekozen merk dat na een maatwijziging niet meer past: nooit stil een onmogelijke wand toevoegen.
      else if (!g.beste) fouten.push(`${z.label} (${g.merk}): ${g.reden}`);
      else if (!g.r.ok) fouten.push(`${z.label}: ${g.r.errors.join(' · ')}`);
    }
  }
  const totaal = actief.reduce((t, z) => t + (gekozen(z.id)?.r.uwVerkoop ?? 0), 0);
  return { actief, voorstellen, gekozen, maatVan, aantalVan, fouten, totaal };
}

/**
 * Meldingen over de hoogte onder de goot (elke melding blokkeert het toevoegen van de wanden).
 * `max` is de maximale doorloophoogte die de fabrikant opgeeft; null = de lijst noemt er geen,
 * dan bepaalt enkel de glaswand zelf hoe hoog ze kan (dat meldt het wandvoorstel).
 */
export function hoogteMeldingen(onderkantGoot: number, max: number | null = MAX_ONDERKANT_GOOT): string[] {
  if (!(onderkantGoot > 0)) return ['Vul de hoogte onder de goot in'];
  if (max != null && onderkantGoot > max) {
    return [`${onderkantGoot}mm onder de goot is meer dan de maximale doorloophoogte van ${max}mm volgens Deponti`];
  }
  if (onderkantGoot < MIN_ONDERKANT_GOOT) {
    return [`${onderkantGoot}mm onder de goot is lager dan de laagste maat in de prijslijsten `
      + `(ES75 vanaf 2000mm, Fiano vanaf ${MIN_ONDERKANT_GOOT}mm) — tikfout? Een lagere wand vraag je aan bij de fabrikant.`];
  }
  return [];
}

/**
 * Past een ingegeven dagmaat bij deze zijde? De goot hangt tussen de staanders, dus een wand kan niet
 * breder zijn dan de vrije opening; een zijwand bij muurmontage niet langer dan de uitval.
 */
export function wandMaatFout(zijde: OverkappingZijde, dagmaat: number, uitval: number): string {
  if (zijde.dagmaat != null && dagmaat > zijde.dagmaat) {
    return `${zijde.label}: ${dagmaat}mm is breder dan de vrije opening tussen de staanders (${zijde.dagmaat}mm)`;
  }
  if (zijde.dagmaat == null && uitval > 0 && dagmaat > uitval) {
    return `${zijde.label}: ${dagmaat}mm is langer dan de uitval van de overkapping (${uitval}mm)`;
  }
  return '';
}
