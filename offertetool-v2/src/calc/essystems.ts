/**
 * ES Systems terrasoverkappingen — Comfortline Plus en Black (prijslijsten januari 2026).
 *
 * Twee lijsten, elf prijsrasters: dak in polycarbonaat 16mm, inclusief 44.2 glas of voorbereid
 * voor glas, telkens als muuraanbouw of (enkel Black) vrijstaand. De maat is altijd een
 * roostermaat uit de lijst: breedte × uitval, met de breedte gemeten over de buitenkant van de
 * palen. Tussenmaten staan niet in de lijst en worden hier dus niet berekend.
 *
 * De dealerlijst is brutoprijs: inkoop = lijstprijs − 40%, net als de ES75-glaswanden die uit
 * diezelfde Comfortline Plus-lijst komen. Alle prijzen, de oranje zones (versterkte XL-ligger
 * inbegrepen) en de spans van "Aantal palen" staan in essystems.json en zijn machinaal uit de
 * PDF gelezen — zie het _bron-blok daar.
 */
import data from '../data/essystems.json';
import { GLASWAND_VOORBEREIDING_TARIEF } from '../data/constants';
import { berekenTotalen } from './shared';
import type { CalcResult, Marges, PrijsRegel } from './types';

const d = data as any;
const eur = (n: number) => Math.round(n * 100) / 100;
const GEEN_BEDIENING = { bed1: '', bed2: '' };

export type EsLijst = 'Comfortline Plus' | 'Black';
export type EsMontage = 'muur' | 'vrij';
/** polycarbonaat = dak inbegrepen · glas = 44.2 glas inbegrepen · voorbereid = zonder glas. */
export type EsDak = 'polycarbonaat' | 'glas' | 'voorbereid';

export interface EsArtikel {
  id: string;
  label: string;
  eenheid: string;
  prijs: number;
}

export interface EsModel {
  lijst: EsLijst;
  blz: number;
  titel: string;
  montage: EsMontage;
  dak: EsDak;
  paal: { breedte: number; diepte: number; label: string };
  /** Breedte − deze aftrek = vrije opening tussen de palen (2 × paalbreedte). */
  vrijeOpeningAftrek: number;
  kleuren: string[];
  /** Uitvallen (rijen) en breedtes (kolommen) die in de lijst staan. */
  rijen: number[];
  kolommen: number[];
  prijzen: Record<string, Record<string, number>>;
  /** Uitvallen waar de versterkte (XL) ligger al in de prijs zit (de oranje zone). */
  xlLigger: number[];
  /** Breedte → wat de lijst onder "Aantal palen" zet ('2', '3', '2 of 3', '2x Hoekpaal 1x Tussenpaal'). */
  palen: Record<string, string>;
  vakken: Record<string, number>;
  opties: EsArtikel[];
  standaard: Record<string, string>;
  /** Voorwaarden die de lijst geel markeert, letterlijk. */
  meldingen: string[];
  /** Boven deze uitval vraagt de lijst een liggerversterking per ligger (enkel Black). */
  liggerversterkingVanaf: number | null;
}

export interface EsOnderdeelGroep {
  groep: string;
  lijst: EsLijst | 'beide';
  blz: number;
  info?: string;
  artikelen: EsArtikel[];
}

export const ES_MODELLEN: string[] = Object.keys(d.modellen);
export const esModel = (naam: string): EsModel | undefined => d.modellen[naam];
export const ES_ONDERDELEN = d.onderdelen as EsOnderdeelGroep[];
export const ES_KORTING: number = d.korting;
export const ES_MARGE: number = d.marge;
export const ES_PLAATSING: number = d.plaatsing;

/** Alle losse artikelen die bij deze lijst horen (de LED-groepen staan in beide lijsten). */
export function esOnderdeelGroepen(lijst: EsLijst): EsOnderdeelGroep[] {
  return ES_ONDERDELEN.filter((g) => g.lijst === lijst || g.lijst === 'beide');
}

export function esArtikel(id: string): EsArtikel | undefined {
  for (const g of ES_ONDERDELEN) {
    const a = g.artikelen.find((x) => x.id === id);
    if (a) return a;
  }
  return undefined;
}

