/**
 * Glazen schuifwanden — ES Systems ES75 en Deponti Fiano.
 *
 * De twee merken prijzen fundamenteel anders:
 *  - ES75    : één settarief per wand = f(standaard|maatwerk, helder|getint, aantal rails 1-6).
 *              Breedte en hoogte bepalen de prijs NIET, enkel of het binnen de grenzen valt.
 *              Inkoop = lijstprijs − 40% (op alles).
 *  - Deponti : stuklijst = aantal panelen × paneelprijs(inbouwhoogte × paneelbreedte) + rail + opties.
 *              De dealerlijst ís de inkoopprijs (korting 0%).
 *
 * De meetkunde is voor beide gelijk:
 *   paneelbreedte = (breedte wand + (n − 1) × overlap) / n
 *   breedte wand  = n × paneelbreedte − (n − 1) × overlap
 */
import data from '../data/glaswand.json';
import { GLASWAND_MERK, GLASWAND_VOORBEREIDING_TARIEF } from '../data/constants';
import { berekenTotalen } from './shared';
import type { BedieningKeuze, CalcResult, KleurKeuze, Marges, PrijsRegel, VrijeOptie } from './types';

export type GlaswandMerk = 'ES Systems' | 'Deponti';
export type PaneelModus = 'standaard' | 'maatwerk';

export interface GlaswandOptieKeuze {
  id: string;
  aantal: number;
}

/**
 * Eén rij in de paneelverdeling van een wand. Zo kan je standaardmaten onderling mengen
 * (bestelbon BB260402: 2x 900mm + 1x 1000mm) en er één maatwerkglas tussen zetten.
 * breedte 0 = "vult de rest van de opening op" — dat paneel volgt uit de gekozen overlap.
 */
export interface GlaswandPaneel {
  breedte: number;
  aantal: number;
}

/**
 * Handmatige extra lijn voor iets dat niet in de prijslijst staat — bijvoorbeeld een slot
 * (ES heeft er geen tarief voor) of lakwerk in een afwijkende RAL ("op aanvraag").
 * netto:true = het bedrag is al de inkoopprijs; netto:false = het is een lijstprijs
 * waar de leverancierskorting nog af gaat.
 */
export interface GlaswandExtra {
  omschrijving: string;
  bedrag: number;
  netto: boolean;
}

export interface GlaswandInput {
  merk: GlaswandMerk;
  /** Aantal identieke wanden. */
  aantal: number;

  /** Gemeten dagmaat van de opening (mm). */
  dagmaatBreedte: number;
  kokerLinks: number;
  kokerMidden: number;
  kokerRechts: number;
  /** Inbouwhoogte: vloer tot onderkant goot (ES) / onderzijde onderprofiel tot bovenzijde bovenprofiel (Deponti). */
  dagmaatHoogte: number;
  /**
   * Gemeten hoogte onder de goot (wanden uit de Overkappingen-tab); 0 = niet gekend. Deponti bestelt
   * dan de standaardhoogte die erin past (zie fianoKlasse) en de bestelbon zegt waarom.
   */
  gemetenHoogte?: number;

  aantalPanelen: number;
  /** 'standaard' = paneelbreedte uit de lijst, overlap volgt · 'maatwerk' = overlap gekozen, breedte volgt. */
  paneelModus: PaneelModus;
  paneelBreedte: number;
  /**
   * Vrije paneelverdeling. Is deze ingevuld, dan gaat ze vóór paneelModus/paneelBreedte/aantalPanelen.
   * Leeg laten voor een wand met allemaal gelijke panelen.
   */
  paneelVerdeling?: GlaswandPaneel[];
  overlap: number;
  steellook: boolean;

  /** ES: glastype. */
  glas: 'helder' | 'getint';

  /** Deponti: aantal sporen van de onderrail (0 = gelijk aan het aantal panelen). */
  sporen: number;
  /** Deponti: raillengte in mm (0 = automatisch de kortste die past). */
  raillengte: number;
  /** Deponti maatwerkglas: standaard | brons | grijs | gesatineerd. */
  glassoort: string;
  /** Deponti: zij- of middensluiting trekt 85mm van de gemeten dagmaat af. */
  sluiting: 'geen' | 'zij' | 'midden';

  kleur: KleurKeuze;
  opties: GlaswandOptieKeuze[];
  /** Stukken zonder tarief in de prijslijst (slot, lakwerk, ...). */
  extraLijnen: GlaswandExtra[];
  bediening: BedieningKeuze;
  opmerkingen: string;
  vrijeOpties: VrijeOptie[];
  marges: Marges;
  /** Vast plaatsingsbedrag per wand; default uit GLASWAND_MERK (€800). */
  plaatsingVast?: number;
  /** Voorbereidende werken voor deze regel in totaal (niet per wand). */
  voorbereidingPersonen: number;
  voorbereidingUren: number;
  /** Uurtarief voorbereidende werken; default GLASWAND_VOORBEREIDING_TARIEF. */
  voorbereidingTarief?: number;
}

const es = (data as any).es;
const dp = (data as any).deponti;
const r1 = (n: number) => Math.round(n * 10) / 10;

export const GLASWAND_MERKEN: GlaswandMerk[] = ['ES Systems', 'Deponti'];
export const ES_BREEDTES: number[] = es.standaardBreedtes;
export const DEPONTI_BREEDTES: number[] = dp.standaardBreedtes;
export const DEPONTI_HOOGTES: number[] = dp.standaardHoogtes;
export const DEPONTI_GLASSOORTEN: string[] = Object.keys(dp.maatwerkPerM2);

/** Fiano-compensatietabel (handleiding Fiano blz. 12): welke dagmaat hoogte een standaardhoogte afdekt. */
export const FIANO_COMPENSATIE: {
  onder: number; boven: number; meenemerOnder: number; uProfielBoven: number; koker60Boven: number;
} = dp.hoogteCompensatie;

