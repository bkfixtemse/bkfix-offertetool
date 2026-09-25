/**
 * Indelingsadvies voor een glaswand — ES75 en Deponti Fiano.
 *
 * Je geeft de wandbreedte, het aantal panelen en de gewenste overlap. De tool zoekt zelf alle
 * indelingen met precies dat aantal panelen — maatwerk, standaardglas in elke combinatie van maten,
 * en standaardglas met maatwerkpanelen die de rest opvullen — zonder dat je eerst tussen die soorten
 * moet kiezen. Het overzicht over alle aantallen bouwt op diezelfde lijsten, zodat er in de hele tab
 * maar één definitie van "beste" bestaat.
 *
 * Elke indeling wordt doorgerekend met calcGlaswand — dezelfde rekenkern als het formulier. Kies je
 * er een, dan krijg je dus gegarandeerd dezelfde maten en dezelfde prijs.
 *
 * "Beste" = de goedkoopste indeling zonder ongewoon smal glas (< krapPaneelBreedte) en zonder glas
 * breder dan de breedste standaardmaat; bij gelijke prijs de overlap die het dichtst bij de gewenste
 * ligt, dan het minste aantal panelen, dan het minste maatwerkglas, dan het breedste smalste paneel.
 */
import data from '../data/glaswand.json';
import {
  calcGlaswand, glaswandWandBreedte, kleurCode, type GlaswandInput, type GlaswandMerk, type GlaswandPaneel,
} from './glaswand';

const es = (data as any).es;
const dp = (data as any).deponti;
// De ondergrenzen voor smal glas zijn BKfix-grenzen (het smalste glas op een echte bestelbon was
// 599mm); ze gelden voor beide merken.
const MIN_BREEDTE: number = es.minPaneelBreedte ?? 0;
const KRAP_BREEDTE: number = es.krapPaneelBreedte ?? 0;

/** Wat per merk verschilt: de standaardmaten, het maximum aantal panelen en de overlapgrenzen. */
interface MerkRegels {
  merk: GlaswandMerk;
  leverancier: string;
  /** Glasbreedtes die aan het standaardtarief gaan — bij Deponti afhankelijk van de hoogte en het glas. */
  standaard: number[];
  maxPanelen: number;
  maxPaneelBreedte: number;
  overlapMin: number;
  overlapMax: number;
}

function merkRegels(basis: Pick<GlaswandInput, 'merk' | 'dagmaatHoogte' | 'glassoort' | 'steellook'>): MerkRegels {
  if (basis.merk === 'Deponti') {
    // Een standaardpaneel bestaat enkel in helder glas en op een standaardhoogte, en niet elke
    // breedte bestaat op elke hoogte (640 niet in 2350). Al de rest is maatwerk.
    const rij = dp.panelen[String(basis.dagmaatHoogte)] as Record<string, number> | undefined;
    const helder = !basis.glassoort || basis.glassoort === 'standaard';
    const standaard = helder && rij
      ? (dp.standaardBreedtes as number[]).filter((b) => typeof rij[String(b)] === 'number')
      : [];
    // Steel-look werkt met 30mm overlap (de rekenkern zet dat ook zo): enkel indelingen op 30mm.
    const sl = !!basis.steellook;
    return {
      merk: 'Deponti', leverancier: 'Deponti', standaard, maxPanelen: dp.maxPanelen,
      maxPaneelBreedte: dp.advies.maxPaneelBreedte,
      overlapMin: sl ? 30 : dp.advies.overlapMin, overlapMax: sl ? 30 : dp.advies.overlapMax,
    };
  }
  return {
    merk: 'ES Systems', leverancier: 'ES', standaard: es.standaardBreedtes, maxPanelen: es.maxRails,
    maxPaneelBreedte: es.advies.maxPaneelBreedte,
    overlapMin: es.advies.overlapMin, overlapMax: es.advies.overlapMax,
  };
}
/** Speling die de rekenkern bij één paneel nog aanvaardt (zie calcGlaswand). */
const EEN_PANEEL_MIN = -5;
const EEN_PANEEL_MAX = 20;

export type AdviesSoort = 'maatwerk' | 'standaard' | 'mix' | 'aanvulling';