/** ES-dealerlijst = brutoprijs: 40% eraf is de inkoop, daarop de BKfix-marge. */
export const esMarges = (margePct = ES_MARGE * 100, eenmaligeKorting = 0): Marges => ({
  allroundKorting: ES_KORTING,
  bkfixMarge: margePct / 100,
  eenmaligeKorting,
});

/** Dakoppervlakte in m² — de eenheid van de "Meerprijs/m²"-opties. */
export const esDakM2 = (breedte: number, uitval: number) =>
  breedte > 0 && uitval > 0 ? Math.round((breedte * uitval) / 1000) / 1000 : 0;

export interface EsKeuze { id: string; aantal: number }
/** Een stuk dat niet in de lijst staat; het bedrag is de inkoopprijs. */
export interface EsExtra { omschrijving: string; bedrag: number }

export interface EsInput {
  model: string;
  aantal: number;
  breedte: number;
  uitval: number;
  kleur: string;
  /** Opties uit de tabel onder het prijsraster van dit model. */
  opties: EsKeuze[];
  /** Losse artikelen uit de profielen-, palen-, zijwand- en LED-pagina's. */
  onderdelen: EsKeuze[];
  extraLijnen: EsExtra[];
  plaatsingPerStuk: number;
  voorbereidingPersonen: number;
  voorbereidingUren: number;
  voorbereidingTarief?: number;
  marges: Marges;
  opmerkingen: string;
}

/** Welke maten er in de lijst staan voor dit model: per breedte de uitvallen met een prijs. */
export function esMaten(model: string): { breedte: number; uitvallen: number[] }[] {
  const m = esModel(model);
  if (!m) return [];
  return m.kolommen.map((breedte) => ({
    breedte,
    uitvallen: m.rijen.filter((u) => typeof m.prijzen[String(u)]?.[String(breedte)] === 'number'),
  }));
}