export interface FianoKlasse {
  /** De standaardhoogte (inbouwhoogte) die besteld wordt. */
  hoogte: number;
  /** Dagmaat hoogte waarin ze past: van … tot … (standaard, zonder meenemers). */
  van: number;
  tot: number;
  /** Met meenemers past ze pas vanaf deze dagmaat. */
  meenemerVan: number;
}

/**
 * De Fiano-standaardhoogte die in een gemeten dagmaat hoogte past, of null: dan is het maatwerkglas.
 * Volgens Deponti past standaardhoogte H in een dagmaat van H − 20 tot H + 25mm.
 */
export function fianoKlasse(dagmaatHoogte: number): FianoKlasse | null {
  const c = FIANO_COMPENSATIE;
  for (const h of DEPONTI_HOOGTES) {
    if (dagmaatHoogte >= h - c.onder && dagmaatHoogte <= h + c.boven) {
      return { hoogte: h, van: h - c.onder, tot: h + c.boven, meenemerVan: h - c.meenemerOnder };
    }
  }
  return null;
}

/** De hoogte waarmee een merk rekent voor een gemeten hoogte onder de goot. */
export function hoogteVoorMerk(merk: GlaswandMerk, gemeten: number): number {
  return merk === 'Deponti' ? (fianoKlasse(gemeten)?.hoogte ?? gemeten) : gemeten;
}

/** Waarom een Fiano-wand op deze hoogte besteld wordt (voor de bestelbon); '' als er niets te zeggen is. */
export function fianoHoogteNota(gemeten: number): string {
  if (!(gemeten > 0)) return '';
  const k = fianoKlasse(gemeten);
  if (!k) return `Gemeten dagmaat hoogte ${gemeten}mm valt tussen de Fiano-standaardhoogtes: maatwerkglas`;
  if (k.hoogte === gemeten) return '';
  const meenemer = gemeten < k.meenemerVan ? `; met meenemers past ze pas vanaf ${k.meenemerVan}mm` : '';
  return `Gemeten dagmaat hoogte ${gemeten}mm → Fiano-standaardhoogte ${k.hoogte}mm `
    + `(compensatietabel Deponti: ${k.van} tot ${k.tot}mm${meenemer})`;
}

/** Tussen twee standaardhoogtes: het alternatief uit de compensatietabel (enkel op het scherm). */
export function fianoAlternatief(gemeten: number): string {
  if (!(gemeten > 0) || fianoKlasse(gemeten)) return '';
  const c = FIANO_COMPENSATIE;
  const u = DEPONTI_HOOGTES.find((h) => gemeten > h + c.boven && gemeten <= h + c.uProfielBoven);
  if (u) return `Alternatief volgens Deponti: standaardhoogte ${u}mm met een U-profiel (tot ${u + c.uProfielBoven}mm)`;
  const k = DEPONTI_HOOGTES.find((h) => gemeten > h + c.boven && gemeten <= h + c.koker60Boven);
  if (k) return `Alternatief volgens Deponti: standaardhoogte ${k}mm met een koker 60 (tot ${k + c.koker60Boven}mm)`;
  return '';
}

export function glaswandOpties(merk: GlaswandMerk) {
  return (merk === 'Deponti' ? dp.opties : es.opties) as {
    id: string; label: string; eenheid: string; prijs: number;
    perPaneel?: boolean; steellook?: boolean;
    /** true = zit al in het settarief, enkel als reserveonderdeel bij te bestellen. */
    reserve?: boolean;
    /** false = één keer per project (paal, koker, L-profiel), niet per wand. */
    perWand?: boolean;
    /** true = dit artikel vraagt een glas met gat. */
    vereistGat?: boolean;
    /** Deponti: leverbaar in deze kleuren (RAL-code of 'Brut'); kleuren7 = bij 7 sporen. */
    kleuren?: string[];
    kleuren7?: string[];
    /** Deponti: leverbaar voor dit aantal sporen. */
    sporen?: number[];
    /** true = leveranciersregel (transport): wel in de berekening, niet in de klantoffertetekst. */
    intern?: boolean;
  }[];
}

/** 'RAL 9016 verkeerswit structuur' → '9016', 'Brut' → 'Brut', anders ''. */
export function kleurCode(kleur: string): string {
  if (/brut/i.test(kleur || '')) return 'Brut';
  return (kleur || '').match(/\b(9001|9016|7024|9005)\b/)?.[1] ?? '';
}

/**
 * Deponti: bestaat deze optie in de gekozen kleur en voor dit aantal sporen? (lijst 2026 blz. 42-44)
 * Geeft de waarschuwingen terug; leeg = in orde. Gedeeld door de glaswand en de Fiano Louvre.
 */
export function depontiOptieMeldingen(
  opt: { label: string; kleuren?: string[]; kleuren7?: string[]; sporen?: number[] },
  kleur: string,
  sporen: number,
): string[] {
  const uit: string[] = [];
  const code = kleurCode(kleur);
  const kleuren = sporen === 7 && opt.kleuren7 ? opt.kleuren7 : opt.kleuren;
  if (kleuren && code && !kleuren.includes(code)) {
    uit.push(
      `${opt.label} bestaat${sporen === 7 && opt.kleuren7 ? ' bij 7 sporen' : ''} niet in `
      + `${code === 'Brut' ? 'brut' : `RAL ${code}`} (leverbaar: ${kleuren.map((k) => (k === 'Brut' ? 'brut' : k)).join(' / ')})`,
    );
  }
  if (opt.sporen && sporen > 0 && !opt.sporen.includes(sporen)) {
    uit.push(`${opt.label} bestaat niet voor ${sporen} sporen`);
  }
  return uit;
}

/**
 * Deponti: de breedtes die op deze inbouwhoogte een standaardpaneel zijn. Enkel helder glas bestaat
 * als standaardpaneel, en niet elke breedte bestaat op elke hoogte (640 niet in 2350).
 */
