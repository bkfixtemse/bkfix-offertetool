/**
 * Alles wat er van een offerte-item te vertellen valt, als platte secties. Daarmee kan de Historie
 * een item van een oude offerte volledig laten terugkijken — zonder de offerte te laden, zonder
 * iets te herberekenen en zonder gevaar dat je per ongeluk in een bewerking belandt.
 *
 * Alles komt uit het bewaarde item zelf: zo zie je de offerte zoals ze toen gemaakt is, ook als de
 * prijslijsten intussen veranderd zijn.
 */
import { bestelSpecPairs } from './bestelspec';
import { isStandaardBreedte, DEPONTI_GLASAFTREK, type GlaswandMerk } from './glaswand';
import { kleurLabel } from './shared';
import type { OfferItem } from './types';

export interface OverzichtSectie {
  titel: string;
  /** Label → waarde. */
  rijen?: [string, string][];
  /** Losse regels zonder label (opties, opmerkingen, waarschuwingen). */
  punten?: string[];
}

const eur = (n: number) =>
  `€${(Number.isFinite(n) ? n : 0).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (f: number) => `${((f || 0) * 100).toLocaleString('nl-BE', { maximumFractionDigits: 1 })}%`;
const maat = (b?: number, h?: number) => (b && h ? `${b}×${h}mm` : b ? `${b}mm` : '');

/** De marge zoals de rekenkaart ze per product toont: zonder plaatsing (zie ResultCard). */
export function itemMarge(it: OfferItem): { bedrag: number; deel: number } {
  const bedrag = (it.uwVerkoop || 0) - (it.aankoop || 0) - (it.plaatsingTotaal || 0);
  return { bedrag, deel: it.uwVerkoop > 0 ? bedrag / it.uwVerkoop : 0 };
}

/** Eén regel titel voor bovenaan het item. */
export function itemTitel(it: OfferItem): string {
  const m = maat(it.breedte, it.hoogte ?? it.uitval);
  return [`${it.aantal}× ${it.product}`, it.type, m].filter(Boolean).join(' · ');
}

export interface Paneel {
  /** Volgnummer in de wand, van links naar rechts zoals de rekenkern ze bestelt. */
  nr: number;
  breedte: number;
  standaard: boolean;
  /**
   * De maat zoals ze besteld wordt. Bij Deponti is een standaardpaneel een artikel op de
   * inbouwhoogte (980×2500) en maatwerkglas de nettomaat (85mm kleiner); bij ES is alle glas
   * 100mm kleiner dan de dagmaat. 0 = niet te bepalen uit wat er bewaard is.
   */
  hoogte: number;
  /** 'standaardpaneel' (artikel) of 'maatwerkglas' (nettomaat). */
  maatLabel: string;
}

/**
 * De panelen van een glaswand, stuk per stuk: welke breedte en of het een standaardmaat of
 * maatwerkglas is. Items die sinds 10-2026 bewaard zijn, dragen die soort zelf mee
 * (`detail.panelenSoort`); bij oudere items leiden we ze af met dezelfde regel als de rekenkern.
 */
export function itemPanelen(it: OfferItem): Paneel[] {
  const lijst = String(it.detail?.panelenLijst || '').split(',').map(Number).filter((b) => b > 0);
  if (lijst.length === 0) return [];
  const soorten = String(it.detail?.panelenSoort || '').split(',').filter(Boolean);
  const merk: GlaswandMerk = String(it.detail?.merk || '') === 'Deponti' ? 'Deponti' : 'ES Systems';
  const inbouwhoogte = Number(it.detail?.inbouwhoogte || 0);
  const glassoort = String(it.detail?.glastype || 'standaard');
  const glasHoogte = Number(it.detail?.glasHoogte || 0);
  return lijst.map((breedte, i) => {
    const standaard = soorten[i]
      ? soorten[i] === 'standaard'
      : isStandaardBreedte(merk, breedte, inbouwhoogte, glassoort);
    // Bij Deponti verschilt de besteldmaat per soort; detail.glasHoogte draagt er maar één.
    const hoogte = merk !== 'Deponti' ? glasHoogte
      : standaard ? inbouwhoogte
        : (inbouwhoogte > 0 ? inbouwhoogte - DEPONTI_GLASAFTREK : 0);
    return {
      nr: i + 1,
      breedte,
      standaard,
      hoogte,
      maatLabel: standaard && merk === 'Deponti' ? 'standaardpaneel' : 'glas',
    };
  });
}

/** Niet-lege secties, in weergavevolgorde. */
export function itemSecties(it: OfferItem): OverzichtSectie[] {
  const secties: OverzichtSectie[] = [];

  const maten: [string, string][] = [['Aantal', String(it.aantal ?? 1)]];
  const dag = maat(it.breedte, it.hoogte ?? it.uitval);
  if (dag) maten.push(['Dagmaat', dag]);
  if (it.calculatiemaat) maten.push(['Calculatiemaat (prijsopzoeking)', maat(it.calculatiemaat.b, it.calculatiemaat.h)]);
  // Bij meerdere glasmaten in één wand zegt één bestelmaat te weinig; dan staat de lijst in detail.
  const bestel = String(it.detail?.glasmaat || '') || (it.bestelmaat ? maat(it.bestelmaat.b, it.bestelmaat.h) : '');
  if (bestel) maten.push(['Bestelmaat (fabrikant)', bestel]);
  secties.push({ titel: 'Maat & aantal', rijen: maten });

  const uitvoering: [string, string][] = [];
  const kleur = kleurLabel(it.kleur ?? { select: '', custom: '' });
  if (kleur) uitvoering.push(['Kleur', kleur]);
  const bediening = [it.bediening?.bed1, it.bediening?.bed2].filter(Boolean).join(' + ');
  if (bediening) uitvoering.push(['Bediening', bediening]);
  const opties = (it.options ?? []).filter(Boolean);
  if (uitvoering.length > 0 || opties.length > 0) {
    secties.push({ titel: 'Uitvoering & opties', rijen: uitvoering, punten: opties });
  }

  // Glaswand: paneel per paneel, want "hoeveel panelen en welke waren maatwerk?" is net wat je
  // achteraf wil terugvinden. Eén samenvattende regel, dan elk paneel apart.
  const panelen = itemPanelen(it);
  if (panelen.length > 0) {
    const nStandaard = panelen.filter((p) => p.standaard).length;
    const nMaatwerk = panelen.length - nStandaard;
    const verdeling = nMaatwerk === 0 ? 'allemaal standaardmaten'
      : nStandaard === 0 ? 'allemaal maatwerkglas'
        : `${nStandaard} standaard, ${nMaatwerk} maatwerk`;
    const rijen: [string, string][] = [['Aantal panelen', `${panelen.length} (${verdeling})`]];
    for (const p of panelen) {
      const maat = p.hoogte > 0 ? ` · ${p.maatLabel} ${p.breedte}×${p.hoogte}mm` : '';
      rijen.push([`Paneel ${p.nr}`, `${p.breedte}mm · ${p.standaard ? 'standaardmaat' : 'maatwerk'}${maat}`]);
    }
    if (it.detail?.overlap) rijen.push(['Overlap', `${it.detail.overlap}mm`]);
    secties.push({ titel: 'Panelen', rijen });
  }

  const spec = bestelSpecPairs(it);
  if (spec.length > 0) secties.push({ titel: 'Bestelspecificaties', rijen: spec });

  const prijs: [string, string][] = [];
  for (const r of it.regels ?? []) {
    prijs.push([`${r.label}${r.eenmalig ? ' (eenmalig)' : ''}${r.netto ? ' (netto)' : ''}`, eur(r.bedrag)]);
  }
  // Stukken met een afgesproken klantprijs, plaatsing inbegrepen: die lopen buiten de marge om.
  for (const v of it.vasteRegels ?? []) {
    prijs.push([`${v.label} — vaste klantprijs`, `${eur(v.verkoop)} (inkoop ${eur(v.aankoop)})`]);
  }
  prijs.push(['Productsubtotaal (adviesprijs)', eur(it.productSubtotal)]);
  if (it.marges?.allroundKorting) prijs.push(['Leverancierskorting', pct(it.marges.allroundKorting)]);
  if (it.marges?.bkfixMarge) prijs.push(['BKfix-marge', pct(it.marges.bkfixMarge)]);
  if (it.marges?.eenmaligeKorting) prijs.push(['Eenmalige korting', `− ${eur(it.marges.eenmaligeKorting)}`]);
  if (it.bedieningTotaal) prijs.push(['Bediening (verkoop)', eur(it.bedieningTotaal)]);
  prijs.push(['Plaatsing', eur(it.plaatsingTotaal)]);
  prijs.push(['Aankoop', eur(it.aankoop)]);
  prijs.push(['Uw verkoop', eur(it.uwVerkoop)]);
  const m = itemMarge(it);
  prijs.push(['Marge (product, zonder plaatsing)', `${eur(m.bedrag)} (${pct(m.deel)})`]);
  secties.push({ titel: 'Prijsopbouw', rijen: prijs });

  if (it.opmerkingen) secties.push({ titel: 'Opmerkingen', punten: [it.opmerkingen] });
  if ((it.warnings ?? []).length > 0) secties.push({ titel: 'Waarschuwingen bij het berekenen', punten: it.warnings });

  return secties;
}