/** Wat een voorstel in het formulier invult. */
export interface AdviesInstelling {
  paneelModus: 'standaard' | 'maatwerk' | 'mix';
  aantalPanelen: number;
  paneelBreedte: number;
  paneelVerdeling: GlaswandPaneel[];
  overlap: number;
}

export interface AdviesOptie {
  soort: AdviesSoort;
  titel: string;
  instelling: AdviesInstelling;
  mogelijk: boolean;
  /** Waarom het niet kan (leeg als het wel kan). */
  reden: string;
  /** Waarschuwingen van de rekenkern. */
  meldingen: string[];
  /** Elke paneelbreedte afzonderlijk, zoals de rekenkern ze bestelt. */
  panelen: number[];
  overlap: number;
  wandBreedte: number;
  /** Som van de glasbreedtes min de overlappen — hoort gelijk te zijn aan de wandbreedte. */
  controle: number;
  /** Controle klopt, op de afronding na (elk paneel hooguit 0,5mm) — bij één paneel: de speling van de rekenkern. */
  controleKlopt: boolean;
  /** Vrije doorgang als alle panelen naar één kant geschoven zijn: wand min het breedste paneel. */
  doorgang: number;
  /** Setprijs volgens de lijst, inkoop na korting, klantprijs met plaatsing — telkens zonder opties. */
  lijst: number;
  aankoop: number;
  verkoop: number;
  /** Er zit een paneel in dat smaller is dan krapPaneelBreedte. */
  krap: boolean;
  /** Er zit een paneel in dat breder is dan de breedste standaardmaat. */
  breed: boolean;
  /** De standaardmaten waarmee deze optie gewogen werd (merk, hoogte en glas). */
  standaardMaten: number[];
}

/**
 * Vertaalt een indeling naar de velden van GlaswandInput — precies zoals het formulier dat doet.
 * Zowel het formulier als het advies gebruiken deze functie, zodat een voorstel na "gebruik deze"
 * exact hetzelfde doorrekent.
 */
export function indelingNaarInvoer(inst: AdviesInstelling): Pick<
  GlaswandInput, 'paneelModus' | 'paneelVerdeling' | 'aantalPanelen' | 'paneelBreedte' | 'overlap'
> {
  return {
    paneelModus: inst.paneelModus === 'standaard' ? 'standaard' : 'maatwerk',
    paneelVerdeling: inst.paneelModus === 'mix' ? inst.paneelVerdeling : undefined,
    aantalPanelen: inst.aantalPanelen,
    paneelBreedte: inst.paneelBreedte,
    overlap: inst.overlap,
  };
}

const eur = (n: number) => Math.round(n * 100) / 100;

/** Alle niet-dalende reeksen van standaardmaten met lengte m (m=3 bij 4 maten: 20 reeksen). */
function multisets(maten: number[], m: number, vanaf = 0): number[][] {
  if (m === 0) return [[]];
  const uit: number[][] = [];
  for (let i = vanaf; i < maten.length; i++) {
    for (const rest of multisets(maten, m - 1, i)) uit.push([maten[i], ...rest]);
  }
  return uit;
}

/** [900, 900, 980] → [{900, 2}, {980, 1}] */
function telMaten(maten: number[]): GlaswandPaneel[] {
  const t = new Map<number, number>();
  for (const b of maten) t.set(b, (t.get(b) ?? 0) + 1);
  return [...t.entries()].map(([breedte, aantal]) => ({ breedte, aantal }));
}

