/**
 * Indelingsadvies voor een ES75-glaswand.
 *
 * Op basis van de wandbreedte en de gewenste overlap stelt dit zelf indelingen voor:
 *  - maatwerk: drie opeenvolgende aantallen panelen, alle panelen even breed, op exact de gewenste overlap;
 *  - mix & match: elke combinatie van standaardmaten (de overlap volgt), of standaardglas met één of
 *    meer maatwerkpanelen die de rest opvullen op de gewenste overlap.
 *
 * Elke indeling wordt doorgerekend met calcGlaswand — dezelfde rekenkern als het formulier. Kies je
 * een voorstel, dan krijg je dus gegarandeerd dezelfde maten en dezelfde prijs.
 *
 * "Beste" = de goedkoopste geschikte indeling zonder ongewoon smal glas; bij gelijke prijs de overlap
 * die het dichtst bij de gewenste ligt, dan het minste aantal panelen, dan het minste maatwerkglas,
 * dan het breedste smalste paneel.
 */
import data from '../data/glaswand.json';
import { calcGlaswand, type GlaswandInput, type GlaswandPaneel } from './glaswand';

const es = (data as any).es;
const cfg = es.advies as {
  maxPaneelBreedte: number;
  overlapMin: number;
  overlapMax: number;
  overlapAfwijking: number;
};
const STANDAARD: number[] = es.standaardBreedtes;
const MAX_RAILS: number = es.maxRails;
const MIN_BREEDTE: number = es.minPaneelBreedte ?? 0;
const KRAP_BREEDTE: number = es.krapPaneelBreedte ?? 0;

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
  /** Controle klopt, op de afronding na (elk paneel hooguit 0,5mm, dus samen hooguit n/2 mm). */
  controleKlopt: boolean;
  /** Vrije doorgang als alle panelen naar één kant geschoven zijn: wand min het breedste paneel. */
  doorgang: number;
  /** Setprijs volgens de lijst, inkoop na korting, klantprijs met plaatsing — telkens zonder opties. */
  lijst: number;
  aankoop: number;
  verkoop: number;
  /** Er zit een paneel in dat smaller is dan krapPaneelBreedte. */
  krap: boolean;
  /** Er zit een paneel in dat breder is dan de breedste standaardmaat (bv. als je zelf weinig panelen kiest). */
  breed: boolean;
}

export interface GlaswandAdvies {
  wandBreedte: number;
  overlap: number;
  /** Altijd drie rijen, ook als een aantal panelen niet kan — met de reden erbij. */
  maatwerk: AdviesOptie[];
  /** De (hooguit) drie beste mix-&-match-indelingen. */
  mix: AdviesOptie[];
  beste: AdviesOptie | null;
  waarom: string;
  criterium: string;
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
function multisets(m: number, vanaf = 0): number[][] {
  if (m === 0) return [[]];
  const uit: number[][] = [];
  for (let i = vanaf; i < STANDAARD.length; i++) {
    for (const rest of multisets(m - 1, i)) uit.push([STANDAARD[i], ...rest]);
  }
  return uit;
}

/** [900, 900, 980] → [{900, 2}, {980, 1}] */
function telMaten(maten: number[]): GlaswandPaneel[] {
  const t = new Map<number, number>();
  for (const b of maten) t.set(b, (t.get(b) ?? 0) + 1);
  return [...t.entries()].map(([breedte, aantal]) => ({ breedte, aantal }));
}

function reken(basis: GlaswandInput, soort: AdviesSoort, inst: AdviesInstelling): AdviesOptie {
  const r = calcGlaswand({ ...basis, ...indelingNaarInvoer(inst) });
  const panelen = String(r.detail.panelenLijst || '').split(',').filter(Boolean).map(Number);
  const n = panelen.length;
  const overlap = Number(r.detail.overlap) || 0;
  const wandBreedte = Number(r.calculatiemaat?.b) || 0;
  const breedste = panelen.reduce((m, b) => Math.max(m, b), 0);
  const telling = new Map<number, number>();
  for (const b of panelen) telling.set(b, (telling.get(b) ?? 0) + 1);
  const titel = [...telling.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([b, a]) => `${a}× ${b}mm${STANDAARD.includes(b) ? '' : ' (maatwerk)'}`)
    .join(' + ');
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
    controle: Math.round(panelen.reduce((t, b) => t + b, 0) - Math.max(0, n - 1) * overlap),
    controleKlopt: Math.abs(
      Math.round(panelen.reduce((t, b) => t + b, 0) - Math.max(0, n - 1) * overlap) - wandBreedte,
    ) <= Math.max(1, Math.ceil(n / 2)),
    doorgang: Math.max(0, wandBreedte - breedste),
    lijst: eur(r.productSubtotal),
    aankoop: eur(r.aankoop),
    verkoop: eur(r.uwVerkoop),
    krap: panelen.some((b) => b > 0 && b < KRAP_BREEDTE),
    breed: panelen.some((b) => b > cfg.maxPaneelBreedte),
  };
}

