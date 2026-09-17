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
import { berekenTotalen, kleurLabel } from './shared';
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
  }[];
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
  const verdeling: GlaswandPaneel[] = ((inp.paneelVerdeling && inp.paneelVerdeling.length > 0)
    ? inp.paneelVerdeling
    : [{ breedte: inp.paneelModus === 'standaard' ? inp.paneelBreedte : 0, aantal: inp.aantalPanelen }]
  ).filter((r) => r && Math.floor(r.aantal) > 0);
  const n = verdeling.reduce((t, r) => t + Math.floor(r.aantal), 0);

  // ---- Breedte van de wand ----
  const kokers = (inp.kokerLinks || 0) + (inp.kokerMidden || 0) + (inp.kokerRechts || 0);
  // Het steellookprofiel is 35mm breed: de sjablonen trekken 20mm van de breedte af en rekenen met 30mm overlap.
  // ES Systems voert geen steel-look glasroeden (dat is een Deponti-artikel); het vinkje mag daar
  // de glasmaat en de overlap dus niet stil beïnvloeden.
  const steellookActief = inp.steellook && !isES;
  if (inp.steellook && isES) {
    warnings.push('ES Systems levert geen steel-look glasroeden — het vinkje wordt genegeerd');
  }
  const steellookAftrek = steellookActief ? 20 : 0;
  // Deponti: bij zij- of middensluiting moet 85mm van de gemeten dagmaat.
  const sluitingAftrek = !isES && inp.sluiting !== 'geen' ? dp.sluitingAftrek : 0;
  const wandBreedte = (inp.dagmaatBreedte || 0) - kokers - steellookAftrek - sluitingAftrek;

  if (!inp.dagmaatBreedte || !inp.dagmaatHoogte) errors.push('Vul de dagmaat breedte en hoogte in');
  if (n < 1) errors.push('Vul het aantal panelen in');
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
    } else {
      // Eén of meer panelen vullen de rest op, op basis van de gekozen overlap.
      overlap = steellookActief ? 30 : inp.overlap;
      if (steellookActief && inp.overlap && inp.overlap !== 30) {
        warnings.push(`Steel-look werkt met 30mm overlap — de ingevulde ${inp.overlap}mm is vervangen`);
      }
      const rest = wandBreedte + (n - 1) * overlap - somVast;
      const autoBreedte = rest / autoAantal;
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

  const regels: PrijsRegel[] = [];
  const detail: Record<string, string | number | boolean> = {};
  let uitvoering: PaneelModus = inp.paneelModus;
  let glasHoogte = 0;

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
    if (!dp.rail[String(sporen)]) errors.push(`Deponti heeft geen rail met ${sporen} sporen`);

    if (inp.paneelModus === 'standaard') {
      const rij = dp.panelen[String(inp.dagmaatHoogte)];
      if (!rij) {
        errors.push(
          `Inbouwhoogte ${inp.dagmaatHoogte}mm is geen Deponti-standaardmaat `
          + `(${dp.standaardHoogtes.join(' / ')})`,
        );
      } else {
        const prijs = rij[String(paneelBreedte)];
        if (typeof prijs !== 'number') {
          errors.push(`Deponti levert geen paneel van ${paneelBreedte}mm breed bij hoogte ${inp.dagmaatHoogte}mm`);
        } else {
          regels.push({ label: `${n} × glaspaneel ${paneelBreedte}×${inp.dagmaatHoogte}mm`, bedrag: prijs * n });
        }
      }
    } else {
      const perM2 = dp.maatwerkPerM2[inp.glassoort] ?? dp.maatwerkPerM2.standaard;
      const m2 = (paneelBreedte / 1000) * (inp.dagmaatHoogte / 1000);
      regels.push({
        label: `${n} × maatwerkglas ${Math.round(paneelBreedte)}×${inp.dagmaatHoogte}mm (${r1(m2)} m² × €${perM2})`,
        bedrag: m2 * perM2 * n,
      });
      warnings.push('Maatwerkglas: levertijd ± 4 weken');
    }

    const lengte = inp.raillengte || kiesRaillengte(sporen, wandBreedte);
    if (!lengte) {
      const beschikbaar = Object.keys(dp.rail[String(sporen)] ?? {}).join(' / ');
      errors.push(
        `Geen ${sporen}-spoorrail die ${r1(wandBreedte)}mm overspant`
        + (beschikbaar ? ` — beschikbaar: ${beschikbaar}mm` : ''),
      );
    } else {
      const railPrijs = dp.rail[String(sporen)]?.[String(lengte)];
      if (typeof railPrijs !== 'number') {
        errors.push(`Deponti levert geen rail van ${lengte}mm met ${sporen} sporen`);
      } else {
        regels.push({ label: `Onderrail ${sporen} sporen, ${lengte}mm`, bedrag: railPrijs });
        if (dp.railNiet9005.includes(`${sporen}/${lengte}`) && /9005/.test(kleurLabel(inp.kleur))) {
          errors.push(`Rail ${sporen} sporen × ${lengte}mm is niet beschikbaar in RAL 9005`);
        }
        detail.raillengte = lengte;
      }
    }

    // Deponti bestelt het paneel op de inbouwhoogtemaat zelf (artikel "1040x2300"),
    // er gaat dus geen 100mm af zoals bij ES.
    glasHoogte = inp.dagmaatHoogte;
    detail.sporen = sporen;
    detail.railBreedte = dp.railBreedte[String(sporen)] ?? '';
    if (inp.sluiting !== 'geen') detail.sluiting = inp.sluiting === 'zij' ? 'Zijsluiting' : 'Middensluiting';
    warnings.push(
      'Deponti-prijzen komen uit de dealerlijst 2024/2025; op facturen van 2026 weken rail, meenemer en '
      + 'maatwerkglas af — controleer voor je bestelt',
    );
  }

  // ---- Opties ----
  const optieLijst = glaswandOpties(merk);
  const optieLabels: string[] = [];
  let heeftMeenemers = false;
  const reserveGekozen: string[] = [];
  const aantalPerOptie = new Map<string, number>();
  for (const keuze of inp.opties ?? []) {
    const opt = optieLijst.find((o) => o.id === keuze.id);
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
    optieLabels.push(naam);   // bewust zonder bedrag: optieLabels gaat mee naar de klantoffertetekst
  }

  if (!isES && heeftMeenemers && n > 1 && overlap < dp.minOverlapMeenemer) {
    errors.push(`Meenemers vragen minimaal ${dp.minOverlapMeenemer}mm overlap (nu ${r1(overlap)}mm)`);
  }

  // ---- Kleur ----
  const kl = kleurLabel(inp.kleur);
  if (kl && !glaswandKleuren(merk).includes(kl)) {
    warnings.push(`"${kl}" is geen standaardkleur — prijs op aanvraag, voeg de meerprijs als vrije optie toe`);
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
    bestelmaat: { b: Math.round(paneelBreedte), h: glasHoogte || inp.dagmaatHoogte },
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
      !isES && inp.paneelModus === 'maatwerk' && `Maatwerkglas ${inp.glassoort}`,
      detail.sluiting && String(detail.sluiting),
      inp.steellook && 'Steel-look glasroeden',
      voorbereiding > 0
        && `Voorbereidende werken: ${vbPersonen} × ${vbUren}u × €${tarief} = €${voorbereiding.toFixed(2)}`,
      kl && `Kleur: ${kl}`,
      ...optieLabels,
      ...(inp.vrijeOpties ?? []).map((o) => `${o.description}: €${(o.amount || 0).toFixed(2)}`),
    ].filter(Boolean) as string[],
    opmerkingen: inp.opmerkingen,
    detail: {
      ...detail,
      merk,
      uitvoering,
      aantalPanelen: n,
      paneelBreedte: Math.round(paneelBreedte),
      paneelVerdeling: maten.map((m) => `${m.aantal}× ${Math.round(m.breedte)}mm`).join(' + '),
      overlap: r1(overlap),
      wandBreedte: Math.round(wandBreedte),
      glasHoogte,
      steellook: steellookActief,
      // Schone lijst van gekozen opties voor de offertetekst — zonder bedragen, zodat er geen
      // inkoopprijs in de klantoffertetekst kan belanden.
      optiesTekst: optieLabels.join(' · '),
      plaatsingVast,
      voorbereidingPersonen: vbPersonen,
      voorbereidingUren: vbUren,
      voorbereidingKost: Math.round(voorbereiding * 100) / 100,
    },
    bediening: inp.bediening,
    kleur: inp.kleur,
  };
}