function reken(basis: GlaswandInput, regelsMerk: MerkRegels, soort: AdviesSoort, inst: AdviesInstelling): AdviesOptie {
  const r = calcGlaswand({ ...basis, ...indelingNaarInvoer(inst) });
  const panelen = String(r.detail.panelenLijst || '').split(',').filter(Boolean).map(Number);
  const n = panelen.length;
  const overlap = n > 1 ? Number(r.detail.overlap) || 0 : 0;
  const wandBreedte = Number(r.calculatiemaat?.b) || 0;
  const breedste = panelen.reduce((m, b) => Math.max(m, b), 0);
  const som = panelen.reduce((t, b) => t + b, 0);
  const controle = Math.round(som - Math.max(0, n - 1) * overlap);
  const telling = new Map<number, number>();
  for (const b of panelen) telling.set(b, (telling.get(b) ?? 0) + 1);
  const titel = [...telling.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([b, a]) => `${a}× ${b}mm${regelsMerk.standaard.includes(b) ? '' : ' (maatwerk)'}`)
    .join(' + ');
  const speling = wandBreedte - controle;
  return {
    soort,
    titel: titel || `${inst.aantalPanelen} panelen`,
    instelling: inst,
    mogelijk: r.ok,
    reden: r.errors.join(' · '),
    meldingen: r.warnings,
    panelen,
    overlap,
    wandBreedte,
    controle,
    controleKlopt: n === 1
      ? speling >= EEN_PANEEL_MIN && speling <= EEN_PANEEL_MAX
      : Math.abs(speling) <= Math.max(1, Math.ceil(n / 2)),
    doorgang: Math.max(0, wandBreedte - breedste),
    lijst: eur(r.productSubtotal),
    aankoop: eur(r.aankoop),
    verkoop: eur(r.uwVerkoop),
    krap: panelen.some((b) => b > 0 && b < KRAP_BREEDTE),
    breed: panelen.some((b) => b > regelsMerk.maxPaneelBreedte),
    standaardMaten: regelsMerk.standaard,
  };
}

function maatwerkAantal(o: AdviesOptie) {
  return o.panelen.filter((b) => !o.standaardMaten.includes(b)).length;
}

/** Het glas zelf, los van de volgorde. Dezelfde glasmaten in dezelfde opening = dezelfde wand. */
function glasSleutel(o: AdviesOptie) {
  return [...o.panelen].sort((x, y) => x - y).join(',');
}

/** Rangorde: geschikt, geen smal of te breed glas, goedkoopst, overlap dichtst bij de wens, minst panelen. */
function vergelijk(gewenst: number) {
  return (a: AdviesOptie, b: AdviesOptie) =>
    Number(!a.mogelijk) - Number(!b.mogelijk)
    || Number(a.krap) - Number(b.krap)
    || Number(a.breed) - Number(b.breed)
    || a.aankoop - b.aankoop
    || Math.abs(a.overlap - gewenst) - Math.abs(b.overlap - gewenst)
    || a.panelen.length - b.panelen.length
    // daarna: minder maatwerkpanelen, dan het breedste smalste paneel (liever geen smal glas),
    // dan minder verschillende maten, en tot slot vast op de maten zelf zodat de volgorde nooit
    // afhangt van de volgorde waarin de combinaties gemaakt werden
    || maatwerkAantal(a) - maatwerkAantal(b)
    || Math.min(...b.panelen) - Math.min(...a.panelen)
    || new Set(a.panelen).size - new Set(b.panelen).size
    || glasSleutel(a).localeCompare(glasSleutel(b));
}

export function adviesCriterium(maxPaneelBreedte: number) {
  return 'Beste = de goedkoopste indeling zonder ongewoon smal glas en zonder glas breder dan '
    + `${maxPaneelBreedte}mm. Bij gelijke prijs telt de overlap die het dichtst bij je gewenste ligt, `
    + 'dan het kleinste aantal panelen.';
}
/** Het criterium voor ES (bleef zo heten voor bestaande imports). */
export const ADVIES_CRITERIUM = adviesCriterium(es.advies.maxPaneelBreedte);

/** Invoer voor de vergelijking: alles wat niet over de indeling gaat, wordt geneutraliseerd. */
function voorbereid(basis: GlaswandInput) {
  const isDeponti = basis.merk === 'Deponti';
  const regelsMerk = merkRegels(basis);
  // Steel-look legt de overlap op 30mm vast (zie calcGlaswand); de gewenste overlap volgt dat.
  const gewenst = isDeponti && basis.steellook ? 30 : Math.max(0, basis.overlap || 0);
  const neutraal: GlaswandInput = {
    ...basis,
    merk: isDeponti ? 'Deponti' : 'ES Systems',
    aantal: 1,
    opties: [],
    extraLijnen: [],
    vrijeOpties: [],
    // De kleur telt niet mee in de vergelijking, behalve brut bij Deponti: dan is de rail een andere
    // (brute rail 7100mm, enkel 3-6 sporen) en moeten de voorstellen dezelfde prijs en dezelfde
    // grenzen tonen als de berekening.
    kleur: isDeponti && kleurCode(basis.kleur?.select === 'andere' ? basis.kleur?.custom : basis.kleur?.select) === 'Brut'
      ? { select: 'Brut', custom: '' }
      : { select: '', custom: '' },
    // Steel-look en de sluiting veranderen bij Deponti de breedte en de overlap: die blijven staan.
    // Bij ES doet steel-look niets (enkel een melding), dus daar mag het weg.
    steellook: isDeponti ? basis.steellook : false,
    // Sporen en raillengte blijven zoals ingevuld: bij Deponti is de rail een prijsregel, en de
    // voorstellen moeten dezelfde prijs tonen als de berekening (0 = de tool kiest zelf).
    sporen: basis.sporen || 0,
    raillengte: basis.raillengte || 0,
    voorbereidingPersonen: 0,
    voorbereidingUren: 0,
    // De eenmalige korting is een regelkorting, geen eigenschap van de indeling. Zonder deze regel
    // hing de getoonde klantprijs af van de volgorde waarin je de velden invulde.
    marges: { ...basis.marges, eenmaligeKorting: 0 },
  };
  const W = glaswandWandBreedte(neutraal);
  return { neutraal, regelsMerk, W, gewenst, klaar: W > 0 && basis.dagmaatHoogte > 0 };
}