/** Rangorde: geschikt, geen ongewoon smal glas, goedkoopst, overlap dichtst bij de wens, minst panelen. */
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
    || sleutel(a).localeCompare(sleutel(b));
}

function maatwerkAantal(o: AdviesOptie) {
  return o.panelen.filter((b) => !STANDAARD.includes(b)).length;
}

function sleutel(o: AdviesOptie) {
  return `${[...o.panelen].sort((x, y) => x - y).join(',')}@${o.overlap}`;
}

/** Ligt een afgeleide overlap binnen wat we voorstellen? */
function overlapOk(o: number, gewenst: number) {
  return o >= cfg.overlapMin && o <= cfg.overlapMax && Math.abs(o - gewenst) <= cfg.overlapAfwijking;
}

export const ADVIES_CRITERIUM =
  'Beste = de goedkoopste geschikte indeling zonder ongewoon smal glas. Bij gelijke prijs telt de '
  + 'overlap die het dichtst bij je gewenste ligt, dan het kleinste aantal panelen.';

/** Invoer voor de vergelijking: alles wat niet over de indeling gaat, wordt geneutraliseerd. */
function voorbereid(basis: GlaswandInput) {
  const gewenst = Math.max(0, basis.overlap || 0);
  const neutraal: GlaswandInput = {
    ...basis,
    merk: 'ES Systems',
    aantal: 1,
    opties: [],
    extraLijnen: [],
    vrijeOpties: [],
    kleur: { select: '', custom: '' },
    steellook: false,
    voorbereidingPersonen: 0,
    voorbereidingUren: 0,
    // De eenmalige korting is een regelkorting, geen eigenschap van de indeling. Zonder deze regel
    // hing de getoonde klantprijs af van de volgorde waarin je de velden invulde.
    marges: { ...basis.marges, eenmaligeKorting: 0 },
  };
  const W = (basis.dagmaatBreedte || 0)
    - ((basis.kokerLinks || 0) + (basis.kokerMidden || 0) + (basis.kokerRechts || 0));
  return { neutraal, W, gewenst, klaar: W > 0 && basis.dagmaatHoogte > 0 };
}

/**
 * Alle indelingen met precies n panelen: elke combinatie van standaardmaten (de overlap volgt), en
 * standaardglas met k maatwerkpanelen die de rest opvullen op de gewenste overlap.
 * @param relatief de afgeleide overlap moet ook dicht bij de gewenste liggen (voor de overzichtslijst)
 * @param maatwerk ook de indeling "alle panelen maatwerk" meenemen
 */