export function calcEsOverkapping(inp: EsInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const regels: PrijsRegel[] = [];
  const labels: string[] = [];
  const klantLabels: string[] = [];
  const aantal = Math.max(1, Math.floor(inp.aantal || 1));

  const m = esModel(inp.model);
  let basis: number | undefined;
  if (!m) {
    errors.push(`Onbekend model "${inp.model}"`);
  } else {
    basis = m.prijzen[String(inp.uitval)]?.[String(inp.breedte)];
    if (!inp.breedte || !inp.uitval) {
      errors.push('Kies een maat uit de lijst');
    } else if (typeof basis !== 'number') {
      errors.push(
        `${inp.model} bestaat niet in ${inp.breedte} × ${inp.uitval}mm — `
        + `breedtes ${m.kolommen.join(' / ')}mm, uitval ${m.rijen.join(' / ')}mm`,
      );
    }
  }

  const montageLabel = m?.montage === 'vrij' ? 'vrijstaand' : 'muuraanbouw';
  const palenTekst = m ? m.palen[String(inp.breedte)] ?? '' : '';
  if (m && typeof basis === 'number') {
    regels.push({
      label: `${m.titel} ${inp.breedte} × ${inp.uitval}mm — ${montageLabel}`,
      bedrag: basis,
    });
  }

  // ---- Kleur ----
  if (m && !inp.kleur) warnings.push('Kies de kleur');
  if (m && inp.kleur && !m.kleuren.includes(inp.kleur)) {
    warnings.push(`"${inp.kleur}" is geen standaardkleur — ES doet niet-standaardkleuren op aanvraag (enkel structuurlak)`);
  }

  // ---- Wat de lijst bij deze maat vraagt ----
  if (m && typeof basis === 'number') {
    if (m.xlLigger.includes(inp.uitval)) {
      labels.push(`Versterkte XL-ligger inbegrepen (uitval ${inp.uitval}mm)`);
    }
    if (m.liggerversterkingVanaf != null && inp.uitval > m.liggerversterkingVanaf) {
      warnings.push(`${m.meldingen.find((x) => /Liggerversterking/i.test(x))
        ?? `Liggerversterking is vereist per ligger voor een diepte > ${m.liggerversterkingVanaf}mm`}`
        + ' — voeg ze toe bij de onderdelen');
    }
    // "2 of 3" palen: de lijst laat de keuze, maar vraagt er iets bij.
    if (/of/.test(palenTekst)) {
      warnings.push(m.meldingen.find((x) => /staanders/i.test(x))
        ?? `De lijst zet "${palenTekst}" palen bij ${inp.breedte}mm — leg het aantal vast op de bestelbon`);
    }
  }

  // ---- Opties uit het model ----
  for (const k of inp.opties ?? []) {
    if (!k?.id || !(k.aantal > 0)) continue;
    const o = m?.opties.find((x) => x.id === k.id);
    if (!o) { warnings.push(`Optie "${k.id}" hoort niet bij ${inp.model} — niet meegerekend`); continue; }
    regels.push({ label: `${o.label} (${k.aantal} ${o.eenheid} × €${o.prijs})`, bedrag: o.prijs * k.aantal });
    labels.push(`${o.label}: ${k.aantal} ${o.eenheid}`);
    klantLabels.push(o.label);
  }

  // ---- Losse artikelen (profielen, palen, zijwanden, LED) ----
  for (const k of inp.onderdelen ?? []) {
    if (!k?.id || !(k.aantal > 0)) continue;
    const a = esArtikel(k.id);
    if (!a) { warnings.push(`Artikel "${k.id}" staat niet meer in de lijst — niet meegerekend`); continue; }
    regels.push({ label: `${a.label} (${k.aantal} × €${a.prijs})`, bedrag: a.prijs * k.aantal });
    labels.push(`${a.label}: ${k.aantal}`);
    klantLabels.push(`${a.label}: ${k.aantal}`);
  }

  // ---- Handmatige extra lijnen (netto inkoop) ----
  for (const e of inp.extraLijnen ?? []) {
    if (!e || !e.bedrag) continue;
    const naam = (e.omschrijving || '').trim() || 'Extra';
    regels.push({ label: `${naam} (netto inkoop)`, bedrag: e.bedrag, netto: true, eenmalig: true });
    labels.push(naam);
    klantLabels.push(naam);
  }

  // ---- Plaatsing ----
  const tarief = inp.voorbereidingTarief ?? GLASWAND_VOORBEREIDING_TARIEF;
  const vb = Math.max(0, inp.voorbereidingPersonen || 0) * Math.max(0, inp.voorbereidingUren || 0)
    * Math.max(0, tarief);
  const plaatsingTotaal = Math.max(0, inp.plaatsingPerStuk || 0) * aantal + vb;

  const tot = berekenTotalen(regels, aantal, 0, plaatsingTotaal, GEEN_BEDIENING, inp.marges);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    product: 'Overkapping',
    type: inp.model,
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
      inp.kleur && `Kleur: ${inp.kleur}`,
      m && `Dak: ${m.standaard.Polycarbonaat ?? m.standaard.Glas ?? m.dak}`,
      vb > 0 && `Voorbereidende werken: ${inp.voorbereidingPersonen} × ${inp.voorbereidingUren}u`,
      ...labels,
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      merk: 'ES Systems',
      soort: 'es-overkapping',
      lijst: m?.lijst ?? '',
      blz: m?.blz ?? 0,
      montage: montageLabel,
      palen: palenTekst,
      vakken: m?.vakken[String(inp.breedte)] ?? '',
      paal: m?.paal.label ?? '',
      kleur: inp.kleur,
      xlLigger: !!m && m.xlLigger.includes(inp.uitval),
      standaard: m ? Object.entries(m.standaard).map(([k, v]) => `${k}: ${v}`).join(' · ') : '',
      optiesTekst: klantLabels.join(' · '),
      plaatsingPerStuk: inp.plaatsingPerStuk,
      voorbereidingPersonen: inp.voorbereidingPersonen,
      voorbereidingUren: inp.voorbereidingUren,
      voorbereidingKost: eur(vb),
    },
    bediening: GEEN_BEDIENING,
    kleur: { select: inp.kleur, custom: '' },
  };
}