/**
 * Alle indelingen met precies n panelen: elke combinatie van standaardmaten (de overlap volgt en
 * moet tussen overlapMin en overlapMax liggen), standaardglas met k maatwerkpanelen die de rest
 * opvullen op de gewenste overlap, en alle panelen maatwerk.
 */
function genereer(
  neutraal: GlaswandInput, rm: MerkRegels, W: number, gewenst: number, n: number,
): AdviesOptie[] {
  const uit: AdviesOptie[] = [];
  // Zonder standaardmaten (bv. Deponti op een niet-standaardhoogte) is enkel maatwerk mogelijk.
  const kVanaf = rm.standaard.length === 0 ? n : 0;
  for (let k = kVanaf; k <= n; k++) {
    for (const std of multisets(rm.standaard, n - k)) {
      const som = std.reduce((t, b) => t + b, 0);
      const verdeling = telMaten(std);
      if (k === 0) {
        if (n === 1) {
          const gat = W - som;                                  // één vast paneel moet de opening dekken
          if (gat < EEN_PANEEL_MIN || gat > EEN_PANEEL_MAX) continue;
        } else {
          const o = (som - W) / (n - 1);
          if (!(o >= rm.overlapMin && o <= rm.overlapMax)) continue;
        }
        uit.push(reken(neutraal, rm, verdeling.length === 1 ? 'standaard' : 'mix', {
          paneelModus: verdeling.length === 1 ? 'standaard' : 'mix',
          aantalPanelen: n,
          paneelBreedte: verdeling.length === 1 ? verdeling[0].breedte : 0,
          paneelVerdeling: verdeling.length === 1 ? [] : verdeling,
          overlap: gewenst,
        }));
        continue;
      }
      if (k === n) {
        // alle panelen maatwerk, even breed, op de gewenste overlap
        uit.push(reken(neutraal, rm, 'maatwerk', {
          paneelModus: 'maatwerk', aantalPanelen: n, paneelBreedte: 0, paneelVerdeling: [], overlap: gewenst,
        }));
        continue;
      }
      // k opvulpanelen, allemaal even breed, op de gewenste overlap (zelfde afronding als de rekenkern)
      const opvul = Math.round((W + (n - 1) * gewenst - som) / k);
      if (opvul < MIN_BREEDTE || opvul > rm.maxPaneelBreedte || rm.standaard.includes(opvul)) continue;
      uit.push(reken(neutraal, rm, 'aanvulling', {
        paneelModus: 'mix', aantalPanelen: n, paneelBreedte: 0, overlap: gewenst,
        paneelVerdeling: [...verdeling, { breedte: 0, aantal: k }],
      }));
    }
  }
  return uit;
}

/**
 * Enkel wat kan, en elke wand één keer. Twee indelingen met hetzelfde glas zijn dezelfde wand: de
 * overlap volgt dan uit het glas en de opening. De eerst gemaakte blijft staan — de standaardvariant
 * (met de werkelijke overlap) komt in genereer voor de maatwerkvariant (met de nominale).
 */
function ontdubbel(opties: AdviesOptie[]): AdviesOptie[] {
  const gezien = new Set<string>();
  return opties.filter((k) => {
    if (!k.mogelijk) return false;
    const s = glasSleutel(k);
    if (gezien.has(s)) return false;
    gezien.add(s);
    return true;
  });
}