function genereer(
  neutraal: GlaswandInput, W: number, gewenst: number, n: number,
  opts: { relatief: boolean; maatwerk: boolean },
): AdviesOptie[] {
  const uit: AdviesOptie[] = [];
  const kMax = opts.maatwerk ? n : n - 1;
  for (let k = 0; k <= kMax; k++) {
    for (const std of multisets(n - k)) {
      const som = std.reduce((t, b) => t + b, 0);
      const verdeling = telMaten(std);
      if (k === 0) {
        if (n === 1) {
          if (W - som < 0 || W - som > 20) continue;          // één vast paneel moet de opening dekken
        } else {
          const o = (som - W) / (n - 1);
          if (opts.relatief ? !overlapOk(o, gewenst) : !(o >= cfg.overlapMin && o <= cfg.overlapMax)) continue;
        }
        uit.push(reken(neutraal, verdeling.length === 1 ? 'standaard' : 'mix', {
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
        uit.push(reken(neutraal, 'maatwerk', {
          paneelModus: 'maatwerk', aantalPanelen: n, paneelBreedte: 0, paneelVerdeling: [], overlap: gewenst,
        }));
        continue;
      }
      // k opvulpanelen, allemaal even breed, op de gewenste overlap (zelfde afronding als de rekenkern)
      const opvul = Math.round((W + (n - 1) * gewenst - som) / k);
      if (opvul < MIN_BREEDTE || opvul > cfg.maxPaneelBreedte || STANDAARD.includes(opvul)) continue;
      uit.push(reken(neutraal, 'aanvulling', {
        paneelModus: 'mix', aantalPanelen: n, paneelBreedte: 0, overlap: gewenst,
        paneelVerdeling: [...verdeling, { breedte: 0, aantal: k }],
      }));
    }
  }
  return uit;
}

/** Enkel wat kan, zonder dubbels (dezelfde glasmaten op dezelfde overlap). */
function ontdubbel(opties: AdviesOptie[]): AdviesOptie[] {
  const gezien = new Set<string>();
  return opties.filter((k) => {
    if (!k.mogelijk) return false;
    const s = sleutel(k);
    if (gezien.has(s)) return false;
    gezien.add(s);
    return true;
  });
}

/**
 * @param basis de volledige invoer van het formulier; opties, extra lijnen, kleur en voorbereiding
 *              worden voor de vergelijking geneutraliseerd, zodat enkel de indeling het verschil maakt.
 */
export function glaswandAdvies(basis: GlaswandInput): GlaswandAdvies {
  const { neutraal, W, gewenst, klaar } = voorbereid(basis);
  const leeg: GlaswandAdvies = {
    wandBreedte: W, overlap: gewenst, maatwerk: [], mix: [], beste: null, waarom: '', criterium: ADVIES_CRITERIUM,
  };
  if (!klaar) return leeg;

  // ---- Maatwerk: drie opeenvolgende aantallen panelen, te beginnen bij het eerste dat niet
  // breder uitkomt dan de breedste standaardmaat. Ook onmogelijke aantallen tonen we, met reden.
  const breedteBij = (n: number) => Math.round((W + (n - 1) * gewenst) / n);
  let n0 = 1;
  while (n0 < 50 && breedteBij(n0) > cfg.maxPaneelBreedte) n0++;
  const maatwerk = [n0, n0 + 1, n0 + 2].map((n) => reken(neutraal, 'maatwerk', {
    paneelModus: 'maatwerk', aantalPanelen: n, paneelBreedte: 0, paneelVerdeling: [], overlap: gewenst,
  }));

  // ---- Mix & match over alle aantallen panelen; "alles maatwerk" staat al in de maatwerklijst.
  const kandidaten: AdviesOptie[] = [];
  for (let n = 1; n <= MAX_RAILS; n++) {
    kandidaten.push(...genereer(neutraal, W, gewenst, n, { relatief: true, maatwerk: false }));
  }
  const orde = vergelijk(gewenst);
  const mix = ontdubbel(kandidaten).sort(orde).slice(0, 3);

  const geschikt = [...maatwerk.filter((m) => m.mogelijk), ...mix].sort(orde);
  const beste = geschikt[0] ?? null;

  // Een korte, controleerbare uitleg bij de keuze.
  let waarom = '';
  if (!beste) {
    waarom = n0 > MAX_RAILS
      ? `Geen indeling mogelijk: met glas van hooguit ${cfg.maxPaneelBreedte}mm zijn er meer dan `
        + `${MAX_RAILS} panelen nodig, en ES75 gaat tot ${MAX_RAILS} rails. Splits de opening met een koker.`
      : 'Geen enkele indeling komt door de controles — bekijk de redenen bij de maatwerkopties.';
  } else {
    const besteMaatwerk = [...maatwerk.filter((m) => m.mogelijk)].sort(orde)[0];
    if (beste.soort !== 'maatwerk' && besteMaatwerk && besteMaatwerk.aankoop > beste.aankoop) {
      waarom = `€${(besteMaatwerk.aankoop - beste.aankoop).toFixed(2).replace('.', ',')} goedkoper in inkoop `
        + `dan de goedkoopste maatwerkindeling (${besteMaatwerk.titel}).`;
    } else if (beste.soort === 'maatwerk' && mix.length === 0) {
      waarom = `Geen standaardcombinatie mogelijk binnen ${gewenst}mm ± ${cfg.overlapAfwijking}mm overlap; `
        + 'dit is de goedkoopste maatwerkindeling.';
    } else {
      waarom = 'Goedkoopste geschikte indeling.';
    }
    if (beste.overlap !== gewenst && beste.panelen.length > 1) {
      waarom += ` Let op: de overlap wordt ${beste.overlap}mm in plaats van ${gewenst}mm.`;
    }
  }

  return { wandBreedte: W, overlap: gewenst, maatwerk, mix, beste, waarom, criterium: ADVIES_CRITERIUM };
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
 * Alle mogelijke indelingen met precies het gekozen aantal panelen: maatwerk, standaardglas in elke
 * combinatie van maten, en standaardglas met maatwerkpanelen die de rest opvullen — door elkaar,
 * gerangschikt, de beste eerst. De gebruiker hoeft dus niet zelf te kiezen tussen standaard,
 * maatwerk of mix. Een standaardcombinatie komt erin als haar overlap tussen overlapMin en
 * overlapMax ligt (ook als dat verder van de gewenste overlap ligt; die afstand telt in de rangorde).
 */
export function glaswandOptiesVoorAantal(basis: GlaswandInput, aantal: number): AantalAdvies {
  const { neutraal, W, gewenst, klaar } = voorbereid(basis);
  const n = Math.floor(aantal || 0);
  const leeg = { aantal: n, wandBreedte: W, opties: [], beste: null };
  if (!klaar || n < 1) return { ...leeg, reden: '' };

  const maatwerkReden = () => reken(neutraal, 'maatwerk', {
    paneelModus: 'maatwerk', aantalPanelen: n, paneelBreedte: 0, paneelVerdeling: [], overlap: gewenst,
  }).reden;
  // Meer panelen dan rails: niets doorrekenen, meteen de reden van de rekenkern tonen.
  if (n > MAX_RAILS) return { ...leeg, reden: maatwerkReden() };

  const opties = ontdubbel(genereer(neutraal, W, gewenst, n, { relatief: false, maatwerk: true }))
    .sort(vergelijk(gewenst));
  if (opties.length === 0) {
    return { ...leeg, reden: maatwerkReden() || `Geen indeling met ${n} panelen past in ${W}mm.` };
  }
  return { aantal: n, wandBreedte: W, opties, beste: opties[0], reden: '' };
}

/**
 * Hoe het formulier aan zijn indeling komt:
 * - 'auto'  : altijd de beste mogelijkheid voor het gekozen aantal panelen en de overlap;
 * - 'vast'  : een mogelijkheid die de gebruiker zelf aanklikte (bewaard zoals ze toen was);
 * - 'eigen' : de gebruiker gaf de glasmaten zelf in.
 */
export type IndelingKeuze = 'auto' | 'vast' | 'eigen';

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
      aantalPanelen: st.paneelVerdeling.reduce((t, r) => t + (Math.floor(r.aantal) || 0), 0),
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

/**
 * Een offerte-item dat bewaard is voor er een keuze bestond, rekende met paneelModus en de
 * bijhorende velden. Door het als 'vast' te openen, rekent het exact zoals toen — anders zou het
 * bij het heropenen stil naar de beste mogelijkheid springen en van prijs veranderen.
 */
export function migreerIndeling<T extends object>(invoer: T): T & { keuze: IndelingKeuze } {
  return 'keuze' in invoer ? (invoer as T & { keuze: IndelingKeuze }) : { ...invoer, keuze: 'vast' };
}