export function depontiStandaardBreedtes(inbouwhoogte: number, glassoort: string): number[] {
  const rij = dp.panelen[String(inbouwhoogte)] as Record<string, number> | undefined;
  if (!rij || (glassoort && glassoort !== 'standaard')) return [];
  return (dp.standaardBreedtes as number[]).filter((b) => typeof rij[String(b)] === 'number');
}

export function glaswandKleuren(merk: GlaswandMerk): string[] {
  return merk === 'Deponti' ? dp.kleuren : es.kleuren;
}

/** Kortste beschikbare raillengte voor dit aantal sporen die de wand overspant. */
export function kiesRaillengte(sporen: number, wandBreedte: number): number | null {
  const rij = dp.rail[String(sporen)];
  if (!rij) return null;
  const passend = Object.keys(rij).map(Number).filter((l) => l >= wandBreedte).sort((a, b) => a - b);
  return passend.length > 0 ? passend[0] : null;
}

/**
 * Breedte die het glas moet overspannen: gemeten dagmaat min de kokers, en bij Deponti ook min
 * 20mm voor steel-look (het profiel is 35mm breed; de sjablonen rekenen met 30mm overlap — zo komt
 * werf 3835 exact op de 696mm glas van so96274) en min 85mm bij een zij- of middensluiting.
 * ES Systems voert geen steel-look glasroeden: daar telt het vinkje niet.
 */
export function glaswandWandBreedte(inp: Pick<GlaswandInput,
  'merk' | 'dagmaatBreedte' | 'kokerLinks' | 'kokerMidden' | 'kokerRechts' | 'steellook' | 'sluiting'>): number {
  const isDeponti = inp.merk === 'Deponti';
  const kokers = (inp.kokerLinks || 0) + (inp.kokerMidden || 0) + (inp.kokerRechts || 0);
  const steellookAftrek = isDeponti && inp.steellook ? 20 : 0;
  const sluitingAftrek = isDeponti && inp.sluiting && inp.sluiting !== 'geen' ? dp.sluitingAftrek : 0;
  return (inp.dagmaatBreedte || 0) - kokers - steellookAftrek - sluitingAftrek;
}