export interface AantalAdvies {
  aantal: number;
  wandBreedte: number;
  /** Alle indelingen die kunnen, gerangschikt: de beste eerst. */
  opties: AdviesOptie[];
  beste: AdviesOptie | null;
  /** Waarom er niets kan, als opties leeg is. */
  reden: string;
}

/**
 * Alle mogelijke indelingen met precies het gekozen aantal panelen, door elkaar en gerangschikt,
 * de beste eerst. De gebruiker hoeft niet te kiezen tussen standaard, maatwerk of mix.
 */
export function glaswandOptiesVoorAantal(basis: GlaswandInput, aantal: number): AantalAdvies {
  const { neutraal, regelsMerk, W, gewenst, klaar } = voorbereid(basis);
  const n = Math.floor(aantal || 0);
  const leeg = { aantal: n, wandBreedte: W, opties: [], beste: null };
  if (!klaar || n < 1) return { ...leeg, reden: '' };

  const maatwerkReden = () => reken(neutraal, regelsMerk, 'maatwerk', {
    paneelModus: 'maatwerk', aantalPanelen: n, paneelBreedte: 0, paneelVerdeling: [], overlap: gewenst,
  }).reden;
  // Meer panelen dan rails: niets doorrekenen, meteen de reden van de rekenkern tonen.
  if (n > regelsMerk.maxPanelen) return { ...leeg, reden: maatwerkReden() };

  const opties = ontdubbel(genereer(neutraal, regelsMerk, W, gewenst, n)).sort(vergelijk(gewenst));
  if (opties.length === 0) {
    return { ...leeg, reden: maatwerkReden() || `Geen indeling met ${n} panelen past in ${W}mm.` };
  }
  return { aantal: n, wandBreedte: W, opties, beste: opties[0], reden: '' };
}

export interface GlaswandOverzicht {
  wandBreedte: number;
  overlap: number;
  /** De lijst per aantal panelen, van 1 tot het maximum aantal rails. */
  perAantal: AantalAdvies[];
  /** De beste indeling over alle aantallen heen — nooit met smal of te breed glas. */
  beste: AdviesOptie | null;
  waarom: string;
  criterium: string;
}

/** Het overzicht over alle aantallen panelen, gebouwd op dezelfde lijsten als glaswandOptiesVoorAantal. */
export function glaswandOverzicht(basis: GlaswandInput): GlaswandOverzicht {
  const { regelsMerk: rm, W, gewenst, klaar } = voorbereid(basis);
  const criterium = adviesCriterium(rm.maxPaneelBreedte);
  const leeg: GlaswandOverzicht = {
    wandBreedte: W, overlap: gewenst, perAantal: [], beste: null, waarom: '', criterium,
  };
  if (!klaar) return leeg;

  const perAantal = Array.from({ length: rm.maxPanelen }, (_, i) => glaswandOptiesVoorAantal(basis, i + 1));
  const orde = vergelijk(gewenst);
  const zuiver = (o: AdviesOptie | null): o is AdviesOptie => !!o && !o.krap && !o.breed;
  const beste = perAantal.map((p) => p.beste).filter(zuiver).sort(orde)[0] ?? null;

  let waarom = '';
  if (!beste) {
    waarom = `Geen indeling met glas tussen ${KRAP_BREEDTE} en ${rm.maxPaneelBreedte}mm op hooguit `
      + `${rm.maxPanelen} ${rm.merk === 'Deponti' ? 'sporen' : 'rails'}. Kies zelf een aantal panelen `
      + `(breder of smaller glas, bevestigen bij ${rm.leverancier}) of splits de opening met een koker.`;
  } else {
    const besteMaatwerk = perAantal
      .flatMap((p) => p.opties.filter((o) => o.soort === 'maatwerk' && zuiver(o)))
      .sort(orde)[0];
    if (beste.soort !== 'maatwerk' && besteMaatwerk && besteMaatwerk.aankoop > beste.aankoop) {
      waarom = `€${(besteMaatwerk.aankoop - beste.aankoop).toFixed(2).replace('.', ',')} goedkoper in inkoop `
        + `dan de goedkoopste volledige maatwerkindeling (${besteMaatwerk.titel}).`;
    } else {
      waarom = 'Goedkoopste geschikte indeling.';
    }
    if (beste.overlap !== gewenst && beste.panelen.length > 1) {
      waarom += ` Let op: de overlap wordt ${beste.overlap}mm in plaats van ${gewenst}mm.`;
    }
  }
  return { wandBreedte: W, overlap: gewenst, perAantal, beste, waarom, criterium };
}

