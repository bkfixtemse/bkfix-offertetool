// Hand-geporteerde constanten uit de Allround catalogus 2026 (mei) — geverifieerd.

/** Allround kleurencollectie (rolluik/screen/veranda kleurdropdown). */
export const KLEURENCOLLECTIE = {
  glad: ['7009','7010','7011','7012','7013','7015','7016','7021','7022','7023','7024',
         '7026','7030','7031','7032','7033','7034','7035','7036','7037','7038','7039',
         '7040','7042','7043','7044','7045','7046','7047',
         '8000','8001','8002','8003','8004','8007','8008','8011','8012','8014','8015',
         '8016','8017','8019','8022','8023','8024','8025','8028',
         '9001','9002','9003','9004','9005','9006','9007','9010','9011','9016','9017','9018'],
  structuur: ['5011','6009','7016','7021','7039','9001','9005','9010','9016'], // suffix SL
  metallic:  ['DB703','7016','8019','9006','9007'],                            // suffix SM
} as const;

/** Meerprijs voor kleur buiten de Allround collectie (poedercoating / 'andere'). */
export const KLEUR_MEERPRIJS = 675;

/** Pisano 230: 3 inbegrepen standaardkleuren; andere Allround RAL = +140. */
export const PISANO_STD_KLEUREN = ['RAL 9001', 'RAL 9010', 'RAL 7016 SL'];
export const PISANO_RAL_MEERPRIJS = 140;

/** Vinci pergola vervangende montagesteunen — meerprijs per steun (catalogus p41/43/45). */
export const VERANDA_STEUNEN: Record<string, number> = {
  'Geen': 0,
  'Zijwaartse steun Z (+€10/st)': 10,
  'Koppelsteun (+€20/st)': 20,
  'Hoge steun H (+€20/st)': 20,
  'Afwijkende hoogte (+€15/st)': 15,
};

/** Bedieningen: aankoop = catalogusprijs × (1 − 40%). */
export const BEDIENING_KORTING = 0.40;

/**
 * Waar de cataloguskostprijs afwijkt van onze verkoopprijs.
 * Tahoma: catalogus €260, vaste verkoop €375 incl. koppeling/installatie.
 */
export const BEDIENING_CATALOG: Record<string, number> = {
  'tahoma switch (incl koppelen)': 260,
};

/** Meerprijzen (catalogus mei). */
export const GELEIDER_BOREN_PER_STUK = 6;   // €/geleider (×2 per scherm)
export const EXTERN_ZONNEPANEEL = 70;        // € (enkel solar)
export const KNIKARM_MUURSTRIP_PER_M = 125;  // €/lopende meter (Pisano/Gaudi)
export const UITVAL_KLEIN_TOESLAG = 245;     // € bij uitval 700–1400mm (pergola/serre, alle types)
export const ONDERLAT_HOOG_VERZWAARD = 15;   // € screen hoge verzwaarde onderlat
export const VERANDA_MOTOR_OREA_WT = -60;    // minderprijs t.o.v. Sunea io (standaard)

/** Standaard kortingen: pergola/serre (* in catalogus) 40%, rest 50%. */
export const KORTING_PERGOLA = 0.40;
export const KORTING_STANDAARD = 0.50;
export const BKFIX_MARGE_STANDAARD = 0.20;

/** Plaatsingstarieven (BKfix intern). */
export const PLAATSING = {
  rolluikBasis: 50,                 // + per-type toeslag uit opties.json
  screenBasis: 100,
  screenNovaExtra: { 'Nova 83': 100, 'Nova 103': 100, 'Nova 123': 100, 'Nova solar 103': 50 } as Record<string, number>,
  knikarmPerMeter: 100,             // (bCeil/1000) × 100
  knikarmVast: 250,
  verandaVast: 350,
};

/** Knikarm type-info voor TL-omschrijvingen. */
export const KNIKARM_TYPE_INFO: Record<string, { title: string; sub?: string; motor: string; doekLabel: string; muurOpties: boolean }> = {
  'Pisano 230': { title: "Knikarmscherm 'Pisano 230'", sub: 'Kast 230mm. Strakke, moderne look.', motor: 'Somfy Sunea IO motor', doekLabel: 'Acryldoek uit de Allround acrylcollectie', muurOpties: true },
  'Gaudi 300':  { title: "Knikarmscherm 'Gaudi 300'", sub: 'Kast van 150×225mm. Strakke en moderne look.\nDeze zonnetent kan afmetingen aan tot 7m breed en een uitval tot 4m.', motor: 'Somfy Sunea IO motor', doekLabel: 'Acryldoek uit de Allround acrylcollectie', muurOpties: true },
  'Gaudi 400':  { title: "Knikarmscherm 'Gaudi 400'", sub: 'Kast 150×225mm. Tot 12m breed en 4m uitval.', motor: 'Somfy Sunea IO motor', doekLabel: 'Acryldoek uit de Allround acrylcollectie', muurOpties: true },
  'Moneo 400':  { title: "Knikarmscherm 'Moneo 400'", sub: 'Tot 7m breed, 4m uitval.', motor: 'Somfy Sunea IO motor', doekLabel: 'Acryldoek uit de Allround acrylcollectie', muurOpties: true },
};

/** Veranda type-info voor TL-omschrijvingen. */
export const VERANDA_TYPE_INFO: Record<string, { title: string; sub?: string; motor: string }> = {
  'Vinci 150 onderliggend': { title: "Pergola 'Vinci 150'", sub: 'Onderliggend systeem. Kast 150mm.', motor: 'Somfy Sunea io' },
  'Vinci 250 bovenliggend': { title: "Pergola 'Vinci 250'", sub: 'Bovenliggend systeem. Kast 250mm.', motor: 'Somfy Sunea io' },
  'Vinci 300 zonder zip':   { title: "Pergola 'Vinci 300'", sub: 'Zonder zip. Kast 300mm.', motor: 'Somfy Sunea io' },
  'Vinci 250 met zip':      { title: "Pergola 'Vinci 250 met zip'", sub: 'Kast 250mm, met zijdelingse zip-geleiders.', motor: 'Somfy Sunea io' },
  'Vinci 250+ volant':      { title: "Pergola 'Vinci 250+ volant'", sub: 'Kast 250mm, met Vario volant-optie.', motor: 'Somfy Sunea io' },
  'vinci 450 waterdicht':   { title: "Pergola 'Vinci 450 waterdicht'", sub: 'Waterdicht systeem. Kast 450mm.', motor: 'Somfy Sunea io' },
  'Stilo 103 onderliggend': { title: "Serrezonwering 'Stilo 103'", sub: 'Onderliggende serrezonwering met zip. Kast 103mm.', motor: 'Somfy Sunea io' },
  'Stilo 123 onderliggend': { title: "Serrezonwering 'Stilo 123'", sub: 'Onderliggende serrezonwering met zip. Kast 123mm.', motor: 'Somfy Sunea io' },
};