export function calcGlaswand(inp: GlaswandInput): CalcResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const merk = inp.merk;
  // Nooit crashen op een onbekend merk: een uitzondering in de rekenkern laat React de hele
  // boom unmounten (wit scherm). Liever terugvallen op ES en dat melden.
  const cfg = GLASWAND_MERK[merk] ?? GLASWAND_MERK['ES Systems'];
  if (!GLASWAND_MERK[merk]) warnings.push(`Onbekend merk "${merk}" — gerekend met de ES-instellingen`);
  // Alles wat niet uitdrukkelijk Deponti is, volgt de ES-route. Zo loopt een onbekend merk
  // (bv. uit een oude bewaarde offerte) door dezelfde tak als de terugval hierboven.
  const isES = merk !== 'Deponti';
  // Eén rij per glasmaat. Zonder eigen verdeling is dat gewoon één rij: alle panelen even breed,
  // en bij modus 'maatwerk' een rij zonder breedte, die de opening opvult.
  // Is er uitdrukkelijk een eigen verdeling meegegeven (mix & match), dan telt alleen die - ook
  // als ze leeg is. Anders zou een lege verdeling stil terugvallen op aantalPanelen en een prijs
  // tonen voor een wand die de gebruiker nooit ingevuld heeft.
  const eigenVerdeling = Array.isArray(inp.paneelVerdeling);
  const verdeling: GlaswandPaneel[] = (eigenVerdeling
    ? (inp.paneelVerdeling as GlaswandPaneel[])
    : [{ breedte: inp.paneelModus === 'standaard' ? inp.paneelBreedte : 0, aantal: inp.aantalPanelen }]
  ).filter((r) => r && Math.floor(r.aantal) > 0);
  const n = verdeling.reduce((t, r) => t + Math.floor(r.aantal), 0);

  // ---- Breedte van de wand ----
  const steellookActief = inp.steellook && !isES;
  if (inp.steellook && isES) {
    warnings.push('ES Systems levert geen steel-look glasroeden — het vinkje wordt genegeerd');
  }
  const wandBreedte = glaswandWandBreedte(inp);

  if (!inp.dagmaatBreedte || !inp.dagmaatHoogte) errors.push('Vul de dagmaat breedte en hoogte in');
  if (n < 1) errors.push(eigenVerdeling ? 'Voeg minstens één glasmaat toe' : 'Vul het aantal panelen in');
  if (wandBreedte <= 0 && inp.dagmaatBreedte) errors.push('De kokers zijn samen breder dan de opening');

  // ---- Paneelbreedte en overlap ----
  let paneelBreedte = 0;          // de breedste maat; enkel voor weergave en bestelmaat
  let overlap = 0;
  let maten: { breedte: number; aantal: number }[] = [];
  if (n >= 1 && wandBreedte > 0) {
    const vast = verdeling.filter((r) => r.breedte > 0);
    const auto = verdeling.filter((r) => !(r.breedte > 0));
    const autoAantal = auto.reduce((t, r) => t + Math.floor(r.aantal), 0);
    const somVast = vast.reduce((t, r) => t + r.breedte * Math.floor(r.aantal), 0);

    if (autoAantal === 0) {
      // Alle breedtes zijn gegeven: de overlap volgt eruit.
      overlap = n > 1 ? (somVast - wandBreedte) / (n - 1) : 0;
      maten = vast.map((r) => ({ breedte: r.breedte, aantal: Math.floor(r.aantal) }));
      if (steellookActief && n > 1 && Math.abs(overlap - 30) > 1) {
        warnings.push(
          `Steel-look werkt met 30mm overlap; deze glasmaten geven ${r1(overlap)}mm — `
          + 'laat één paneel de rest opvullen of kies andere maten',
        );
      }
    } else {
      // Eén of meer panelen vullen de rest op, op basis van de gekozen overlap.
      overlap = steellookActief ? 30 : inp.overlap;
      if (steellookActief && inp.overlap && inp.overlap !== 30) {
        warnings.push(`Steel-look werkt met 30mm overlap — de ingevulde ${inp.overlap}mm is vervangen`);
      }
      const rest = wandBreedte + (n - 1) * overlap - somVast;
      // Afronden op hele mm: het glas wordt ook op hele mm besteld. Deed je dat niet, dan besliste
      // een honderdste millimeter of de wand aan het standaard- of het maatwerktarief gaat, terwijl
      // er op de bestelbon exact dezelfde maat staat.
      const autoBreedte = Math.round(rest / autoAantal);
      if (autoBreedte <= 0) {
        errors.push(
          `De vaste panelen vullen de opening van ${Math.round(wandBreedte)}mm al helemaal — `
          + 'er blijft geen breedte over voor het resterende glas',
        );
      }
      maten = [
        ...vast.map((r) => ({ breedte: r.breedte, aantal: Math.floor(r.aantal) })),
        ...auto.map((r) => ({ breedte: autoBreedte, aantal: Math.floor(r.aantal) })),
      ];
    }
    paneelBreedte = maten.reduce((m, r) => Math.max(m, r.breedte), 0);
  }
  const gemengd = maten.length > 1;

  // Twee controles op de glasbreedte, allebei los van elkaar:
  // - smaller dan de overlap kan fysiek niet: twee buren zouden het paneel volledig bedekken;
  // - onder minPaneelBreedte bestaat er geen schuifpaneel (eigen grens van BKfix, zie glaswand.json).
  const minBreedte = es.minPaneelBreedte ?? 0;
  const krapBreedte = es.krapPaneelBreedte ?? 0;
  for (const m of maten) {
    if (!(m.breedte > 0)) continue;
    if (n > 1 && overlap > 0 && m.breedte <= overlap) {
      errors.push(
        `Een glaspaneel van ${Math.round(m.breedte)}mm is smaller dan de overlap van `
        + `${r1(overlap)}mm — die verdeling kan niet`,
      );
    } else if (m.breedte < minBreedte) {
      errors.push(
        `Een glaspaneel van ${Math.round(m.breedte)}mm is te smal om te schuiven `
        + `(ondergrens ${minBreedte}mm) — controleer de verdeling`,
      );
    } else if (m.breedte < krapBreedte) {
      warnings.push(
        `Een glaspaneel van ${Math.round(m.breedte)}mm is ongewoon smal `
        + `(het smalste op een echte ES-bestelbon was 599mm) — bevestigen bij ${isES ? 'ES' : 'Deponti'}`,
      );
    }
  }

  if (n === 1 && paneelBreedte > 0 && wandBreedte > 0) {
    const gat = wandBreedte - paneelBreedte;
    if (gat < -5) {
      errors.push(`Eén paneel van ${Math.round(paneelBreedte)}mm past niet in een opening van ${Math.round(wandBreedte)}mm`);
    } else if (gat > 20) {
      warnings.push(`Eén paneel van ${Math.round(paneelBreedte)}mm laat ${Math.round(gat)}mm van de opening open`);
    }
  }

  if (n > 1 && paneelBreedte > 0) {
    if (overlap < 0) {
      errors.push(`Panelen van ${paneelBreedte}mm zijn samen te smal voor een opening van ${r1(wandBreedte)}mm`);
    } else if (overlap < 30) {
      warnings.push(`Overlap ${r1(overlap)}mm is kleiner dan de gebruikelijke 30mm`);
    } else if (overlap > 70) {
      warnings.push(`Overlap ${r1(overlap)}mm is groter dan de gebruikelijke 70mm — panelen zitten ver over elkaar`);
    }
  }

  // ---- Kleur ----
  // Niet via kleurLabel(): dat valt bij een lege eigen kleur terug op "Andere kleur (+€675)",
  // de meerprijs uit de Allround-kleurencollectie. Die geldt niet voor glaswanden en zou zo in
  // de klantofferte en op de bestelbon belanden.
  const kl = inp.kleur.select === 'andere' ? (inp.kleur.custom || '').trim() : (inp.kleur.select || '');
  if (inp.kleur.select === 'andere' && !kl) {
    errors.push(`Vul in welke kleur — ${isES ? 'ES' : 'Deponti'} rekent niet-standaardkleuren op aanvraag aan`);
  }
  // Bij Deponti telt een vrij getypte standaardkleur ("brut", "ral 7024") als die standaardkleur: de
  // rekenkern herkent ze via kleurCode() (brute rail, beschikbaarheid) en mag dan niet tegelijk
  // "geen standaardkleur, meerprijs toevoegen" zeggen.
  const standaardKleur = glaswandKleuren(merk).includes(kl)
    || (!isES && !!kleurCode(kl) && glaswandKleuren(merk).some((k) => kleurCode(k) === kleurCode(kl)));
  if (kl && !standaardKleur) {
    warnings.push(`"${kl}" is geen standaardkleur — prijs op aanvraag, voeg de meerprijs als extra lijn toe`);
  }

  const regels: PrijsRegel[] = [];
  const detail: Record<string, string | number | boolean> = {};
  let uitvoering: PaneelModus = inp.paneelModus;
  let glasHoogte = 0;
  /** Breedte op de bestelmaat; 0 = de breedste glasmaat. */
  let bestelBreedte = 0;

  if (isES) {
    // ---------------- ES Systems ES75 ----------------
    if (n > es.maxRails) errors.push(`ES75 gaat tot ${es.maxRails} rails; ${n} panelen is niet mogelijk`);

    // ES bepaalt het tarief op de GLASMAAT, niet op hoe je het invoert: op de bestelbonnen staat
    // "maatwerk" enkel wanneer de paneelbreedte niet in de lijst zit (BB261000: 3x 1000x2300 =
    // standaardtarief; BB260457: 4x 656mm = maatwerk). Het ES-bestelformulier heeft daarom twee
    // aparte rijen: "std breedte" en "maatwerk glas".
    const grens = es.dagmaat[inp.glas] ?? es.dagmaat.helder;
    // De HOOGTE heeft geen invloed op het tarief: ES rekent één prijs tot dagmaat 2700mm
    // (zaakvoerder, 2026-09-17). Alleen de GLASBREEDTE bepaalt of een paneel standaard- of
    // maatwerkglas is; in een gemengde wand betaalt elk paneel zijn eigen deel.
    const isStandaardPaneel = (m: { breedte: number }) => es.standaardBreedtes.includes(m.breedte);
    const standaardAantal = maten.filter(isStandaardPaneel).reduce((t, m) => t + m.aantal, 0);
    const maatwerkAantal = n - standaardAantal;
    const standaardMaat = maten.length > 0 && maatwerkAantal === 0;
    uitvoering = standaardMaat ? 'standaard' : 'maatwerk';

    // Boven 2700mm kan ES nog leveren, maar dan is de prijs op aanvraag — de berekening klopt daar niet meer.
    if (inp.dagmaatHoogte > es.dagmaat.maatwerkMax) {
      warnings.push(
        `Inbouwhoogte ${inp.dagmaatHoogte}mm gaat boven de ${es.dagmaat.maatwerkMax}mm uit de prijslijst — `
        + 'ES levert dat wel, maar de prijs is op aanvraag: dit bedrag klopt dus niet',
      );
    }
    if (inp.glas === 'getint' && inp.dagmaatHoogte > grens.max) {
      warnings.push(`De prijslijst geeft getint glas tot ${grens.max}mm — bevestigen bij ES`);
    }
    if (inp.dagmaatHoogte > 0 && inp.dagmaatHoogte < grens.min) {
      warnings.push(
        `Inbouwhoogte ${inp.dagmaatHoogte}mm ligt onder de laagste maat uit de prijslijst `
        + `(${grens.min}mm) — bevestigen bij ES`,
      );
    }
    if (paneelBreedte > 0 && inp.dagmaatHoogte > 0 && maatwerkAantal > 0 && errors.length === 0) {
      const afwijkend = maten.filter((m) => !isStandaardPaneel(m));
      warnings.push(
        `${afwijkend.map((m) => `${m.aantal}× ${Math.round(m.breedte)}mm`).join(', ')} `
        + `${afwijkend.length === 1 && afwijkend[0].aantal === 1 ? 'is geen standaardmaat' : 'zijn geen standaardmaten'} `
        + `(${es.standaardBreedtes.join(' / ')}mm) — alleen dat glas gaat aan het maatwerktarief`,
      );
    }

    // Het tarief staat per SET in de lijst (per aantal rails). In een gemengde wand betaalt elk
    // paneel zijn eigen deel: standaardglas aan het standaardtarief, maatwerkglas aan het
    // maatwerktarief, allebei gedeeld door het aantal rails van de set.
    const setStd = es.sets.standaard[inp.glas]?.[String(n)];
    const setMaat = es.sets.maatwerk[inp.glas]?.[String(n)];
    let basis: number | undefined;
    let tariefLabel = '';
    if (maatwerkAantal === 0) {
      basis = typeof setStd === 'number' ? setStd : undefined;
      tariefLabel = `standaard ${inp.glas} glas`;
    } else if (standaardAantal === 0) {
      basis = typeof setMaat === 'number' ? setMaat : undefined;
      tariefLabel = `maatwerk ${inp.glas} glas`;
    } else if (typeof setStd === 'number' && typeof setMaat === 'number') {
      basis = Math.round(((standaardAantal * setStd + maatwerkAantal * setMaat) / n) * 100) / 100;
      tariefLabel = `${inp.glas} glas, ${standaardAantal}× standaard + ${maatwerkAantal}× maatwerk`;
    }
    if (typeof basis === 'number') {
      regels.push({ label: `ES75 ${tariefLabel} — ${n} rail${n > 1 ? 's' : ''}`, bedrag: basis });
    } else if (errors.length === 0) {
      errors.push(`Geen ES75-tarief voor ${n} rails`);
    }
    detail.uitvoeringLabel = maatwerkAantal === 0 ? 'standaard'
      : standaardAantal === 0 ? 'maatwerk'
        : `gemengd (${standaardAantal}× standaard + ${maatwerkAantal}× maatwerk)`;

    glasHoogte = inp.dagmaatHoogte ? inp.dagmaatHoogte - es.glasAftrek : 0;
    if (inp.dagmaatHoogte > 0 && glasHoogte <= 0) {
      errors.push(`Inbouwhoogte ${inp.dagmaatHoogte}mm is te klein: er blijft geen glashoogte over`);
    }
    detail.railBreedte = es.railBreedte[String(n)] ?? '';
    detail.glastype = inp.glas;
    detail.glasmaat = glasHoogte && maten.length > 0
      ? maten.map((m) => `${m.aantal}× ${Math.round(m.breedte)}×${glasHoogte}mm`).join(' + ')
      : '';
  } else {
    // ---------------- Deponti Fiano ----------------
    const sporen = inp.sporen || n;
    if (n > dp.maxPanelen) errors.push(`Deponti Fiano gaat tot ${dp.maxPanelen} sporen; ${n} panelen is niet mogelijk`);
    if (!dp.rail[String(sporen)]) errors.push(`Deponti heeft geen rail met ${sporen} sporen`);
    if (sporen < n && inp.sluiting !== 'midden') {
      warnings.push(`${n} panelen op ${sporen} sporen — kan enkel met een middensluiting (panelen naar twee kanten)`);
    }

    // Per paneel afrekenen, zoals Deponti factureert (stuklijst). Een paneel is een standaardpaneel
    // als de lijst er een prijs voor heeft bij deze inbouwhoogte (640 bestaat niet in 2350); al de
    // rest is maatwerkglas: glasbreedte × INBOUWHOOGTE × m²-prijs (lijst 2026 blz. 41). Zo rekent
    // Deponti ook: so96274 = 0,696 × 2,111 × €125 = €183,66 per paneel.
    const H = inp.dagmaatHoogte;
    const rij = dp.panelen[String(H)] as Record<string, number> | undefined;
    const glassoort = dp.maatwerkPerM2[inp.glassoort] !== undefined ? inp.glassoort : 'standaard';
    if (glassoort !== inp.glassoort && inp.glassoort) warnings.push(`Onbekende glassoort "${inp.glassoort}" — gerekend als helder`);
    const perM2: number = dp.maatwerkPerM2[glassoort];
    if (glassoort === 'grijs' && dp.grijsMelding) warnings.push(dp.grijsMelding);
    // Standaardpanelen bestaan enkel in helder glas: grijs, brons en gesatineerd zijn altijd maatwerk.
    const standaardMogelijk = glassoort === 'standaard' && !!rij;
    const isStandaardPaneel = (m: { breedte: number }) =>
      standaardMogelijk && typeof rij?.[String(m.breedte)] === 'number';
    const standaardAantal = maten.filter(isStandaardPaneel).reduce((t, m) => t + m.aantal, 0);
    const maatwerkAantal = n - standaardAantal;
    const nettoGlasHoogte = H > 0 ? H - dp.glasAftrek : 0;
    if (H > 0 && nettoGlasHoogte <= 0) errors.push(`Inbouwhoogte ${H}mm is te klein: er blijft geen glashoogte over`);

    for (const m of maten) {
      if (!(m.breedte > 0) || !(H > 0)) continue;
      const b = Math.round(m.breedte);
      if (isStandaardPaneel(m)) {
        const prijs = rij![String(m.breedte)];
        regels.push({ label: `${m.aantal} × glaspaneel ${b}×${H}mm (standaard)`, bedrag: prijs * m.aantal });
      } else {
        // In centen rekenen op hele mm: 708 × 2110 × 125 = 186,735 moet €186,74 worden (zoals op de factuur),
        // en niet €186,73 door een afrondingsfout in de komma.
        const centen = Math.round((b * H * perM2) / 10000);
        const perPaneel = centen / 100;
        regels.push({
          label: `${m.aantal} × maatwerkglas ${dp.maatwerkLabels?.[glassoort] ?? glassoort} ${b}×${nettoGlasHoogte}mm `
            + `(${b}×${H}mm × €${perM2}/m² = €${perPaneel.toFixed(2)}/paneel)`,
          bedrag: Math.round(perPaneel * m.aantal * 100) / 100,
        });
      }
    }
    uitvoering = maatwerkAantal === 0 && n > 0 ? 'standaard' : 'maatwerk';
    detail.uitvoeringLabel = maatwerkAantal === 0 ? 'standaard'
      : standaardAantal === 0 ? 'maatwerk'
        : `gemengd (${standaardAantal}× standaard + ${maatwerkAantal}× maatwerk)`;
    if (maatwerkAantal > 0 && n > 0 && paneelBreedte > 0) {
      if (glassoort !== 'standaard') {
        // geen extra melding: gekleurd glas is altijd maatwerk
      } else if (!rij && H > 0) {
        warnings.push(
          `Inbouwhoogte ${H}mm is geen standaardhoogte (${dp.standaardHoogtes.join(' / ')}) — alle glas is maatwerk`,
        );
      } else if (standaardAantal > 0 || maten.some((m) => dp.standaardBreedtes.includes(m.breedte))) {
        const afwijkend = maten.filter((m) => !isStandaardPaneel(m));
        warnings.push(
          `${afwijkend.map((m) => `${m.aantal}× ${Math.round(m.breedte)}mm`).join(', ')} is maatwerkglas — `
          + 'alleen dat glas gaat aan de m²-prijs',
        );
      }
      warnings.push('Maatwerkglas: levertijd ± 4 weken');
    }

    // Brut (onbewerkt): lijst 2026 blz. 42 — enkel 3 tot 6 sporen, altijd 7100mm, zelf op maat te zagen.
    const brut = kleurCode(kl) === 'Brut';
    if (brut) {
      warnings.push(
        'Brut: de profielen zijn onbehandeld (voor buiten nog te behandelen) en komen in 7100mm, '
        + 'zelf op maat te zagen (lijst 2026 blz. 42)',
      );
      const bruteLengte: number = dp.railBruteLengte;
      const bruteRail = dp.railBrute[String(sporen)];
      if (typeof bruteRail !== 'number') {
        errors.push(`Een brute rail bestaat enkel in 3 tot 6 sporen (nu ${sporen})`);
      } else if (wandBreedte > bruteLengte) {
        errors.push(`De brute rail is ${bruteLengte}mm, de wand ${r1(wandBreedte)}mm`);
      } else {
        regels.push({ label: `Onderrail ${sporen} sporen Brute, ${bruteLengte}mm`, bedrag: bruteRail });
        detail.raillengte = bruteLengte;
      }
    }
    if (brut && inp.raillengte && inp.raillengte !== dp.railBruteLengte) {
      warnings.push(`Brut: de rail komt altijd in ${dp.railBruteLengte}mm — de ingevulde ${inp.raillengte}mm telt niet`);
    }
    const lengte = brut ? null : inp.raillengte || kiesRaillengte(sporen, wandBreedte);
    if (brut) {
      // al gerekend hierboven
    } else if (!lengte) {
      const beschikbaar = Object.keys(dp.rail[String(sporen)] ?? {}).join(' / ');
      errors.push(
        `Geen ${sporen}-spoorrail die ${r1(wandBreedte)}mm overspant`
        + (beschikbaar ? ` — beschikbaar: ${beschikbaar}mm` : ''),
      );
    } else {
      // Een zelf ingevulde lengte die korter is dan de wand: bv. bewust, als de wand breder is dan
      // de langste rail en de rest apart besteld wordt. Daarom een waarschuwing en geen stop.
      if (inp.raillengte && inp.raillengte < wandBreedte) {
        warnings.push(`De rail van ${inp.raillengte}mm is korter dan de wand (${r1(wandBreedte)}mm)`);
      }
      const railPrijs = dp.rail[String(sporen)]?.[String(lengte)];
      if (typeof railPrijs !== 'number') {
        errors.push(`Deponti levert geen rail van ${lengte}mm met ${sporen} sporen`);
      } else {
        regels.push({ label: `Onderrail ${sporen} sporen, ${lengte}mm`, bedrag: railPrijs });
        if (dp.railNiet9005Lijst2025.includes(`${sporen}/${lengte}`) && /9005/.test(kl)) {
          warnings.push(
            `Rail ${sporen} sporen × ${lengte}mm bestond in de lijst 2025 niet in RAL 9005; de lijst 2026 `
            + 'markeert geen cellen meer — nakijken in de Deponti-portal',
          );
        }
        detail.raillengte = lengte;
      }
    }

    // Een standaardpaneel bestel je op de inbouwhoogte (artikel "1040x2300", so87317); maatwerkglas op
    // de netto glasmaat, en die is 85mm kleiner (lijst 2025 blz. 94; so96274: 2111 -> 2026). In een
    // gemengde wand staan beide in detail.glasmaat; de bestelmaat volgt dan het maatwerkglas.
    glasHoogte = maatwerkAantal === 0 ? H : nettoGlasHoogte;
    // Gemengde wand: de bestelmaat is die van het maatwerkglas (de standaardpanelen zijn artikels
    // op de inbouwhoogte en staan in detail.glasmaat) — nooit een mengvorm van de twee.
    if (maatwerkAantal > 0 && standaardAantal > 0) {
      bestelBreedte = maten.filter((m) => !isStandaardPaneel(m)).reduce((b, m) => Math.max(b, m.breedte), 0);
    }
    detail.inbouwhoogte = H;
    detail.glasmaat = H > 0 && maten.length > 0
      ? maten.map((m) => (isStandaardPaneel(m)
        ? `${m.aantal}× standaardpaneel ${Math.round(m.breedte)}×${H}mm`
        : `${m.aantal}× maatwerkglas ${Math.round(m.breedte)}×${nettoGlasHoogte}mm netto`)).join(' + ')
      : '';
    detail.glastype = glassoort;
    detail.sporen = sporen;
    detail.railBreedte = dp.railBreedte[String(sporen)] ?? '';
    if (inp.sluiting !== 'geen') detail.sluiting = inp.sluiting === 'zij' ? 'Zijsluiting' : 'Middensluiting';
  }

  // ---- Opties ----
  const optieLijst = glaswandOpties(merk);
  const optieLabels: string[] = [];
  /** Wat de klant te zien krijgt: zonder leveranciersregels zoals transport. */
  const klantLabels: string[] = [];
  const sporenWand = Number(detail.sporen) || n;
  let heeftMeenemers = false;
  const reserveGekozen: string[] = [];
  const aantalPerOptie = new Map<string, number>();
  for (const keuze of inp.opties ?? []) {
    const opt = optieLijst.find((o) => o.id === keuze.id);
    if (!opt && keuze.id && keuze.aantal > 0) {
      // Een bewaarde offerte met een artikel dat niet meer in de prijslijst staat: nooit stil weglaten.
      warnings.push(`Optie "${keuze.id}" staat niet meer in de prijslijst — niet meegerekend, voeg ze toe als extra lijn`);
    }
    if (!opt || keuze.aantal <= 0) continue;
    aantalPerOptie.set(opt.id, (aantalPerOptie.get(opt.id) ?? 0) + keuze.aantal);
    // Palen, kokers en L-profielen horen bij de werf, niet bij elke wand apart.
    const eenmalig = opt.perWand === false;
    regels.push({
      label: `${opt.label} (${keuze.aantal} × €${opt.prijs})${eenmalig ? ' — per project' : ''}`,
      bedrag: opt.prijs * keuze.aantal,
      eenmalig,
    });
    optieLabels.push(`${opt.label}: ${keuze.aantal}`);
    if (!opt.intern) klantLabels.push(`${opt.label}: ${keuze.aantal}`);
    if (!isES) warnings.push(...depontiOptieMeldingen(opt, kl, sporenWand));
    if (opt.id === 'meenemer') heeftMeenemers = true;
    if (opt.reserve) reserveGekozen.push(opt.label);
  }

  if (reserveGekozen.length > 0) {
    warnings.push(
      `${reserveGekozen.join(', ')} ${reserveGekozen.length === 1 ? 'zit' : 'zitten'} al in het settarief `
      + '(glas, loopwagens en rail zijn inbegrepen) — enkel apart bestellen als reserveonderdeel',
    );
  }

  // Een draaihandvat wordt in het glas gefreesd: dat vraagt de meerprijs "glas met gat".
  const gatNodig = optieLijst.filter((o) => o.vereistGat && (aantalPerOptie.get(o.id) ?? 0) > 0);
  if (gatNodig.length > 0) {
    const nodig = gatNodig.reduce((t, o) => t + (aantalPerOptie.get(o.id) ?? 0), 0);
    const gekozen = aantalPerOptie.get('glas_gat') ?? 0;
    if (gekozen < nodig) {
      warnings.push(
        `${gatNodig.map((o) => o.label).join(', ')} vraagt glas met gat Ø45mm — nu ${gekozen} van ${nodig} `
        + 'ingevuld bij "Meerprijs glas met gat"',
      );
    }
  }

  // ---- Handmatige extra lijnen ----
  for (const e of inp.extraLijnen ?? []) {
    if (!e || !e.bedrag) continue;
    const naam = (e.omschrijving || '').trim() || 'Extra';
    regels.push({ label: e.netto ? `${naam} (netto inkoop)` : naam, bedrag: e.bedrag, netto: e.netto });
    optieLabels.push(naam);   // bewust zonder bedrag: dit gaat mee naar de klantoffertetekst
    klantLabels.push(naam);
  }

  // De lijst 2025 vroeg minstens 35mm overlap bij meenemers. De lijst 2026 zegt het niet meer, en
  // werf 3835 kreeg meenemers geleverd met steel-look op 30mm (so96274) — dus een waarschuwing, geen stop.
  if (!isES && heeftMeenemers && n > 1 && overlap < dp.minOverlapMeenemer) {
    warnings.push(
      `Meenemers bij ${r1(overlap)}mm overlap: de lijst 2025 vroeg minstens ${dp.minOverlapMeenemer}mm `
      + '(de lijst 2026 vermeldt het niet meer) — nakijken bij Deponti',
    );
  }
  if (!isES && (aantalPerOptie.get('glas_gat') ?? 0) > n && n > 0) {
    warnings.push(`${aantalPerOptie.get('glas_gat')} glazen met gat, maar de wand heeft ${n} panelen`);
  }

  // ---- Plaatsing ----
  // Vast bedrag per wand, ongeacht het aantal sporen. Het variabele werk zit in de voorbereiding,
  // die voor de hele regel geldt (de gebruiker vult de werkelijke man-uren in, niet per wand).
  const plaatsingVast = inp.plaatsingVast ?? cfg.plaatsingVast;
  const tarief = inp.voorbereidingTarief ?? GLASWAND_VOORBEREIDING_TARIEF;
  const vbPersonen = Math.max(0, inp.voorbereidingPersonen || 0);
  const vbUren = Math.max(0, inp.voorbereidingUren || 0);
  const voorbereiding = vbPersonen * vbUren * Math.max(0, tarief);
  const plaatsingTotaal = plaatsingVast * inp.aantal + voorbereiding;

  const vrijeSom = (inp.vrijeOpties ?? []).reduce((s, o) => s + (o?.amount || 0), 0);
  const tot = berekenTotalen(regels, inp.aantal, vrijeSom, plaatsingTotaal, inp.bediening, inp.marges);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    product: 'Glazen schuifwand',
    type: isES ? 'ES75' : 'Deponti Fiano',
    aantal: inp.aantal,
    breedte: inp.dagmaatBreedte,
    hoogte: inp.dagmaatHoogte,
    calculatiemaat: { b: Math.round(wandBreedte), h: inp.dagmaatHoogte },
    bestelmaat: { b: Math.round(bestelBreedte || paneelBreedte), h: glasHoogte || inp.dagmaatHoogte },
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
      gemengd
        ? `${n} panelen: ${maten.map((m) => `${m.aantal}× ${Math.round(m.breedte)}mm`).join(' + ')}`
        : `${n} ${n === 1 ? 'paneel' : 'panelen'} van ${Math.round(paneelBreedte)}mm`,
      n > 1 && `Overlap: ${r1(overlap)}mm`,
      isES && `Glas: ${inp.glas}`,
      isES && uitvoering === 'maatwerk' && 'Maatwerkglas',
      !isES && `Rail: ${detail.sporen} sporen${detail.raillengte ? ` × ${detail.raillengte}mm` : ''}`,
      !isES && uitvoering === 'maatwerk' && `Maatwerkglas ${dp.maatwerkLabels?.[String(detail.glastype)] ?? inp.glassoort}`,
      detail.sluiting && String(detail.sluiting),
      steellookActief && 'Steel-look glasroeden',
      // Bewust zonder bedrag: options gaat mee naar de leveranciersbestelbon, en ons uurtarief
      // hoort daar niet op. Het bedrag staat in detail.voorbereidingKost.
      voorbereiding > 0 && `Voorbereidende werken: ${vbPersonen} × ${vbUren}u`,
      kl && `Kleur: ${kl}`,
      ...optieLabels,
      ...(inp.vrijeOpties ?? []).map((o) => `${o.description}: €${(o.amount || 0).toFixed(2)}`),
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      ...detail,
      merk,
      uitvoering,
      // Enkel voor de bestelbon: waarom een Fiano-wand onder een overkapping op deze hoogte besteld wordt.
      hoogteNota: isES ? '' : fianoHoogteNota(inp.gemetenHoogte ?? 0),
      aantalPanelen: n,
      paneelBreedte: Math.round(paneelBreedte),
      paneelVerdeling: maten.map((m) => `${m.aantal}× ${Math.round(m.breedte)}mm`).join(' + '),
      // Elke paneelbreedte afzonderlijk, in volgorde (bv. "900,980,980"). De indelingsvoorstellen
      // lezen dit terug, zodat ze exact dezelfde maten tonen als wat de rekenkern bestelt.
      panelenLijst: maten.flatMap((m) => Array.from({ length: m.aantal }, () => Math.round(m.breedte))).join(','),
      overlap: r1(overlap),
      wandBreedte: Math.round(wandBreedte),
      glasHoogte,
      steellook: steellookActief,
      // Schone lijst van gekozen opties voor de offertetekst — zonder bedragen, zodat er geen
      // inkoopprijs in de klantoffertetekst kan belanden.
      optiesTekst: klantLabels.join(' · '),
      plaatsingVast,
      voorbereidingPersonen: vbPersonen,
      voorbereidingUren: vbUren,
      voorbereidingKost: Math.round(voorbereiding * 100) / 100,
    },
    bediening: inp.bediening,
    kleur: inp.kleur,
  };
}