/**
 * Hoe het formulier aan zijn indeling komt:
 * - 'auto'  : altijd de beste mogelijkheid voor het gekozen aantal panelen en de overlap;
 * - 'vast'  : een mogelijkheid die de gebruiker zelf aanklikte (bewaard zoals ze toen was);
 * - 'eigen' : de gebruiker gaf de glasmaten zelf in.
 */
export type IndelingKeuze = 'auto' | 'vast' | 'eigen';

/** Versie van de bewaarde indeling: 2 = het advies bestaat ook voor Deponti. */
export const INDELING_VERSIE = 2;

export interface IndelingStaat {
  keuze: IndelingKeuze;
  paneelModus: AdviesInstelling['paneelModus'];
  aantalPanelen: number;
  paneelBreedte: number;
  paneelVerdeling: GlaswandPaneel[];
  overlap: number;
}

/** De indeling waarmee het formulier rekent, volgens de keuze. */
export function bepaalIndeling(st: IndelingStaat, perAantal: AantalAdvies | null): AdviesInstelling {
  if (st.keuze === 'eigen') {
    return {
      paneelModus: 'mix',
      aantalPanelen: somRijen(st.paneelVerdeling),
      paneelBreedte: st.paneelBreedte,
      paneelVerdeling: st.paneelVerdeling,
      overlap: st.overlap,
    };
  }
  if (st.keuze === 'auto' && perAantal?.beste) {
    const b = perAantal.beste.instelling;
    // Een maatwerk- of mixvoorstel heeft geen standaardbreedte (0); die laten we op wat er stond.
    return { ...b, paneelBreedte: b.paneelBreedte || st.paneelBreedte };
  }
  if (st.keuze === 'auto') {
    // Niets mogelijk met dit aantal: reken het als maatwerk, zodat de rekenkern de reden toont.
    return {
      paneelModus: 'maatwerk', aantalPanelen: st.aantalPanelen, paneelBreedte: st.paneelBreedte,
      paneelVerdeling: [], overlap: st.overlap,
    };
  }
  return {
    paneelModus: st.paneelModus, aantalPanelen: st.aantalPanelen, paneelBreedte: st.paneelBreedte,
    paneelVerdeling: st.paneelVerdeling, overlap: st.overlap,
  };
}

function somRijen(rijen: GlaswandPaneel[] = []) {
  return rijen.reduce((t, r) => t + (Math.floor(r?.aantal) || 0), 0);
}

/**
 * Een offerte-item dat bewaard is voor er een keuze bestond, rekende met paneelModus en de
 * bijhorende velden. Het moet bij het heropenen exact zo blijven rekenen — anders zou het stil naar
 * de beste mogelijkheid springen en van prijs veranderen:
 * - een mixwand opent als 'eigen', met de rijen zichtbaar. Het oude formulier paste aantalPanelen in
 *   mix-modus niet aan (het bleef vaak op 3 staan bij een wand van 4), dus we tellen het uit de rijen.
 * - een standaard- of maatwerkwand opent als 'vast'.
 */
export function migreerIndeling<T extends Partial<IndelingStaat> & { merk?: string; indelingVersie?: number }>(
  invoer: T,
): T & { keuze: IndelingKeuze } {
  // Een Deponti-item van vóór versie 2 kreeg keuze 'auto' mee zonder dat er voor Deponti een advies
  // bestond: het rekende met zijn eigen velden. Die keuze telt dus niet, anders sprong zo'n item bij
  // het heropenen stil naar de "beste" indeling en een andere prijs.
  const keuzeTelt = invoer.merk !== 'Deponti' || (invoer.indelingVersie ?? 0) >= INDELING_VERSIE;
  if (keuzeTelt && 'keuze' in invoer && invoer.keuze) return invoer as T & { keuze: IndelingKeuze };
  if (invoer.paneelModus === 'mix') {
    return { ...invoer, keuze: 'eigen', aantalPanelen: somRijen(invoer.paneelVerdeling) };
  }
  return { ...invoer, keuze: 'vast' };
}
