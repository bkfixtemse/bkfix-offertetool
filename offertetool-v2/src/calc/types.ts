/** Gedeelde types voor de rekenkern. Pure data — geen React/Firebase. */

export type Plaatsing = 'idd' | 'odd';

/** Een prijscel: getal = prijs, 'x' = niet produceerbaar. */
export type PriceCell = number | 'x';
export type PriceGrid = Record<string, Record<string, PriceCell>>;

export interface KleurKeuze {
  /** Geselecteerde waarde uit de dropdown ('' = standaard wit, 'andere' = vrije invoer). */
  select: string;
  /** Vrije omschrijving wanneer select === 'andere'. */
  custom: string;
}

export interface BedieningKeuze {
  bed1: string;
  bed2: string;
}

/** Marges per berekening (instelbaar per offerte). */
export interface Marges {
  /** Allround korting, fractie (0.40 of 0.50). */
  allroundKorting: number;
  /** BKfix marge, fractie (default 0.20). */
  bkfixMarge: number;
  /** Eenmalige korting in €. */
  eenmaligeKorting: number;
}

/** Eén prijscomponent in de berekening — alles traceerbaar. */
export interface PrijsRegel {
  label: string;
  bedrag: number;
}

/** Resultaat van elke product-calculator. */
export interface CalcResult {
  ok: boolean;
  errors: string[];
  warnings: string[];

  product: string;
  type: string;
  aantal: number;

  /** Ingevoerde dagmaten (mm). */
  breedte: number;
  hoogte?: number;
  uitval?: number;

  /** Maat waarop de prijs is opgezocht (raster). */
  calculatiemaat?: { b: number; h: number };
  /** Maat voor de fabrikant (bestelbon). */
  bestelmaat?: { b: number; h: number };

  /** Traceerbare opbouw van het productsubtotaal. */
  regels: PrijsRegel[];
  /** Som van regels × aantal + vrije opties. */
  productSubtotal: number;

  /** Plaatsingskosten (niet onder Allround korting). */
  plaatsingTotaal: number;
  /** Verkoopprijs bedieningen (aan klant). */
  bedieningTotaal: number;
  /** Aankoopprijs bedieningen (catalogus × 0,6). */
  bedieningAankoop: number;

  marges: Marges;
  /** Aankoop = subtotal×(1−korting) + bedieningAankoop. */
  aankoop: number;
  /** Verkoop = productAankoop/(1−bkfix). */
  verkoop: number;
  /** Wat de klant betaalt: verkoop − korting + plaatsing + bediening. */
  uwVerkoop: number;

  /** Beschrijvende opties (voor offerte/TL/Excel). */
  options: string[];
  opmerkingen: string;

  /** Productspecifieke velden voor TL-omschrijving en bestelbon. */
  detail: Record<string, string | number | boolean>;
  bediening: BedieningKeuze;
  kleur: KleurKeuze;
}

/** Welk formulier/tab een offerte-item hoort — bepaalt waar het bewerkt wordt. */
export type ProductKind = 'rolluik' | 'screen' | 'knikarm' | 'veranda' | 'bediening' | 'artikel';

/** Eén regel op de offerte (= CalcResult + id + herkomst + ruwe invoer voor bewerken). */
export interface OfferItem extends CalcResult {
  id: string;
  kind: ProductKind;
  /** Ruwe formulier-invoer, zodat het item terug in zijn formulier geladen kan worden. */
  input: unknown;
}

export interface VrijeOptie {
  description: string;
  amount: number;
}
